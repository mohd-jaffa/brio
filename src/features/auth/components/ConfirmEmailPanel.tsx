"use client";

import { useEffect, useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { ERROR_MESSAGES, UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES, HOME_ROUTE } from "@/constants/routes";
import { errorMessage } from "@/lib/errors/errorMessage";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";
import { Pending } from "@/components/ui/pending";
import { loadPage } from "@/lib/navigation/url";

type ConfirmState = "working" | "done" | "changed" | "failed";

export interface ConfirmationLink {
  accessToken: string;
  refreshToken: string;
}

/**
 * What Supabase put in the URL fragment. It is parsed out here rather than in
 * the component so the awkward part — a link that was followed twice, or after
 * it expired, arrives carrying an error instead of tokens — can be tested
 * without a browser.
 */
export function readConfirmationLink(fragment: string):
  | { link: ConfirmationLink }
  | { link: null; expired: boolean } {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) return { link: { accessToken, refreshToken } };
  return { link: null, expired: params.has("error") };
}

/**
 * The token of the link that confirms a new email address (the user,
 * 2026-09-26), which it carries in the fragment as `change`; null for any
 * other link.
 */
export function readEmailChangeToken(fragment: string): string | null {
  return new URLSearchParams(fragment.replace(/^#/, "")).get("change");
}

/**
 * Where the link in the welcome email lands (plan §7). Supabase hands the
 * tokens back in the URL fragment, so only this page can read them; they are
 * wiped out of the address bar before anything else happens, because a browser
 * history entry containing a session is a session anyone on the device has.
 *
 * The link that confirms a new email address lands here too. Its token proves
 * the address, so it works signed in or not, on any device; the account's
 * email changes, and a session open here is read again to show it.
 */
export function ConfirmEmailPanel() {
  const { adopt, reload } = useAuth();
  const [state, setState] = useState<ConfirmState>("working");
  const [changing, setChanging] = useState(false);
  const [changedTo, setChangedTo] = useState("");
  // A link that expired is a failure; arriving here without one at all is
  // just someone in the wrong place, and it should not be shouted at them.
  const [notice, setNotice] = useState<{ message: string; tone: "danger" | "info" }>({
    message: UI_TEXT.auth.confirmLinkMissing,
    tone: "info",
  });

  useEffect(() => {
    let cancelled = false;

    const confirm = async () => {
      const fragment = window.location.hash;
      const parsed = readConfirmationLink(fragment);
      const change = readEmailChangeToken(fragment);

      if (fragment) window.history.replaceState(null, "", window.location.pathname);

      if (change) {
        setChanging(true);
        try {
          const { email } = await AuthClient.confirmEmailChange(change);
          if (cancelled) return;
          await reload();
          setChangedTo(email);
          setState("changed");
        } catch (failure) {
          if (cancelled) return;
          setNotice({ message: errorMessage(failure, "AUTH_EMAIL_CONFIRM_FAILED"), tone: "danger" });
          setState("failed");
        }
        return;
      }

      // Nothing has been awaited yet, so the page is still here.
      if (!parsed.link) {
        setNotice(
          parsed.expired
            ? { message: ERROR_MESSAGES.AUTH_EMAIL_CONFIRM_FAILED, tone: "danger" }
            : { message: UI_TEXT.auth.confirmLinkMissing, tone: "info" },
        );
        setState("failed");
        return;
      }

      try {
        const session = await AuthClient.confirmEmail(parsed.link);
        if (cancelled) return;
        await adopt(session);
        setState("done");
        loadPage(HOME_ROUTE);
      } catch (failure) {
        if (cancelled) return;
        setNotice({ message: errorMessage(failure, "AUTH_EMAIL_CONFIRM_FAILED"), tone: "danger" });
        setState("failed");
      }
    };

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [adopt, reload]);

  if (state === "working") {
    return <Pending message={changing ? UI_TEXT.auth.confirmingChange : UI_TEXT.auth.confirming} inline />;
  }

  if (state === "done") return <ScreenNotice tone="info">{UI_TEXT.auth.confirmed}</ScreenNotice>;

  if (state === "changed") {
    return (
      <div className="space-y-5">
        <ScreenNotice tone="info">{UI_TEXT.auth.emailChanged(changedTo)}</ScreenNotice>
        <LinkButton href={HOME_ROUTE} variant="action" size="lg" shape="pill" fullWidth label={UI_TEXT.auth.toApp} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ScreenNotice tone={notice.tone}>{notice.message}</ScreenNotice>
      <LinkButton
        href={AUTH_ROUTES.signIn}
        variant="action"
        size="lg"
        shape="pill"
        fullWidth
        label={UI_TEXT.auth.backToSignIn}
      />
    </div>
  );
}
