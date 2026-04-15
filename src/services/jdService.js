import fs from "fs/promises";
import { extractTextFromPDF } from "../parsers/pdfParser.js";
import { cleanText } from "../utils/textCleaner.js";
import { AppError } from "../utils/appError.js";
import { normalizeSkills } from "../utils/skillNormalizer.js";
import { extractSkills } from "../utils/skillExtractor.js";
import {
  calculateMatchingScore,
  matchSkills,
} from "../matchers/skillMatcher.js";
import {
  extractAboutRole,
  extractJDSkillBuckets,
  extractSalary,
  extractYearsOfExperience,
} from "../utils/jdInfoExtractor.js";
import { saveJDAnalysis } from "../database/mysql.js";
import { warn } from "../utils/logger.js";
import skillsDictionary from "../../data/skills.json" with { type: "json" };

const normalizedSkillsDictionary = normalizeSkills(skillsDictionary);
const DEFAULT_RESUME_SKILLS = [];
const DEFAULT_CANDIDATE_NAME = "Anonymous Candidate";
const DEFAULT_ROLE = "Unspecified Role";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const resolveJobId = (jobId) => {
  const normalized = normalizeNonEmptyString(jobId);

  if (normalized) {
    return normalized;
  }

  return `JD-AUTO-${Date.now()}`;
};

const validateUploadedFile = (file) => {
  if (!file || typeof file !== "object") {
    return;
  }

  if (!file.path) {
    throw new AppError("Uploaded file path is missing", 400);
  }
};

const parseTextFile = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath, "utf8");
  return String(fileBuffer || "");
};

const parseRawJDText = async ({ file, rawText }) => {
  if (typeof rawText === "string" && rawText.trim()) {
    return rawText;
  }

  if (!file || !file.path) {
    throw new AppError("JD text content or file is required", 400);
  }

  const fileName = String(
    file.originalname || file.filename || "",
  ).toLowerCase();
  const fileExtension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf("."))
    : "";

  if (
    file.mimetype === "text/plain" ||
    file.mimetype === "text/markdown" ||
    fileExtension === ".txt" ||
    fileExtension === ".md"
  ) {
    return parseTextFile(file.path);
  }

  return extractTextFromPDF(file.path);
};

const normalizeJDText = (rawText) => {
  return cleanText(rawText);
};

const extractJDSkills = (cleanedText) => {
  return extractSkills(cleanedText, normalizedSkillsDictionary);
};

const extractJDMetadata = (rawText) => {
  return {
    salary: extractSalary(rawText),
    yearOfExperience: extractYearsOfExperience(rawText),
    aboutRole: extractAboutRole(rawText),
  };
};

const extractJDSkillData = (cleanedText) => {
  return extractJDSkillBuckets(cleanedText, normalizedSkillsDictionary);
};

const analyzeSkillMatch = (resumeSkills, jdSkills) => {
  return matchSkills(resumeSkills, jdSkills);
};

const normalizeResumeSkillsInput = (resumeSkills) => {
  if (!Array.isArray(resumeSkills)) {
    return [];
  }

  const normalized = resumeSkills
    .map((skill) => String(skill).toLowerCase().trim())
    .filter((skill) => skill.length > 0);

  return [...new Set(normalized)];
};

const buildJDPayload = ({
  candidateName,
  salary,
  yearOfExperience,
  resumeSkills,
  jobId,
  role,
  aboutRole,
  requiredSkills,
  optionalSkills,
  skillsAnalysis,
  matchingScore,
}) => {
  return {
    name: candidateName,
    salary,
    yearOfExperience,
    resumeSkills,
    matchingJobs: [
      {
        jobId,
        role,
        aboutRole,
        requiredSkills,
        optionalSkills,
        skillsAnalysis,
        matchingScore,
      },
    ],
  };
};

export const processJD = async (
  file,
  {
    rawText = "",
    candidateName,
    resumeSkills = DEFAULT_RESUME_SKILLS,
    jobId,
    role,
  } = {},
) => {
  try {
    validateUploadedFile(file);

    const resolvedCandidateName =
      normalizeNonEmptyString(candidateName) || DEFAULT_CANDIDATE_NAME;
    const resolvedJobId = resolveJobId(jobId);
    const resolvedRole = normalizeNonEmptyString(role) || DEFAULT_ROLE;

    const jdRawText = await parseRawJDText({ file, rawText });
    const sourceLabel = rawText?.trim()
      ? "text"
      : file?.mimetype === "text/plain" || file?.mimetype === "text/markdown"
        ? "text-file"
        : "file";
    const cleanedText = normalizeJDText(jdRawText);
    const { salary, yearOfExperience, aboutRole } =
      extractJDMetadata(jdRawText);
    const { allSkills, requiredSkills, optionalSkills } =
      extractJDSkillData(cleanedText);
    const jdSkills =
      allSkills.length > 0 ? allSkills : extractJDSkills(cleanedText);
    const normalizedResumeSkills = normalizeResumeSkillsInput(resumeSkills);
    const skillsAnalysis = analyzeSkillMatch(normalizedResumeSkills, jdSkills);
    const matchingScore = calculateMatchingScore(skillsAnalysis);

    const payload = buildJDPayload({
      candidateName: resolvedCandidateName,
      salary,
      yearOfExperience,
      resumeSkills: normalizedResumeSkills,
      jobId: resolvedJobId,
      role: resolvedRole,
      aboutRole,
      requiredSkills,
      optionalSkills,
      skillsAnalysis,
      matchingScore,
    });

    await saveJDAnalysis({
      file,
      result: payload,
      source: {
        candidateName: resolvedCandidateName,
        jobId: resolvedJobId,
        role: resolvedRole,
        rawText: jdRawText,
        cleanedText,
        sourceType: sourceLabel,
      },
    }).catch((error) => {
      warn(
        `JD persistence skipped: ${error?.message || String(error || "Unknown DB persistence error")}`,
      );
      return null;
    });

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message = error?.message || "Unknown JD processing error";
    throw new AppError(`Failed to process JD: ${message}`, 500);
  }
};
