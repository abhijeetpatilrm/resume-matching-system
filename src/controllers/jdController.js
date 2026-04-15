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

const parseBatchTextSources = (body) => {
  const rawTexts = body?.rawTexts;
  const jdTexts = body?.jdTexts;

  if (Array.isArray(rawTexts)) {
    return rawTexts.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (Array.isArray(jdTexts)) {
    return jdTexts.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const stringPayload = rawTexts || jdTexts;
  if (typeof stringPayload !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(stringPayload);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch {
    // Fall through to simple delimiter-based split.
  }

  return stringPayload
    .split(/\n---\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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

export const uploadJDBatch = async (req, res, next) => {
  try {
    const candidateName = req.body?.name;
    const role = req.body?.role;
    const resumeSkills = parseResumeSkillsInput(req.body?.resumeSkills);
    const baseJobId = String(req.body?.jobId || "JD").trim();

    const files = Array.isArray(req.uploadedFiles) ? req.uploadedFiles : [];
    const textSources = parseBatchTextSources(req.body);

    if (files.length === 0 && textSources.length === 0) {
      throw new AppError(
        "Please upload one or more JD files or provide JD text entries",
        400,
      );
    }

    if (!resumeSkills.length) {
      throw new AppError("resumeSkills is required for JD batch comparison", 400);
    }

    info(`JD batch received: ${files.length} files and ${textSources.length} text entries`);

    const fileResults = await Promise.all(
      files.map(async (file, index) => {
        const result = await processJD(file, {
          candidateName,
          resumeSkills,
          jobId: `${baseJobId}-${index + 1}`,
          role,
        });

        return {
          sourceType: "file",
          sourceName: file.originalname || file.filename || `JD file ${index + 1}`,
          result,
        };
      }),
    );

    const textResults = await Promise.all(
      textSources.map(async (rawText, index) => {
        const result = await processJD(null, {
          rawText,
          candidateName,
          resumeSkills,
          jobId: `${baseJobId}-TEXT-${index + 1}`,
          role,
        });

        return {
          sourceType: "text",
          sourceName: `Pasted JD ${index + 1}`,
          result,
        };
      }),
    );

    const comparisons = [...fileResults, ...textResults].map((entry) => {
      const topMatch = Array.isArray(entry.result?.matchingJobs)
        ? entry.result.matchingJobs[0]
        : null;

      return {
        sourceType: entry.sourceType,
        sourceName: entry.sourceName,
        name: entry.result?.name,
        salary: entry.result?.salary || null,
        yearOfExperience: entry.result?.yearOfExperience ?? null,
        matchingScore: topMatch?.matchingScore ?? 0,
        job: topMatch,
        fullResult: entry.result,
      };
    });

    comparisons.sort((a, b) => b.matchingScore - a.matchingScore);

    res.status(200).json({
      success: true,
      totalJDs: comparisons.length,
      comparisons,
      bestMatch: comparisons[0] || null,
    });
  } catch (error) {
    next(error);
  }
};
