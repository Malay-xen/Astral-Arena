import { Router } from 'express';
import * as paymentCtrl from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/verify', requireAuth, paymentCtrl.verifyPayment);
router.post('/webhook', paymentCtrl.handleWebhook);

export default router;