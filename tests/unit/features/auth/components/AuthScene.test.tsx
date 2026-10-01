import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { AuthAbout, AuthPromise, AuthScene } from "@/features/auth/components/AuthScene";

function scene(props: Partial<Parameters<typeof AuthScene>[0]> = {}) {
  return render(
    <AuthScene headline={UI_TEXT.auth.signInHeadline} intro={UI_TEXT.auth.signInIntro} {...props}>
      <p>The form</p>
    </AuthScene>,
  );
}

describe("AuthScene", () => {
  it("sets the headline as its lines, neutral for every home business (Q8)", () => {
    scene();
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent("Good workstarts here.");
    expect(headline.children).toHaveLength(2);
    expect(screen.getByText("Sign in to run your business")).toBeInTheDocument();
    expect(screen.getByText("The form")).toBeInTheDocument();
  });

  it("is the screen's one main landmark, so a screen reader can go straight to the form", () => {
    scene();
    expect(screen.getByRole("main")).toContainElement(screen.getByText("The form"));
  });

  it("puts the plate behind the scene: decorative, and loaded first as the largest paint", () => {
    const { container } = scene();
    const plate = container.querySelector(".auth-plate");
    expect(plate).toHaveAttribute("aria-hidden", "true");
    const image = plate?.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image?.getAttribute("src")).toMatch(/cake-table/);
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    // The only picture a screen reader meets is the wordmark, read as the app's name.
    expect(screen.getAllByRole("img")).toEqual([screen.getByRole("img", { name: "Brio" })]);
  });

  it("names the app with its wordmark, and its line under it", () => {
    scene();
    const wordmark = screen.getByRole("img", { name: "Brio" });
    expect(wordmark.getAttribute("src")).toMatch(/wordmark/);
    expect(wordmark).toHaveAttribute("loading", "eager");
    expect(screen.getByText("Made by you. Managed simply.")).toBeInTheDocument();
  });

  it("offers the other front door and a way back, when it has them", () => {
    scene({
      backHref: "/login",
      counterpart: { question: UI_TEXT.auth.haveAccount, label: UI_TEXT.auth.signIn, href: "/login" },
    });
    expect(screen.getByRole("link", { name: UI_TEXT.actions.back })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: UI_TEXT.auth.signIn })).toHaveAttribute("href", "/login");
  });

  it("offers neither behind the front door, where there is nowhere else to go", () => {
    scene({ footer: <p>Footer line</p> });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Footer line")).toBeInTheDocument();
  });
});

describe("AuthPromise", () => {
  it("closes the sheet on the promise", () => {
    render(<AuthPromise>{UI_TEXT.auth.promise}</AuthPromise>);
    expect(screen.getByText("Made at home, run with care.")).toBeInTheDocument();
  });
});

describe("AuthAbout", () => {
  it("leads someone meeting Brio for the first time to what it does", () => {
    render(<AuthAbout />);
    expect(screen.getByRole("link", { name: UI_TEXT.auth.seeWhatBrioDoes })).toHaveAttribute("href", "/");
  });
});
