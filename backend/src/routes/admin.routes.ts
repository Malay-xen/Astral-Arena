import { Router } from 'express';
import * as adminCtrl from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole(['ADMIN']));

router.get('/users', adminCtrl.getUsers);
router.put('/users/:userId/role', adminCtrl.updateUserRole);
router.get('/stats', adminCtrl.getAdminStats);

export default router;