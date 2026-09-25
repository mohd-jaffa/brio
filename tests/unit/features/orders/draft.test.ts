import { describe, expect, it } from "vitest";

import {
  addAdjustment,
  addCustom,
  addProduct,
  chooseCustomer,
  draftForm,
  draftTotals,
  itemCount,
  newDraft,
  newKey,
  offersCustomerPlace,
  quantityOf,
  readDraft,
  removeAdjustment,
  removeLine,
  setAdjustment,
  setDelivery,
  setDeliveryType,
  setLineNote,
  setNotes,
  setPayment,
  setQuantity,
  takeCustomerPlace,
  tomorrowAtThisHour,
  type DraftCustomer,
  type OrderDraft,
} from "@/features/orders/draft";
import { orderFormSchema } from "@/lib/validation";

const anu: DraftCustomer = {
  kind: "CUSTOMER",
  id: "c1111111-1111-4111-8111-111111111111",
  name: "Anu",
  phone: "+919812345678",
  address: "Flat 302, Sunrise Apartments",
  googleMapsLink: "https://maps.app.goo.gl/anu",
};
const rahul: DraftCustomer = { ...anu, id: "c-rahul", name: "Rahul", address: "Villa 12", googleMapsLink: "" };
const nobody: DraftCustomer = { ...anu, id: "c-none", name: "Meera", address: "", googleMapsLink: "" };

const delivering = (draft: OrderDraft = newDraft()) => setDeliveryType(draft, "DELIVERY");

