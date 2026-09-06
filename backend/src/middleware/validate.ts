import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: error.errors[0]?.message || 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({ error: 'Invalid request payload' });
    }
  };
};

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
  mlbbId: z.string().min(3, 'MLBB ID is required'),
  serverId: z.string().min(2, 'Server ID is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createTournamentSchema = z.object({
  title: z.string().min(3, 'Tournament title must be at least 3 characters'),
  game: z.string().default('Mobile Legends: Bang Bang'),
  entryFee: z.number().nonnegative('Entry fee cannot be negative').default(0),
  prizePool: z.number().nonnegative('Prize pool cannot be negative').default(0),
  maxTeams: z.number().int().positive('Max teams must be at least 2'),
  teamSize: z.number().int().positive().default(5),
  rules: z.string().optional(),
  startDate: z.string().datetime('Valid start date is required'),
});