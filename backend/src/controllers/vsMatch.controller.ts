import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';

// =========================================================================
// 1. PLAYER-FACING ENDPOINTS (STRICT PRIVACY - NO PARTICIPANT LEAKS)
// =========================================================================

export const getMatchesByCategory = async (req: Request, res: Response) => {
  const { category } = req.query;
  const authHeader = req.headers.authorization;
  let currentUserId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET as string) as { id: string };
      currentUserId = decoded.id;
    } catch {
      // Unauthenticated visitor
    }
  }

  if (!category || !['1v1', '3v3', '5v5'].includes(category as string)) {
    return res.status(400).json({ error: 'Valid category (1v1, 3v3, or 5v5) is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT 
         m.id,
         m.match_code,
         m.category,
         m.sub_mode,
         m.entry_fee,
         m.winning_amount,
         m.required_players,
         m.current_players,
         m.status,
         m.scheduled_time,
         m.created_at,
         CASE 
           WHEN $2::uuid IS NOT NULL AND EXISTS (
             SELECT 1 FROM vs_match_participants p WHERE p.match_id = m.id AND p.user_id = $2::uuid
           ) THEN TRUE 
           ELSE FALSE 
         END as is_joined,
         CASE 
           WHEN $2::uuid IS NOT NULL AND EXISTS (
             SELECT 1 FROM vs_match_participants p WHERE p.match_id = m.id AND p.user_id = $2::uuid
           ) THEN m.room_code 
           ELSE NULL 
         END as room_code
       FROM vs_matches m
       WHERE m.category = $1
       ORDER BY 
         CASE 
           WHEN m.status = 'WAITING_FOR_PLAYERS' THEN 1 
           WHEN m.status = 'SCHEDULED' THEN 2 
           WHEN m.status = 'IN_PROGRESS' THEN 3 
           ELSE 4 
         END,
         m.created_at DESC`,
      [category, currentUserId]
    );

    const matches = result.rows.map((row) => ({
      id: row.id,
      matchCode: row.match_code,
      category: row.category,
      subMode: row.sub_mode,
      entryFee: parseFloat(row.entry_fee),
      winningAmount: parseFloat(row.winning_amount),
      requiredPlayers: row.required_players,
      currentPlayers: row.current_players,
      remainingSlots: Math.max(0, row.required_players - row.current_players),
      status: row.status,
      scheduledTime: row.scheduled_time,
      isJoined: row.is_joined,
      roomCode: row.room_code,
      createdAt: row.created_at,
    }));

    return res.json(matches);
  } catch (err: unknown) {
    console.error('Fetch match listings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve matches.' });
  }
};

export const joinMatchById = async (req: AuthRequest, res: Response) => {
  const { id: matchId } = req.params;
  const { mlbbId, serverId } = req.body;
  const userId = req.user!.id;

  if (!mlbbId || !serverId) {
    return res.status(400).json({ error: 'MLBB ID and Server ID are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const matchRes = await client.query(
      `SELECT id, match_code, category, sub_mode, entry_fee, winning_amount, 
              required_players, current_players, status, scheduled_time, room_code
       FROM vs_matches 
       WHERE id = $1 FOR UPDATE`,
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found.' });
    }

    const match = matchRes.rows[0];

    if (match.status !== 'WAITING_FOR_PLAYERS' && match.status !== 'SCHEDULED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Registration closed. This match is no longer accepting players.' });
    }

    if (match.current_players >= match.required_players) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Registration closed. This match is already full.' });
    }

    const participantCheck = await client.query(
      'SELECT id FROM vs_match_participants WHERE match_id = $1 AND user_id = $2',
      [matchId, userId]
    );

    if (participantCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You are already registered in this match.' });
    }

    const entryFee = parseFloat(match.entry_fee);
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const currentBalance = parseFloat(walletRes.rows[0].balance);
    if (currentBalance < entryFee) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient wallet balance. Required: ₹${entryFee}, Available: ₹${currentBalance.toFixed(2)}. Please add funds.`,
      });
    }

    const updatedBalance = currentBalance - entryFee;
    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
      [updatedBalance, walletRes.rows[0].id]
    );

    const txRes = await client.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
       VALUES ($1, $2, 'ENTRY_FEE', $3, $4, $5, $6, 'SUCCESS')
       RETURNING id`,
      [
        walletRes.rows[0].id,
        userId,
        entryFee,
        updatedBalance,
        match.match_code,
        `Entry fee for Match #${match.match_code} (${match.category} • ${match.sub_mode})`,
      ]
    );

    const newPlayerCount = match.current_players + 1;
    await client.query(
      `INSERT INTO vs_match_participants (match_id, user_id, mlbb_id, server_id, team_slot, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [matchId, userId, mlbbId.trim(), serverId.trim(), (match.current_players % 2) + 1, txRes.rows[0].id]
    );

    let updatedStatus = match.status;
    if (newPlayerCount >= match.required_players) {
      updatedStatus = 'SCHEDULED';
    }

    await client.query(
      `UPDATE vs_matches 
       SET current_players = $1, status = $2, updated_at = NOW() 
       WHERE id = $3`,
      [newPlayerCount, updatedStatus, matchId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Successfully registered for match!',
      match: {
        id: match.id,
        matchCode: match.match_code,
        category: match.category,
        subMode: match.sub_mode,
        entryFee,
        winningAmount: parseFloat(match.winning_amount),
        currentPlayers: newPlayerCount,
        requiredPlayers: match.required_players,
        remainingSlots: Math.max(0, match.required_players - newPlayerCount),
        status: updatedStatus,
        scheduledTime: match.scheduled_time,
        roomCode: match.room_code || 'Waiting for host',
      },
      newBalance: updatedBalance,
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    console.error('Join match error:', err);
    return res.status(500).json({ error: 'Failed to join match. Please try again.' });
  } finally {
    client.release();
  }
};

export const getPlayerMatchHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    // Only finished matches (VICTORY / DEFEAT) count towards stats
    const statsRes = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE p.result IN ('VICTORY', 'DEFEAT'))::int as total_played,
         COUNT(*) FILTER (WHERE p.result = 'VICTORY')::int as total_won
       FROM vs_match_participants p
       JOIN vs_matches m ON m.id = p.match_id
       WHERE p.user_id = $1 AND m.status != 'CANCELLED'`,
      [userId]
    );

    const matchesPlayed = statsRes.rows[0]?.total_played || 0;
    const matchesWon = statsRes.rows[0]?.total_won || 0;

    // Returns result as 'CANCELLED' if match was cancelled
    const matchesRes = await pool.query(
      `SELECT 
         m.id,
         m.match_code,
         m.category,
         m.sub_mode,
         m.entry_fee,
         m.winning_amount,
         m.current_players,
         m.required_players,
         m.room_code,
         m.status as match_status,
         m.scheduled_time,
         CASE 
           WHEN m.status = 'CANCELLED' THEN 'CANCELLED'::player_match_result
           ELSE p.result 
         END as result,
         p.payout_amount,
         p.registered_at,
         p.mlbb_id,
         p.server_id
       FROM vs_match_participants p
       JOIN vs_matches m ON m.id = p.match_id
       WHERE p.user_id = $1
       ORDER BY p.registered_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({
      statistics: {
        matchesPlayed,
        matchesWon,
        winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
      },
      matches: matchesRes.rows.map((row) => ({
        id: row.id,
        matchCode: row.match_code,
        category: row.category,
        subMode: row.sub_mode,
        entryFee: parseFloat(row.entry_fee),
        winningAmount: parseFloat(row.winning_amount),
        currentPlayers: row.current_players,
        requiredPlayers: row.required_players,
        roomCode: row.room_code,
        matchStatus: row.match_status,
        scheduledTime: row.scheduled_time,
        result: row.result,
        payoutAmount: parseFloat(row.payout_amount),
        registeredAt: row.registered_at,
        mlbbId: row.mlbb_id,
        serverId: row.server_id,
      })),
    });
  } catch (err: unknown) {
    console.error('Player match history error:', err);
    return res.status(500).json({ error: 'Failed to retrieve player match history.' });
  }
};

// =========================================================================
// 2. ADMIN MATCH MANAGEMENT ENDPOINTS
// =========================================================================

export const adminCreateMatch = async (req: AuthRequest, res: Response) => {
  const { category, subMode, entryFee, winningAmount, scheduledTime, roomCode } = req.body;

  if (!category || !['1v1', '3v3', '5v5'].includes(category)) {
    return res.status(400).json({ error: 'Invalid match category.' });
  }

  const parsedFee = parseFloat(entryFee);
  const parsedWin = parseFloat(winningAmount);

  if (isNaN(parsedFee) || parsedFee <= 0 || isNaN(parsedWin) || parsedWin <= 0) {
    return res.status(400).json({ error: 'Entry fee and winning amount must be valid numbers.' });
  }

  const requiredPlayers = category === '1v1' ? 2 : category === '3v3' ? 6 : 10;
  const matchSubMode = subMode || (category === '1v1' ? 'Large Map (Classic)' : category === '3v3' ? 'Classic Arena' : 'Classic Conquest');

  try {
    const result = await pool.query(
      `INSERT INTO vs_matches (category, sub_mode, entry_fee, winning_amount, required_players, current_players, status, scheduled_time, room_code)
       VALUES ($1, $2, $3, $4, $5, 0, 'WAITING_FOR_PLAYERS', $6, $7)
       RETURNING *`,
      [category, matchSubMode, parsedFee, parsedWin, requiredPlayers, scheduledTime || null, roomCode || null]
    );

    return res.status(201).json({
      message: 'Match created successfully.',
      match: result.rows[0],
    });
  } catch (err: unknown) {
    console.error('Admin create match error:', err);
    return res.status(500).json({ error: 'Failed to create match.' });
  }
};

export const adminGetAllMatches = async (req: AuthRequest, res: Response) => {
  const { category } = req.query;

  try {
    let query = `
      SELECT 
        m.*,
        (SELECT COUNT(*)::int FROM vs_match_participants p WHERE p.match_id = m.id) as registered_count
      FROM vs_matches m
    `;
    const params: any[] = [];

    if (category && ['1v1', '3v3', '5v5'].includes(category as string)) {
      query += ` WHERE m.category = $1 `;
      params.push(category);
    }

    query += ` ORDER BY m.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin matches.' });
  }
};

