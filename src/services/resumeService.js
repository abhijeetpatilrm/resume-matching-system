import { extractTextFromPDF } from "../parsers/pdfParser.js";
import { cleanText } from "../utils/textCleaner.js";
import { AppError } from "../utils/appError.js";
import { normalizeSkills } from "../utils/skillNormalizer.js";
import { extractSkills } from "../utils/skillExtractor.js";
import { saveResumeUpload } from "../database/mysql.js";
import skillsDictionary from "../../data/skills.json" with { type: "json" };

const normalizedSkillsDictionary = normalizeSkills(skillsDictionary);

const nameStopWords = new Set([
  "resume",
  "curriculum",
  "vitae",
  "summary",
  "objective",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "profile",
  "contact",
]);

const toTitleCase = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map(
      (part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`,
    )
    .join(" ");

const isLikelyNameLine = (line) => {
  if (!line || line.length < 4 || line.length > 60) {
    return false;
  }

  if (/[@\d]/.test(line)) {
    return false;
  }

  const normalized = line
    .replace(/[^a-zA-Z\s.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  const words = normalized.split(" ").filter(Boolean);

  if (words.length < 2 || words.length > 4) {
    return false;
  }

  if (words.some((word) => nameStopWords.has(word.toLowerCase()))) {
    return false;
  }

  if (words.some((word) => word.length < 2)) {
    return false;
  }

  return words.every((word) => /^[a-zA-Z.'-]+$/.test(word));
};

const extractNameFromFileName = (file) => {
  const sourceName = String(file?.originalname || file?.filename || "");
  const withoutExtension = sourceName.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z\s.'-]/g, " ")
    .trim();

  const words = normalized.split(" ").filter(Boolean);
  if (
    words.length >= 2 &&
    words.length <= 4 &&
    words.every((word) => word.length > 1)
  ) {
    return toTitleCase(words.join(" "));
  }

  return null;
};

const extractCandidateName = (rawText, file) => {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  const detectedLine = lines.find(isLikelyNameLine);
  if (detectedLine) {
    const normalized = detectedLine
      .replace(/[^a-zA-Z\s.'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return toTitleCase(normalized);
  }

  return extractNameFromFileName(file) || "Anonymous Candidate";
};

const validateUploadedFile = (file) => {
  if (!file || typeof file !== "object") {
    throw new AppError("Uploaded file object is required", 400);
  }

  if (!file.path) {
    throw new AppError("Uploaded file path is missing", 400);
  }
};

const parseRawResumeText = async (filePath) => {
  return extractTextFromPDF(filePath);
};

const normalizeResumeText = (rawText) => {
  return cleanText(rawText);
};

const extractResumeSkills = (cleanedText) => {
  return extractSkills(cleanedText, normalizedSkillsDictionary);
};

const buildResumePayload = ({
  candidateName,
  rawText,
  cleanedText,
  skills,
}) => {
  return {
    candidateName,
    rawText,
    cleanedText,
    skills,
  };
};

export const processResume = async (file) => {
  try {
    validateUploadedFile(file);

    const rawText = await parseRawResumeText(file.path);
    const cleanedText = normalizeResumeText(rawText);
    const skills = extractResumeSkills(cleanedText);
    const candidateName = extractCandidateName(rawText, file);
    const payload = buildResumePayload({
      candidateName,
      rawText,
      cleanedText,
      skills,
    });

    await saveResumeUpload({
      file,
      rawText,
      cleanedText,
      skills,
    }).catch(() => null);

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message = error?.message || "Unknown resume processing error";
    throw new AppError(`Failed to process resume: ${message}`, 500);
  }
};
