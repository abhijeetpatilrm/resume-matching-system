const toLowerCase = (text) => text.toLowerCase();

const normalizeLineBreaks = (text) => text.replace(/\r\n?|\n/g, "\n");

const removeUnwantedCharacters = (text) =>
  text.replace(/[^a-z0-9\s.,+#]/g, " ");

const removeExtraSpaces = (text) => text.replace(/[ \t]+/g, " ");

const normalizeLineSpacing = (text) => text.replace(/ *\n+ */g, "\n");

export const cleanText = (text) => {
  if (typeof text !== "string") {
    return "";
  }

  let cleaned = text;

  cleaned = toLowerCase(cleaned);
  cleaned = normalizeLineBreaks(cleaned);
  cleaned = removeUnwantedCharacters(cleaned);
  cleaned = removeExtraSpaces(cleaned);
  cleaned = normalizeLineSpacing(cleaned);

  return cleaned.trim();
};
