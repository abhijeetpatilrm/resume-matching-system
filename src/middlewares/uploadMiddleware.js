import fs from "fs";
import path from "path";
import multer from "multer";

import { AppError } from "../utils/appError.js";
import { info } from "../utils/logger.js";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const UPLOADS_DIRECTORY = path.join(process.cwd(), "uploads");

const ensureUploadsDirectory = () => {
  if (!fs.existsSync(UPLOADS_DIRECTORY)) {
    fs.mkdirSync(UPLOADS_DIRECTORY, { recursive: true });
  }
};

const sanitizeFileName = (fileName) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const buildUniqueFileName = (originalName, fallbackExtension = ".pdf") => {
  const timestamp = Date.now();
  const parsed = path.parse(originalName || "file.pdf");
  const safeBaseName = sanitizeFileName(parsed.name || "file");
  const safeExtension = parsed.ext || fallbackExtension;

  return `${timestamp}-${safeBaseName}${safeExtension}`;
};

const createFileFilter =
  ({ allowTextFiles = false } = {}) =>
  (req, file, callback) => {
    const fileExtension = path.extname(file.originalname || "").toLowerCase();

    const isPdfMimeType =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/x-pdf";

    const isPdfExtension = fileExtension === ".pdf";

    const isTextMimeType =
      file.mimetype === "text/plain" ||
      file.mimetype === "text/markdown" ||
      file.mimetype === "application/plain";

    const isTextExtension = fileExtension === ".txt" || fileExtension === ".md";

    if (
      allowTextFiles &&
      ((isPdfMimeType && isPdfExtension) || (isTextMimeType && isTextExtension))
    ) {
      return callback(null, true);
    }

    if (!isPdfMimeType || !isPdfExtension) {
      return callback(new AppError("Only PDF files are allowed", 400));
    }

    callback(null, true);
  };

ensureUploadsDirectory();

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOADS_DIRECTORY);
  },
  filename: (req, file, callback) => {
    callback(null, buildUniqueFileName(file.originalname));
  },
});

const createUploadHandler = ({
  allowTextFiles = false,
  requireFile = true,
  fieldNames = ["file"],
  maxCountPerField = 1,
} = {}) => {
  const allowedFieldNames =
    Array.isArray(fieldNames) && fieldNames.length
      ? [...new Set(fieldNames)]
      : ["file"];

  const multerUpload = multer({
    storage,
    fileFilter: createFileFilter({ allowTextFiles }),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  }).fields(
    allowedFieldNames.map((name) => ({ name, maxCount: maxCountPerField })),
  );

  return (req, res, next) => {
    multerUpload(req, res, (error) => {
      if (error) {
        if (error instanceof AppError) return next(error);

        if (
          error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE"
        ) {
          return next(new AppError("File size must not exceed 2MB", 413));
        }

        return next(new AppError(error.message || "File upload failed", 500));
      }

      const uploadedFiles = allowedFieldNames.flatMap(
        (fieldName) => req.files?.[fieldName] || [],
      );

      const uploadedFile = uploadedFiles[0] || null;

      if (uploadedFiles.length > 0) {
        req.uploadedFiles = uploadedFiles;
      }

      if (uploadedFile) {
        req.file = uploadedFile;
      }

      if (requireFile && !req.file) {
        return next(new AppError("No file uploaded", 400));
      }

      if (req.file) {
        info(`File uploaded: ${req.file.filename}`);
      }

      next();
    });
  };
};

const upload = createUploadHandler({
  allowTextFiles: false,
  requireFile: true,
  fieldNames: ["file", "resume"],
});

export const uploadJdSource = createUploadHandler({
  allowTextFiles: true,
  requireFile: false,
  fieldNames: ["file", "jd"],
});

export const uploadMultipleJdSources = createUploadHandler({
  allowTextFiles: true,
  requireFile: false,
  fieldNames: ["files", "jds", "file", "jd"],
  maxCountPerField: 20,
});

export default upload;
