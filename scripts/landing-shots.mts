/**
 * The landing page's screenshots (`src/assets/landing/`, plan §139.11.22): a
 * demo business made for them through the app's own functions, given a month
 * of orders, photographed in the built app, and deleted again.
 *
 *   npm run build && npx next start -p 3100          (in another terminal)
 *   npx tsx --env-file=.env.local scripts/landing-shots.mts
 *
 * Local only: it refuses a hosted Supabase, as the integration tests do, and
 * sends no mail. Whatever it made is deleted even when a step fails.
 */
import { randomInt, randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";
import sharp from "sharp";

const APP = process.env.LANDING_APP_URL ?? "http://localhost:3100";
const OUT = join(process.cwd(), "src/assets/landing");
const WORK = join(process.cwd(), ".landing-shots");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(supabaseUrl)) {
  throw new Error(
    `The landing shots are made only against a local Supabase, not ${supabaseUrl || "an unset address"}.`,
  );
}
// No mail: the demo's confirmation fails quietly, as it does when mail is down.
process.env.SMTP_HOST = "";

const { register, login } = await import("@/features/auth/api");
const { createCustomer } = await import("@/features/customers/api");
const { createExpense } = await import("@/features/expenses/api");
const { logInventoryTransaction } = await import("@/features/inventory/api");
const { createOrder } = await import("@/features/orders/checkout");
const { updateOrderStatus } = await import("@/features/orders/status");
const { createProduct } = await import("@/features/products/api");
const { createSupabaseAnonClient, createSupabaseServiceRoleClient } = await import("@/lib/supabase/server");
const validation = await import("@/lib/validation");

type Tenant = import("@/lib/supabase/tenant").Tenant;

const admin = createSupabaseServiceRoleClient();
const DAY_MS = 86_400_000;
const phone = `9${randomInt(100_000_000, 1_000_000_000)}`;
const password = `Demo-${randomUUID()}`;

/** A time `days` ago at `hour`:`minute` in India, where the demo business is. */
function daysAgo(days: number, hour = 11, minute = 0): Date {
  const india = new Date(Date.now() + 5.5 * 3_600_000);
  const day = Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate(), hour, minute);
  return new Date(day - 5.5 * 3_600_000 - days * DAY_MS);
}

const PRODUCTS = [
  {
    key: "choc",
    name: "Belgian Chocolate Cake (1 kg)",
    price: 1_450_00,
    unit: "kg",
    icon: "chocolate-cake-slice",
    stock: 14,
  },
  { key: "cheese", name: "Blueberry Cheesecake (500 g)", price: 950_00, unit: "piece", icon: "glazed-cake", stock: 7 },
  { key: "cupcake", name: "Red Velvet Cupcakes (box of 6)", price: 480_00, unit: "box", icon: "cupcake", stock: 30 },
  { key: "brownie", name: "Fudgy Brownie Box (4 pcs)", price: 380_00, unit: "box", icon: "cake-squares", stock: 34 },
  {
    key: "muffin",
    name: "Choco-chip Muffins (box of 4)",
    price: 320_00,
    unit: "box",
    icon: "choco-chip-muffin",
    stock: 26,
  },
  {
    key: "strawberry",
    name: "Strawberry Cream Cake (1 kg)",
    price: 1_300_00,
    unit: "kg",
    icon: "strawberry-cake",
    stock: 10,
  },
  { key: "hamper", name: "Festive Gift Hamper", price: 1_800_00, unit: "set", icon: "gift-box-red", stock: 16 },
  { key: "bouquet", name: "Rose Bouquet (12 stems)", price: 900_00, unit: "bunch", icon: "rose-bouquet", stock: 12 },
] as const;
type ProductKey = (typeof PRODUCTS)[number]["key"];

