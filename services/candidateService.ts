import { connectDB } from "@/lib/db";
import { Candidate, GENERATOR_WRITABLE_FIELDS } from "@/models/Candidate";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { AuditLog } from "@/models/AuditLog";
import { ACTIONS, assertCan, PermissionError } from "@/lib/permissions";
import { BATCH_STATUS, ROLES, type Role } from "@/lib/constants";

type Actor = { id: string; role: Role; organizationId: string | null };

/**
 * Loads the candidate's batch and verifies the actor is allowed to touch it:
 *  - GENERATOR_ADMIN must be the batch's assigned generator.
 *  - Batch must not be LOCKED (post-generation freeze, see spec's Batch Management policy).
 * Throws otherwise. This is the single choke point every generator-facing
 * write (photo upload, generate) must go through.
 */
async function loadWritableAssignmentForCandidate(candidateId: string, actor: Actor) {
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw new Error("Candidate not found");

  const assignment = await ExcelAssignment.findById(candidate.assignmentId);
  if (!assignment) throw new Error("Batch not found");

  if (String(assignment.organizationId) !== String(actor.organizationId) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new PermissionError("Candidate does not belong to your organization");
  }

  if (actor.role === ROLES.GENERATOR_ADMIN) {
    if (String(assignment.generatorId) !== String(actor.id)) {
      throw new PermissionError("This batch is not assigned to you");
    }
  }

  if (assignment.status === BATCH_STATUS.LOCKED) {
    throw new Error("Batch is locked -- no further changes are allowed");
  }

  return { candidate, assignment };
}

/**
 * GENERATOR_ADMIN's only write path onto Candidate. Never creates a document,
 * never touches name/course/certificateNo/etc -- only the photo fields.
 */
export async function uploadCandidatePhoto(params: {
  actor: Actor;
  candidateId: string;
  photoUrl: string;
}) {
  assertCan(params.actor.role, ACTIONS.UPLOAD_PHOTO);
  await connectDB();

  const { candidate, assignment } = await loadWritableAssignmentForCandidate(
    params.candidateId,
    params.actor
  );

  const updated = await Candidate.findOneAndUpdate(
    { _id: candidate._id, assignmentId: assignment._id },
    {
      $set: {
        photoUrl: params.photoUrl,
        photoUploadedAt: new Date(),
        photoUploadedBy: params.actor.id,
      } satisfies Partial<Record<(typeof GENERATOR_WRITABLE_FIELDS)[number], unknown>>,
    },
    { new: true, upsert: false }
  );

  await AuditLog.create({
    organizationId: assignment.organizationId,
    userId: params.actor.id,
    role: params.actor.role,
    action: "candidate.photo.upload",
    targetType: "Candidate",
    targetId: candidate._id,
  });

  return updated;
}

/**
 * GENERATOR_ADMIN's (and ORG_ADMIN/SUPER_ADMIN's, scoped) generate action.
 * Only sets generated/pdf metadata -- see services/certificateService.ts for
 * the actual PDF pipeline this wraps.
 */
export async function markCandidateGenerated(params: {
  actor: Actor;
  candidateId: string;
  pdfUrl: string;
  pdfVersion: number;
}) {
  assertCan(params.actor.role, ACTIONS.GENERATE_PDF);
  await connectDB();

  const { candidate, assignment } = await loadWritableAssignmentForCandidate(
    params.candidateId,
    params.actor
  );

  if (!candidate.photoUrl) {
    throw new Error("Cannot generate a certificate before a photo is uploaded");
  }

  const updated = await Candidate.findOneAndUpdate(
    { _id: candidate._id, assignmentId: assignment._id },
    {
      $set: {
        generated: true,
        generatedAt: new Date(),
        generatedBy: params.actor.id,
        pdfUrl: params.pdfUrl,
        pdfVersion: params.pdfVersion,
      } satisfies Partial<Record<(typeof GENERATOR_WRITABLE_FIELDS)[number], unknown>>,
    },
    { new: true, upsert: false }
  );

  assignment.generatedCount = await Candidate.countDocuments({
    assignmentId: assignment._id,
    generated: true,
  });
  await assignment.save();

  await AuditLog.create({
    organizationId: assignment.organizationId,
    userId: params.actor.id,
    role: params.actor.role,
    action: "certificate.generate",
    targetType: "Candidate",
    targetId: candidate._id,
    metadata: { pdfVersion: params.pdfVersion },
  });

  return updated;
}

/** ORG_ADMIN / SUPER_ADMIN only -- candidate data itself is otherwise read-only for everyone. */
export async function revokeCertificate(params: { actor: Actor; candidateId: string; reason: string }) {
  assertCan(params.actor.role, ACTIONS.REVOKE_CERTIFICATE);
  await connectDB();

  const candidate = await Candidate.findById(params.candidateId);
  if (!candidate) throw new Error("Candidate not found");
  if (
    params.actor.role !== ROLES.SUPER_ADMIN &&
    String(candidate.organizationId) !== String(params.actor.organizationId)
  ) {
    throw new PermissionError("Candidate does not belong to your organization");
  }

  candidate.revoked = true;
  candidate.revokedAt = new Date();
  candidate.revokedReason = params.reason;
  await candidate.save();

  await AuditLog.create({
    organizationId: candidate.organizationId,
    userId: params.actor.id,
    role: params.actor.role,
    action: "certificate.revoke",
    targetType: "Candidate",
    targetId: candidate._id,
    metadata: { reason: params.reason },
  });

  return candidate;
}
