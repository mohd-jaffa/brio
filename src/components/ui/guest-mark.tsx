import { UserRound } from "lucide-react";

/**
 * What stands for a Guest wherever a customer's initials would (plan
 * §139.11.3): a quiet figure on the sunken tone, the size of an avatar.
 * Decorative, since "Guest" is always written beside it.
 */
export function GuestMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sunken text-text-muted"
    >
      <UserRound size={20} strokeWidth={1.75} />
    </span>
  );
}
