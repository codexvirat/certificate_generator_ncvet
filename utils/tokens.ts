import { randomBytes, createHash } from "crypto";

/** Non-guessable verification token used in QR codes / verify URLs — never the sequential certificateNo. */
export function generateVerificationId(): string {
  return randomBytes(8).toString("base64url"); // ~11 chars, URL-safe
}

export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
