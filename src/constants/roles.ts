/**
 * The two roles the plan approves (§5, AGENTS.md §8). They live here rather
 * than in the auth feature because the validation layer and the route guards
 * both name them, and `src/lib` never imports from `src/features`.
 */
export const USER_ROLES = ["BAKER", "DEV"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  BAKER: "Baker",
  DEV: "Developer",
};

/**
 * Who may act on a bakery's own business data. DEV is deliberately absent:
 * the plan says developer access covers logs, workers and platform health,
 * and must be granted explicitly rather than inherited from the role (§5).
 */
export const BAKERY_ROLES: readonly UserRole[] = ["BAKER"];
