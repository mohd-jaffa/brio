"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { ZodError } from "zod";

import { Button } from "@/components/ui/button";
import { CartBar } from "@/components/ui/cart-bar";
import { cn } from "@/components/ui/cn";
import { CustomerPicker, type PickedCustomer } from "@/components/ui/customer-picker";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import { useAuth } from "@/features/auth/AuthProvider";
import { CustomersClient } from "@/features/customers/api.client";
import { CustomerFormSheet } from "@/features/customers/components/CustomerFormSheet";
import type { Customer, CustomerListItem } from "@/features/customers/types";
import type { Product } from "@/features/products/types";
import { OrderBill } from "@/features/receipts/components/OrderBill";
import { useArrived } from "@/hooks/useArrived";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTravelMotion } from "@/hooks/useTravelMotion";
import { ApiError } from "@/lib/api/client";
import { formatPaise } from "@/lib/format/currency";
import { parseRupees } from "@/lib/money";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiPages } from "@/lib/query/useApiPages";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { orderFormSchema, type OrderFormPayload } from "@/lib/validation";

import { OrdersClient } from "../api.client";
import {
  addCustom,
  addProduct,
  chooseCustomer,
  customerForDraft,
  draftForm,
  draftTotals,
  itemCount,
  quantityOf,
  removeProduct,
  type DraftCustomer,
} from "../draft";
import type { OrderEstimate, StockShortfall } from "../estimate";
import { useOrderDraft } from "../hooks/useOrderDraft";
import type { Order } from "../types";
import { CustomItemSheet } from "./CustomItemSheet";
import { DetailsPanel } from "./DetailsPanel";
import { EstimateBill } from "./EstimateBill";
import { ItemsPanel } from "./ItemsPanel";
import { OrderSummary } from "./OrderSummary";
import { PaymentPanel } from "./PaymentPanel";

const STEPS = ["items", "details", "payment"] as const;
type Step = (typeof STEPS)[number];

/** The paths each step answers for, and every step before it. */
const STEP_PATHS: Record<Step, readonly string[]> = {
  items: ["items"],
  details: ["items", "customer", "delivery", "adjustments", "notes"],
  payment: ["items", "customer", "delivery", "adjustments", "notes", "payment"],
};

const ROUTE = "/orders/new";

function readStep(value: string | null): Step {
  return (STEPS as readonly (string | null)[]).includes(value) ? (value as Step) : "items";
}

/** The first message under each path — what each field shows. */
function issuesByPath(error: ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    issues[path] ??= issue.message;
  }
  return issues;
}

function within(issues: Record<string, string>, step: Step): Record<string, string> {
  return Object.fromEntries(
    Object.entries(issues).filter(([path]) =>
      STEP_PATHS[step].some((prefix) => path === prefix || path.startsWith(`${prefix}.`)),
    ),
  );
}

/**
 * The stock refusal as a card that names what is short, in words — "Only 2
 * left of Red Velvet Cake." — with nothing to try again: the order has to
 * change first.
 */
function stockRefusal(failure: unknown) {
  if (!(failure instanceof ApiError) || failure.code !== "ORDER_INSUFFICIENT_STOCK") return null;
  const shortfalls = (failure.details as { shortfalls?: StockShortfall[] } | undefined)?.shortfalls ?? [];
  if (shortfalls.length === 0) return null;
  return {
    title: UI_TEXT.outcomes.orderNotPlaced,
    message: shortfalls.map(({ name, available }) => UI_TEXT.newOrder.onlyLeft(name, available)).join(" "),
    requestId: failure.requestId,
  };
}

/** A bar that stays at the foot of the step, above the bottom navigation. */
function StepBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] z-20 md:bottom-6 lg:hidden">
      {children}
    </div>
  );
}

