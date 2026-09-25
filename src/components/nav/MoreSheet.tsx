"use client";

import { Medallion } from "@/components/ui/medallion";
import { Row, RowList } from "@/components/ui/row";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { MORE_NAV } from "@/constants/navigation";
import { AccountMenu } from "@/features/auth/components/AccountMenu";

import { ThemeSwitch } from "./ThemeSwitch";

/**
 * The rest of the app, on a phone (plan §139.10): each place with a medallion
 * and a chevron, then the account and Sign out. Its items are the ones the
 * bottom bar does not hold, from the one nav list. It is a `Sheet`, so the
 * page behind is inert while it is open and focus goes back to More when it
 * closes (BUG-25). The theme switch stays here until Settings → Appearance
 * takes it (R5.11).
 */
export function MoreSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={UI_TEXT.nav.more}
      className="md:hidden"
      footer={
        <div className="space-y-4">
          <ThemeSwitch />
          <AccountMenu onSignedOut={onClose} />
        </div>
      }
    >
      <nav aria-label={UI_TEXT.nav.secondary}>
        <RowList>
          {MORE_NAV.map(({ id, label, icon, href }) => (
            <Row
              key={id}
              href={href}
              onClick={onClose}
              leading={<Medallion icon={icon} size="sm" />}
              title={label}
            />
          ))}
        </RowList>
      </nav>
    </Sheet>
  );
}
