import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, {SignOptions} from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const SALT_ROUNDS = 12;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured in environment variables');
}

const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d';

export const register = async (req: Request, res: Response) => {
  const { email, username, mlbbId, serverId, password } = req.body;

  try {
    const checkUser = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase().trim(), username.trim()]
    );

    if (checkUser.rows.length > 0) {
      const match = checkUser.rows[0];
      if (match.email === email.toLowerCase().trim()) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertResult = await pool.query(
      `INSERT INTO users (email, username, mlbb_id, server_id, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'PLAYER')
       RETURNING id, email, username, mlbb_id, server_id, role, created_at`,
      [email.toLowerCase().trim(), username.trim(), mlbbId.trim(), serverId.trim(), passwordHash]
    );

    const newUser = insertResult.rows[0];
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET , {
      expiresIn: JWT_EXPIRES_IN ,
    });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        mlbbId: newUser.mlbb_id,
        serverId: newUser.server_id,
        role: newUser.role,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
    console.error('Registration error:', err);
    return res.status(500).json({ 
      error: `Database Error: ${errorMessage}` 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.mlbb_id, u.server_id, u.password_hash, u.role, u.is_active, w.balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET , {
      expiresIn: JWT_EXPIRES_IN ,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        mlbbId: user.mlbb_id,
        serverId: user.server_id,
        role: user.role,
        walletBalance: parseFloat(user.balance || 0),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.mlbb_id, u.server_id, u.role, w.balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];
    return res.json({
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        mlbbId: u.mlbb_id,
        serverId: u.server_id,
        role: u.role,
        walletBalance: parseFloat(u.balance || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile data' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.json({ message: 'If this email is registered, password reset instructions have been dispatched.' });
    }

    const userId = userRes.rows[0].id;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    // In production, integrate email dispatch. Token is logged for audit/admin recovery:
    console.log(`[PASSWORD_RESET] Token for ${email}: ${resetToken}`);

    return res.json({
      message: 'If this email is registered, password reset instructions have been dispatched.',
      // For local testing convenience:
      debugToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not process password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resetRecord = await client.query(
      `SELECT id, user_id FROM password_resets
       WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW() FOR UPDATE`,
      [tokenHash]
    );

    if (resetRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const { id: resetId, user_id: userId } = resetRecord.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
    await client.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [resetId]);

    await client.query('COMMIT');
    return res.json({ message: 'Password has been successfully updated. You can now log in.' });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to reset password' });
  } finally {
    client.release();
  }
};