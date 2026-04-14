import { Router } from 'express';

import { uploadJdSource } from '../middlewares/uploadMiddleware.js';
import { uploadJD } from '../controllers/jdController.js';

const router = Router();

router.post('/upload', uploadJdSource, uploadJD);

export default router;