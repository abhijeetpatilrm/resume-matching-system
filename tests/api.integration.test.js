import { test } from "node:test";
import assert from "node:assert";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readdirSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import services and utilities
import { processResume } from "../src/services/resumeService.js";
import { processJD } from "../src/services/jdService.js";
import { matchSkills, calculateMatchingScore } from "../src/matchers/skillMatcher.js";
import { extractSkills } from "../src/utils/skillExtractor.js";
import { cleanText } from "../src/utils/textCleaner.js";

// Load skill dictionary
const skillDictPath = path.join(__dirname, "../data/skills.json");
const skillDictData = JSON.parse(readFileSync(skillDictPath, "utf-8"));

/**
 * Integration Tests for Resume Matching System
 * Tests the complete processing pipeline and core matching logic
 */

// Helper function to find real PDF files in uploads directory
function findRealPDF(pattern) {
  const uploadsDir = path.join(__dirname, "../uploads");
  if (!existsSync(uploadsDir)) return null;

  const files = readdirSync(uploadsDir);
  const matching = files.filter((f) => pattern.test(f) && f.endsWith(".pdf"));
  if (matching.length > 0) {
    return path.join(uploadsDir, matching[0]);
  }
  return null;
}

test("Unit: Skill Extraction - extractSkills identifies skills from text", (t) => {
  const testText =
    "5+ years experience with Python, Java, and Docker technologies. Expert in PostgreSQL";
  const skills = extractSkills(testText, skillDictData);

  assert.ok(Array.isArray(skills), "extractSkills returns an array");
  assert.ok(skills.length > 0, "Extracted some skills from text");

  // Verify normalization
  skills.forEach((skill) => {
    assert.strictEqual(skill, skill.toLowerCase(), `Skill "${skill}" is lowercase`);
  });
});

test("Unit: Text Cleaning - cleanText normalizes PDF text properly", (t) => {
  const messyText = "  HELLO  \n\n  World  \t\t  TEST  ";
  const cleaned = cleanText(messyText);

  assert.ok(/hello/.test(cleaned), "Text converted to lowercase");
  assert.ok(cleaned.length > 0, "Output not empty");
});

test("Unit: Skill Matching - matchSkills analyzes skill presence correctly", (t) => {
  const resumeSkills = ["python", "docker", "postgresql"];
  const jdSkills = ["python", "postgresql", "kubernetes", "aws"];

  const analysis = matchSkills(resumeSkills, jdSkills);

  assert.strictEqual(analysis.length, jdSkills.length, "Analysis includes all JD skills");

  analysis.forEach((item) => {
    assert.ok(item.skill, "Item has skill");
    assert.strictEqual(typeof item.presentInResume, "boolean", "Has boolean flag");
  });

  // Verify correctness
  assert.ok(analysis.find((s) => s.skill === "python").presentInResume, "Python present");
  assert.ok(!analysis.find((s) => s.skill === "kubernetes").presentInResume, "Kubernetes absent");
});

test("Unit: Score Calculation - correct formula (matched/total)*100", (t) => {
  const skillAnalysis = [
    { skill: "python", presentInResume: true },
    { skill: "docker", presentInResume: true },
    { skill: "kubernetes", presentInResume: false },
  ];

  const score = calculateMatchingScore(skillAnalysis);
  const expectedScore = 66.67;

  assert.strictEqual(score.toFixed(2), expectedScore.toFixed(2), "Score matches formula");
  assert.ok(score >= 0 && score <= 100, "Score in valid range");
});

test("Unit: Score Calculation - edge case 0 matched", (t) => {
  const skillAnalysis = [
    { skill: "python", presentInResume: false },
    { skill: "docker", presentInResume: false },
  ];

  assert.strictEqual(calculateMatchingScore(skillAnalysis), 0, "Score is 0");
});

test("Unit: Score Calculation - edge case all matched", (t) => {
  const skillAnalysis = [
    { skill: "python", presentInResume: true },
    { skill: "docker", presentInResume: true },
  ];

  assert.strictEqual(calculateMatchingScore(skillAnalysis), 100, "Score is 100");
});

test("Unit: Score Calculation - empty analysis", (t) => {
  assert.strictEqual(calculateMatchingScore([]), 0, "Score is 0 for empty");
});

test("Integration: processResume error handling with invalid path", async (t) => {
  const invalidFile = {
    path: "/nonexistent/file.pdf",
    mimetype: "application/pdf",
    filename: "fake.pdf",
  };

  try {
    await processResume(invalidFile);
    assert.fail("Should throw");
  } catch (error) {
    assert.ok(error.message, "Error has message");
  }
});

test("Integration: processJD error handling with invalid path", async (t) => {
  const invalidFile = {
    path: "/nonexistent/file.pdf",
    mimetype: "application/pdf",
    filename: "fake.pdf",
  };

  try {
    await processJD(invalidFile, {
      candidateName: "Test",
      resumeSkills: ["python"],
      jobId: "JD_TEST",
      role: "Developer",
    });
    assert.fail("Should throw");
  } catch (error) {
    assert.ok(error.message, "Error has message");
  }
});

// Real file integration tests (conditional)
const jdPdfPath = findRealPDF(/Job|JD|job|Description|formatted/i);
const resumePdfPath = findRealPDF(/Resume|resume|ABHIJEET|Patil|CV|cv/i);

if (jdPdfPath) {
  test("Integration: processJD with real PDF returns all required fields", async (t) => {
    const params = {
      candidateName: "Test User",
      resumeSkills: ["python", "java"],
      jobId: "JD_001",
      role: "Backend Dev",
    };

    const result = await processJD(
      {
        path: jdPdfPath,
        mimetype: "application/pdf",
        filename: path.basename(jdPdfPath),
      },
      params
    );

    // Verify schema
    assert.strictEqual(result.name, params.candidateName);
    assert.ok(result.hasOwnProperty("salary"));
    assert.strictEqual(typeof result.yearOfExperience, "number");
    assert.ok(Array.isArray(result.resumeSkills));
    assert.ok(Array.isArray(result.matchingJobs));

    if (result.matchingJobs.length > 0) {
      const job = result.matchingJobs[0];
      assert.ok(job.jobId);
      assert.ok(job.role);
      assert.ok(job.aboutRole);
      assert.ok(Array.isArray(job.requiredSkills));
      assert.ok(Array.isArray(job.optionalSkills));
      assert.ok(Array.isArray(job.skillsAnalysis));
      assert.strictEqual(typeof job.matchingScore, "number");
      assert.ok(job.matchingScore >= 0 && job.matchingScore <= 100);
    }
  });
} else {
  test.skip("Integration: real JD PDF tests", () => {});
}

if (resumePdfPath) {
  test("Integration: processResume with real PDF returns skills", async (t) => {
    const result = await processResume({
      path: resumePdfPath,
      mimetype: "application/pdf",
      filename: path.basename(resumePdfPath),
    });

    assert.ok(result);
    assert.ok(Array.isArray(result.skills));
    assert.ok(result.rawText);
    assert.ok(result.cleanedText);

    if (result.skills.length > 0) {
      result.skills.forEach((skill) => {
        assert.strictEqual(skill, skill.toLowerCase());
        assert.strictEqual(skill, skill.trim());
      });
    }
  });
} else {
  test.skip("Integration: real resume PDF tests", () => {});
}
