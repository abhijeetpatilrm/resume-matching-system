const normalizeSkill = (skill) => String(skill).toLowerCase().trim();

const uniqueNormalizedSkills = (skills) => {
  if (!Array.isArray(skills)) {
    return [];
  }

  const normalized = skills
    .map(normalizeSkill)
    .filter((skill) => skill.length > 0);

  return [...new Set(normalized)];
};

export const matchSkills = (resumeSkills, jdSkills) => {
  const uniqueResumeSkills = uniqueNormalizedSkills(resumeSkills);
  const uniqueJDSkills = uniqueNormalizedSkills(jdSkills);

  const resumeSkillSet = new Set(uniqueResumeSkills);

  return uniqueJDSkills.map((skill) => ({
    skill,
    presentInResume: resumeSkillSet.has(skill),
  }));
};

export const calculateMatchingScore = (skillAnalysis) => {
  if (!Array.isArray(skillAnalysis) || skillAnalysis.length === 0) {
    return 0;
  }

  const totalJDSkills = skillAnalysis.length;
  const matchedSkills = skillAnalysis.filter(
    (entry) => entry && entry.presentInResume === true,
  ).length;

  return Number(((matchedSkills / totalJDSkills) * 100).toFixed(2));
};
