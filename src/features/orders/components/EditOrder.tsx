"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Button, LinkButton } from "@/components/ui/button";
import { CartBar } from "@/components/ui/cart-bar";
import { cn } from "@/components/ui/cn";
import { CustomerPicker, type PickedCustomer } from "@/components/ui/customer-picker";
import { lazySheet } from "@/components/ui/lazy-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import { CustomersClient } from "@/features/customers/api.client";
import type { Customer, CustomerListItem } from "@/features/customers/types";
import type { Product } from "@/features/products/types";
import { useArrived } from "@/hooks/useArrived";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTravelMotion } from "@/hooks/useTravelMotion";
import { errorMessage } from "@/lib/errors/errorMessage";
import { pushUrl } from "@/lib/navigation/url";
import { startNavigation } from "@/lib/navigation/pending";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiPages } from "@/lib/query/useApiPages";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { editOrderFormSchema, type EditOrderFormPayload } from "@/lib/validation";

import { OrdersClient } from "../api.client";
import {
  addCustom,
  addProduct,
  chooseCustomer,
  customerForDraft,
  draftTotals,
  editDraft,
  editForm,
  itemCount,
  quantityOf,
  removeProduct,
  type DraftCustomer,
  type OrderDraft,
} from "../draft";
import { isFinal } from "../lifecycle";
import { issuesByPath, readStep, stockRefusal, within, type Step } from "../steps";
import type { Order } from "../types";
import { DetailsPanel } from "./DetailsPanel";
import { ItemsPanel } from "./ItemsPanel";
import { OrderSummary } from "./OrderSummary";
import { StepBar } from "./StepBar";

/** Kept out of the screen's first download, and fetched once it is idle (`lazySheet`). */
const CustomerFormSheet = lazySheet(
  () => import("@/features/customers/components/CustomerFormSheet").then((module) => module.CustomerFormSheet),
  (props) => props.isOpen,
);
const CustomItemSheet = lazySheet(
  () => import("./CustomItemSheet").then((module) => module.CustomItemSheet),
  (props) => props.open,
);

/** Changing an order has no payment step: what has been paid stays on the order. */
const EDIT_STEPS: readonly Step[] = ["items", "details"];

/** Who a Guest order is for, as the draft holds it. */
const GUEST: DraftCustomer = { kind: "GUEST" };

/**
 * Changing an open order (plan §139.11.13), on the create screen's own parts:
 * the product grid and custom items — to add to it — then its items with
 * their steppers, who it is for, how and when it is handed over, and its
 * discounts and charges, then **Save changes**. A line already on the order
 * keeps the price it was ordered at; one added now takes today's. On a phone
 * each step is its own page, `?step=`; from 1024 px the grid sits beside one
 * panel holding the rest.
 *
 * What has been paid is not changed here — payments are collected on the
 * order — so the summary shows it, and the balance the changes leave. The
 * changes live on this screen until they are saved; a finished order cannot
 * be changed, and says so.
 */
export function EditOrder({ id }: { id: string }) {
  const text = UI_TEXT.editOrder;
  const order = useApiQuery<Order>(apiRoutes.orders.detail(id));
  // A Guest order has no customer to read.
  const customerId = order.data?.customerId;
  const customer = useApiQuery<Customer>(customerId ? apiRoutes.customers.detail(customerId) : null);

  const current = order.data;
  if (!current) {
    return order.error ? (
      <Unread
        error={errorMessage(order.error, "ORDER_LOAD_FAILED")}
        retrying={order.isValidating}
        retry={() => void order.mutate()}
      />
    ) : (
      <Loading />
    );
  }

  if (isFinal(current.status)) {
    return (
      <section className="space-y-4">
        <PageHeader title={text.title(current.orderNumber)} back={`/orders/${id}`} />
        <ScreenNotice tone="info">{text.finished}</ScreenNotice>
        <LinkButton href={`/orders/${id}`} label={text.backToOrder} variant="secondary" />
      </section>
    );
  }

  // The changes begin from the order as it stands, and who it is for.
  const who = current.customerId ? customer.data && customerForDraft(customer.data) : GUEST;
  if (!who) {
    return customer.error ? (
      <Unread
        error={errorMessage(customer.error, "CUSTOMER_LOAD_FAILED")}
        retrying={customer.isValidating}
        retry={() => void customer.mutate()}
      />
    ) : (
      <Loading />
    );
  }

  return <Editor order={current} customer={who} />;
}

