import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validate';

const router = Router();

router.post('/register', validate(registerSchema), authCtrl.register);
router.post('/login', validate(loginSchema), authCtrl.login);
router.get('/me', requireAuth, authCtrl.getMe);
router.post('/forgot-password', validate(forgotPasswordSchema), authCtrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authCtrl.resetPassword);

export default router;