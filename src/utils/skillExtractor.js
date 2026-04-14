const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildBoundaryRegex = (variation) => {
  const escapedVariation = escapeRegExp(variation.trim());

  // Use non-word boundaries on both sides to avoid partial matches.
  return new RegExp(`(^|[^a-z0-9])${escapedVariation}([^a-z0-9]|$)`, "i");
};

const hasVariationMatch = (text, variation) => {
  if (!variation || !variation.trim()) {
    return false;
  }

  const matcher = buildBoundaryRegex(variation.toLowerCase());
  return matcher.test(text);
};

export const extractSkills = (text, skillDictionary) => {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  if (!skillDictionary || typeof skillDictionary !== "object") {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const matchedSkills = new Set();

  for (const [skill, variations] of Object.entries(skillDictionary)) {
    const variationList = Array.isArray(variations) ? variations : [variations];

    for (const variation of variationList) {
      if (hasVariationMatch(normalizedText, String(variation).toLowerCase())) {
        matchedSkills.add(skill.toLowerCase());
        break;
      }
    }
  }

  return [...matchedSkills];
};
