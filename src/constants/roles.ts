/**
 * The two roles the plan approves (§5, AGENTS.md §8). They live here rather
 * than in the auth feature because the validation layer and the route guards
 * both name them, and `src/lib` never imports from `src/features`.
 */
export const USER_ROLES = ["USER", "DEV"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Owner",
  DEV: "Developer",
};

/**
 * Who may act on a business's own data: its owner, USER (plan §139.11.1).
 * DEV is deliberately absent: the plan says developer access covers logs,
 * workers and platform health, and must be granted explicitly rather than
 * inherited from the role (§5).
 */
export const BUSINESS_ROLES: readonly UserRole[] = ["USER"];

/**
 * Who may read the platform — the accounts, the audit trail, the job queue —
 * in the developer console (plan §5, §37): DEV, and only DEV. Read-only for
 * now (the user, 2026-09-27).
 */
export const DEVELOPER_ROLES: readonly UserRole[] = ["DEV"];
