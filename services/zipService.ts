import { ZipArchive } from "archiver";
import type { CandidateDoc } from "@/models/Candidate";

/** Streams a ZIP of each candidate's generated PDF, fetched from local storage. */
export async function buildCertificatesZip(
  candidates: Array<Pick<CandidateDoc, "certificateNo" | "pdfUrl">>
): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  for (const candidate of candidates) {
    if (!candidate.pdfUrl) continue;
    const res = await fetch(candidate.pdfUrl);
    if (!res.ok) continue;
    const bytes = Buffer.from(await res.arrayBuffer());
    archive.append(bytes, { name: `${candidate.certificateNo}.pdf` });
  }

  await archive.finalize();
  await done;
  return Buffer.concat(chunks);
}
