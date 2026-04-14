import { AppError } from "../utils/appError.js";
import { info } from "../utils/logger.js";
import { processResume } from "../services/resumeService.js";

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("File is required", 400);
    }

    // Log upload
    info(`Resume received: ${req.file.filename}`);

    const parsedData = await processResume(req.file);

    res.status(200).json({
      success: true,
      message: "Resume processed successfully",
      data: parsedData,
    });
  } catch (error) {
    next(error);
  }
};
