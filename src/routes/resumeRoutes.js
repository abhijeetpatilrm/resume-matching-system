import { Router } from "express";

import upload from "../middlewares/uploadMiddleware.js";
import { uploadResume } from "../controllers/resumeController.js";

const router = Router();

/**
 * @route   POST /api/resume/upload
 * @desc    Upload resume PDF and process it
 * @access  Public
 */
// TODO: Add request validation middleware if needed
router.post("/upload", upload, uploadResume);

export default router;
