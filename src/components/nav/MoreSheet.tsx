"use client";

import { Medallion } from "@/components/ui/medallion";
import { Row, RowList } from "@/components/ui/row";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { MORE_NAV } from "@/constants/navigation";
import { SignOutRow } from "@/features/auth/components/SignOutRow";

/**
 * The rest of the app, on a phone (plan §139.10): Analytics, Expenses,
 * Inventory, Business details and Settings, each with a medallion, a line on
 * what it holds and a chevron, then **Sign out**. Its places are the ones the
 * bottom bar does not hold, from the one nav list. It is a `Sheet`, so the
 * page behind is inert while it is open and focus goes back to More when it
 * closes (BUG-25). The theme is chosen on Settings → Appearance (R5.11).
 */
export function MoreSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet open={isOpen} onClose={onClose} title={UI_TEXT.nav.more} className="md:hidden">
      <div className="space-y-3">
        <nav aria-label={UI_TEXT.nav.secondary}>
          <RowList>
            {MORE_NAV.map(({ id, label, icon, href }) => (
              <Row
                key={id}
                href={href}
                onClick={onClose}
                leading={<Medallion icon={icon} size="sm" />}
                title={label}
                subtitle={UI_TEXT.nav.hints[id]}
              />
            ))}
          </RowList>
        </nav>
        <RowList>
          <SignOutRow onSignedOut={onClose} />
        </RowList>
      </div>
    </Sheet>
  );
}
