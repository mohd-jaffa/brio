import { UI_TEXT } from "@/constants/messages";

/**
 * Golden's colours (src/app/globals.css), written out: a mail app reads no
 * stylesheet variables, and most read no stylesheet at all, so every style
 * is on its element.
 */
const COLOUR = {
  ground: "#f6efe5",
  surface: "#fffcf8",
  sunken: "#f1e8db",
  border: "#e6dacb",
  text: "#2b1d14",
  muted: "#6b5747",
  primary: "#7a4a25",
  action: "#2a1b12",
  actionText: "#fff8f0",
} as const;

// The app's serif and sans where a mail app has them, and their nearest
// everywhere else; nothing is fetched for them, so opening an email tells no
// font service anything.
const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/** The marks an email shows (public/email, scripts/brand.mjs), as drawn. */
const WORDMARK = { path: "/email/wordmark.png", width: 79, height: 36 };
const LEAF = { path: "/email/leaf.png", width: 18, height: 16 };

/** Anything a person typed, made safe to stand in an email's HTML. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export interface EmailParts {
  /** The app's address, where its marks are, with no trailing slash needed. */
  appUrl: string;
  subject: string;
  /** What a mail app shows beside the subject, before the email is opened. */
  preheader: string;
  heading: string;
  /** Plain text, a paragraph each; the first is the greeting. */
  paragraphs: string[];
  /** Something to copy, set apart: the temporary password. */
  code?: { label: string; value: string };
  /** The one thing to do, as a button, with its address in words under it. */
  action?: { label: string; url: string; fallback?: string };
  /** A line under the button: how long a link lasts. */
  note?: string;
  /** Why this email came, and what to do if it should not have. */
  footnote: string;
}

const paragraph = (text: string, last: boolean) =>
  `<p style="margin:0 0 ${last ? 0 : 16}px;font-family:${SANS};font-size:16px;line-height:26px;color:${COLOUR.muted};">${escapeHtml(text)}</p>`;

/**
 * An email in Brio's own world (the user, 2026-10-01): the wordmark over a
 * cream ground, the words on a card, one dark button — the app's one dark
 * control — and the brand's line and leaf at its foot. Tables, inline styles
 * and a light scheme only, for every mail app from Gmail to Outlook; a phone's
 * mail app gets a narrower frame. Everything a person gave is escaped.
 */
export function emailHtml(parts: EmailParts): string {
  const base = parts.appUrl.replace(/\/+$/, "");
  const button = parts.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
        <tr>
          <td bgcolor="${COLOUR.action}" style="border-radius:999px;background:${COLOUR.action};">
            <a href="${escapeHtml(parts.action.url)}" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:16px;font-weight:600;line-height:20px;color:${COLOUR.actionText};text-decoration:none;border-radius:999px;">${escapeHtml(parts.action.label)}</a>
          </td>
        </tr>
      </table>${
        parts.action.fallback
          ? `<p style="margin:20px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${COLOUR.muted};">${escapeHtml(parts.action.fallback)}<br><a href="${escapeHtml(parts.action.url)}" style="color:${COLOUR.primary};word-break:break-all;">${escapeHtml(parts.action.url)}</a></p>`
          : ""
      }`
    : "";
  const code = parts.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr>
          <td bgcolor="${COLOUR.sunken}" style="background:${COLOUR.sunken};border-radius:14px;padding:18px 20px;">
            <p style="margin:0 0 6px;font-family:${SANS};font-size:13px;line-height:18px;color:${COLOUR.muted};">${escapeHtml(parts.code.label)}</p>
            <p style="margin:0;font-family:${MONO};font-size:22px;line-height:30px;font-weight:600;letter-spacing:1px;color:${COLOUR.text};">${escapeHtml(parts.code.value)}</p>
          </td>
        </tr>
      </table>`
    : "";
  const note = parts.note
    ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${COLOUR.muted};">${escapeHtml(parts.note)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(parts.subject)}</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  body { margin: 0; padding: 0; }
  @media (max-width: 600px) {
    .brio-frame { padding: 24px 12px !important; }
    .brio-card { padding: 28px 22px !important; }
    .brio-heading { font-size: 26px !important; line-height: 32px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLOUR.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(parts.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOUR.ground}" style="background:${COLOUR.ground};">
  <tr>
    <td align="center" class="brio-frame" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 4px 24px;">
            <a href="${escapeHtml(base)}" style="text-decoration:none;"><img src="${escapeHtml(base)}${WORDMARK.path}" width="${WORDMARK.width}" height="${WORDMARK.height}" alt="${UI_TEXT.appName}" style="display:block;border:0;width:${WORDMARK.width}px;height:${WORDMARK.height}px;"></a>
          </td>
        </tr>
        <tr>
          <td class="brio-card" bgcolor="${COLOUR.surface}" style="background:${COLOUR.surface};border:1px solid ${COLOUR.border};border-radius:20px;padding:40px 40px 36px;">
            <h1 class="brio-heading" style="margin:0 0 20px;font-family:${SERIF};font-size:30px;line-height:36px;font-weight:600;letter-spacing:-0.3px;color:${COLOUR.text};">${escapeHtml(parts.heading)}</h1>
            ${parts.paragraphs.map((text, at) => paragraph(text, at === parts.paragraphs.length - 1)).join("\n            ")}
            ${code}${button}${note}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 4px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 8px 0 0;vertical-align:middle;"><img src="${escapeHtml(base)}${LEAF.path}" width="${LEAF.width}" height="${LEAF.height}" alt="" style="display:block;border:0;width:${LEAF.width}px;height:${LEAF.height}px;"></td>
                <td style="vertical-align:middle;font-family:${SANS};font-size:13px;line-height:18px;font-weight:600;color:${COLOUR.primary};">${UI_TEXT.appTagline}</td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-family:${SANS};font-size:12px;line-height:19px;color:${COLOUR.muted};">${escapeHtml(parts.footnote)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** The same email as plain text, for a mail app that shows no HTML. */
export function emailText(parts: EmailParts): string {
  return [
    ...parts.paragraphs.flatMap((text) => [text, ""]),
    ...(parts.code ? [`${parts.code.label}: ${parts.code.value}`, ""] : []),
    ...(parts.action ? [`${parts.action.label}: ${parts.action.url}`, ""] : []),
    ...(parts.note ? [parts.note, ""] : []),
    "—",
    `${UI_TEXT.appName} · ${UI_TEXT.appTagline}`,
    parts.footnote,
  ].join("\n");
}