/** The order being changed: begun once from the order as it stood, and kept on this screen until it is saved. */
function Editor({ order, customer }: { order: Order; customer: DraftCustomer }) {
  const text = UI_TEXT.editOrder;
  const id = order.id;
  const route = `/orders/${id}/edit`;
  const step = readStep(useSearchParams().get("step"), EDIT_STEPS);
  const router = useRouter();
  const respond = useResponse();

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

  const [draft, setDraft] = useState(() => editDraft(order, customer));
  const update = (change: (draft: OrderDraft) => OrderDraft) => setDraft(change);
  const [tried, setTried] = useState<Step | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);

  // What Try again repeats.
  const lastAttempt = useRef<(() => void) | null>(null);
  const save = useApiMutation<EditOrderFormPayload, Order>((payload) => OrdersClient.updateOrder(id, payload), {
    revalidate: [
      apiRoutes.orders.detail(id),
      apiRoutes.orders.list,
      apiRoutes.orders.counts,
      apiRoutes.products.list,
      apiRoutes.dashboard,
    ],
    onError: (failure) => {
      const refusal = stockRefusal(failure, UI_TEXT.outcomes.changesNotSaved);
      if (refusal) return respond.error(refusal);
      respond.failure(failure, {
        title: UI_TEXT.outcomes.changesNotSaved,
        fallback: "ORDER_UPDATE_FAILED",
        retry: () => lastAttempt.current?.(),
      });
    },
  });

  const count = itemCount(draft);
  const cartArrived = useArrived(count > 0);
  const stepRegion = useRef<HTMLDivElement>(null);
  useTravelMotion(stepRegion, EDIT_STEPS.indexOf(step), "(min-width: 1024px)");

  const parsed = editOrderFormSchema.safeParse(editForm(draft));
  const issues = parsed.success ? {} : issuesByPath(parsed.error);
  const errors = tried ? within(issues, tried) : {};
  const totals = draftTotals(draft, (productId) => productsById.get(productId)?.defaultPrice);

  // A step is the same screen: the address changes, and the server is not asked again.
  const goTo = (next: Step) => pushUrl(next === "items" ? route : `${route}?step=${next}`);

  const choose = (chosen: DraftCustomer) => update((draft) => chooseCustomer(draft, chosen));
  const pick = (picked: PickedCustomer<Customer>) =>
    choose(picked.kind === "GUEST" ? picked : customerForDraft(picked.customer));
  // The customer who already has the number typed for a new one.
  const takeExisting = async (existingId: string) => {
    try {
      choose(customerForDraft(await CustomersClient.get(existingId)));
    } catch (failure) {
      respond.failure(failure, { title: UI_TEXT.outcomes.customerNotChosen, fallback: "CUSTOMER_LOAD_FAILED" });
    }
  };

  /** Shows every issue, and on a phone goes back to the first step that has one. */
  const putRight = () => {
    setTried("details");
    const first = EDIT_STEPS.find((at) => Object.keys(within(issues, at)).length > 0);
    if (first && first !== step && window.matchMedia?.("(min-width: 1024px)").matches !== true) goTo(first);
  };

  const submit = async () => {
    if (!parsed.success) return putRight();
    const payload = parsed.data;
    const attempt = async () => {
      lastAttempt.current = () => void attempt();
      const saved = await save.submit(payload);
      if (!saved) return;
      respond.success({ title: UI_TEXT.outcomes.orderUpdated, message: text.savedBody(saved.orderNumber) });
      startNavigation();
      router.replace(`/orders/${id}`);
    };
    await attempt();
  };

  const header =
    step === "details"
      ? { subtitle: text.detailsSubtitle, back: route }
      : { subtitle: text.itemsSubtitle, back: `/orders/${id}` };

  const saveButton = (
    <Button
      label={text.save}
      variant="action"
      size="lg"
      fullWidth
      loading={save.submitting}
      disabled={count === 0}
      onClick={() => void submit()}
    />
  );

  return (
    <>
      <div className="lg:hidden">
        <PageHeader title={text.title(order.orderNumber)} subtitle={header.subtitle} back={header.back} />
      </div>
      <div className="hidden lg:block">
        <PageHeader title={text.title(order.orderNumber)} subtitle={text.itemsSubtitle} back={`/orders/${id}`} />
      </div>

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
                countLabel={UI_TEXT.newOrder.itemsCount(count)}
                label={UI_TEXT.newOrder.viewOrder}
                total={totals.total}
                arriving={cartArrived}
                actionLabel={UI_TEXT.newOrder.continueToDetails}
                onAction={() => {
                  setTried("items");
                  if (Object.keys(within(issues, "items")).length === 0) goTo("details");
                }}
              />
            </StepBar>
          )}
        </div>

        <aside
          aria-label={UI_TEXT.newOrder.detailsTitle}
          className={cn(
            "space-y-8 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6 lg:shadow-card",
            step === "items" && "step-away",
          )}
        >
          <h2 className="hidden font-heading text-2xl font-medium text-text lg:block">
            {UI_TEXT.newOrder.detailsTitle}
          </h2>

          <DetailsPanel
            draft={draft}
            products={productsById}
            errors={errors}
            update={update}
            onChooseCustomer={() => setPicking(true)}
            onNewCustomer={() => setAddingCustomer(true)}
            onAddMore={() => goTo("items")}
          />

          <OrderSummary
            itemCount={count}
            totals={totals}
            adjustments={draft.adjustments}
            paid={order.payment.paid}
            paidLabel={text.paidSoFar}
          />

          {/* Always in reach while the panel scrolls. */}
          <div className="hidden lg:sticky lg:-bottom-6 lg:-mx-6 lg:block lg:border-t lg:border-border lg:bg-surface lg:px-6 lg:py-4">
            {saveButton}
          </div>

          <StepBar>{saveButton}</StepBar>
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
        onSuccess={(created) => choose(customerForDraft(created))}
        onUseExisting={(existingId) => void takeExisting(existingId)}
      />
      <CustomItemSheet
        open={addingCustom}
        onClose={() => setAddingCustom(false)}
        onAdd={(item) => update((current) => addCustom(current, item))}
      />
    </>
  );
}

/** The order, or its customer, could not be read: in the API's words, with Try again. */
function Unread({ error, retrying, retry }: { error: string; retrying: boolean; retry: () => void }) {
  return (
    <section className="space-y-4">
      <ScreenNotice>{error}</ScreenNotice>
      <Button label={UI_TEXT.actions.retry} variant="secondary" loading={retrying} onClick={retry} />
    </section>
  );
}

/** The screen's place while the order, or its customer, is on its way. */
function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label={UI_TEXT.orderDetail.loading}>
      <SkeletonRows rows={3} height="h-32" />
    </div>
  );
}
