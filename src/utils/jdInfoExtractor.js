import { extractSkills } from "./skillExtractor.js";

const toNumber = (value) => Number.parseFloat(value);

const average = (a, b) => Number(((a + b) / 2).toFixed(2));

const unique = (items) => [...new Set(items)];

const cleanLine = (line) => String(line || "").trim();

const normalizeHeading = (line) =>
  cleanLine(line)
    .toLowerCase()
    .replace(/^[-*\u2022\d.)\s]+/, "")
    .replace(/[:\-]+$/, "")
    .trim();

const stripBullet = (line) =>
  cleanLine(line)
    .replace(/^[-*\u2022\d.)\s]+/, "")
    .trim();

const isLikelyHeading = (line) => {
  const normalized = normalizeHeading(line);

  if (!normalized) {
    return false;
  }

  return /^(about|role|job description|responsibilities|requirements|required|preferred|optional|must have|nice to have|skills)\b/.test(
    normalized,
  );
};

export const extractSalary = (rawText) => {
  const text = String(rawText || "");

  if (!text.trim()) {
    return null;
  }

  const lines = text.split(/\r?\n/);

  const salaryUnit =
    "(?:lpa|lakhs?|lakh per annum|per annum|pa|annum|k|thousand|million|crore)";

  const patterns = [
    new RegExp(
      `(?:salary|ctc|compensation|base\\s*salary)\\s*[:\\-]?\\s*(((?:₹|rs\\.?|inr)\\s*)?\\d[\\d,]*(?:\\.\\d+)?(?:\\s*(?:-|to)\\s*(?:₹|rs\\.?|inr)?\\s*\\d[\\d,]*(?:\\.\\d+)?)?(?:\\s*${salaryUnit})?)`,
      "i",
    ),
    new RegExp(
      `((?:₹|rs\\.?|inr)\\s*\\d[\\d,]*(?:\\.\\d+)?(?:\\s*(?:-|to)\\s*(?:₹|rs\\.?|inr)?\\s*\\d[\\d,]*(?:\\.\\d+)?)?(?:\\s*${salaryUnit})?)`,
      "i",
    ),
    new RegExp(
      `(\\d[\\d,]*(?:\\.\\d+)?(?:\\s*(?:-|to)\\s*\\d[\\d,]*(?:\\.\\d+)?)?\\s*${salaryUnit})`,
      "i",
    ),
  ];

  for (const line of lines) {
    if (
      !/salary|ctc|compensation|₹|\binr\b|\brs\.?\b|lpa|lakh|crore|annum|pa/i.test(
        line,
      )
    ) {
      continue;
    }

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const salary = cleanLine(match[1]);
        if (/\d/.test(salary)) {
          return salary;
        }
      }
    }
  }

  return null;
};

export const extractYearsOfExperience = (rawText) => {
  const text = String(rawText || "").toLowerCase();

  if (!text.trim()) {
    return null;
  }

  if (/\b(fresher|entry[-\s]?level|no experience)\b/.test(text)) {
    return 0;
  }

  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)/i,
    /(?:at\s+least|min(?:imum)?\s*)?(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i,
  ];

  for (const pattern of rangePatterns) {
    const rangeMatch = text.match(pattern);
    if (rangeMatch) {
      return average(toNumber(rangeMatch[1]), toNumber(rangeMatch[2]));
    }
  }

  const singlePatterns = [
    /(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i,
    /(?:experience|exp)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\b/i,
    /(?:at\s+least|min(?:imum)?\s*)(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)/i,
    /(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:in|with)\b/i,
  ];

  for (const pattern of singlePatterns) {
    const singleMatch = text.match(pattern);
    if (singleMatch) {
      return Number(toNumber(singleMatch[1]).toFixed(2));
    }
  }

  return null;
};

const extractSectionAfterHeading = (rawText, headingPattern) => {
  const text = String(rawText || "");
  const lines = text.split(/\r?\n/);
  const startIndex = lines.findIndex((line) =>
    headingPattern.test(normalizeHeading(line)),
  );

  if (startIndex < 0) {
    return "";
  }

  const sectionLines = [];

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = stripBullet(lines[i]);

    if (!line) {
      if (sectionLines.length > 0) {
        break;
      }
      continue;
    }

    if (sectionLines.length > 0 && isLikelyHeading(line)) {
      break;
    }

    sectionLines.push(line);

    if (sectionLines.length >= 6) {
      break;
    }
  }

  return sectionLines.join(" ");
};

export const extractAboutRole = (rawText) => {
  const text = String(rawText || "");

  if (!text.trim()) {
    return null;
  }

  const inlinePatterns = [
    /(?:about\s+the\s+role|about\s+role|role\s+overview|job\s+description|role\s+summary)\s*[:\-]\s*([^\n]+)/i,
    /(?:responsibilities|key\s+responsibilities|what\s+you\s+will\s+do)\s*[:\-]\s*([^\n]+)/i,
  ];

  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanLine(match[1]);
    }
  }

  const aboutRole = extractSectionAfterHeading(
    text,
    /^(about\s+role|role\s+overview|job\s+description|about\s+the\s+role|role\s+summary)\b/,
  );

  if (aboutRole) {
    return aboutRole;
  }

  const responsibilities = extractSectionAfterHeading(
    text,
    /^(responsibilities|key\s+responsibilities|what\s+you\s+will\s+do)\b/,
  );

  if (responsibilities) {
    return responsibilities;
  }

  const firstMeaningfulLine = text
    .split(/\r?\n/)
    .map(cleanLine)
    .find((line) => line.length >= 40);

  return firstMeaningfulLine || null;
};

const collectSectionBlock = (cleanedText, headingPattern) => {
  const lines = String(cleanedText || "").split("\n");
  const index = lines.findIndex((line) =>
    headingPattern.test(normalizeHeading(line)),
  );

  if (index < 0) {
    return "";
  }

  const collected = [];

  for (let i = index + 1; i < lines.length; i += 1) {
    const line = stripBullet(lines[i]);

    if (!line) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }

    if (collected.length > 0 && isLikelyHeading(line)) {
      break;
    }

    collected.push(line);

    if (collected.length >= 25) {
      break;
    }
  }

  return collected.join("\n");
};

export const extractJDSkillBuckets = (
  cleanedText,
  normalizedSkillDictionary,
) => {
  const allSkills = extractSkills(cleanedText, normalizedSkillDictionary);

  const requiredBlock = collectSectionBlock(
    cleanedText,
    /^(required\s+skills?|must\s+have|requirements?|qualifications)$/,
  );

  const optionalBlock = collectSectionBlock(
    cleanedText,
    /^(optional\s+skills?|preferred\s+skills?|nice\s+to\s+have|good\s+to\s+have)$/,
  );

  const extractedRequiredSkills = requiredBlock
    ? extractSkills(requiredBlock, normalizedSkillDictionary)
    : allSkills;

  const extractedOptionalSkills = optionalBlock
    ? extractSkills(optionalBlock, normalizedSkillDictionary)
    : [];

  const optionalSet = new Set(extractedOptionalSkills);
  const requiredSkills = extractedRequiredSkills.filter(
    (skill) => !optionalSet.has(skill),
  );

  return {
    allSkills: unique(allSkills),
    requiredSkills: unique(requiredSkills),
    optionalSkills: unique(extractedOptionalSkills),
  };
};
