import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessClient } from "@/features/business/api.client";
import { BusinessDetailsForm } from "@/features/business/components/BusinessDetailsForm";
import type { BusinessProfile } from "@/features/business/types";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

vi.mock("@/features/business/api.client", () => ({ BusinessClient: { update: vi.fn(), uploadLogo: vi.fn() } }));

const business: BusinessProfile = {
  id: "b-1",
  name: "Sweet Delights",
  tagline: null,
  city: null,
  address: "12 MG Road",
  phone: "+919876543210",
  logoUrl: null,
};

function form(profile = business) {
  render(<BusinessDetailsForm business={profile} />, { wrapper: Providers });
  return {
    name: screen.getByLabelText(/^Business name/),
    tagline: screen.getByLabelText(/^Catch phrase/),
    city: screen.getByLabelText(/^City/),
    address: screen.getByLabelText(/^Address/),
    phone: screen.getByLabelText(/^Business phone/),
    preview: screen.getByRole("figure", { name: "Bill header preview" }),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("BusinessDetailsForm", () => {
  it("starts from the saved profile, the number shown without its +91", () => {
    const fields = form();
    expect(fields.name).toHaveValue("Sweet Delights");
    expect(fields.tagline).toHaveValue("");
    expect(fields.city).toHaveValue("");
    expect(fields.phone).toHaveValue("98765 43210");
    expect(fields.phone).toHaveAccessibleDescription(/\+91.*Printed on your bills/);
  });

  it("draws the bill's header from what is typed, as it is typed", async () => {
    const fields = form();
    await userEvent.type(fields.tagline, "Baked fresh");
    await userEvent.type(fields.city, "Pune");

    expect(within(fields.preview).getByText("Baked fresh")).toBeInTheDocument();
    expect(within(fields.preview).getByText(/12 MG Road\s+Pune\s+\+91 98765 43210/)).toBeInTheDocument();
  });

  it("saves the whole profile, tidied, and says it was saved", async () => {
    vi.mocked(BusinessClient.update).mockResolvedValue(business);
    const fields = form();
    await userEvent.type(fields.city, "  Pune ");
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() =>
      expect(BusinessClient.update).toHaveBeenCalledWith({
        name: "Sweet Delights",
        tagline: null,
        city: "Pune",
        address: "12 MG Road",
        phone: "+919876543210",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Business details saved");
  });

  it("asks for what is missing beside each field, and sends nothing", async () => {
    // Registered before the address was asked for: none is saved yet.
    const fields = form({ ...business, address: null });
    expect(fields.address).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));

    expect(await screen.findByText("City needs a value.")).toBeInTheDocument();
    expect(screen.getByText("Address needs a value.")).toBeInTheDocument();
    expect(fields.city).toHaveAttribute("aria-invalid", "true");
    expect(BusinessClient.update).not.toHaveBeenCalled();
  });

  it("shows a refusal on a card, and keeps what was typed", async () => {
    vi.mocked(BusinessClient.update).mockRejectedValue(
      new ApiError(422, "VALIDATION_ERROR", "Please check the highlighted fields.", "req_7"),
    );
    const fields = form();
    await userEvent.type(fields.city, "Pune");
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));

    const card = await screen.findByRole("alertdialog", { name: "Business details not saved" });
    expect(card).toHaveTextContent("Reference: req_7");
    expect(fields.city).toHaveValue("Pune");
  });

  it("fills a catch phrase and city already saved", () => {
    const fields = form({ ...business, tagline: "Baked fresh", city: "Pune" });
    expect(fields.tagline).toHaveValue("Baked fresh");
    expect(fields.city).toHaveValue("Pune");
  });

  it("carries the logo field with it", () => {
    form({ ...business, logoUrl: "/api/business/logo?v=1" });
    expect(screen.getByRole("button", { name: "Replace logo" })).toBeInTheDocument();
  });
});
