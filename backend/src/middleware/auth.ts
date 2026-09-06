import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    mlbb_id: string;
    server_id: string;
    role: 'PLAYER' | 'HOST' | 'ADMIN';
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    
    const result = await pool.query(
      'SELECT id, email, username, mlbb_id, server_id, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid session or account deactivated' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

export const requireRole = (allowedRoles: ('PLAYER' | 'HOST' | 'ADMIN')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      if (req.user.role === 'PLAYER' && allowedRoles.includes('HOST')) {
        return res.status(403).json({
          error: 'Host access requires administrator approval. Please contact the platform administrator.',
        });
      }
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};