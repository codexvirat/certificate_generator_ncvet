export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  GENERATOR_ADMIN: "GENERATOR_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled",
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const ORG_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
} as const;
export type OrgStatus = (typeof ORG_STATUS)[keyof typeof ORG_STATUS];

// Batch lifecycle. Once LOCKED, no photo/data writes are accepted from any role.
export const BATCH_STATUS = {
  DRAFT: "draft",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  GENERATED: "generated",
  LOCKED: "locked",
} as const;
export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];