/**
 * Creating an order, items first (plan §139.10, Q11): the product grid and
 * custom items, then who it is for and how it is handed over, then payment,
 * then **Place order**. On a phone each step is its own page — `?step=` — so
 * the back button walks back through them; from 1024 px the grid sits beside
 * one panel holding everything else. The order is a draft on this device
 * until it is placed or cleared (./hooks/useOrderDraft), and is placed once
 * however often Place order is pressed (§133.3 C2).
 */
export function NewOrder() {
  const text = UI_TEXT.newOrder;
  const router = useRouter();
  const step = readStep(useSearchParams().get("step"));
  const respond = useResponse();
  const { profile } = useAuth();
  const { draft, update, clear, keyFor } = useOrderDraft(profile?.id ?? null);

  const products = useApiQuery<Product[]>(apiRoutes.products.list);
  // Customers are read only while the picker is open, searched on the server, a page at a time.
  const [picking, setPicking] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const searchedCustomers = useDebouncedValue(customerSearch.trim());
  const customers = useApiPages<CustomerListItem>(
    picking ? withQuery(apiRoutes.customers.list, { search: searchedCustomers }) : null,
  );
  const productsById = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, product])),
    [products.data],
  );
  const onSale = useMemo(() => (products.data ?? []).filter((product) => product.isActive), [products.data]);

  // The furthest step whose checks have been run: its fields show their issues.
  const [tried, setTried] = useState<Step | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  // The estimate's bill while it is open (§139.11.5), and the bill of the order just placed.
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<OrderEstimate | undefined>();
  const [placedBill, setPlacedBill] = useState<{ id: string; orderNumber: string } | null>(null);

  // What Try again repeats: the same request, so the same key (§133.3 C2).
  const lastAttempt = useRef<(() => void) | null>(null);
  const create = useApiMutation<OrderFormPayload, Order>(
    (payload) => OrdersClient.createOrder(payload, keyFor(payload)),
    {
      revalidate: [apiRoutes.orders.list, apiRoutes.products.list],
      onError: (failure) => {
        const refusal = stockRefusal(failure);
        if (refusal) return respond.error(refusal);
        respond.failure(failure, {
          title: UI_TEXT.outcomes.orderNotPlaced,
          fallback: "SAVE_FAILED",
          retry: () => lastAttempt.current?.(),
        });
      },
    },
  );

  const preview = useApiMutation<OrderFormPayload, OrderEstimate>((payload) => OrdersClient.preview(payload), {
    onError: (failure) => {
      setEstimating(false);
      respond.failure(failure, { title: UI_TEXT.orderDetail.billNotBuilt, fallback: "RECEIPT_LOAD_FAILED" });
    },
  });

  // The cart bar rises in with the first item, not when a kept draft loads.
  const cartArrived = useArrived(draft !== null && itemCount(draft) > 0, draft !== null);
  // On a phone each step comes in from the side it lies on (the grid shows
  // them all from 1024 px, and stays still).
  const stepRegion = useRef<HTMLDivElement>(null);
  useTravelMotion(stepRegion, STEPS.indexOf(step), "(min-width: 1024px)");

  if (!draft) {
    return (
      <div role="status" aria-busy="true" aria-label={text.title}>
        <SkeletonRows rows={3} height="h-32" />
      </div>
    );
  }

  const parsed = orderFormSchema.safeParse(draftForm(draft));
  const issues = parsed.success ? {} : issuesByPath(parsed.error);
  const errors = tried ? within(issues, tried) : {};
  const totals = draftTotals(draft, (id) => productsById.get(id)?.defaultPrice);
  const count = itemCount(draft);
  const paidNow =
    draft.payment.status === "PAID"
      ? totals.total
      : draft.payment.status === "PARTIALLY_PAID"
        ? (parseRupees(draft.payment.amount) ?? 0)
        : 0;

  const goTo = (next: Step) => router.push(next === "items" ? ROUTE : `${ROUTE}?step=${next}`);

  /** Moves on when this step has nothing left to put right; otherwise shows what. */
  const passes = (at: Step) => {
    setTried(at);
    return Object.keys(within(issues, at)).length === 0;
  };

  const choose = (customer: DraftCustomer) => update((current) => chooseCustomer(current, customer));

  const pick = (picked: PickedCustomer<Customer>) =>
    choose(picked.kind === "GUEST" ? picked : customerForDraft(picked.customer));

  // The customer who already has the number typed for a new one.
  const takeExisting = async (customerId: string) => {
    try {
      choose(customerForDraft(await CustomersClient.get(customerId)));
    } catch (failure) {
      respond.failure(failure, { title: UI_TEXT.outcomes.customerNotChosen, fallback: "CUSTOMER_LOAD_FAILED" });
    }
  };

  const confirmClear = async () => {
    if (
      await respond.confirm({
        title: text.clearTitle,
        message: text.clearBody,
        confirmLabel: text.clearAll,
        cancelLabel: UI_TEXT.outcomes.keepEditing,
        tone: "danger",
      })
    ) {
      clear();
      setTried(null);
      router.replace(ROUTE);
    }
  };

  /** Shows every issue, and on a phone goes back to the first step that has one. */
  const putRight = () => {
    setTried("payment");
    const first = STEPS.find((at) => Object.keys(within(issues, at)).length > 0);
    if (first && first !== step && window.matchMedia?.("(min-width: 1024px)").matches !== true) goTo(first);
  };

  /** The bill before the order exists: the server prices the draft and stores nothing (§139.11.5). */
  const viewBill = async () => {
    if (!parsed.success) return putRight();
    setEstimate(undefined);
    setEstimating(true);
    const priced = await preview.submit(parsed.data);
    if (priced) setEstimate(priced);
  };

  const place = async () => {
    if (!parsed.success) return putRight();
    const who = draft.customer?.kind === "CUSTOMER" ? draft.customer.name : UI_TEXT.orders.guest;
    const payload = parsed.data;
    const attempt = async () => {
      lastAttempt.current = () => void attempt();
      const order = await create.submit(payload);
      if (!order) return;
      clear();
      setTried(null);
      router.replace(ROUTE);
      respond.success({
        title: text.placed,
        message: text.placedBody(order.orderNumber),
        facts: [
          { label: text.factOrder, value: order.orderNumber },
          { label: text.factCustomer, value: who },
          { label: text.factTotal, value: formatPaise(order.pricing.total) },
        ],
        primary: {
          label: UI_TEXT.bill.view,
          onClick: () => setPlacedBill({ id: order.id, orderNumber: order.orderNumber }),
        },
        secondary: { label: text.newOrder },
        autoClose: false,
      });
    };
    await attempt();
  };

  const header =
    step === "details"
      ? {
          title: text.detailsTitle,
          subtitle: text.detailsSubtitle,
          back: ROUTE,
        }
      : step === "payment"
        ? {
            title: text.paymentTitle,
            subtitle: text.paymentSubtitle,
            back: `${ROUTE}?step=details`,
          }
        : { title: text.title, subtitle: text.itemsSubtitle, back: "/orders" };

  const placeButton = (
    <Button
      label={text.placeOrder}
      variant="action"
      size="lg"
      fullWidth
      loading={create.submitting}
      disabled={count === 0}
      onClick={() => void place()}
    />
  );

  return (
    <>
      <div className="lg:hidden">
        <PageHeader title={header.title} subtitle={header.subtitle} back={header.back} />
      </div>
      <div className="hidden lg:block">
        <PageHeader title={text.title} subtitle={text.itemsSubtitle} back="/orders" />
      </div>
      <p aria-live="polite" className="sr-only">
        {header.title}
      </p>

      <div
        ref={stepRegion}
        className="relative grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start"
      >
        <div className={cn("space-y-4", step !== "items" && "step-away")}>
          <ItemsPanel
            products={onSale}
            loading={products.isLoading}
            quantityOf={(productId) => quantityOf(draft, productId)}
            onAdd={(productId) => update((current) => addProduct(current, productId))}
            onRemove={(productId) => update((current) => removeProduct(current, productId))}
            onAddCustom={() => setAddingCustom(true)}
          />
          {count > 0 && (
            <StepBar>
              <CartBar
                count={count}
                countLabel={text.itemsCount(count)}
                label={text.viewOrder}
                total={totals.total}
                arriving={cartArrived}
                actionLabel={text.continueToDetails}
                onAction={() => passes("items") && goTo("details")}
              />
            </StepBar>
          )}
        </div>

        <aside
          aria-label={text.detailsTitle}
          className={cn(
            "space-y-8 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6 lg:shadow-card",
            step === "items" && "step-away",
          )}
        >
          <div className="hidden items-center justify-between lg:flex">
            <h2 className="font-heading text-2xl font-medium text-text">{text.detailsTitle}</h2>
            {count > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                label={text.clearAll}
                onClick={() => void confirmClear()}
              />
            )}
          </div>

          <div className={cn(step === "payment" && "step-away")}>
            <DetailsPanel
              draft={draft}
              products={productsById}
              errors={errors}
              update={update}
              onChooseCustomer={() => setPicking(true)}
              onNewCustomer={() => setAddingCustomer(true)}
              onAddMore={() => goTo("items")}
            />
          </div>

          <div className={cn(step !== "payment" && "step-away")}>
            <PaymentPanel payment={draft.payment} errors={errors} update={update} />
          </div>

          <OrderSummary
            itemCount={count}
            totals={totals}
            adjustments={draft.adjustments}
            paid={step === "payment" || draft.payment.status !== "UNPAID" ? paidNow : undefined}
            onViewBill={count > 0 ? () => void viewBill() : undefined}
          />

          {/* Always in reach while the panel scrolls. */}
          <div className="hidden lg:sticky lg:-bottom-6 lg:-mx-6 lg:block lg:border-t lg:border-border lg:bg-surface lg:px-6 lg:py-4">
            {placeButton}
          </div>

          <StepBar>
            {step === "details" ? (
              <Button
                label={text.proceedToPayment}
                icon={ArrowRight}
                iconPosition="end"
                variant="action"
                size="lg"
                fullWidth
                onClick={() => passes("details") && goTo("payment")}
              />
            ) : (
              placeButton
            )}
          </StepBar>

          {count > 0 && (
            <div className="lg:hidden">
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                label={text.clearAll}
                onClick={() => void confirmClear()}
              />
            </div>
          )}
        </aside>
      </div>

      <CustomerPicker
        open={picking}
        onClose={() => setPicking(false)}
        customers={customers.data}
        search={customerSearch}
        onSearch={setCustomerSearch}
        more={customers}
        value={
          draft.customer &&
          (draft.customer.kind === "GUEST" ? { kind: "GUEST" } : { kind: "CUSTOMER", id: draft.customer.id })
        }
        onPick={pick}
        onAddNew={() => {
          setPicking(false);
          setAddingCustomer(true);
        }}
      />
      <CustomerFormSheet
        isOpen={addingCustomer}
        onClose={() => setAddingCustomer(false)}
        onSuccess={(customer) => choose(customerForDraft(customer))}
        onUseExisting={(customerId) => void takeExisting(customerId)}
      />
      <CustomItemSheet
        open={addingCustom}
        onClose={() => setAddingCustom(false)}
        onAdd={(item) => update((current) => addCustom(current, item))}
      />
      <EstimateBill
        open={estimating}
        estimate={estimate}
        onClose={() => setEstimating(false)}
        placing={create.submitting}
        onPlace={() => {
          setEstimating(false);
          void place();
        }}
      />
      <OrderBill
        orderId={placedBill?.id ?? ""}
        orderNumber={placedBill?.orderNumber ?? ""}
        open={placedBill !== null}
        onClose={() => setPlacedBill(null)}
      />
    </>
  );
}
