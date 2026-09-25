import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessClient } from "@/features/business/api.client";
import { LogoField } from "@/features/business/components/LogoField";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

vi.mock("@/features/business/api.client", () => ({ BusinessClient: { uploadLogo: vi.fn() } }));

const png = (size = 10) => new File([new Uint8Array(size)], "logo.png", { type: "image/png" });
const chooser = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;

beforeEach(() => vi.clearAllMocks());

describe("LogoField", () => {
  it("offers an upload when there is no logo, and says there is none", () => {
    render(<LogoField logoUrl={null} />, { wrapper: Providers });
    expect(screen.getByText("No logo yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload logo" })).toHaveAccessibleDescription(/PNG, JPG or WebP, up to 500 KB/);
  });

  it("shows the current logo, and offers to replace it", () => {
    render(<LogoField logoUrl="/api/business/logo?v=1" />, { wrapper: Providers });
    expect(screen.getByRole("img", { name: "Your current logo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace logo" })).toBeInTheDocument();
  });

  it("opens the file chooser from a real button, and accepts only the three image types", async () => {
    const { container } = render(<LogoField logoUrl={null} />, { wrapper: Providers });
    const input = chooser(container);
    const opened = vi.spyOn(input, "click");

    await userEvent.click(screen.getByRole("button", { name: "Upload logo" }));
    expect(opened).toHaveBeenCalledOnce();
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,image/webp");
    expect(input).toHaveAttribute("tabindex", "-1");
  });

  it("sends a chosen logo and says it was updated", async () => {
    vi.mocked(BusinessClient.uploadLogo).mockResolvedValue({} as never);
    const { container } = render(<LogoField logoUrl={null} />, { wrapper: Providers });
    const file = png();

    await userEvent.upload(chooser(container), file);

    await waitFor(() => expect(BusinessClient.uploadLogo).toHaveBeenCalledWith(file));
    expect(await screen.findByRole("status")).toHaveTextContent("Logo updated");
  });

  it("does nothing when the chooser is closed without a file", () => {
    const { container } = render(<LogoField logoUrl={null} />, { wrapper: Providers });
    fireEvent.change(chooser(container), { target: { files: [] } });
    expect(BusinessClient.uploadLogo).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("stops a file that is too large or the wrong kind before sending it, and says why", async () => {
    const { container } = render(<LogoField logoUrl={null} />, { wrapper: Providers });

    await userEvent.upload(chooser(container), png(500 * 1024 + 1));
    const card = await screen.findByRole("alertdialog", { name: "Logo not uploaded" });
    expect(card).toHaveTextContent("That logo is larger than 500 KB.");
    expect(BusinessClient.uploadLogo).not.toHaveBeenCalled();
  });

  it("shows the server's refusal and its reference, and keeps the old logo", async () => {
    vi.mocked(BusinessClient.uploadLogo).mockRejectedValue(
      new ApiError(400, "LOGO_TYPE_NOT_ALLOWED", "Choose a PNG, JPG or WebP image.", "req_42"),
    );
    const { container } = render(<LogoField logoUrl="/api/business/logo?v=1" />, { wrapper: Providers });

    await userEvent.upload(chooser(container), png());

    const card = await screen.findByRole("alertdialog", { name: "Logo not uploaded" });
    expect(card).toHaveTextContent("Choose a PNG, JPG or WebP image.");
    expect(card).toHaveTextContent("Reference: req_42");
    expect(screen.getByRole("img", { name: "Your current logo" })).toBeInTheDocument();
  });
});