export const adminGetMatchParticipants = async (req: AuthRequest, res: Response) => {
  const { id: matchId } = req.params;

  try {
    const matchRes = await pool.query('SELECT * FROM vs_matches WHERE id = $1', [matchId]);
    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    const participantsRes = await pool.query(
      `SELECT 
         p.id as participant_id,
         p.user_id,
         u.username,
         u.email,
         p.mlbb_id,
         p.server_id,
         p.team_slot,
         p.result,
         p.payout_amount,
         p.registered_at
       FROM vs_match_participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.match_id = $1
       ORDER BY p.registered_at ASC`,
      [matchId]
    );

    return res.json({
      match: matchRes.rows[0],
      participants: participantsRes.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch match participants.' });
  }
};

export const adminUpdateMatch = async (req: AuthRequest, res: Response) => {
  const { id: matchId } = req.params;
  const { roomCode, scheduledTime, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE vs_matches 
       SET 
         room_code = COALESCE($1, room_code),
         scheduled_time = COALESCE($2, scheduled_time),
         status = COALESCE($3, status),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [roomCode !== undefined ? roomCode : null, scheduledTime !== undefined ? scheduledTime : null, status || null, matchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    return res.json({
      message: 'Match updated successfully.',
      match: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update match.' });
  }
};

export const adminSettleMatch = async (req: AuthRequest, res: Response) => {
  const { id: matchId } = req.params;
  const { winnerUserId } = req.body;

  if (!winnerUserId) {
    return res.status(400).json({ error: 'Winner User ID is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const matchRes = await client.query(
      'SELECT id, match_code, winning_amount, status FROM vs_matches WHERE id = $1 FOR UPDATE',
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found.' });
    }

    const match = matchRes.rows[0];
    if (match.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Match has already been completed and settled.' });
    }

    const prize = parseFloat(match.winning_amount);

    await client.query(
      `UPDATE vs_match_participants 
       SET result = 'VICTORY', payout_amount = $1 
       WHERE match_id = $2 AND user_id = $3`,
      [prize, matchId, winnerUserId]
    );

    await client.query(
      `UPDATE vs_match_participants 
       SET result = 'DEFEAT', payout_amount = 0.00 
       WHERE match_id = $1 AND user_id != $2`,
      [matchId, winnerUserId]
    );

    const walletRes = await client.query(
      `UPDATE wallets 
       SET balance = balance + $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING id, balance`,
      [prize, winnerUserId]
    );

    if (walletRes.rows.length > 0) {
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
         VALUES ($1, $2, 'PRIZE_PAYOUT', $3, $4, $5, $6, 'SUCCESS')`,
        [
          walletRes.rows[0].id,
          winnerUserId,
          prize,
          walletRes.rows[0].balance,
          match.match_code,
          `Prize payout for winning match #${match.match_code}`,
        ]
      );
    }

    await client.query(
      `UPDATE vs_matches SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [matchId]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Match successfully settled! Winner wallet credited.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin settle match error:', err);
    return res.status(500).json({ error: 'Failed to settle match.' });
  } finally {
    client.release();
  }
};

export const adminCancelMatch = async (req: AuthRequest, res: Response) => {
  const { id: matchId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const matchRes = await client.query(
      'SELECT id, match_code, entry_fee, status FROM vs_matches WHERE id = $1 FOR UPDATE',
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found.' });
    }

    const match = matchRes.rows[0];
    if (match.status === 'CANCELLED' || match.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Match cannot be cancelled.' });
    }

    const entryFee = parseFloat(match.entry_fee);

    const partsRes = await client.query(
      'SELECT user_id FROM vs_match_participants WHERE match_id = $1',
      [matchId]
    );

    // Refund each participant
    for (const part of partsRes.rows) {
      const walletRes = await client.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance`,
        [entryFee, part.user_id]
      );

      if (walletRes.rows.length > 0) {
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
           VALUES ($1, $2, 'REFUND', $3, $4, $5, $6, 'SUCCESS')`,
          [
            walletRes.rows[0].id,
            part.user_id,
            entryFee,
            walletRes.rows[0].balance,
            match.match_code,
            `Refund for cancelled match #${match.match_code}`,
          ]
        );
      }
    }

    // 1. Mark match status as CANCELLED
    await client.query(
      `UPDATE vs_matches SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [matchId]
    );

    // 2. Also mark participant records as CANCELLED so player histories reflect the refund!
    await client.query(
      `UPDATE vs_match_participants SET result = 'CANCELLED' WHERE match_id = $1`,
      [matchId]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Match cancelled and participants refunded successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel match error:', err);
    return res.status(500).json({ error: 'Failed to cancel match.' });
  } finally {
    client.release();
  }
};