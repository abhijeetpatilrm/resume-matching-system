import { env } from "../config/env.js";
import { info, warn } from "../utils/logger.js";

let pool;
let initializationAttempted = false;
let databaseEnabled = false;
let mysqlImportPromise;

const isConfigured = () =>
  Boolean(env.mysql.host && env.mysql.user && env.mysql.database);

const formatMySqlError = (error) => {
  if (!error) {
    return "Unknown error";
  }

  const details = [];

  if (error.code) {
    details.push(`code=${error.code}`);
  }

  if (error.errno !== undefined) {
    details.push(`errno=${error.errno}`);
  }

  if (error.sqlState) {
    details.push(`sqlState=${error.sqlState}`);
  }

  if (error.message) {
    details.push(`message=${error.message}`);
  }

  if (details.length === 0) {
    return String(error);
  }

  return details.join(", ");
};

const loadMysql = async () => {
  if (!mysqlImportPromise) {
    mysqlImportPromise = import("mysql2/promise").catch(() => null);
  }

  return mysqlImportPromise;
};

const getPool = async () => {
  if (!isConfigured()) {
    return null;
  }

  if (pool) {
    return pool;
  }

  const mysql = await loadMysql();

  if (!mysql?.createPool) {
    return null;
  }

  pool = mysql.createPool({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    database: env.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  });

  return pool;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS resume_uploads (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    raw_text LONGTEXT NOT NULL,
    cleaned_text LONGTEXT NOT NULL,
    skills_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS jd_analyses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_type VARCHAR(30) NOT NULL DEFAULT 'file',
    original_filename VARCHAR(255) NULL,
    stored_filename VARCHAR(255) NULL,
    file_path VARCHAR(1024) NULL,
    candidate_name VARCHAR(255) NOT NULL,
    job_id VARCHAR(120) NOT NULL,
    role VARCHAR(255) NOT NULL,
    salary VARCHAR(255) NULL,
    year_of_experience DECIMAL(5,2) NULL,
    about_role LONGTEXT NULL,
    raw_text LONGTEXT NOT NULL,
    cleaned_text LONGTEXT NOT NULL,
    resume_skills_json JSON NOT NULL,
    required_skills_json JSON NOT NULL,
    optional_skills_json JSON NOT NULL,
    all_skills_json JSON NOT NULL,
    skills_analysis_json JSON NOT NULL,
    matching_score DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export const initializeMySql = async () => {
  if (!isConfigured()) {
    warn("MySQL is not configured; database persistence is disabled.");
    return false;
  }

  if (initializationAttempted && databaseEnabled) {
    return true;
  }

  initializationAttempted = true;

  const connectionPool = await getPool();

  if (!connectionPool) {
    warn("MySQL package is unavailable; database persistence is disabled.");
    return false;
  }

  let connection;

  try {
    connection = await connectionPool.getConnection();

    for (const statement of schemaStatements) {
      await connectionPool.execute(statement);
    }

    databaseEnabled = true;
    info("MySQL persistence initialized successfully.");
    return true;
  } catch (error) {
    databaseEnabled = false;
    warn(`MySQL persistence unavailable: ${formatMySqlError(error)}`);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const isMySqlEnabled = () => databaseEnabled;

export const saveResumeUpload = async ({
  file,
  rawText,
  cleanedText,
  skills,
}) => {
  if (!databaseEnabled || !file) {
    return null;
  }

  const connectionPool = await getPool();

  if (!connectionPool) {
    return null;
  }

  const [result] = await connectionPool.execute(
    `INSERT INTO resume_uploads (
      original_filename,
      stored_filename,
      file_path,
      raw_text,
      cleaned_text,
      skills_json
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      file.originalname || file.filename,
      file.filename,
      file.path,
      rawText,
      cleanedText,
      JSON.stringify(skills || []),
    ],
  );

  return {
    id: result.insertId,
    originalFilename: file.originalname || file.filename,
    storedFilename: file.filename,
  };
};

export const saveJDAnalysis = async ({ file, result, source }) => {
  if (!databaseEnabled || !result) {
    return null;
  }

  const connectionPool = await getPool();

  if (!connectionPool) {
    return null;
  }
  const job = Array.isArray(result.matchingJobs)
    ? result.matchingJobs[0]
    : null;

  const [dbResult] = await connectionPool.execute(
    `INSERT INTO jd_analyses (
      source_type,
      original_filename,
      stored_filename,
      file_path,
      candidate_name,
      job_id,
      role,
      salary,
      year_of_experience,
      about_role,
      raw_text,
      cleaned_text,
      resume_skills_json,
      required_skills_json,
      optional_skills_json,
      all_skills_json,
      skills_analysis_json,
      matching_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      source?.sourceType || "file",
      file?.originalname || file?.filename || null,
      file?.filename || null,
      file?.path || null,
      result.name ||
        source?.candidateName ||
        "Candidate Name (optional for now)",
      job?.jobId || source?.jobId || "JD001",
      job?.role || source?.role || "Software Engineer",
      result.salary || null,
      result.yearOfExperience ?? null,
      job?.aboutRole || null,
      source?.rawText || "",
      source?.cleanedText || "",
      JSON.stringify(result.resumeSkills || []),
      JSON.stringify(job?.requiredSkills || []),
      JSON.stringify(job?.optionalSkills || []),
      JSON.stringify(job?.skillsAnalysis?.map((entry) => entry.skill) || []),
      JSON.stringify(job?.skillsAnalysis || []),
      job?.matchingScore ?? 0,
    ],
  );

  return {
    id: dbResult.insertId,
    jobId: job?.jobId || source?.jobId || "JD001",
  };
};