const CUSTOMERS = [
  { key: "meera", name: "Meera Iyer", address: "14, 3rd Cross, Indiranagar", since: 40 },
  { key: "rahul", name: "Rahul Verma", address: "22 Palm Grove, Koramangala", since: 36 },
  { key: "farida", name: "Farida Khan", address: "7 Lake View Road, HSR Layout", since: 33 },
  { key: "anu", name: "Anu Sharma", address: "Flat 402, Brigade Residency, Whitefield", since: 31 },
  { key: "joseph", name: "Joseph D’Souza", address: "9 Church Street", since: 24 },
  { key: "kavya", name: "Kavya Reddy", address: "118 MG Road", since: 18 },
  { key: "vikram", name: "Vikram Nair", address: "5 Sunrise Enclave, JP Nagar", since: 9 },
  { key: "sana", name: "Sana Qureshi", address: "31 Rose Garden, Frazer Town", since: 3 },
] as const;
type CustomerKey = (typeof CUSTOMERS)[number]["key"] | "guest";

interface Plan {
  who: CustomerKey;
  items: [ProductKey, number][];
  /** Placed this many days ago. */
  placed: number;
  /** Due this many days from today; negative is past. */
  due: number;
  status: "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED";
  paid: "PAID" | "UNPAID" | number;
  delivery?: boolean;
}

// A month of orders: most delivered and paid, some owed, and what is open now
// — one a day late, three due today, two tomorrow, the rest later this week.
const HISTORY: Plan[] = [
  [29, "meera", [["choc", 1]]],
  [28, "guest", [["cupcake", 2]]],
  [27, "rahul", [["brownie", 3]]],
  [
    26,
    "farida",
    [
      ["cheese", 1],
      ["muffin", 1],
    ],
  ],
  [25, "anu", [["hamper", 1]]],
  [24, "guest", [["muffin", 2]]],
  [23, "meera", [["strawberry", 1]]],
  [
    22,
    "joseph",
    [
      ["cupcake", 1],
      ["brownie", 1],
    ],
  ],
  [21, "guest", [["brownie", 2]]],
  [20, "rahul", [["choc", 1]]],
  [19, "kavya", [["bouquet", 1]]],
  [18, "anu", [["cupcake", 2]]],
  [17, "guest", [["cheese", 1]]],
  [16, "farida", [["hamper", 1]]],
  [
    15,
    "meera",
    [
      ["brownie", 2],
      ["muffin", 1],
    ],
  ],
  [14, "joseph", [["strawberry", 1]]],
  [13, "guest", [["cupcake", 1]]],
  [12, "kavya", [["choc", 1]]],
  [11, "rahul", [["muffin", 2]]],
  [
    10,
    "anu",
    [
      ["bouquet", 1],
      ["cupcake", 1],
    ],
  ],
  [9, "vikram", [["hamper", 2]]],
  [8, "guest", [["brownie", 3]]],
  [7, "meera", [["cheese", 1]]],
  [
    6,
    "farida",
    [
      ["choc", 1],
      ["cupcake", 1],
    ],
  ],
  [5, "joseph", [["muffin", 1]]],
  [4, "kavya", [["strawberry", 1]]],
  [3, "guest", [["cupcake", 2]]],
  [2, "rahul", [["hamper", 1]]],
].map(([placed, who, items], at) => ({
  who: who as CustomerKey,
  items: items as [ProductKey, number][],
  placed: placed as number,
  due: -(placed as number) + 1,
  status: "DELIVERED" as const,
  // Most are paid; a few are still owed, in part or whole.
  paid: at % 9 === 4 ? 200_00 : at % 11 === 7 ? ("UNPAID" as const) : ("PAID" as const),
  delivery: at % 3 === 0,
}));

const OPEN: Plan[] = [
  { who: "vikram", items: [["choc", 1]], placed: 4, due: -1, status: "READY", paid: 500_00, delivery: true },
  {
    who: "meera",
    items: [
      ["strawberry", 1],
      ["cupcake", 1],
    ],
    placed: 3,
    due: 0,
    status: "READY",
    paid: "PAID",
  },
  { who: "anu", items: [["hamper", 2]], placed: 2, due: 0, status: "IN_PROGRESS", paid: 1_000_00, delivery: true },
  { who: "guest", items: [["brownie", 2]], placed: 1, due: 0, status: "PENDING", paid: "UNPAID" },
  { who: "sana", items: [["cheese", 1]], placed: 1, due: 1, status: "PENDING", paid: "UNPAID" },
  {
    who: "kavya",
    items: [
      ["cupcake", 2],
      ["muffin", 1],
    ],
    placed: 0,
    due: 1,
    status: "PENDING",
    paid: "PAID",
  },
  { who: "farida", items: [["choc", 1]], placed: 0, due: 3, status: "PENDING", paid: 700_00, delivery: true },
  {
    who: "joseph",
    items: [
      ["bouquet", 1],
      ["hamper", 1],
    ],
    placed: 0,
    due: 4,
    status: "PENDING",
    paid: "UNPAID",
  },
];

