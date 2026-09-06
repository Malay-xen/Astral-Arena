import { Router } from 'express';
import * as tourneyCtrl from '../controllers/tournament.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate, createTournamentSchema } from '../middleware/validate';

const router = Router();

router.get('/', tourneyCtrl.getTournaments);
router.get('/:id', tourneyCtrl.getTournamentById);
router.post('/:id/join', requireAuth, tourneyCtrl.joinTournament);

// Host & Admin tournament management
router.post('/', requireAuth, requireRole(['HOST', 'ADMIN']), validate(createTournamentSchema), tourneyCtrl.createTournament);
router.put('/matches/:matchId/result', requireAuth, requireRole(['HOST', 'ADMIN']), tourneyCtrl.updateMatchResult);

export default router;