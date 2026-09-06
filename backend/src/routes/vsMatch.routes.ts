import { Router } from 'express';
import * as vsCtrl from '../controllers/vsMatch.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Player Routes
router.get('/', vsCtrl.getMatchesByCategory);
router.post('/:id/join', requireAuth, vsCtrl.joinMatchById);
router.get('/history', requireAuth, vsCtrl.getPlayerMatchHistory);

// Admin-Only Routes
router.post('/admin/create', requireAuth, requireRole(['ADMIN']), vsCtrl.adminCreateMatch);
router.get('/admin/all', requireAuth, requireRole(['ADMIN']), vsCtrl.adminGetAllMatches);
router.get('/admin/:id/participants', requireAuth, requireRole(['ADMIN']), vsCtrl.adminGetMatchParticipants);
router.put('/admin/:id', requireAuth, requireRole(['ADMIN']), vsCtrl.adminUpdateMatch);
router.post('/admin/:id/settle', requireAuth, requireRole(['ADMIN']), vsCtrl.adminSettleMatch);
router.post('/admin/:id/cancel', requireAuth, requireRole(['ADMIN']), vsCtrl.adminCancelMatch);

export default router;