import { describe, expect, it } from "vitest";

import { emailHtml, emailText, escapeHtml, type EmailParts } from "@/lib/mail/templates/layout";

const parts: EmailParts = {
  appUrl: "https://brio.test/",
  subject: "A subject",
  preheader: "Seen before it is opened",
  heading: "A heading",
  paragraphs: ["Hi <Priya>,", "The body."],
  footnote: "Why this came.",
};

describe("escapeHtml", () => {
  it("makes what a person typed safe in HTML", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;");
  });
});

describe("emailHtml", () => {
  it("draws the wordmark from the app's address, the words escaped, and the brand's line at the foot", () => {
    const html = emailHtml(parts);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>A subject</title>");
    expect(html).toContain('src="https://brio.test/email/wordmark.png"');
    expect(html).toContain('alt="Brio"');
    expect(html).toContain('src="https://brio.test/email/leaf.png"');
    expect(html).toContain("Seen before it is opened");
    expect(html).toContain(">A heading</h1>");
    expect(html).toContain("Hi &lt;Priya&gt;,");
    expect(html).not.toContain("<Priya>");
    expect(html).toContain("Made by you. Managed simply.");
    expect(html).toContain("Why this came.");
    // Light only: a mail app's dark mode does not repaint the brand.
    expect(html).toContain('<meta name="color-scheme" content="light only">');
  });

  it("adds a button with its address in words, a code set apart and a note only when given", () => {
    expect(emailHtml(parts)).not.toContain('<a href="https://brio.test/go');
    const html = emailHtml({
      ...parts,
      action: { label: "Go", url: "https://brio.test/go?a=1&b=2", fallback: "Or this link:" },
      code: { label: "Code", value: "Ab<1>" },
      note: "Works for a day.",
    });
    expect(html).toContain('href="https://brio.test/go?a=1&amp;b=2"');
    expect(html).toContain(">Go</a>");
    expect(html).toContain("Or this link:");
    expect(html).toContain("Ab&lt;1&gt;");
    expect(html).toContain("Works for a day.");
    // A button with no words under it.
    expect(emailHtml({ ...parts, action: { label: "Go", url: "https://brio.test/go" } })).not.toContain(
      "Or this link:",
    );
  });
});

describe("emailText", () => {
  it("says the same in plain text", () => {
    expect(emailText(parts)).toBe(
      ["Hi <Priya>,", "", "The body.", "", "—", "Brio · Made by you. Managed simply.", "Why this came."].join("\n"),
    );
    const text = emailText({
      ...parts,
      code: { label: "Code", value: "123" },
      action: { label: "Go", url: "https://brio.test/go" },
      note: "Works for a day.",
    });
    expect(text).toContain("Code: 123");
    expect(text).toContain("Go: https://brio.test/go");
    expect(text).toContain("Works for a day.");
  });
});
