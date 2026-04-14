import { AppError } from "../utils/appError.js";
import { info } from "../utils/logger.js";
import { processJD } from "../services/jdService.js";

const parseResumeSkillsInput = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value.split(",").map((skill) => skill.trim());
  }

  return [];
};

export const uploadJD = async (req, res, next) => {
  try {
    const rawText = String(req.body?.rawText || req.body?.jdText || "").trim();

    if (!req.file && !rawText) {
      throw new AppError("Please upload a JD file or paste JD text", 400);
    }

    // Log upload
    if (req.file) {
      info(`JD received: ${req.file.filename}`);
    } else {
      info("JD text received from form input");
    }

    const parsedData = await processJD(req.file, {
      rawText,
      candidateName: req.body?.name,
      resumeSkills: parseResumeSkillsInput(req.body?.resumeSkills),
      jobId: req.body?.jobId,
      role: req.body?.role,
    });

    res.status(200).json(parsedData);
  } catch (error) {
    next(error);
  }
};
