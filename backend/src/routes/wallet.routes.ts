import { Router } from 'express';
import * as walletCtrl from '../controllers/wallet.controller';
import * as paymentCtrl from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, walletCtrl.getWallet);
router.post('/create-order', requireAuth, paymentCtrl.createOrder);

// Real Withdrawal routes
router.post('/withdraw', requireAuth, walletCtrl.requestWithdrawal);
router.get('/withdrawals', requireAuth, walletCtrl.getWithdrawalHistory);

export default router;