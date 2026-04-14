import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

export const extractTextFromPDF = async (filePath) => {
  let parser;

  try {
    const fileBuffer = await fs.readFile(filePath);
    parser = new PDFParse({ data: fileBuffer });
    const parsed = await parser.getText();

    return parsed?.text ?? "";
  } catch (error) {
    const message = error?.message || "Unknown parsing error";
    throw new Error(`Failed to extract text from PDF at '${filePath}': ${message}`);
  } finally {
    if (parser?.destroy) {
      await parser.destroy();
    }
  }
};