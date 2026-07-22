import { ROLES, type Role } from "@/lib/constants";

// Mirrors the permission matrix from the spec. This is the single source of
// truth for "can this role do this action" checks used by API routes and UI.
export const ACTIONS = {
  CREATE_ORGANIZATION: "CREATE_ORGANIZATION",
  CREATE_ORG_ADMIN: "CREATE_ORG_ADMIN",
  CREATE_GENERATOR: "CREATE_GENERATOR",
  UPLOAD_TEMPLATE: "UPLOAD_TEMPLATE",
  UPLOAD_EXCEL: "UPLOAD_EXCEL",
  ASSIGN_EXCEL: "ASSIGN_EXCEL",
  CREATE_CANDIDATE: "CREATE_CANDIDATE",
  EDIT_CANDIDATE: "EDIT_CANDIDATE",
  UPLOAD_PHOTO: "UPLOAD_PHOTO",
  GENERATE_PDF: "GENERATE_PDF",
  DOWNLOAD_ZIP: "DOWNLOAD_ZIP",
  VERIFY_CERTIFICATE: "VERIFY_CERTIFICATE",
  REVOKE_CERTIFICATE: "REVOKE_CERTIFICATE",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// true = allowed, false = never allowed, "own-batch" = allowed but must be
// scoped to the caller's own assigned/organization data (enforced in services).
type Grant = boolean | "own-batch";

const MATRIX: Record<Role, Partial<Record<Action, Grant>>> = {
  [ROLES.SUPER_ADMIN]: {
    CREATE_ORGANIZATION: true,
    CREATE_ORG_ADMIN: true,
    CREATE_GENERATOR: true,
    UPLOAD_TEMPLATE: true,
    UPLOAD_EXCEL: true,
    ASSIGN_EXCEL: true,
    CREATE_CANDIDATE: false, // candidates only ever come from Excel import, never manual entry
    EDIT_CANDIDATE: false,
    UPLOAD_PHOTO: false,
    GENERATE_PDF: true,
    DOWNLOAD_ZIP: true,
    VERIFY_CERTIFICATE: true,
    REVOKE_CERTIFICATE: true,
    VIEW_AUDIT_LOGS: true,
  },
  [ROLES.ORG_ADMIN]: {
    CREATE_ORGANIZATION: false,
    CREATE_ORG_ADMIN: false,
    CREATE_GENERATOR: "own-batch", // scoped to their own organization
    UPLOAD_TEMPLATE: "own-batch",
    UPLOAD_EXCEL: "own-batch",
    ASSIGN_EXCEL: "own-batch",
    CREATE_CANDIDATE: false, // even Org Admin doesn't hand-create candidates -- import only
    EDIT_CANDIDATE: false,
    UPLOAD_PHOTO: false,
    GENERATE_PDF: "own-batch",
    DOWNLOAD_ZIP: "own-batch",
    VERIFY_CERTIFICATE: true,
    REVOKE_CERTIFICATE: "own-batch",
    VIEW_AUDIT_LOGS: "own-batch",
  },
  [ROLES.GENERATOR_ADMIN]: {
    // Deliberately the most restricted role -- see lib/constants.ts and
    // models/Candidate.ts GENERATOR_WRITABLE_FIELDS.
    CREATE_ORGANIZATION: false,
    CREATE_ORG_ADMIN: false,
    CREATE_GENERATOR: false,
    UPLOAD_TEMPLATE: false,
    UPLOAD_EXCEL: false,
    ASSIGN_EXCEL: false,
    CREATE_CANDIDATE: false,
    EDIT_CANDIDATE: false,
    UPLOAD_PHOTO: "own-batch",
    GENERATE_PDF: "own-batch",
    DOWNLOAD_ZIP: "own-batch",
    VERIFY_CERTIFICATE: true, // read-only, public verify page uses this too
    REVOKE_CERTIFICATE: false,
    VIEW_AUDIT_LOGS: false,
  },
};

export function can(role: Role, action: Action): boolean {
  return Boolean(MATRIX[role]?.[action]);
}

/** True only for grants that require the caller be scoped to their own org/batch. */
export function isScopedGrant(role: Role, action: Action): boolean {
  return MATRIX[role]?.[action] === "own-batch";
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new PermissionError(`Role ${role} is not permitted to perform ${action}`);
  }
}

export class PermissionError extends Error {
  status = 403;
}

// Path-prefix -> roles allowed to enter that route group. Used by middleware.ts.
export const ROUTE_ROLE_MAP: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/super-admin", roles: [ROLES.SUPER_ADMIN] },
  { prefix: "/organization", roles: [ROLES.ORG_ADMIN] },
  { prefix: "/generator", roles: [ROLES.GENERATOR_ADMIN] },
];
