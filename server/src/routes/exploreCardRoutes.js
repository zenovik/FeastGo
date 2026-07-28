import { Router } from 'express';
import { listExploreCards } from '../controllers/exploreCardController.js';

const router = Router();

router.get('/', listExploreCards);

export default router;