const EXPENSES = [
  [28, "Ingredients", "Flour, butter and sugar — monthly stock", 4_200_00, "UPI"],
  [26, "Packaging", "Cake boxes and cupcake inserts", 1_650_00, "UPI"],
  [23, "Ingredients", "Cream cheese and blueberries", 1_980_00, "CARD"],
  [20, "Utilities", "Gas cylinder", 1_100_00, "CASH"],
  [17, "Ingredients", "Belgian chocolate, 2 kg", 2_400_00, "UPI"],
  [14, "Delivery", "Deliveries this fortnight", 860_00, "UPI"],
  [11, "Marketing", "Festive offer on Instagram", 1_000_00, "CARD"],
  [8, "Packaging", "Hamper baskets and ribbon", 1_350_00, "UPI"],
  [5, "Ingredients", "Fresh cream and strawberries", 1_520_00, "UPI"],
  [2, "Equipment", "Piping nozzles set", 740_00, "CARD"],
] as const;

async function build(): Promise<{ userId: string; shots: { customerId: string; orderId: string } }> {
  const registration = validation.registerSchema.parse({
    name: "Asha Menon",
    phone,
    email: `demo-${randomUUID().slice(0, 12)}@brio.test`,
    password,
    confirmPassword: password,
    businessName: "Asha’s Home Bakes",
    tagline: "Cakes, bakes and gift boxes",
    city: "Bengaluru",
    address: "12 Lake Road, Indiranagar",
  });
  const { userId, bakeryId } = await register(admin, registration);
  // Welcomed, and the email confirmed: the photographs show the app, not a first visit.
  const since = daysAgo(45).toISOString();
  await admin.from("profiles").update({ welcomed_at: since, email_confirmed_at: since }).eq("id", userId);
  const session = await login(createSupabaseAnonClient(), validation.loginSchema.parse({ phone, password }));
  const tenant: Tenant = { supabase: createSupabaseAnonClient(session.accessToken), bakeryId, actorId: userId };
  try {
    return { userId, shots: await fill(tenant) };
  } catch (error) {
    await remove(userId);
    throw error;
  }
}

