import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAboutRole,
  extractJDSkillBuckets,
  extractSalary,
  extractYearsOfExperience,
} from "../src/utils/jdInfoExtractor.js";
import { normalizeSkills } from "../src/utils/skillNormalizer.js";

const skillDictionary = normalizeSkills({
  java: ["java"],
  python: ["python"],
  docker: ["docker"],
  react: ["react", "react.js"],
  postgresql: ["postgresql", "postgres"],
});

test("extractSalary returns labeled salary value", () => {
  const raw = "Role: Backend Developer\nCTC: 12 LPA\nLocation: Remote";
  assert.equal(extractSalary(raw), "12 LPA");
});

test("extractSalary returns null when salary text has no numeric value", () => {
  const raw = "Base salary is determined case-by-case.";
  assert.equal(extractSalary(raw), null);
});

test("extractYearsOfExperience handles ranges", () => {
  const raw = "We need 3-5 years of experience in backend development.";
  assert.equal(extractYearsOfExperience(raw), 4);
});

test("extractYearsOfExperience handles fresher", () => {
  const raw = "Entry-level role. Fresher candidates can apply.";
  assert.equal(extractYearsOfExperience(raw), 0);
});

test("extractAboutRole pulls content from role heading block", () => {
  const raw = [
    "About Role:",
    "Build and maintain reliable backend services for global users.",
    "Collaborate with product and platform teams.",
    "Required Skills:",
    "Java, Docker",
  ].join("\n");

  const about = extractAboutRole(raw);

  assert.ok(about?.includes("Build and maintain reliable backend services"));
  assert.ok(!about?.includes("Required Skills"));
});

test("extractJDSkillBuckets separates required and optional skills", () => {
  const cleaned = [
    "required skills:",
    "python, docker, postgresql",
    "optional skills:",
    "react",
  ].join("\n");

  const result = extractJDSkillBuckets(cleaned, skillDictionary);

  assert.deepEqual(result.requiredSkills.sort(), [
    "docker",
    "postgresql",
    "python",
  ]);
  assert.deepEqual(result.optionalSkills, ["react"]);
  assert.deepEqual(result.allSkills.sort(), [
    "docker",
    "postgresql",
    "python",
    "react",
  ]);
});
