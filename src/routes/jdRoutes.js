import { Router } from "express";

import {
	uploadJdSource,
	uploadMultipleJdSources,
} from "../middlewares/uploadMiddleware.js";
import { uploadJD, uploadJDBatch } from "../controllers/jdController.js";

const router = Router();

router.post("/upload", uploadJdSource, uploadJD);
router.post("/batch-upload", uploadMultipleJdSources, uploadJDBatch);

export default router;