async function fill(tenant: Tenant) {
  const products = new Map<ProductKey, string>();
  for (const product of PRODUCTS) {
    const made = await createProduct(
      tenant,
      validation.createProductSchema.parse({
        name: product.name,
        defaultPrice: product.price,
        unit: product.unit,
        iconKey: product.icon,
      }),
    );
    products.set(product.key, made.id);
    await logInventoryTransaction(
      tenant,
      validation.logInventoryTransactionSchema.parse({ productId: made.id, type: "STOCK_IN", quantity: product.stock }),
    );
  }

  const customers = new Map<CustomerKey, string>();
  for (const customer of CUSTOMERS) {
    const made = await createCustomer(
      tenant,
      validation.createCustomerSchema.parse({
        name: customer.name,
        phone: `9${randomInt(100_000_000, 1_000_000_000)}`,
        address: customer.address,
      }),
    );
    customers.set(customer.key, made.id);
    await admin
      .from("customers")
      .update({ created_at: daysAgo(customer.since).toISOString() })
      .eq("id", made.id);
  }

  let billed = "";
  for (const [at, plan] of [...HISTORY, ...OPEN].entries()) {
    const person = plan.who === "guest" ? undefined : customers.get(plan.who);
    const payment =
      plan.paid === "PAID"
        ? { status: "PAID", method: at % 4 === 0 ? "CASH" : "UPI" }
        : plan.paid === "UNPAID"
          ? { status: "UNPAID" }
          : { status: "PARTIALLY_PAID", amount: plan.paid, method: "UPI" };
    const order = await createOrder(
      tenant,
      validation.createOrderSchema.parse({
        customer: person ? { kind: "CUSTOMER", id: person } : { kind: "GUEST" },
        items: plan.items.map(([key, quantity]) => ({ productId: products.get(key), quantity })),
        delivery: plan.delivery
          ? { type: "DELIVERY", date: daysAgo(-1, 17).toISOString(), address: "Delivered to the door" }
          : { type: "PICKUP", date: daysAgo(-1, 17).toISOString() },
        payment,
      }),
      randomUUID(),
    );
    if (plan.status !== "PENDING") {
      await updateOrderStatus(tenant, order.id, validation.updateOrderStatusSchema.parse({ status: plan.status }));
    }
    const placed = daysAgo(plan.placed, 10 + (at % 8), (at * 17) % 60).toISOString();
    await admin
      .from("orders")
      .update({ created_at: placed, delivery_date: daysAgo(-plan.due, 16 + (at % 3)).toISOString() })
      .eq("id", order.id);
    await admin.from("payments").update({ created_at: placed }).eq("order_id", order.id);
    if (plan.who === "meera" && plan.status === "READY") billed = order.id;
  }

  for (const [days, category, description, amount, method] of EXPENSES) {
    await createExpense(
      tenant,
      validation.createExpenseSchema.parse({
        category,
        description,
        amount,
        expenseDate: daysAgo(days).toISOString().slice(0, 10),
        paymentMethod: method,
      }),
    );
  }
  return { customerId: customers.get("meera")!, orderId: billed };
}

async function remove(userId: string) {
  const { error } = await admin.rpc("delete_account", { p_user_id: userId });
  if (error) console.error(`The demo account ${userId} was not deleted: ${error.message}`);
}

async function signedIn(browser: Browser, width: number, height: number, scale: number): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const answer = await context.request.post(`${APP}/api/auth/login`, { data: { phone, password } });
  if (!answer.ok()) throw new Error(`The demo could not sign in to ${APP}: ${answer.status()}`);
  return context.newPage();
}

async function settle(page: Page, path?: string) {
  if (path) await page.goto(`${APP}${path}`);
  await page.waitForLoadState("networkidle");
  // The figures roll and the charts draw in; let them land.
  await page.waitForTimeout(1_200);
}

/**
 * The phone the screens are shown on (the user: "a phone like framed
 * screenshot like with iphone 18 pro"): a current Pro phone's screen in
 * points, with the status bar its Dynamic Island sits in and the home
 * indicator's strip. The app is photographed in the space between, and the
 * two are drawn on in the colour of the screen's own top and foot, so the
 * frame on the page (`PhoneFrame`) closes round a whole screen.
 */
const PHONE = { width: 402, height: 874, top: 62, bottom: 34, scale: 2 } as const;
const PHONE_VIEW = { width: PHONE.width, height: PHONE.height - PHONE.top - PHONE.bottom };

