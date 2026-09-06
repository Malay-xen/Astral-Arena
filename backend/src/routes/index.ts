import { Router } from 'express';
import authRoutes from './auth.routes';
import tournamentRoutes from './tournament.routes';
import walletRoutes from './wallet.routes';
import paymentRoutes from './payment.routes';
import adminRoutes from './admin.routes';
import vsMatchRoutes from './vsMatch.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/wallet', walletRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/vs-matches', vsMatchRoutes);

export default router;