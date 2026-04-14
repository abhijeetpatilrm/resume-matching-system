import { extractTextFromPDF } from "../parsers/pdfParser.js";
import { cleanText } from "../utils/textCleaner.js";
import { AppError } from "../utils/appError.js";
import { normalizeSkills } from "../utils/skillNormalizer.js";
import { extractSkills } from "../utils/skillExtractor.js";
import { saveResumeUpload } from "../database/mysql.js";
import skillsDictionary from "../../data/skills.json" with { type: "json" };

const normalizedSkillsDictionary = normalizeSkills(skillsDictionary);

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

const buildResumePayload = ({ rawText, cleanedText, skills }) => {
  return {
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
    const payload = buildResumePayload({ rawText, cleanedText, skills });

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
