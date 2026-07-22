import QRCode from "qrcode";

export function buildVerificationUrl(verificationId: string): string {
  const domain = process.env.QR_VERIFY_DOMAIN ?? "http://localhost:3000/verify";
  return `${domain.replace(/\/$/, "")}/${verificationId}`;
}

export async function generateQrPng(verificationId: string): Promise<Buffer> {
  const url = buildVerificationUrl(verificationId);
  return QRCode.toBuffer(url, { type: "png", margin: 1, width: 300 });
}
