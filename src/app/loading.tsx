import { Pending } from "@/components/ui/pending";
import { UI_TEXT } from "@/constants/messages";

/**
 * Shown the moment a route is asked for, until it arrives — so a tap answers
 * at once instead of leaving the last screen up (plan §134 P1-2).
 */
export default function Loading() {
  return <Pending message={UI_TEXT.states.loading} />;
}
