import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.mlbb_id, u.server_id, u.role, u.is_active, u.created_at,
              w.balance as wallet_balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve user registry' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['PLAYER', 'HOST', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  if (userId === req.user!.id && role !== 'ADMIN') {
    return res.status(400).json({ error: 'You cannot demote your own administrator account' });
  }

  try {
    const updateRes = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role',
      [role, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: `Role successfully updated to ${role}`,
      user: updateRes.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const tournamentsCount = await pool.query('SELECT COUNT(*) FROM tournaments');
    const totalDeposits = await pool.query("SELECT COALESCE(SUM(amount_inr), 0) FROM payments WHERE status = 'PAID'");
    
    return res.json({
      totalUsers: parseInt(usersCount.rows[0].count, 10),
      totalTournaments: parseInt(tournamentsCount.rows[0].count, 10),
      totalVolumeINR: parseFloat(totalDeposits.rows[0].coalesce),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load system metrics' });
  }
};