/** The colour of a screenshot's row `y`, a few pixels in from the left edge. */
async function colourAt(file: string, y: number): Promise<{ r: number; g: number; b: number }> {
  const { data } = await sharp(file)
    .extract({ left: 6, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

const hex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
/** Dark marks on a light ground, light on a dark one. */
const inkOn = ({ r, g, b }: { r: number; g: number; b: number }) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? "#1c140f" : "#fbf7f0";

/** The status bar, drawn at 2×: the time in the left shoulder, signal, Wi-Fi and battery in the right. */
function statusBar(width: number, height: number, ground: string, ink: string): Buffer {
  const mid = 59;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${ground}"/>
  <text x="134" y="${mid + 12}" text-anchor="middle" font-family="SF Pro Text, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="34" font-weight="600" fill="${ink}" letter-spacing="-0.5">9:41</text>
  <g fill="${ink}">
    <rect x="596" y="${mid + 3}" width="6" height="9" rx="2"/>
    <rect x="606" y="${mid - 2}" width="6" height="14" rx="2"/>
    <rect x="616" y="${mid - 7}" width="6" height="19" rx="2"/>
    <rect x="626" y="${mid - 12}" width="6" height="24" rx="2"/>
  </g>
  <g fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round">
    <path d="M 646 ${mid - 4} A 24 24 0 0 1 678 ${mid - 4}"/>
    <path d="M 653 ${mid + 3} A 14 14 0 0 1 671 ${mid + 3}"/>
  </g>
  <circle cx="662" cy="${mid + 10}" r="3.6" fill="${ink}"/>
  <rect x="694" y="${mid - 12}" width="50" height="24" rx="7.5" fill="none" stroke="${ink}" stroke-opacity="0.4" stroke-width="2.4"/>
  <rect x="698" y="${mid - 8}" width="36" height="16" rx="4.5" fill="${ink}"/>
  <path d="M 747 ${mid - 4} q 4 4 0 8" fill="none" stroke="${ink}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
</svg>`);
}

/** The home indicator's strip, drawn at 2×. */
function homeStrip(width: number, height: number, ground: string, ink: string): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${ground}"/>
  <rect x="${(width - 268) / 2}" y="${height - 26}" width="268" height="10" rx="5" fill="${ink}"/>
</svg>`);
}

/** A phone photograph as the whole screen: status bar, the app, and the home indicator. */
async function asPhoneScreen(file: string): Promise<Buffer> {
  const { width, height } = await sharp(file).metadata();
  const top = PHONE.top * PHONE.scale;
  const bottom = PHONE.bottom * PHONE.scale;
  const head = await colourAt(file, 1);
  const foot = await colourAt(file, height! - 2);
  return sharp({ create: { width: width!, height: height! + top + bottom, channels: 3, background: hex(head) } })
    .composite([
      { input: statusBar(width!, top, hex(head), inkOn(head)), top: 0, left: 0 },
      { input: file, top, left: 0 },
      { input: homeStrip(width!, bottom, hex(foot), inkOn(foot)), top: top + height!, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function photograph(shots: { customerId: string; orderId: string }) {
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });
  const browser = await chromium.launch();
  try {
    const phonePage = await signedIn(browser, PHONE_VIEW.width, PHONE_VIEW.height, PHONE.scale);
    for (const [name, path] of [
      ["home", "/"],
      ["analytics", "/analytics"],
      ["customer", `/customers/${shots.customerId}`],
      ["inventory", "/inventory"],
    ] as const) {
      await settle(phonePage, path);
      await phonePage.screenshot({ path: join(WORK, `${name}.png`) });
    }

    await settle(phonePage, "/orders/new");
    for (const name of [PRODUCTS[1].name, PRODUCTS[2].name, PRODUCTS[2].name]) {
      await phonePage.getByRole("button", { name: `Add ${name}` }).click();
    }
    // Back to the top, so the screen shows what it is with the order building below.
    await phonePage.evaluate(() => window.scrollTo(0, 0));
    await settle(phonePage);
    await phonePage.screenshot({ path: join(WORK, "new-order.png") });

    await settle(phonePage, `/orders/${shots.orderId}`);
    await phonePage.getByRole("button", { name: "View bill" }).first().click();
    await settle(phonePage);
    await phonePage.screenshot({ path: join(WORK, "bill.png") });

    const desk = await signedIn(browser, 1440, 900, 1.5);
    await settle(desk, "/");
    await desk.screenshot({ path: join(WORK, "desktop-home.png") });
  } finally {
    await browser.close();
  }

  await mkdir(OUT, { recursive: true });
  for (const name of ["home", "analytics", "customer", "inventory", "new-order", "bill"]) {
    await sharp(await asPhoneScreen(join(WORK, `${name}.png`)))
      .webp({ quality: 80, effort: 6 })
      .toFile(join(OUT, `${name}.webp`));
  }
  await sharp(join(WORK, "desktop-home.png")).webp({ quality: 80, effort: 6 }).toFile(join(OUT, "desktop-home.webp"));
  await rm(WORK, { recursive: true, force: true });
}

const { userId, shots } = await build();
try {
  await photograph(shots);
  console.log(`Landing shots written to ${OUT}`);
} finally {
  await remove(userId);
}