describe("a new draft", () => {
  it("starts empty, a pickup, unpaid, dated tomorrow at this hour — worked out now (BUG-28)", () => {
    const now = new Date(2026, 8, 25, 14, 37);
    const draft = newDraft(now);
    expect(draft).toMatchObject({ version: 1, lines: [], customer: null, adjustments: [], notes: "" });
    expect(draft.delivery).toMatchObject({ type: "PICKUP", date: "2026-09-26T14:00", address: "", googleMapsLink: "" });
    expect(draft.payment).toEqual({ status: "UNPAID", method: "UPI", reference: "", amount: "" });
    expect(tomorrowAtThisHour(new Date(2026, 11, 31, 9, 5))).toBe("2027-01-01T09:00");
  });

  it("reads back a stored draft of this version, and nothing else", () => {
    const draft = newDraft();
    expect(readDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
    for (const stored of [
      null,
      "x",
      {},
      { ...draft, version: 0 },
      { ...draft, lines: "no" },
      { ...draft, payment: undefined },
    ]) {
      expect(readDraft(stored)).toBeNull();
    }
  });

  it("gives every line and adjustment its own key", () => {
    expect(new Set(Array.from({ length: 20 }, newKey)).size).toBe(20);
  });
});

describe("items", () => {
  it("adds a product, and one more of it on the next tap", () => {
    const once = addProduct(newDraft(), "p-cake");
    const twice = addProduct(once, "p-cake");
    expect(twice.lines).toHaveLength(1);
    expect(twice.lines[0]).toMatchObject({ productId: "p-cake", quantity: 2, notes: "" });
    expect(quantityOf(twice, "p-cake")).toBe(2);
    expect(quantityOf(twice, "p-bread")).toBe(0);
  });

  it("adds a custom item with its description as the note on the bill (§139.11.7)", () => {
    const draft = addCustom(newDraft(), { name: "Name topper", unitPrice: 15000, description: "Gold" });
    expect(draft.lines[0]).toMatchObject({
      custom: { name: "Name topper", unitPrice: 15000 },
      quantity: 1,
      notes: "Gold",
    });
    expect(addCustom(newDraft(), { name: "Card", unitPrice: 100, description: null }).lines[0].notes).toBe("");
  });

  it("sets a quantity and a note, removes a line, and counts what is in the order", () => {
    let draft = addCustom(addProduct(newDraft(), "p-cake"), { name: "Topper", unitPrice: 100 });
    const [cake, topper] = draft.lines;
    draft = setLineNote(setQuantity(draft, cake.key, 3), cake.key, "Happy birthday");
    expect(draft.lines[0]).toMatchObject({ quantity: 3, notes: "Happy birthday" });
    expect(draft.lines[1]).toBe(topper);
    expect(itemCount(draft)).toBe(4);
    expect(removeLine(draft, cake.key).lines).toEqual([topper]);
  });
});

describe("the delivery autofill (§139.11.4)", () => {
  it("fills an empty delivery from the chosen customer", () => {
    const draft = chooseCustomer(delivering(), anu);
    expect(draft.delivery).toMatchObject({ address: anu.address, googleMapsLink: anu.googleMapsLink });
    expect(offersCustomerPlace(draft)).toBe(false);
  });

  it("replaces what the last autofill put there when the customer changes", () => {
    const draft = chooseCustomer(chooseCustomer(delivering(), anu), rahul);
    expect(draft.delivery).toMatchObject({ address: "Villa 12", googleMapsLink: "" });
  });

  it("keeps what the owner typed, and offers the customer's place instead", () => {
    let draft = setDelivery(chooseCustomer(delivering(), anu), { address: "Typed" });
    draft = chooseCustomer(draft, rahul);
    expect(draft.delivery.address).toBe("Typed");
    expect(offersCustomerPlace(draft)).toBe(true);
    const taken = takeCustomerPlace(draft);
    expect(taken.delivery).toMatchObject({
      address: "Villa 12",
      googleMapsLink: "",
      filled: { address: "Villa 12", googleMapsLink: "" },
    });
    expect(offersCustomerPlace(taken)).toBe(false);
  });

  it("fills nothing for a customer with no place, and takes away the last one's", () => {
    const draft = chooseCustomer(chooseCustomer(delivering(), anu), nobody);
    expect(draft.delivery).toMatchObject({ address: "", googleMapsLink: "" });
    expect(offersCustomerPlace(draft)).toBe(false);
  });

  it("clears the last autofill for a Guest", () => {
    const draft = chooseCustomer(chooseCustomer(delivering(), anu), { kind: "GUEST" });
    expect(draft.customer).toEqual({ kind: "GUEST" });
    expect(draft.delivery.address).toBe("");
    expect(offersCustomerPlace(draft)).toBe(false);
  });

  it("leaves a pickup alone until it becomes a delivery", () => {
    const pickup = chooseCustomer(newDraft(), anu);
    expect(pickup.delivery.address).toBe("");
    expect(offersCustomerPlace(pickup)).toBe(false);
    expect(setDeliveryType(pickup, "DELIVERY").delivery.address).toBe(anu.address);
  });

  it("never changes the customer: the order keeps its own copy (§93)", () => {
    const draft = setDelivery(chooseCustomer(delivering(), anu), { address: "Elsewhere", date: "2026-09-27T10:00" });
    expect(draft.customer).toBe(anu);
    expect(draft.delivery.date).toBe("2026-09-27T10:00");
  });
});

describe("charges, payment and notes", () => {
  it("adds, changes and removes a discount or a charge", () => {
    let draft = addAdjustment(newDraft(), "DISCOUNT", "Festive");
    const [festive] = draft.adjustments;
    expect(festive).toMatchObject({ type: "DISCOUNT", name: "Festive", amount: "" });
    draft = setAdjustment(draft, festive.key, { amount: "₹100", type: "CHARGE" });
    expect(draft.adjustments[0]).toMatchObject({ type: "CHARGE", amount: "₹100" });
    expect(removeAdjustment(draft, festive.key).adjustments).toEqual([]);
  });

  it("changes the payment and the internal notes", () => {
    const draft = setNotes(setPayment(newDraft(), { status: "PARTIALLY_PAID", amount: "500" }), "Ring twice");
    expect(draft.payment).toMatchObject({ status: "PARTIALLY_PAID", amount: "500", method: "UPI" });
    expect(draft.notes).toBe("Ring twice");
  });
});

describe("totals and the request", () => {
  it("adds the lines at the prices on screen, custom ones at their own, with half-typed amounts as nothing", () => {
    let draft = addCustom(addProduct(addProduct(newDraft(), "p-cake"), "p-cake"), { name: "Topper", unitPrice: 15000 });
    draft = addAdjustment(addAdjustment(draft, "DISCOUNT", "Festive"), "CHARGE", "Delivery");
    draft = setAdjustment(draft, draft.adjustments[0].key, { amount: "100" });
    draft = setAdjustment(draft, draft.adjustments[1].key, { amount: "still typing" });
    const totals = draftTotals(draft, (id) => (id === "p-cake" ? 125000 : undefined));
    expect(totals).toMatchObject({ subtotal: 265000, discount: 10000, deliveryCharge: 0, total: 255000 });
  });

  it("prices a product no longer on the list, or a stored line naming nothing, as nothing", () => {
    expect(draftTotals(addProduct(newDraft(), "gone"), () => undefined).total).toBe(0);
    const broken = { ...newDraft(), lines: [{ key: "k", quantity: 2, notes: "" }] };
    expect(draftTotals(broken, () => 100).total).toBe(0);
  });

  it("reads through the order form's schema into what the API takes", () => {
    let draft = chooseCustomer(
      delivering(
        addCustom(addProduct(newDraft(), "3f2504e0-4f89-11d3-9a0c-0305e82c3301"), { name: "Topper", unitPrice: 15000 }),
      ),
      anu,
    );
    draft = setPayment(addAdjustment(draft, "DISCOUNT", "Festive"), { status: "PAID", method: "CASH" });
    draft = setAdjustment(draft, draft.adjustments[0].key, { amount: "50" });

    const parsed = orderFormSchema.parse(draftForm(draft));
    expect(parsed.customer).toEqual({ kind: "CUSTOMER", id: "c1111111-1111-4111-8111-111111111111" });
    expect(parsed.items).toEqual([
      { productId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301", quantity: 1, notes: null },
      { custom: { name: "Topper", unitPrice: 15000 }, quantity: 1, notes: null },
    ]);
    expect(parsed.adjustments).toEqual([{ type: "DISCOUNT", name: "Festive", amount: 5000 }]);
    expect(parsed.delivery).toMatchObject({
      type: "DELIVERY",
      address: anu.address,
      googleMapsLink: anu.googleMapsLink,
    });
    expect(parsed.payment).toEqual({ status: "PAID", method: "CASH", reference: null });
  });

  it("sends a Guest as a Guest, and no one as a missing customer", () => {
    expect(draftForm(chooseCustomer(newDraft(), { kind: "GUEST" })).customer).toEqual({ kind: "GUEST" });
    expect(draftForm(newDraft()).customer).toBeNull();
  });
});
