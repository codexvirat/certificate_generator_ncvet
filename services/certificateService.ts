import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { generateQrPng, buildVerificationUrl } from "@/services/qrService";
import type { CandidateDoc } from "@/models/Candidate";
import type { CertificateTemplateDoc } from "@/models/CertificateTemplate";
import { sha256 } from "@/utils/tokens";

// Fields available for {{KEY}} substitution in a template's textFields.
function fieldValue(key: string, candidate: CandidateDoc): string {
  const formatDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "";

  switch (key) {
    case "NAME":
      return candidate.name;
    case "FATHER_NAME":
      return candidate.fatherName ?? "";
    case "COURSE":
      return candidate.course;
    case "DURATION":
      return candidate.duration ?? "";
    case "GRADE":
      return candidate.grade ?? "";
    case "CERTIFICATE_NO":
      return candidate.certificateNo;
    case "START_DATE":
      return formatDate(candidate.startDate);
    case "END_DATE":
      return formatDate(candidate.endDate);
    case "ISSUE_DATE":
      return formatDate(candidate.issueDate);
    default:
      return "";
  }
}

async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch asset: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function embedImageAuto(pdfDoc: PDFDocument, bytes: Buffer) {
  // Normalize to PNG so pdf-lib can embed regardless of source format (jpg/webp/etc).
  const png = await sharp(bytes).png().toBuffer();
  return pdfDoc.embedPng(png);
}

export async function generateCertificatePdf(params: {
  template: CertificateTemplateDoc;
  candidate: CandidateDoc;
}): Promise<{ pdfBytes: Uint8Array; hash: string; verificationUrl: string }> {
  const { template, candidate } = params;
  if (!candidate.photoUrl) throw new Error("Candidate has no uploaded photo");

  const pdfDoc = await PDFDocument.create();
  const backgroundBytes = await fetchBytes(template.background);
  const backgroundImage = await embedImageAuto(pdfDoc, backgroundBytes);
  const { width, height } = backgroundImage.scale(1);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(backgroundImage, { x: 0, y: 0, width, height });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (const field of template.textFields) {
    const text = fieldValue(field.key, candidate);
    if (!text) continue;
    const fontSize = field.fontSize ?? 16;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = field.x;
    if (field.align === "center") x = field.x - textWidth / 2;
    if (field.align === "right") x = field.x - textWidth;

    const hex = (field.fontColor ?? "#000000").replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    page.drawText(text, { x, y: field.y, size: fontSize, font, color: rgb(r, g, b) });
  }

  // Candidate photo, cropped to the template's declared box.
  const photoBytes = await fetchBytes(candidate.photoUrl);
  const photoW = Math.round(template.photoPosition.width ?? 120);
  const photoH = Math.round(template.photoPosition.height ?? 150);
  const croppedPhoto = await sharp(photoBytes)
    .resize(photoW * 2, photoH * 2, { fit: "cover" }) // 2x for print sharpness
    .png()
    .toBuffer();
  const photoImage = await pdfDoc.embedPng(croppedPhoto);
  page.drawImage(photoImage, {
    x: template.photoPosition.x,
    y: template.photoPosition.y,
    width: photoW,
    height: photoH,
  });

  // QR code -> non-guessable verification URL, never raw candidate data.
  const qrBytes = await generateQrPng(candidate.verificationId);
  const qrImage = await pdfDoc.embedPng(qrBytes);
  const qrSize = template.qrPosition.size ?? 80;
  page.drawImage(qrImage, {
    x: template.qrPosition.x,
    y: template.qrPosition.y,
    width: qrSize,
    height: qrSize,
  });

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    hash: sha256(Buffer.from(pdfBytes)),
    verificationUrl: buildVerificationUrl(candidate.verificationId),
  };
}
