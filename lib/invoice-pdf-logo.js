import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** PNG public → JPEG optimisé pour pdfkit (Node). */
export async function prepareLogoForPdf(logoBuffer) {
  if (!logoBuffer?.length) return null;
  try {
    return await sharp(logoBuffer).resize(160).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return null;
  }
}

export async function loadCvneatInvoiceLogoForPdf() {
  try {
    const raw = await readFile(path.join(process.cwd(), 'public', 'cvneat-logo.png'));
    return prepareLogoForPdf(raw);
  } catch {
    return null;
  }
}
