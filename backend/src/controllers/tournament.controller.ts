import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';

export const getTournaments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.game, t.entry_fee, t.prize_pool, t.max_teams, t.current_teams,
              t.team_size, t.status, t.rules, t.start_date, u.username as host_username
       FROM tournaments t
       JOIN users u ON u.id = t.host_id
       ORDER BY t.start_date ASC`
    );

    const tournaments = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      game: row.game,
      entryFee: parseFloat(row.entry_fee),
      prizePool: parseFloat(row.prize_pool),
      maxTeams: row.max_teams,
      currentTeams: row.current_teams,
      teamSize: row.team_size,
      status: row.status,
      rules: row.rules,
      startDate: row.start_date,
      hostUsername: row.host_username,
    }));

    return res.json(tournaments);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve tournament catalog' });
  }
};

export const getTournamentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const tRes = await pool.query(
      `SELECT t.*, u.username as host_username
       FROM tournaments t
       JOIN users u ON u.id = t.host_id
       WHERE t.id = $1`,
      [id]
    );

    if (tRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participantsRes = await pool.query(
      `SELECT tp.id, tp.team_name, tp.mlbb_id, tp.server_id, tp.registered_at, u.username
       FROM tournament_participants tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.tournament_id = $1
       ORDER BY tp.registered_at ASC`,
      [id]
    );

    const matchesRes = await pool.query(
      `SELECT m.*, 
              p1.team_name as team1_name, 
              p2.team_name as team2_name,
              pw.team_name as winner_name
       FROM matches m
       LEFT JOIN tournament_participants p1 ON m.team1_id = p1.id
       LEFT JOIN tournament_participants p2 ON m.team2_id = p2.id
       LEFT JOIN tournament_participants pw ON m.winner_id = pw.id
       WHERE m.tournament_id = $1
       ORDER BY m.round_number, m.match_number`,
      [id]
    );

    return res.json({
      tournament: tRes.rows[0],
      participants: participantsRes.rows,
      matches: matchesRes.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
};

export const joinTournament = async (req: AuthRequest, res: Response) => {
  const { id: tournamentId } = req.params;
  const { teamName } = req.body;
  const userId = req.user!.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tourneyRes = await client.query(
      'SELECT id, entry_fee, max_teams, current_teams, status FROM tournaments WHERE id = $1 FOR UPDATE',
      [tournamentId]
    );

    if (tourneyRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tourneyRes.rows[0];

    if (tournament.status !== 'REGISTRATION_OPEN') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tournament registration is closed' });
    }

    if (tournament.current_teams >= tournament.max_teams) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tournament bracket is currently full' });
    }

    const participantCheck = await client.query(
      'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, userId]
    );

    if (participantCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You are already registered for this tournament' });
    }

    const userRes = await client.query(
      'SELECT mlbb_id, server_id FROM users WHERE id = $1',
      [userId]
    );
    const { mlbb_id, server_id } = userRes.rows[0];

    const entryFee = parseFloat(tournament.entry_fee);
    let txId: string | null = null;

    if (entryFee > 0) {
      const walletRes = await client.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Wallet not found for this account' });
      }

      const wallet = walletRes.rows[0];
      const currentBalance = parseFloat(wallet.balance);

      if (currentBalance < entryFee) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient wallet balance. Required: ₹${entryFee}, Available: ₹${currentBalance}. Please add funds to your wallet.`,
        });
      }

      const updatedBalance = currentBalance - entryFee;
      await client.query(
        'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
        [updatedBalance, wallet.id]
      );

      const txRes = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
         VALUES ($1, $2, 'ENTRY_FEE', $3, $4, $5, 'Tournament Entry Fee Deduction', 'SUCCESS')
         RETURNING id`,
        [wallet.id, userId, entryFee, updatedBalance, tournamentId]
      );
      txId = txRes.rows[0].id;
    }

    await client.query(
      `INSERT INTO tournament_participants (tournament_id, user_id, team_name, mlbb_id, server_id, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tournamentId, userId, (teamName || req.user!.username).trim(), mlbb_id, server_id, txId]
    );

    await client.query(
      'UPDATE tournaments SET current_teams = current_teams + 1 WHERE id = $1',
      [tournamentId]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Successfully registered for the tournament!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Tournament registration error:', err);
    return res.status(500).json({ error: 'Failed to join tournament' });
  } finally {
    client.release();
  }
};

export const createTournament = async (req: AuthRequest, res: Response) => {
  const { title, game, entryFee, prizePool, maxTeams, teamSize, rules, startDate } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tournaments (title, game, host_id, entry_fee, prize_pool, max_teams, team_size, rules, start_date)
       VALUES ($1, COALESCE($2, 'Mobile Legends: Bang Bang'), $3, $4, $5, $6, COALESCE($7, 5), $8, $9)
       RETURNING *`,
      [title, game, req.user!.id, entryFee || 0, prizePool || 0, maxTeams, teamSize || 5, rules, startDate]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create tournament error:', err);
    return res.status(500).json({ error: 'Failed to create tournament' });
  }
};

export const updateMatchResult = async (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const { winnerId } = req.body;

  if (!winnerId) {
    return res.status(400).json({ error: 'Winner participant ID is required' });
  }

  try {
    const matchRes = await pool.query(
      `SELECT m.id, m.tournament_id, t.host_id
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.id = $1`,
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Match record not found' });
    }

    const match = matchRes.rows[0];
    if (req.user!.role !== 'ADMIN' && match.host_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You do not host this tournament' });
    }

    await pool.query(
      `UPDATE matches SET winner_id = $1, status = 'COMPLETED', updated_at = NOW() WHERE id = $2`,
      [winnerId, matchId]
    );

    return res.json({ message: 'Match result saved successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update match result' });
  }
};