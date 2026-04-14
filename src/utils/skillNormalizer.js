const toLowerTrimmed = (value) => String(value).toLowerCase().trim();

const toVariationArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [value];
};

const uniqueNonEmpty = (values) => {
  const normalized = values
    .map(toLowerTrimmed)
    .filter((entry) => entry.length > 0);

  return [...new Set(normalized)];
};

export const normalizeSkills = (skillDictionary) => {
  if (!skillDictionary || typeof skillDictionary !== "object") {
    return {};
  }

  const normalizedDictionary = {};

  for (const [rawKey, rawVariations] of Object.entries(skillDictionary)) {
    const normalizedKey = toLowerTrimmed(rawKey);

    if (!normalizedKey) {
      continue;
    }

    const variations = toVariationArray(rawVariations);
    const merged = uniqueNonEmpty([normalizedKey, ...variations]);

    normalizedDictionary[normalizedKey] = merged;
  }

  return normalizedDictionary;
};
