# Home Bakery Management Platform
## Production-Grade Product, Architecture & Implementation Plan

---

## 1. Product Overview

A mobile-first internal business management application for home bakers.

The application helps a baker manage:

- Customers
- Products
- Orders
- Payments
- Inventory / stock
- Expenses
- Deliveries
- Receipts
- Notifications
- Analytics
- Business performance
- Audit logs
- System logs

A later phase will introduce a public **Menu Builder**, allowing each baker to create one public menu, publish it through a permanent QR code, and expose it as a static/ISR page without requiring customers to log in.

### Primary platforms

- Responsive Web App
- PWA
- Android App using Capacitor
- iOS can initially use the PWA
- Future native iOS support can be added if required

---

# 2. High-Level Architecture

```text
                         ┌───────────────────────────────┐
                         │          CLIENTS              │
                         │                               │
                         │ Web │ PWA │ Android/Capacitor │
                         └───────────────┬───────────────┘
                                         │
                                  Next.js App
                                         │
                   ┌─────────────────────┼─────────────────────┐
                   │                     │                     │
                UI Layer            API Layer              Public Menu
                   │                     │                     │
                   │                Controllers            SSG / ISR
                   │                     │                     │
                   │                Validation                 │
                   │                     │                     │
                   │                Service Layer              │
                   │                     │                     │
                   │          ┌──────────┼──────────┐          │
                   │          │          │          │          │
                   │       Orders     Inventory  Customers    │
                   │          │          │          │          │
                   │          └──────────┼──────────┘          │
                   │                     │                     │
                   │              Repository Layer             │
                   │                     │                     │
                   └─────────────────────┼─────────────────────┘
                                         │
                                  Supabase SDK
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
             PostgreSQL               Storage                  Auth
                 │
       ┌─────────┼───────────┐
       │         │           │
      RLS      Realtime     Jobs
                            │
                            ▼
                         Workers
                            │
              ┌─────────────┼──────────────┐
              │             │              │
        Notifications    Receipts      Analytics
```

---

# 3. Core Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS / component system |
| Forms | React Hook Form |
| Validation | Zod |
| Backend | Next.js API routes / route handlers |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Supabase RLS + application authorization |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Background jobs | PostgreSQL-backed job queue |
| Workers | Node.js worker process |
| Mobile | Capacitor |
| PWA | Next.js PWA |
| PDF receipts | Server-side PDF generation |
| QR | QR code generator |
| Public menu | Next.js SSG / ISR |
| Logging | Structured logger |
| Error handling | Centralized application errors |
| Audit | PostgreSQL audit table |
| Deployment | Web + worker independently deployable |

Redis is **not required initially**.

---

# 4. Architectural Philosophy

Start with a **modular monolith**.

Do not start with microservices.

The system should have clear module boundaries so individual modules can later be extracted if the scale requires it.

```text
Next.js Application
│
├── Auth
├── Customers
├── Products
├── Orders
├── Payments
├── Inventory
├── Expenses
├── Receipts
├── Notifications
├── Analytics
├── Audit
└── Menu
```

Each module should contain its own:

```text
types
constants
validation
repository
service
controller
events
errors
```

---

# 5. User Roles

Only two roles are required.

```text
BAKER
DEV
```

## BAKER

Can access:

- Own bakery
- Own customers
- Own products
- Own orders
- Own inventory
- Own expenses
- Own payments
- Own receipts
- Own notifications
- Own analytics
- Own menu

Cannot access another baker's business data.

## DEV

Can access:

- System logs
- Audit logs
- Worker status
- Application health
- Platform-level administration
- Debugging information

Developer access should still be controlled explicitly rather than assuming that DEV automatically means unrestricted business-data access.

---

# 6. Multi-Tenant Architecture

Every baker is treated as a tenant/business.

```text
Baker
 │
 ├── Customers
 ├── Products
 ├── Orders
 ├── Inventory
 ├── Expenses
 ├── Payments
 ├── Receipts
 ├── Notifications
 └── Analytics
```

Business tables should contain:

```text
bakery_id
```

Supabase Row Level Security must enforce tenant isolation.

Conceptually:

```text
Authenticated User
       │
       ▼
Profile
       │
       ▼
bakery_id
       │
       ▼
RLS Policy
       │
       ▼
Only own bakery records
```

---

# 7. Authentication

Bakers authenticate using:

```text
Phone Number
Password
```

Supabase Auth handles authentication.

Application profile:

```text
profiles
--------
id
phone
name
role
bakery_id
is_active
created_at
updated_at
```

Business:

```text
bakeries
--------
id
owner_id
business_name
logo
phone
address
currency
timezone
created_at
updated_at
```

Do not store all business information inside authentication metadata.

---

# 8. Application Modules

```text
Auth
Users
Baker Profile
Customers
Products
Categories
Orders
Payments
Inventory
Expenses
Deliveries
Receipts
Notifications
Analytics
Audit Logs
System Logs
Workers

Phase 2:
Menu Builder
Public Menu
```

---

# 9. Main Navigation

## Mobile

```text
Home
Orders
Customers
More
```

Inside More:

```text
Products
Inventory
Expenses
Analytics
Receipts
Settings
```

A global action button can provide:

```text
+ Add Order
+ Add Customer
+ Add Stock
+ Add Expense
```

## Tablet/Desktop

Use a responsive sidebar:

```text
Dashboard
Orders
Customers
Products
Inventory
Expenses
Analytics
Receipts
Settings
```

---

# 10. Dashboard

The dashboard should immediately answer:

> How is my bakery doing right now?

Example:

```text
TODAY

Orders             8
Revenue       ₹4,850
Pending             3
Delivered           5
Unpaid        ₹1,250
```

Sections:

- Today's orders
- Today's revenue
- Pending orders
- Upcoming deliveries
- Outstanding payments
- Low-stock products
- Recent customers
- Monthly performance

---

# 11. Customer Management

Customer creation:

```text
Name
Phone Number
Email       optional
Address     optional
Notes       optional
```

Database:

```text
customers
---------
id
bakery_id
name
phone
email
address
notes
created_at
updated_at
```

Unique constraint:

```text
(bakery_id, phone)
```

A baker can only see customers belonging to their bakery.

---

# 12. Customer Profile

Customer details page:

```text
John Mathew
+91 XXXXX XXXXX

Total Orders       18
Total Spent        ₹14,850
Pending Payments   ₹1,250
Average Order      ₹825
```

Show:

- First order
- Last order
- Total orders
- Total spending
- Average order value
- Outstanding payment
- Order history

This effectively provides lightweight CRM functionality.

---

# 13. Product Management

Use the term **Products** rather than generic Items.

Examples:

```text
Brownie
Chocolate Cake
Cupcake
Cookies
Red Velvet Cake
Cheesecake
```

Database:

```text
products
--------
id
bakery_id
category_id
name
description
default_price
unit
image
is_active
created_at
updated_at
```

Example:

```text
Brownie
₹50 / piece
```

---

# 14. Product Categories

```text
categories
----------
id
bakery_id
name
display_order
is_active
created_at
updated_at
```

Examples:

```text
Cakes
Brownies
Cookies
Cupcakes
Pastries
Custom
```

Categories will also be reused by the Menu Builder.

---

# 15. Order Architecture

Orders should use:

```text
orders
order_items
order_adjustments
payments
```

## orders

```text
orders
------
id
bakery_id
customer_id
order_number

status
payment_status

subtotal
discount
delivery_charge
tax
total

delivery_date
delivery_address
notes

created_at
updated_at
```

## order_items

```text
order_items
-----------
id
order_id
product_id

product_name
unit_price
quantity
subtotal
notes
```

Store product name and price as snapshots so historical orders remain correct when a product price changes.

---

# 16. Order Creation UX

Mobile order creation should be extremely fast.

```text
+ Add Order

Customer
[ Select Customer ▼ ]

Delivery Date
[ 24 Sep 2026 ]

Items

Brownie          [-] 3 [+]
Chocolate Cake   [-] 1 [+]

------------------------

Subtotal          ₹750
Discount          ₹50
Delivery          ₹100

------------------------

Total             ₹800

Payment
○ Paid
○ Unpaid

Status
Pending

[ Create Order ]
```

Allow:

```text
+ Add New Customer
```

without leaving the order flow.

---

# 17. Order Status

Recommended state machine:

```text
PENDING
   ↓
IN_PROGRESS
   ↓
IN_TRANSIT
   ↓
DELIVERED
```

Additional terminal state:

```text
CANCELLED
```

Do not allow arbitrary status changes.

Example:

```text
DELIVERED → PENDING
```

should normally be rejected.

---

# 18. Payment Status

Recommended:

```text
UNPAID
PARTIALLY_PAID
PAID
```

Although the initial UI can expose only Paid/Unpaid if simplicity is required.

Future payment table:

```text
payments
--------
id
order_id
amount
payment_method
reference
paid_at
created_at
```

This supports advance payments and partial payments.

---

# 19. Inventory Management

Inventory should use a ledger model.

Do not simply maintain:

```text
product.stock = 10
```

without history.

Use:

```text
inventory_transactions
----------------------
id
bakery_id
product_id

type
quantity

reference_type
reference_id

created_at
```

Transaction types:

```text
STOCK_IN
ORDER_RESERVATION
ORDER_CONSUMPTION
ADJUSTMENT
WASTAGE
RETURN
```

Example:

```text
Brownie

+10 STOCK_IN
-4 ORDER_CONSUMPTION
+5 STOCK_IN
-2 WASTAGE

Current stock = 9
```

---

# 20. Stock Management UX

```text
Inventory

Brownies
Available: 6

[ + Add Stock ]

Chocolate Cake
Available: 2

[ + Add Stock ]

Cookies
Available: 25

[ + Add Stock ]
```

Add stock:

```text
Product
Quantity
Reason

○ Production
○ Purchase
○ Adjustment

[ Add Stock ]
```

---

# 21. Inventory + Orders

When an order is created:

```text
Order:
Brownie × 4
```

Check:

```text
Available stock >= 4
```

If yes:

```text
Reserve / consume stock
```

If no:

```text
Available: 2
Required: 4

Insufficient stock
```

Allow the baker to create a made-to-order order if that business rule is enabled.

---

# 22. Expenses

Expense categories:

```text
Ingredients
Packaging
Delivery
Equipment
Utilities
Marketing
Rent
Other
```

*These are the eight **defaults** every business has. A business may also add
categories of its own (the user, 2026-09-26; §139.11.10).*

Database:

```text
expenses
--------
id
bakery_id
category
description
amount
expense_date
payment_method
receipt_url
created_at
updated_at
```

Example:

```text
Flour              ₹850
Chocolate         ₹1,200
Packaging           ₹300
Electricity         ₹900
Delivery            ₹500
```

---

# 23. Order Adjustments

Before generating a receipt, baker should be able to add:

- Delivery charge
- Packaging charge
- Extra charge
- Discount
- Other adjustment

Use:

```text
order_adjustments
-----------------
id
order_id
type
name
amount
created_at
```

Types:

```text
DISCOUNT
CHARGE
```

Example:

```text
Subtotal          ₹850
Discount          -₹50
Delivery          +₹100
Other             +₹25
-----------------------
Total             ₹925
```

---

# 24. Receipts

Receipt flow:

```text
Order
  ↓
Review Charges
  ↓
Generate Receipt On Demand
  ↓
PDF / Preview
  ↓
Share / Download
```

Receipts are **not persisted**. The receipt/bill is generated from the confirmed order's historical snapshot whenever the baker requests it. No receipt PDF, receipt file, or receipt-history record is stored in Supabase Storage or the database.

Receipt should include:

```text
Bakery name
Bakery contact
Order number
Date
Customer
Products
Quantities
Prices
Subtotal
Discount
Charges
Total
Payment status
Delivery information
Notes
```

The generated PDF should be shareable using the device's native share sheet.

Possible targets:

```text
WhatsApp
Telegram
Messages
Email
AirDrop
Other installed apps
```

Do not require direct WhatsApp API integration for V1.

---

# 25. Notifications

Examples:

```text
Order #1024 is due tomorrow

Payment pending for Order #1021

Order #1022 has been delivered

Stock low: Brownies

New order created
```

Notification architecture:

```text
Application
    ↓
Event
    ↓
Job Queue
    ↓
Worker
    ↓
Notification
```

Notification channels can later include:

```text
In-app
Push
Email
SMS
```

---

# 26. Background Jobs Without Redis

Use PostgreSQL as the initial job queue.

```text
jobs
----
id
type
payload
status
attempts
run_at
locked_at
locked_by
last_error
created_at
completed_at
```

Statuses:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

Worker process:

```text
Worker
   ↓
Find pending job
   ↓
FOR UPDATE SKIP LOCKED
   ↓
Claim job
   ↓
Execute
   ↓
Success → COMPLETED
Failure → Retry
```

Redis/BullMQ can be introduced later if workload requires it.

---

# 27. Worker Types

```text
WorkerManager
│
├── NotificationWorker
├── ReceiptWorker
├── AnalyticsWorker
├── MenuBuildWorker
└── CleanupWorker
```

Example:

```text
OrderDelivered
      ↓
Notification Job
      ↓
Notification Worker
      ↓
Notify Baker
```

---

# 28. Event-Driven Internal Architecture

Important events:

```text
OrderCreated
OrderStatusChanged
PaymentReceived
StockAdded
StockLow
ExpenseCreated
CustomerCreated
ReceiptGenerated
```

Example:

```text
OrderCreated
     │
     ├── Update analytics
     ├── Update inventory
     ├── Create notification
     └── Create audit log
```

This prevents services from becoming huge monolithic functions.

---

# 29. API + Service Layer

Keep the API/controller layer separate from business logic.

Recommended flow:

```text
HTTP Request
     ↓
Controller / API Route
     ↓
Validation
     ↓
Service
     ↓
Repository
     ↓
Supabase/PostgreSQL
```

Example:

```text
POST /api/orders
```

```typescript
export async function POST(req: Request) {
  const input = createOrderSchema.parse(await req.json());

  const result = await orderService.create(input);

  return successResponse(result);
}
```

Controllers should remain thin.

Business rules belong in services.

---

# 30. Repository Layer

Repositories should handle database access.

Example:

```text
OrderRepository
CustomerRepository
ProductRepository
InventoryRepository
PaymentRepository
ExpenseRepository
```

Service:

```text
CreateOrderService
```

can coordinate:

```text
CustomerRepository
ProductRepository
OrderRepository
InventoryRepository
PaymentRepository
```

---

# 31. Project Structure

Recommended structure:

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── expenses/
│   │   ├── analytics/
│   │   └── settings/
│   │
│   └── api/
│       ├── orders/
│       ├── customers/
│       ├── products/
│       └── ...
│
├── modules/
│   ├── auth/
│   ├── customers/
│   ├── products/
│   ├── orders/
│   ├── inventory/
│   ├── expenses/
│   ├── payments/
│   ├── receipts/
│   ├── notifications/
│   ├── analytics/
│   ├── audit/
│   └── menu/
│
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   ├── validations/
│   └── errors/
│
├── infrastructure/
│   ├── supabase/
│   ├── repositories/
│   ├── storage/
│   ├── notifications/
│   └── workers/
│
└── config/
```

Module example:

```text
modules/orders/
├── order.types.ts
├── order.constants.ts
├── order.validation.ts
├── order.repository.ts
├── order.service.ts
├── order.controller.ts
├── order.events.ts
└── order.errors.ts
```

---

# 32. Shared Types and Constants

Avoid duplicating definitions.

Examples:

```text
OrderStatus
PaymentStatus
UserRole
NotificationType
ExpenseCategory
InventoryTransactionType
ErrorCode
```

Centralize:

```text
ERROR_CODES
ERROR_MESSAGES
ORDER_STATUS
PAYMENT_STATUS
USER_ROLES
NOTIFICATION_TYPES
```

If a monorepo is introduced:

```text
packages/
├── shared/
│   ├── types/
│   ├── schemas/
│   ├── constants/
│   └── errors/
│
├── ui/
└── config/
```

Both frontend and backend consume the same shared package.

---

# 33. Validation

Use Zod.

Example:

```typescript
const createCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(PHONE_REGEX),
});
```

Validation should happen on:

```text
Frontend
+
Backend
```

Never rely only on frontend validation.

---

# 34. Error Architecture

Create a central error hierarchy:

```text
AppError
├── ValidationError
├── UnauthorizedError
├── ForbiddenError
├── NotFoundError
├── ConflictError
└── BusinessRuleError
```

Standard response:

```json
{
  "success": false,
  "error": {
    "code": "ORDER_INSUFFICIENT_STOCK",
    "message": "Insufficient stock for Brownie"
  }
}
```

Avoid generic errors such as:

```text
Something went wrong
```

when a useful business-specific error can be provided.

---

# 35. Application Logging

Use structured logs.

Levels:

```text
DEBUG
INFO
WARN
ERROR
```

Example:

```text
2026-09-20T14:31:02Z
INFO
Order created
orderId=1024
bakeryId=abc
```

Logs should contain useful context without exposing secrets or sensitive customer information unnecessarily.

---

# 36. Audit Logs

Audit logs and application logs are different.

Audit log example:

```text
User:
Baker

Action:
ORDER_STATUS_CHANGED

Entity:
Order #1024

Before:
PENDING

After:
IN_PROGRESS

Timestamp:
...
```

Database:

```text
audit_logs
----------
id
actor_id
bakery_id
action
entity_type
entity_id
old_values
new_values
ip_address
user_agent
created_at
```

Important actions:

```text
CUSTOMER_CREATED
CUSTOMER_UPDATED
ORDER_CREATED
ORDER_UPDATED
ORDER_CANCELLED
ORDER_STATUS_CHANGED
PAYMENT_RECORDED
STOCK_ADDED
STOCK_ADJUSTED
EXPENSE_CREATED
PRODUCT_CREATED
PRODUCT_UPDATED
```

---

# 37. Developer-Only Observability

Developer pages:

```text
/admin/logs
/admin/audit
/admin/workers
/admin/system
```

Only:

```text
role === DEV
```

can access these pages.

Bakers should never see system logs.

---

# 38. Analytics

The analytics page should answer:

> How is the bakery performing?

## Sales

- Revenue
- Orders
- Average order value
- Revenue by day/week/month
- Revenue by product
- Revenue by category

## Customers

- Total customers
- New customers
- Returning customers
- Top customers
- Customer order frequency
- Customer lifetime spending

## Products

- Best-selling products
- Most frequently ordered products
- Revenue by product
- Stock movement

## Financial

- Revenue
- Expenses
- Net profit estimate
- Outstanding payments
- Discounts
- Delivery charges

---

# 39. Dashboard Metrics

```text
TODAY

Orders              8
Revenue        ₹4,850
Pending             3
Delivered           5
Unpaid        ₹1,250
```

Monthly:

```text
Revenue          ₹52,400
Expenses         ₹18,200
Net              ₹34,200
Orders               74
Average Order       ₹708
```

Charts:

- Revenue trend
- Order trend
- Product sales
- Expense breakdown
- Customer growth

---

# 40. Top Customers

Example:

```text
Top Customers

Anu
24 orders
₹18,450

Rahul
18 orders
₹14,200

Sara
15 orders
₹11,800
```

Use sorting/filtering rather than hard-coded rankings.

Useful filters:

```text
This Week
This Month
Last 3 Months
This Year
Custom Range
```

---

# 41. Mobile-First UI

Design around:

```text
360px
390px
414px
```

Then support:

```text
768px
1024px
1280px+
```

Mobile:

```text
┌─────────────────┐
│ Header          │
│                 │
│ Content         │
│                 │
│                 │
├─────────────────┤
│ Home Orders     │
└─────────────────┘
```

Desktop:

```text
┌──────┬─────────────────────┐
│      │ Header              │
│ Side ├─────────────────────┤
│ bar  │                     │
│      │ Content             │
│      │                     │
└──────┴─────────────────────┘
```

---

# 42. UI Themes

Two themes should be supported.

## Theme 1 — Clean Bakery

```text
Background: White
Surface: Soft Gray
Primary: Warm Brown
Accent: Cream
```

## Theme 2 — Peach Bakery

```text
Background: Soft Peach
Primary: Terracotta
Accent: Cream
Surface: Warm White
```

Use semantic design tokens:

```text
--color-background
--color-surface
--color-primary
--color-secondary
--color-accent
--color-success
--color-warning
--color-danger
--color-text
```

Do not hard-code colors throughout components.

---

# 43. Typography and Icons

Use:

- Friendly rounded/display font for headings
- Clean readable sans-serif for body text
- Bakery-themed icons

Possible icons:

```text
Cake
Cupcake
Cookie
Chef Hat
Shopping Bag
Receipt
Box
Truck
Wallet
Chart
```

Keep the visual language professional rather than overly decorative.

---

# 44. Splash Screen

For Android/Capacitor:

```text
┌──────────────────────┐
│                      │
│        🧁            │
│                      │
│     BakeryName       │
│                      │
│  Bakery Management   │
│                      │
└──────────────────────┘
```

Use consistent branding for PWA and Android.

---

# 45. Phase 2 — Menu Builder

The Menu Builder should be a separate module.

```text
Menu Builder
    │
    ├── Templates
    ├── Sections
    ├── Products
    ├── Theme
    ├── Branding
    └── Publishing
```

Baker flow:

```text
Create Menu
    ↓
Choose Template
    ↓
Add Categories
    ↓
Select Products
    ↓
Customize
    ↓
Preview
    ↓
Publish
```

---

# 46. One QR Code Per Baker

Each baker gets one permanent menu URL.

Example:

```text
yourdomain.com/m/abc123
```

QR code points to this URL permanently.

When the baker edits the menu:

```text
Menu Updated
    ↓
Revalidate
    ↓
New Static/ISR Page
```

The QR code does not need to change.

---

# 47. Public Menu Architecture

```text
Customer
   │
   ▼
Scan QR
   │
   ▼
/m/[slug]
   │
   ▼
SSG / ISR
   │
   ▼
Public Menu
```

No customer login required.

---

# 48. Menu Database

```text
menus
-----
id
bakery_id
slug
template_id
status
published_version
published_at
updated_at
```

```text
menu_sections
-------------
id
menu_id
name
display_order
```

```text
menu_items
----------
id
section_id
product_id
display_name
description
price
image
display_order
is_available
```

Optional versioning:

```text
menu_versions
-------------
id
menu_id
version
content
published_at
```

---

# 49. Product vs Menu Item

Do not make the public menu directly equal to the internal product record.

Internal product:

```text
Brownie
₹50
```

Public menu:

```text
Signature Belgian Chocolate Brownie
₹70

Rich chocolate brownie...
```

The Menu Item controls the public presentation.

---

# 50. Next.js + PWA + Capacitor

Target architecture:

```text
Next.js
 │
 ├── Web
 ├── PWA
 └── Capacitor
       │
       └── Android
```

This keeps most of the codebase shared.

Native features can be accessed through Capacitor plugins where required:

```text
Native Share
Push Notifications
Splash Screen
App Badge
Filesystem
```

---

# 51. Offline Strategy

Do not make the entire application offline-first in V1.

Start with:

```text
Cached:
Products
Customers
Recent Orders
```

Later:

```text
Offline operation
       ↓
Local Queue
       ↓
Connection Restored
       ↓
Sync
```

Full offline-first synchronization should be introduced only if real usage requires it.

---

# 52. Database Tables

## Core

```text
profiles
bakeries

customers

categories
products

orders
order_items
order_adjustments

payments

inventory_transactions

expenses

receipts

notifications

jobs

audit_logs
```

## System

```text
system_logs
worker_runs
```

## Phase 2

```text
menu_templates
menus
menu_sections
menu_items
menu_versions
```

---

# 53. Critical Transaction Boundaries

Operations such as order creation should be atomic.

Example:

```text
Create Order
+
Create Order Items
+
Reserve/Consume Stock
+
Create Audit Event
+
Queue Notification
```

The system should prevent partial state such as:

```text
Order created
BUT
Stock not updated
```

Use appropriate PostgreSQL transactional mechanisms for critical mutations.

---

# 54. Read vs Mutation Strategy

Not every read needs to pass through the entire API/service stack.

For safe, straightforward reads:

```text
UI
 ↓
Supabase
```

can be appropriate when RLS fully protects the data.

For business-critical mutations:

```text
UI
 ↓
API
 ↓
Service
 ↓
Repository
 ↓
PostgreSQL
```

Examples that should use the business/service layer:

```text
Create Order
Update Order
Cancel Order
Add Stock
Record Payment
Generate Receipt
Adjust Inventory
```

---

# 55. Security Requirements

Mandatory:

- Supabase RLS
- Tenant isolation
- Secure authentication
- Backend validation
- Authorization checks
- Rate limiting where appropriate
- No secrets in frontend
- Secure environment variables
- Input sanitization
- Safe file upload validation
- File size limits
- Audit critical mutations
- Avoid logging passwords/tokens
- Protect developer-only routes
- Protect worker endpoints
- Validate all public menu slugs

---

# 56. Storage and Bakery Logo

User-uploaded files are intentionally restricted to **one bakery logo per bakery**. No other user-uploaded files are supported.

## Bakery Logo Rules

- Maximum file size: **500 KB**.
- Exactly one active logo per bakery.
- Logo upload is tenant-scoped to the baker's `bakery_id`.
- Validate MIME type and file signature server-side; do not trust the browser-provided content type.
- Reject files above 500 KB before persistence.
- When a new logo is uploaded, delete the previous logo file and remove/replace its database reference.
- Do not retain historical logo versions.
- Use a deterministic tenant-scoped path such as `/bakeries/{bakery_id}/logo/{logo_id}`.
- The database stores the current logo metadata/reference; the binary file lives in Supabase Storage.
- RLS/storage policies must prevent one bakery from accessing another bakery's logo.
- Logo replacement should be handled as a controlled mutation so a failed upload does not accidentally remove the currently valid logo.

Example profile fields:

```text
bakery_profile
--------------
id
bakery_id
logo_storage_path
logo_mime_type
logo_size_bytes
updated_at
```

## Receipts

Receipts are **never stored**. There is no receipt-storage bucket and no receipt file table. A PDF/receipt representation is generated on demand from the confirmed order data and can then be shared or downloaded.

Storage should only be used for the bakery logo in the current product scope, and all storage access must respect tenant authorization.

---

# 57. Realtime

Use Supabase Realtime selectively.

Useful cases:

```text
Order status updates
Notifications
Dashboard updates
Worker status
```

Do not make every database table realtime by default.

---

# 58. API Naming

Use resource-oriented APIs.

Examples:

```text
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id
DELETE /api/orders/:id

GET    /api/customers
POST   /api/customers

GET    /api/products
POST   /api/products

GET    /api/inventory
POST   /api/inventory/transactions

GET    /api/expenses
POST   /api/expenses

GET    /api/analytics/overview
GET    /api/analytics/customers
GET    /api/analytics/products
```

Use action endpoints only when they represent meaningful domain operations:

```text
POST /api/orders/:id/cancel
POST /api/orders/:id/payment
POST /api/orders/:id/receipt
```

---

# 59. API Response Standard

Successful response:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Customer not found"
  }
}
```

Use consistent response handling throughout the application.

---

# 60. Development Phases

> What is built, what is stubbed, and what is missing against these phases is
> tracked in **§133. Implementation Gap Register** at the end of this document.

## Phase 1 — Foundation

```text
Authentication
Baker Profile
Roles
Database
RLS
Design System
Shared Types
Constants
Error Handling
Logging
API Architecture
```

## Phase 2 — Business Core

```text
Customers
Products
Categories
Orders
Payments
Inventory
Expenses
```

## Phase 3 — Business Intelligence

```text
Dashboard
Analytics
Top Customers
Revenue
Expenses
Profit
```

## Phase 4 — Communication

```text
Notifications
Receipt Generation
PDF
Native Share
WhatsApp Sharing
```

## Phase 5 — Production Hardening

```text
Audit Logs
Worker System
Retry Handling
Rate Limiting
Monitoring
Backups
Error Tracking
Security Review
```

## Phase 6 — Menu Builder

```text
Templates
Menu Editor
Public Menu
QR Code
SSG/ISR
Publishing
```

## Phase 7 — Android

```text
Capacitor
Splash Screen
App Icon
Push Notifications
Native Share
Build Pipeline
Play Store Release
```

---

# 61. V1 Scope

The first production version should contain:

```text
Authentication
    ↓
Dashboard
    ↓
Customers
    ↓
Products
    ↓
Orders
    ↓
Inventory
    ↓
Expenses
    ↓
Payments
    ↓
Receipts
    ↓
Notifications
    ↓
Analytics
    ↓
Settings
```

Avoid implementing the full Menu Builder before the core business workflow is stable.

---

# 62. Recommended V1 Order Flow

```text
Create Customer
       ↓
Create Products
       ↓
Add Stock
       ↓
Create Order
       ↓
Select Customer
       ↓
Select Products
       ↓
Check/Reserve Stock
       ↓
Set Delivery Date
       ↓
Set Payment Status
       ↓
Order Created
       ↓
Worker Creates Notification
       ↓
Order In Progress
       ↓
Order In Transit
       ↓
Order Delivered
       ↓
Payment Completed
       ↓
Generate Receipt
       ↓
Share Receipt
```

---

# 63. Recommended Business Dashboard Flow

```text
Login
  ↓
Dashboard
  │
  ├── Today's Orders
  ├── Today's Revenue
  ├── Pending Payments
  ├── Upcoming Deliveries
  ├── Low Stock
  ├── Recent Customers
  └── Business Summary
```

---

# 64. Production Readiness Checklist

## Authentication

- [x] Phone/password authentication
- [x] Session handling
- [x] Logout
- [x] Password reset
- [ ] Account deactivation
- [x] Role enforcement

## Security

- [x] RLS enabled
- [ ] Tenant isolation tested
- [x] API authorization
- [x] Input validation
- [ ] File validation
- [ ] Rate limiting
- [x] Secret management

## Orders

- [ ] Order creation
- [ ] Order editing
- [ ] Order cancellation
- [ ] Status state machine
- [ ] Payment status
- [ ] Delivery date
- [ ] Discounts
- [ ] Extra charges

## Inventory

- [ ] Stock additions
- [ ] Stock consumption
- [ ] Stock reservation
- [ ] Wastage
- [ ] Adjustments
- [ ] Inventory history
- [ ] Low-stock alerts

## Customers

- [ ] Customer creation
- [ ] Customer editing
- [ ] Customer search
- [ ] Customer order history
- [ ] Customer spending analytics

## Finance

- [ ] Expenses
- [ ] Payments
- [ ] Revenue
- [ ] Outstanding amounts
- [ ] Discounts
- [ ] Delivery charges

## Receipts

- [ ] Generate PDF on demand
- [ ] Generate receipt preview on demand
- [ ] Native share
- [ ] WhatsApp sharing through native share sheet
- [ ] Do not persist receipt PDFs or receipt history

## Notifications

- [ ] Job queue
- [ ] Worker
- [ ] Retry
- [ ] In-app notifications
- [ ] Push notifications

## Observability

- [x] Structured logs
- [x] Error logs
- [ ] Audit logs
- [ ] Worker monitoring
- [ ] Developer-only dashboards

---

# 65. Final Architecture

```text
                         HOME BAKERY PLATFORM
                                  │
             ┌────────────────────┴────────────────────┐
             │                                         │
       INTERNAL APP                              PUBLIC MENU
             │                                         │
      ┌──────┴──────┐                             QR Code
      │             │                                 │
   BAKER          DEV                           SSG / ISR
      │             │
      └──────┬──────┘
             │
         Next.js
             │
    ┌────────┼─────────┐
    │        │         │
   Web      PWA    Capacitor
    │        │         │
    │        │       Android
    │        │
    └────────┼───────────────┐
             │               │
         API Layer        UI Layer
             │
       Service Layer
             │
       Repository Layer
             │
        Supabase SDK
             │
    ┌────────┼───────────────┐
    │        │               │
 PostgreSQL Storage          Auth
    │
    ├── RLS
    ├── Realtime
    ├── Audit Logs
    └── Job Queue
             │
             ▼
          Workers
             │
    ┌────────┼─────────┐
    │        │         │
Notifications Receipts Analytics
```

---

# 66. Key Architectural Decisions

| Area | Decision |
|---|---|
| Architecture | Modular monolith |
| Frontend | Next.js + TypeScript |
| Mobile | PWA + Capacitor Android |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Authorization | RLS + application authorization |
| Multi-tenancy | `bakery_id` |
| Business logic | Service layer |
| Database access | Repository layer |
| Validation | Zod |
| Shared code | Shared TypeScript types/constants |
| Error handling | Central error architecture |
| Logging | Structured application logs |
| Audit | Dedicated audit logs |
| Background jobs | PostgreSQL-backed queue |
| Redis | Not required initially |
| Notifications | Worker-based |
| Inventory | Ledger-based |
| Orders | `orders` + `order_items` |
| Payments | Separate payment records |
| Receipts | Generated on demand; not stored; native share/download |
| Analytics | Database queries + aggregates |
| Public menu | SSG/ISR |
| QR | One permanent QR per baker |
| UI | Mobile-first responsive |
| Themes | Clean White + Peach Bakery |
| Phase 1 | Internal bakery management |
| Phase 2 | Menu Builder + public QR menu |

---

# 67. End Goal

The finished product should feel like a lightweight operating system for a home bakery:

```text
              ┌─────────────────────┐
              │      DASHBOARD      │
              └──────────┬──────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   CUSTOMERS          ORDERS           INVENTORY
       │                 │                 │
       │                 │                 │
       └────────────┬────┴───────┬─────────┘
                    │            │
                    ▼            ▼
                PAYMENTS      EXPENSES
                    │            │
                    └─────┬──────┘
                          │
                          ▼
                      ANALYTICS
                          │
                          ▼
                    BUSINESS HEALTH
```

The core principle is:

> **Keep the first version simple to deploy, but structure the code and database so the system can grow into a full bakery SaaS without requiring a rewrite.**


---

# 68. Updated Payment Model

Separate payment records are **not required for V1**.

Payment information can live directly on the order because the primary requirement is to know whether an order has been paid and, optionally, how it was paid.

The order should contain:

```text
payment_status
payment_method
payment_reference
```

Recommended payment status:

```text
UNPAID
PAID
```

Optional future status:

```text
PARTIALLY_PAID
```

The initial implementation does not need a separate `payments` table.

## Order Payment Fields

```text
orders
------
payment_status
payment_method
payment_reference
```

Example:

```text
payment_status:
PAID

payment_method:
UPI

payment_reference:
324829183829
```

`payment_reference` should be optional.

Examples:

```text
UPI transaction ID
Cash receipt/reference
Bank transfer reference
Other payment reference
```

If the payment method is:

```text
CASH
```

the reference can remain empty.

---

# 69. Payment Methods

Recommended enum:

```text
CASH
UPI
BANK_TRANSFER
CARD
OTHER
```

The UI should make this quick to select.

Example:

```text
Payment

Status
○ Paid
○ Unpaid

Method
[ UPI ▼ ]

Reference Number
[ Optional ]

```

The payment method and reference fields can be hidden/disabled when the order is unpaid.

---

# 70. Bill Generation Directly From Add Order

The order creation screen should support **creating and sharing the bill immediately**.

The baker should not have to:

```text
Create Order
   ↓
Go to Order Details
   ↓
Generate Bill
   ↓
Share Bill
```

Instead, the flow should be:

```text
Add Order
   ↓
Review Order
   ↓
Add Extra Charges / Discount
   ↓
Set Payment
   ↓
Create & View Bill
   ↓
Share
```

This is especially useful when a baker is standing in front of a customer or completing an order on the phone.

---

# 71. Updated Add Order Screen

The Add Order screen should contain the entire order-to-bill workflow.

```text
┌──────────────────────────────────┐
│ Add Order                    ×   │
├──────────────────────────────────┤
│                                  │
│ Customer                         │
│ [ Anu ▼ ]                        │
│                                  │
│ Delivery Date                    │
│ [ 24 Sep 2026 ]                  │
│                                  │
│ Items                            │
│                                  │
│ Brownie          ₹50 × 4  ₹200   │
│ Chocolate Cake  ₹650 × 1  ₹650   │
│                                  │
│ [+ Add Item]                     │
│                                  │
├──────────────────────────────────┤
│ Pricing                          │
│                                  │
│ Subtotal              ₹850       │
│                                  │
│ Discount              -₹50       │
│ Delivery Charge       +₹100      │
│ Other Charge          +₹25       │
│                                  │
│ ──────────────────────────────── │
│ Total                 ₹925       │
│                                  │
├──────────────────────────────────┤
│ Payment                          │
│                                  │
│ Status                           │
│ ● Paid     ○ Unpaid              │
│                                  │
│ Method                           │
│ [ UPI ▼ ]                        │
│                                  │
│ Reference                        │
│ [ Optional ]                     │
│                                  │
├──────────────────────────────────┤
│                                  │
│ [ Create Order ]                 │
│ [ Create & View Bill ]           │
│                                  │
└──────────────────────────────────┘
```

The exact button arrangement can be optimized for mobile, but **Create & View Bill** should be a first-class action.

---

# 72. Bill Preview Before Sharing

When the baker selects:

```text
Create & View Bill
```

the application should:

1. Validate the order.
2. Calculate the final amount.
3. Create the order.
4. Generate the bill/receipt representation.
5. Open the bill preview.
6. Allow the baker to share it.

Example:

```text
┌───────────────────────────────┐
│ Bill                     Share │
├───────────────────────────────┤
│                               │
│        SWEET BAKES 🧁         │
│                               │
│ Order #1024                   │
│ 24 Sep 2026                   │
│                               │
│ Customer                      │
│ Anu                           │
│ +91 XXXXX XXXXX               │
│                               │
│ Brownie × 4          ₹200     │
│ Chocolate Cake × 1   ₹650     │
│                               │
│ Subtotal             ₹850     │
│ Discount             -₹50     │
│ Delivery             +₹100    │
│ Other Charge         +₹25     │
│ ───────────────────────────   │
│ TOTAL                ₹925     │
│                               │
│ Payment: PAID                 │
│ Method: UPI                   │
│ Ref: 324829183829             │
│                               │
│ Thank you ❤️                 │
│                               │
├───────────────────────────────┤
│ [ Share Bill ]                │
│ [ Download PDF ]              │
└───────────────────────────────┘
```

---

# 73. Bill Sharing

The bill should be shareable using the device's native share mechanism.

The baker can select:

```text
WhatsApp
Telegram
Messages
Email
AirDrop
Other installed apps
```

The application should not need a direct WhatsApp integration for V1.

Recommended flow:

```text
Create & View Bill
        ↓
Bill Preview
        ↓
Share
        ↓
Native Share Sheet
```

On Android, Capacitor can expose the native sharing functionality.

On the web/PWA, use the Web Share API where supported.

Fallback:

```text
Download PDF
```

---

# 74. Extra Charges and Discount in Bill Flow

The baker should be able to add pricing adjustments directly while creating the order.

Example:

```text
Subtotal                ₹850

Discount
[- ₹50]

Delivery Charge
[+ ₹100]

Packaging Charge
[+ ₹20]

Other Charge
[+ ₹25]

────────────────────────
Total                   ₹945
```

Use `order_adjustments`:

```text
order_adjustments
-----------------
id
order_id
type
name
amount
created_at
```

Types:

```text
DISCOUNT
CHARGE
```

The order's final total should always be calculated from the individual components rather than manually entered.

---

# 75. Bill Should Be an Order Snapshot

Once the order is created, the bill should represent that order's historical state.

For example:

```text
Brownie
Quantity: 4
Price: ₹50
```

If the product price later changes to:

```text
₹60
```

the existing bill must continue showing:

```text
₹50
```

Therefore `order_items` must retain:

```text
product_name
unit_price
quantity
subtotal
```

The same applies to:

```text
Discount
Delivery Charge
Other Charges
```

---

# 76. Dashboard — Updated Main Page

The dashboard should be designed around the baker's most immediate question:

> What do I need to take care of right now?

The primary dashboard structure should therefore be:

```text
┌──────────────────────────────────┐
│ Good morning 👋                 │
│ Here's your bakery today         │
├──────────────────────────────────┤
│                                  │
│ Dashboard Summary Card           │
│                                  │
│ Today's Orders       8           │
│ Today's Revenue      ₹4,850      │
│ Pending Payments     ₹1,250      │
│                                  │
│──────────────────────────────────│
│                                  │
│ Pending Orders                    │
│                                  │
│ Due Today                         │
│                                  │
│ #1024  Anu                        │
│ Brownie × 4                       │
│ Due: Today                        │
│ ₹925        In Progress           │
│                                  │
│ #1025  Rahul                      │
│ Chocolate Cake                    │
│ Due: Today                        │
│ ₹1,200      Pending               │
│                                  │
│ Due Tomorrow                      │
│                                  │
│ #1026  Sara                       │
│ Cupcakes × 12                     │
│ Due: Tomorrow                     │
│ ₹600        Pending               │
│                                  │
└──────────────────────────────────┘
```

---

# 77. Dashboard Summary Card

The summary card should appear **above the pending orders list**.

It should provide a quick business snapshot.

Recommended metrics:

```text
Today's Orders
Today's Revenue
Pending Orders
Pending Payments
```

Potential secondary metrics:

```text
This Month Revenue
This Month Orders
Low Stock Items
```

Example:

```text
┌─────────────────────────────────┐
│ Business Today                  │
│                                 │
│ 8 Orders       ₹4,850 Revenue   │
│                                 │
│ 3 Pending      ₹1,250 Unpaid    │
└─────────────────────────────────┘
```

The card should be visually prominent but compact on mobile.

---

# 78. Pending Orders on Dashboard

The dashboard should show orders that are not yet completed.

Primary filter:

```text
Delivery Date
```

Suggested grouping:

```text
Due Today
Due Tomorrow
Upcoming
Overdue
```

Order statuses included:

```text
PENDING
IN_PROGRESS
IN_TRANSIT
```

Normally exclude:

```text
DELIVERED
CANCELLED
```

---

# 79. Pending Order Sorting

Default order:

```text
Overdue
   ↓
Due Today
   ↓
Due Tomorrow
   ↓
Upcoming
```

Within the same delivery date:

```text
earliest created order first
```

or allow a configurable sort option.

The most urgent orders should always be visible first.

---

# 80. Overdue Orders

If:

```text
delivery_date < today
```

and status is not:

```text
DELIVERED
CANCELLED
```

show:

```text
OVERDUE
```

Example:

```text
⚠ Overdue

#1018
Anu
Brownie × 6

Due:
18 Sep 2026

Status:
In Progress
```

This should be visually noticeable without using excessive alarming colors.

---

# 81. Dashboard Order Card

Recommended mobile card:

```text
┌───────────────────────────────┐
│ #1024                    ₹925 │
│                               │
│ Anu                           │
│ Brownie × 4                   │
│                               │
│ 📅 Today                      │
│ ● In Progress                │
│                               │
│ Payment: Paid                 │
└───────────────────────────────┘
```

Tapping the card opens the order details.

---

# 82. Dashboard Quick Actions

Keep common actions accessible from the dashboard:

```text
+ Add Order
+ Add Customer
+ Add Stock
+ Add Expense
```

Mobile:

```text
        [+]
```

or a compact quick-action row.

Tablet/Desktop:

```text
[ + Order ] [ + Customer ] [ + Stock ] [ + Expense ]
```

---

# 83. Dashboard Analytics Card

Below pending orders or after the immediate operational section, show a compact business summary.

Example:

```text
This Month

Revenue        ₹52,400
Expenses       ₹18,200
Orders               74
Avg Order          ₹708
```

A:

```text
View Analytics →
```

button can open the full analytics page.

The dashboard should remain operational rather than becoming a large analytics report.

---

# 84. Recommended Dashboard Priority

The order of information should be:

```text
1. Greeting / business context

2. Business summary card
   - Today's orders
   - Today's revenue
   - Pending orders
   - Pending payments

3. Pending orders
   - Overdue
   - Today
   - Tomorrow
   - Upcoming

4. Quick actions

5. Low stock alerts

6. Monthly business snapshot

7. View full analytics
```

The most urgent operational information should remain above the fold on mobile.

---

# 85. Updated Order Lifecycle

```text
                    ┌───────────────┐
                    │ CREATE ORDER  │
                    └───────┬───────┘
                            │
                            ▼
                     PENDING
                            │
                            ▼
                     IN_PROGRESS
                            │
                            ▼
                     IN_TRANSIT
                            │
                            ▼
                      DELIVERED
```

At any appropriate point before delivery:

```text
PENDING / IN_PROGRESS
          │
          ▼
      CANCELLED
```

Payment is independent:

```text
UNPAID
  │
  ▼
PAID
```

Payment information remains directly on the order.

---

# 86. Updated Order Data Model

```text
orders
------
id
bakery_id
customer_id
order_number

status

payment_status
payment_method
payment_reference

subtotal
delivery_charge
discount
tax
total

delivery_date
delivery_address
notes

created_at
updated_at
```

Order items:

```text
order_items
-----------
id
order_id
product_id

product_name
unit_price
quantity
subtotal

notes
created_at
```

Adjustments:

```text
order_adjustments
-----------------
id
order_id

type
name
amount

created_at
```

No separate payment table is required for the initial architecture.

---

# 87. Updated V1 Core Flow

The primary user journey should be extremely short:

```text
Login
  ↓
Dashboard
  ↓
Add Order
  ↓
Select Customer
  ↓
Select Products
  ↓
Set Quantity
  ↓
Set Delivery Date
  ↓
Add Discount / Charges
  ↓
Set Payment Status
  ↓
Create Order
  ↓
View / Share Bill
```

The baker should be able to complete this entire process from a phone without navigating through multiple screens.

---

# 88. Final Updated Architecture

```text
                         HOME BAKERY PLATFORM
                                  │
             ┌────────────────────┴────────────────────┐
             │                                         │
       INTERNAL APP                              PUBLIC MENU
             │                                         │
      ┌──────┴──────┐                             QR Code
      │             │                                 │
   BAKER          DEV                           SSG / ISR
      │             │
      └──────┬──────┘
             │
         Next.js
             │
    ┌────────┼─────────┐
    │        │         │
   Web      PWA    Capacitor
    │        │         │
    │        │       Android
    │        │
    └────────┼───────────────┐
             │               │
         API Layer        UI Layer
             │
       Service Layer
             │
       Repository Layer
             │
        Supabase SDK
             │
    ┌────────┼───────────────┐
    │        │               │
 PostgreSQL Storage          Auth
    │
    ├── RLS
    ├── Realtime
    ├── Audit Logs
    └── PostgreSQL Job Queue
             │
             ▼
          Workers
             │
    ┌────────┼─────────┐
    │        │         │
Notifications Receipts Analytics
```

---

# 89. Updated Key Architectural Decisions

| Area | Decision |
|---|---|
| Architecture | Modular monolith |
| Frontend | Next.js + TypeScript |
| Mobile | PWA + Capacitor Android |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Authorization | RLS + application authorization |
| Multi-tenancy | `bakery_id` |
| Business logic | Service layer |
| Database access | Repository layer |
| Validation | Zod |
| Shared code | Shared TypeScript types/constants |
| Error handling | Central error architecture |
| Logging | Structured application logs |
| Audit | Dedicated audit logs |
| Background jobs | PostgreSQL-backed queue |
| Redis | Not required initially |
| Notifications | Worker-based |
| Inventory | Ledger-based |
| Orders | `orders` + `order_items` |
| Payments | Payment status + method + optional reference on order |
| Payment table | Not required for V1 |
| Billing | Generate/view/share directly from Add Order |
| Extra charges | Supported during order creation |
| Discounts | Supported during order creation |
| Receipt | PDF + native share |
| Dashboard | Summary card + due-date-filtered pending orders |
| Pending orders | Overdue → Today → Tomorrow → Upcoming |
| Analytics | Database queries + aggregates |
| Public menu | SSG/ISR |
| QR | One permanent QR per baker |
| UI | Mobile-first responsive |
| Themes | Clean White + Peach Bakery |
| Phase 1 | Internal bakery management |
| Phase 2 | Menu Builder + public QR menu |

---

# 90. Final Product Experience

The core experience should feel like a lightweight operating system for a home bakery.

```text
                    ┌─────────────────────┐
                    │      DASHBOARD      │
                    │                     │
                    │ Business Summary    │
                    │        ↓            │
                    │ Pending Orders      │
                    │        ↓            │
                    │ Quick Actions       │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
         CUSTOMERS          ORDERS          INVENTORY
             │                 │                 │
             │                 │                 │
             └────────────┬────┴───────┬─────────┘
                          │            │
                          ▼            ▼
                      EXPENSES      BILLING
                          │            │
                          └─────┬──────┘
                                │
                                ▼
                           ANALYTICS
                                │
                                ▼
                         BUSINESS HEALTH
```

The key V1 principle remains:

> Keep the application extremely fast and simple for a baker using a phone, while keeping the backend modular and production-grade enough that the system can grow into a full bakery SaaS without requiring a rewrite.


---

# 91. Delivery Address & Google Maps Support

The **Add Order** flow should support both a written delivery address and a Google Maps link, since many home bakers deliver to residential locations where a pinned location is often more reliable than a typed address.

The baker should be able to provide:

- Delivery Address only
- Google Maps link only
- Both Address and Google Maps link

At least **one of these fields should be required** for delivery orders.

If the order is marked as **Pickup**, both fields can remain optional.

## Updated Add Order – Delivery Section

```text
Delivery

Delivery Type

● Delivery
○ Pickup

Delivery Date
[ 24 Sep 2026 ]

Delivery Address
[ Enter full address ]

Google Maps Link
[ Paste Google Maps link (optional) ]
```

### Validation Rules

| Scenario | Validation |
|---|---|
| Delivery + Address only | ✅ Valid |
| Delivery + Maps link only | ✅ Valid |
| Delivery + Address + Maps link | ✅ Valid |
| Delivery + Neither | ❌ Show validation error |
| Pickup | Address and Maps link optional |

## Order Database Fields

Update the `orders` table with dedicated delivery fields.

```text
orders
------
delivery_type

delivery_address

delivery_map_url
```

### Field definitions

| Field | Type | Notes |
|---|---|---|
| `delivery_type` | Enum | `DELIVERY` or `PICKUP` |
| `delivery_address` | Text | Full written address |
| `delivery_map_url` | Text | Google Maps URL |

## Google Maps UX

If a Maps link exists, the Order Details screen should show an **Open in Maps** action.

Example:

```text
Delivery

📍 Green Valley Apartments

Near City Hospital

[ Open in Google Maps ]
```

On Android (Capacitor), this should open the native Maps app when possible.

On the Web/PWA, it should open the provided Google Maps link in a new tab.

## Updated Order Data Model

The delivery portion of the `orders` table becomes:

```text
orders
------
delivery_type
delivery_date
delivery_address
delivery_map_url
notes
```

This provides enough flexibility for home bakers while keeping the delivery workflow simple and mobile-friendly.


---

# 91. Delivery Address & Google Maps Support

A home baker often delivers to customers directly.

Many customers may:

- Share a full address
- Share a Google Maps location
- Share both

Therefore the order should support all three scenarios.

```text
Address only
Google Maps link only
Address + Google Maps link
```

Neither field should force the baker to maintain duplicate information.

---

# 92. Customer Address Storage

Customer records should support:

```text
customers
---------
id
bakery_id

name
phone

address
google_maps_link

notes

created_at
updated_at
```

Example:

```text
Name:
Anu

Phone:
+91 XXXXX XXXXX

Address:
Flat 203, Green Residency,
Sector 62, Noida

Google Maps:
https://maps.app.goo.gl/...
```

This allows frequently ordering customers to reuse the same delivery information.

---

# 93. Order Delivery Information

Orders should store a snapshot of the delivery information.

Reason:

A customer may later change:

```text
Address
Maps Link
Phone
```

but historical orders should preserve the delivery information used at the time of ordering.

Recommended order fields:

```text
orders
------
delivery_address
delivery_google_maps_link
```

Example:

```text
delivery_address:
Flat 203, Green Residency,
Sector 62, Noida

delivery_google_maps_link:
https://maps.app.goo.gl/xyz
```

---

# 94. Add Order Screen Update

The Add Order form should contain a dedicated delivery section.

```text
┌──────────────────────────────────┐
│ Delivery Details                 │
├──────────────────────────────────┤
│                                  │
│ Delivery Date                    │
│ [ 24 Sep 2026 ]                  │
│                                  │
│ Delivery Address                 │
│ [__________________________]     │
│                                  │
│ [__________________________]     │
│                                  │
│ Google Maps Link                 │
│ [__________________________]     │
│                                  │
│ [ Use Customer Address ]         │
│                                  │
└──────────────────────────────────┘
```

---

# 95. Use Customer Address Shortcut

Many repeat customers order frequently.

The baker should be able to automatically populate delivery information from the customer profile.

Example:

```text
Customer
[ Anu ▼ ]

✓ Auto-fill delivery details
```

or

```text
[ Use Customer Address ]
```

This fills:

```text
Address
Google Maps Link
```

from the customer record.

The baker can still override the values for a specific order.

---

# 96. Delivery Information Validation

Validation rules:

```text
Address OR Maps Link required
```

Valid:

```text
Address only
```

Valid:

```text
Google Maps link only
```

Valid:

```text
Address + Google Maps link
```

Invalid:

```text
No address
No maps link
```

At least one delivery location field should be present.

---

# 97. Order Card Delivery Indicator

When viewing orders, a quick indicator should show whether delivery information exists.

Example:

```text
#1024
Anu

📍 Address Available
```

or

```text
#1024
Anu

📍 Maps Link Available
```

or

```text
#1024
Anu

📍 Address + Maps
```

This helps bakers quickly identify delivery readiness.

---

# 98. Order Details Page

Order details should include delivery information.

Example:

```text
Order #1024

Customer
Anu

Delivery Date
24 Sep 2026

Delivery Address
Flat 203,
Green Residency,
Sector 62,
Noida

Google Maps
[ Open Maps ]
```

Tapping:

```text
Open Maps
```

should launch:

```text
Google Maps
Apple Maps
Maps app on device
```

depending on platform capabilities.

---

# 99. Receipt / Bill Delivery Section

Delivery information should optionally appear on the generated bill.

Example:

```text
─────────────────────
Customer

Anu
+91 XXXXX XXXXX

Delivery Address

Flat 203
Green Residency
Sector 62
Noida
─────────────────────
```

The Google Maps link does not necessarily need to be printed in the receipt PDF, but should remain available in the order details page.

---

# 100. Updated Order Data Model

```text
orders
------
id

bakery_id
customer_id

order_number

status

payment_status
payment_method
payment_reference

subtotal
discount
delivery_charge
tax
total

delivery_date

delivery_address
delivery_google_maps_link

notes

created_at
updated_at
```

Customer data:

```text
customers
---------
id
bakery_id

name
phone

email

address
google_maps_link

notes

created_at
updated_at
```

This allows:

```text
Customer-level saved address
          +
Order-level delivery snapshot
```

which is the safest and most flexible production design.

---

# 101. Updated Add Order Flow

```text
Add Order
   ↓
Select Customer
   ↓
Auto-fill Address (optional)
   ↓
Select Products
   ↓
Add Quantities
   ↓
Set Delivery Date
   ↓
Address / Maps Link
   ↓
Add Charges / Discounts
   ↓
Payment Status
   ↓
Create Order
   ↓
View Bill
   ↓
Share Bill
```

This ensures every order contains enough delivery information for fulfillment without requiring the baker to leave the order workflow.

---

# 92. Registration — Phone + Email

Baker registration should collect both:

```text
Phone Number
Email Address
Password
Confirm Password
```

Both phone number and email address must be unique per account.

## Registration Rules

```text
Phone number → UNIQUE
Email        → UNIQUE
```

The uniqueness must be enforced at the database level as well as validated by the backend.

Recommended account/profile fields:

```text
profiles
--------
id
phone
email
name
role
bakery_id
is_active
must_change_password
email_confirmed_at
created_at
updated_at
```

---

# 93. Account Confirmation Email

After registration, send an account-confirmation email through a centralized mail service.

Initial implementation:

```text
Nodemailer
```

Do not call Nodemailer directly from individual business modules. Use:

```text
AuthService
    ↓
MailService
    ↓
Nodemailer Provider
    ↓
SMTP Provider
```

The mail provider should remain replaceable later.

Example email:

```text
Welcome to Bakery Manager 🧁

Your account has been created successfully.

Please confirm your email address:

[ Confirm Account ]

If you did not create this account, you can ignore this email.
```

The confirmation link/token must be secure and expire appropriately.

---

# 94. Password Reset

The requested password-reset flow is:

```text
Forgot Password
      ↓
Enter Email
      ↓
Verify Account
      ↓
Generate Secure Temporary Password
      ↓
Store Securely
      ↓
Send Email
      ↓
User Logs In
      ↓
Force Password Change
      ↓
Normal Account Access
```

The temporary password should be generated with a cryptographically secure random generator.

Example email:

```text
Your temporary password is:

K7xP-29mQ

Please log in and change your password immediately.
```

Security requirements:

- Never store passwords in plaintext.
- Never log temporary passwords.
- Never expose temporary passwords in API responses.
- Use a short validity period where supported.
- Invalidate the temporary credential after the password is changed.
- Force a password change after temporary-password login.

A secure reset-link flow can be added later, but the initial product can use the temporary-password workflow.

---

# 95. Forced Password Change

Add an account state such as:

```text
must_change_password
```

Flow:

```text
Login
  ↓
Check must_change_password
  ↓
true
  ↓
Change Password Screen
  ↓
Set New Password
  ↓
must_change_password = false
```

The user should not continue into normal application screens until the temporary password has been replaced.

---

# 96. Central Mail Service

Recommended structure:

```text
infrastructure/
└── mail/
    ├── mail.service.ts
    ├── mail.provider.ts
    ├── nodemailer.provider.ts
    └── templates/
        ├── account-confirmation.ts
        ├── password-reset.ts
        └── ...
```

The application depends on `MailService`, not directly on Nodemailer.

This allows the SMTP/email provider to be changed without modifying authentication or business modules.

---

# 97. Global Error Handling

The application needs one centralized error architecture across:

- Frontend
- API routes
- Controllers
- Services
- Repositories
- Workers
- Authentication
- External integrations

Recommended hierarchy:

```text
AppError
├── ValidationError
├── AuthenticationError
├── AuthorizationError
├── NotFoundError
├── ConflictError
├── BusinessRuleError
├── ExternalServiceError
└── InternalServerError
```

All unknown exceptions should be normalized into a safe internal-server-error response.

---

# 98. Central Error Constants

Create one shared source of truth for error codes and messages.

Example:

```text
shared/constants/errors.ts
```

```typescript
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_ACCOUNT_NOT_CONFIRMED: "AUTH_ACCOUNT_NOT_CONFIRMED",

  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",

  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_INVALID_STATUS: "ORDER_INVALID_STATUS",
  ORDER_INSUFFICIENT_STOCK: "ORDER_INSUFFICIENT_STOCK",

  INVENTORY_INSUFFICIENT_STOCK: "INVENTORY_INSUFFICIENT_STOCK",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;
```

```typescript
export const ERROR_MESSAGES = {
  ORDER_NOT_FOUND: "Order not found.",
  ORDER_INVALID_STATUS: "This order status change is not allowed.",
  ORDER_INSUFFICIENT_STOCK: "There is not enough stock for this order.",
  CUSTOMER_NOT_FOUND: "Customer not found.",
  INTERNAL_ERROR: "Something went wrong. Please try again."
} as const;
```

Do not scatter user-facing error strings throughout the application.

---

# 99. Standard API Error Contract

All API errors should use the same response shape.

```json
{
  "success": false,
  "error": {
    "code": "ORDER_INSUFFICIENT_STOCK",
    "message": "There is not enough stock for this order.",
    "requestId": "req_abc123"
  }
}
```

The `requestId` allows developers to locate the corresponding server-side logs.

---

# 100. Global API Error Handler

All API routes should use a common error-handling mechanism.

```text
API Request
     ↓
Controller
     ↓
Service
     ↓
Error
     ↓
Global Error Handler
     ↓
Normalize Error
     ↓
Log Error
     ↓
Return Standard Response
```

The handler should:

- Identify known application errors.
- Map unknown exceptions to `INTERNAL_ERROR`.
- Attach/request a correlation ID.
- Write detailed structured error logs.
- Avoid exposing stack traces to bakers.
- Return a consistent API response.

---

# 101. Baker Error Display

Bakers should receive clear, actionable error messages rather than raw backend errors.

Example general error modal:

```text
┌───────────────────────────────┐
│             ⚠️                │
│                               │
│ Something went wrong          │
│                               │
│ We couldn't create the order. │
│ Please try again.             │
│                               │
│ Reference: req_abc123         │
│                               │
│ [ Try Again ]    [ Close ]    │
└───────────────────────────────┘
```

Business-rule error:

```text
┌───────────────────────────────┐
│ Stock unavailable             │
│                               │
│ Only 2 brownies are available │
│ but your order requires 4.    │
│                               │
│ [ Edit Order ]                │
└───────────────────────────────┘
```

Create a centralized frontend helper such as:

```text
showAppError(error)
```

or an equivalent error-boundary/modal system.

---

# 102. Error Presentation Strategy

| Error | Baker UI |
|---|---|
| Validation | Inline field errors |
| Business rule | Informative error modal |
| Authentication | Auth-specific message |
| Network failure | Retry modal/toast |
| Server error | Generic error modal |
| Permission error | Access denied state |
| Not found | Not found state |

Do not use a generic modal for every validation problem.

---

# 103. Detailed Error Logging

Error logs should contain enough context for a developer to diagnose failures.

Recommended table:

```text
error_logs
-----------
id
request_id
timestamp

level
error_code
error_message

user_id
bakery_id

module
operation
endpoint
http_method

stack_trace
request_metadata
context

created_at
```

Useful safe metadata may include:

- User agent
- Application version
- Platform
- Environment
- Worker name
- Job ID
- Operation name

Never log:

- Passwords
- Temporary passwords
- Authentication tokens
- Refresh tokens
- Private credentials
- Sensitive payment secrets

---

# 104. Central Error Logger Helper

Do not manually construct detailed error logs in every module.

Create a centralized helper:

```text
ErrorLogger.capture(error, context)
```

Example context:

```typescript
ErrorLogger.capture(error, {
  module: "orders",
  operation: "createOrder",
  userId,
  bakeryId,
  requestId,
  metadata
});
```

Responsibilities:

1. Normalize the exception.
2. Capture the stack trace.
3. Attach request/correlation ID.
4. Attach module and operation.
5. Add safe contextual metadata.
6. Persist/write structured logs.
7. Provide a future integration point for BugSnag.

---

# 105. Detailed Audit Logging

Audit logs and error logs are separate concerns.

Audit logs answer:

```text
Who did it?
What did they do?
When did they do it?
Which record changed?
What was the old state?
What is the new state?
```

Recommended table:

```text
audit_logs
----------
id
actor_id
bakery_id

action
entity_type
entity_id

before_values
after_values

metadata
ip_address
user_agent
request_id

created_at
```

Examples:

```text
ORDER_CREATED
ORDER_UPDATED
ORDER_STATUS_CHANGED
ORDER_CANCELLED

PAYMENT_STATUS_CHANGED

CUSTOMER_CREATED
CUSTOMER_UPDATED

PRODUCT_CREATED
PRODUCT_UPDATED
PRODUCT_DELETED

STOCK_ADDED
STOCK_ADJUSTED
STOCK_WASTED

EXPENSE_CREATED
EXPENSE_UPDATED
EXPENSE_DELETED

ACCOUNT_PASSWORD_CHANGED
ACCOUNT_EMAIL_CHANGED
ACCOUNT_PHONE_CHANGED
```

---

# 106. Central Audit Logger Helper

Use a centralized helper instead of directly inserting audit records from every service.

Example:

```text
AuditLogger.record({
  actorId,
  bakeryId,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
  requestId
})
```

Example order status audit:

```text
Action:
ORDER_STATUS_CHANGED

Before:
PENDING

After:
IN_PROGRESS

Actor:
Baker

Entity:
Order #1024
```

For important business mutations, audit creation should be part of the reliable mutation workflow rather than an ignored fire-and-forget operation.

---

# 107. Event-Driven Audit and Notifications

For complex operations, use internal domain events after successful database transactions.

Example:

```text
OrderService
    ↓
Database Transaction
    ↓
Order Created
    ↓
OrderCreated Event
    ├── AuditLogger
    ├── Notification Job
    └── Analytics Job
```

Important business events can include:

```text
OrderCreated
OrderUpdated
OrderStatusChanged
PaymentStatusChanged
StockAdded
StockAdjusted
StockLow
ExpenseCreated
CustomerCreated
ReceiptGenerated
```

For critical audit requirements, ensure the event/audit mechanism cannot silently lose the record because an asynchronous worker failed.

---

# 108. Request Correlation ID

Every API request should have a request/correlation ID.

```text
Request
   ↓
requestId
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Logs / Audit / Errors
```

Example:

```text
req_01JXYZ...
```

This makes it possible for a developer to search one ID and correlate the request, error, audit record, and related worker job where applicable.

---

# 109. Order Creation as a Cart

The Add Order experience should behave like a cart rather than immediately creating an order for each selected item.

Flow:

```text
Add Order
    ↓
Select Customer
    ↓
Add Items
    ↓
Modify Quantities
    ↓
Add Charges / Discount
    ↓
Set Delivery
    ↓
Set Payment
    ↓
Review Bill
    ↓
Confirm
```

Only after confirmation should the real order be persisted.

---

# 110. Order Draft / Cart State

Before confirmation, maintain a temporary order draft.

Conceptually:

```text
orderDraft
-----------
customer
items[]
delivery
adjustments[]
payment
notes
```

Example item:

```typescript
{
  productId: "brownie",
  name: "Brownie",
  quantity: 4,
  unitPrice: 50
}
```

The draft can exist entirely in the UI state until the baker confirms it.

---

# 111. Cart Item UX

```text
Items

Brownie
₹50

[-]   4   [+]

Chocolate Cake
₹650

[-]   1   [+]

[ + Add Product ]
```

The baker can:

- Increase quantity.
- Decrease quantity.
- Remove an item.
- Add another product.
- Add item-specific notes.

The subtotal should update immediately.

---

# 112. Cart → Bill → Confirm

The complete order workflow becomes:

```text
                    ADD ORDER
                       │
                       ▼
                   CART/DRAFT
                       │
              ┌────────┼────────┐
              │        │        │
           Items    Delivery   Payment
              │        │        │
              └────────┼────────┘
                       │
                       ▼
                  BILL PREVIEW
                       │
                 Review Amount
                       │
                       ▼
                    CONFIRM
                       │
                       ▼
                  CREATE ORDER
                       │
                       ▼
                 VIEW / SHARE BILL
```

This gives the baker a final opportunity to correct the order before it becomes a business record.

---

# 113. Order Confirmation Validation

Before confirmation, validate:

```text
Customer selected
At least one item
Valid quantities
Valid delivery information
Valid delivery date
Valid payment information
Valid adjustments
Inventory rules
```

For delivery orders:

```text
Address OR Google Maps link
```

must be present.

For pickup orders, address and Maps link are optional.

---

# 114. Order Confirmation Transaction

When the baker confirms the cart:

```text
Validate Draft
      ↓
Begin Transaction
      ↓
Create Order
      ↓
Create Order Items
      ↓
Create Adjustments
      ↓
Apply Inventory Rules
      ↓
Create Audit Record/Event
      ↓
Commit
      ↓
Emit Post-Commit Events
      ↓
Queue Notifications
```

The real order should not exist before confirmation.

---

# 115. Dashboard Order Sorting

The main dashboard should sort pending orders by **due delivery date by default**.

Default ordering:

```text
OVERDUE
   ↓
TODAY
   ↓
TOMORROW
   ↓
UPCOMING
```

Within the same delivery date:

```text
earliest delivery time
```

if a delivery time is available. Otherwise use the earliest order creation time.

---

# 116. Dashboard Order Filters

The dashboard should support filters for both preparation and payment status.

### Preparation Status

```text
All
Pending
In Progress
In Transit
Delivered
Cancelled
```

### Payment Status

```text
All
Paid
Unpaid
```

The filters should be combinable.

Example:

```text
Preparation: In Progress
Payment: Unpaid
```

shows only in-progress orders that are unpaid.

---

# 117. Dashboard Filter UI

Mobile example:

```text
Pending Orders

[ Due Date ▼ ]

Status
[ All ▼ ]

Payment
[ All ▼ ]
```

Alternatively, use a filter sheet:

```text
┌──────────────────────────────┐
│ Filters                      │
│                              │
│ Preparation                  │
│ ○ All                        │
│ ○ Pending                    │
│ ○ In Progress                │
│ ○ In Transit                 │
│ ○ Delivered                  │
│                              │
│ Payment                      │
│ ○ All                        │
│ ○ Paid                       │
│ ○ Unpaid                     │
│                              │
│ [ Apply Filters ]            │
└──────────────────────────────┘
```

---

# 118. User Upload Policy

There is exactly **one user-uploaded image type** in the current scope: the bakery logo.

Allowed:

```text
Bakery Logo
Maximum size: 500 KB
Maximum active logos per bakery: 1
```

Not allowed:

```text
Product images
Customer images/files
Expense receipt images/files
Order attachments
Receipt files
Menu images uploaded by users
Other profile images
```

When the baker replaces the logo:

```text
Validate new logo
      ↓
Upload new logo safely
      ↓
Update current logo reference
      ↓
Delete previous logo file/reference
```

The old logo must not remain as an accessible historical version. The replacement operation should avoid leaving the bakery without a valid logo if the new upload fails.

This restricted upload policy keeps storage, validation, security, backup, and cost management simple.

---

# 119. Swagger UI / OpenAPI

Swagger UI is a good fit for this application because it has a defined API/service layer and will benefit from discoverable API contracts.

Use:

```text
OpenAPI Specification
        +
Swagger UI
```

Recommended route:

```text
/api/docs
```

or another DEV-protected documentation route.

Document:

- HTTP method.
- URL.
- Authentication requirements.
- Request body.
- Query parameters.
- Response schema.
- Error responses.
- Example requests.
- Example responses.

Organize by:

```text
Authentication
Customers
Products
Orders
Inventory
Expenses
Analytics
Notifications
Receipts
```

---

# 120. OpenAPI Architecture

Keep OpenAPI documentation separate from business logic.

```text
src/
├── app/api/
│   ├── orders/
│   ├── customers/
│   └── ...
│
├── docs/
│   ├── openapi.ts
│   ├── schemas/
│   └── tags/
│
└── modules/
```

The API contract should remain aligned with the actual route validation and response schemas.

Swagger should be available in development and protected by the DEV role (or disabled) in production.

Never expose internal/admin APIs through an unprotected production Swagger UI.

---

# 121. Testing Strategy

The architecture should support multiple testing layers.

## Unit Tests

Test:

```text
Order calculations
Discount calculations
Charge calculations
Inventory calculations
Status transitions
Validation
Error mapping
```

## Integration Tests

Test:

```text
Create order
Update order
Inventory changes
RLS
Authentication
Notifications
```

## API Tests

Test:

```text
POST /api/orders
GET /api/orders
PATCH /api/orders/:id
```

## E2E Tests

Critical journey:

```text
Login
 ↓
Create Customer
 ↓
Create Product
 ↓
Add Stock
 ↓
Build Order Cart
 ↓
Generate Bill
 ↓
Confirm Order
 ↓
Update Order Status
```

---

# 122. Final Pre-Release Quality Phase

Before the first production release, add a dedicated quality and observability phase.

This phase should include:

```text
BugSnag
SonarQube
Security Review
Performance Testing
E2E Testing
Production Monitoring
```

These should be integrated before the production release rather than added after the first major production incident.

---

# 123. BugSnag Integration

Add BugSnag during the final release-hardening phase.

Use it for:

- Frontend runtime exceptions.
- Application crashes.
- Important API failures where appropriate.
- Unhandled promise rejections.
- Worker failures.
- Release tracking.

Recommended flow:

```text
Application Error
      ↓
Global Error Handler
      ↓
ErrorLogger
      ├── Internal Error Logs
      └── BugSnag
```

BugSnag complements the application's own detailed logs; it does not replace them.

Sensitive information must be filtered/redacted before sending events externally.

Never send:

```text
Passwords
Temporary passwords
Auth tokens
Refresh tokens
Private credentials
Sensitive customer information
```

---

# 124. SonarQube Integration

Add SonarQube to the final release-hardening phase.

Use it to analyze:

- Bugs.
- Vulnerabilities.
- Code smells.
- Duplicated code.
- Maintainability.
- Test coverage.
- Overall code quality.

Recommended CI flow:

```text
Push / Pull Request
       ↓
Install
       ↓
Lint
       ↓
Type Check
       ↓
Unit Tests
       ↓
Integration Tests
       ↓
Build
       ↓
SonarQube Analysis
       ↓
Quality Gate
       ↓
Deploy
```

Critical quality/security failures should block release.

---

# 125. Final Pre-Release Pipeline

```text
Developer
    │
    ▼
Git Push
    │
    ▼
CI
    │
    ├── ESLint
    ├── Prettier Check
    ├── TypeScript Check
    ├── Unit Tests
    ├── Integration Tests
    ├── E2E Tests
    ├── Build
    ├── SonarQube
    └── Security Checks
    │
    ▼
Quality Gate
    │
    ├── FAIL → Stop
    │
    └── PASS
           │
           ▼
       Deploy Staging
           │
           ▼
      Smoke Testing
           │
           ▼
      Production Release
           │
           ▼
         BugSnag
       + Monitoring
```

---

# 126. Updated Complete V1 Flow

```text
REGISTER
   │
   ├── Phone
   ├── Email
   └── Password
   │
   ▼
EMAIL CONFIRMATION
   │
   ▼
LOGIN
   │
   ▼
DASHBOARD
   │
   ├── Business Summary
   │
   ├── Pending Orders
   │     ├── Overdue
   │     ├── Today
   │     ├── Tomorrow
   │     └── Upcoming
   │
   └── Quick Actions
           │
           ▼
       ADD ORDER
           │
           ▼
        CART/DRAFT
           │
      ┌────┼──────────┐
      │    │          │
   Items Delivery   Payment
      │    │          │
      └────┼──────────┘
           │
           ▼
     BILL PREVIEW
           │
           ▼
        CONFIRM
           │
           ▼
      CREATE ORDER
           │
           ├── Inventory
           ├── Audit Log
           ├── Notification Job
           └── Analytics
           │
           ▼
      VIEW / SHARE BILL
```

---

# 127. Updated Production Architecture

```text
                              CLIENTS
                 ┌──────────────┼──────────────┐
                 │              │              │
                Web            PWA         Android
                 │              │          Capacitor
                 └──────────────┼──────────────┘
                                │
                            Next.js
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
               UI Layer      API Layer     Public Menu
                                │           SSG / ISR
                                │
                           Validation
                                │
                         Controller Layer
                                │
                          Service Layer
                                │
                       Repository Layer
                                │
                          Supabase SDK
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
      PostgreSQL              Storage               Auth
          │
     ┌────┼───────────────────────────────┐
     │    │                               │
    RLS  Realtime                    PostgreSQL Queue
     │                                    │
     │                                    ▼
     │                                 Workers
     │                                    │
     │                     ┌──────────────┼──────────────┐
     │                     │              │              │
     │               Notifications    Receipts      Analytics
     │
     ├── Orders
     ├── Customers
     ├── Products
     ├── Inventory
     ├── Expenses
     ├── Audit Logs
     └── Error Logs

Cross-Cutting:
──────────────────────────────────────────────────────
Global Error Handler
Central Error Constants
Error Logger
Audit Logger
Request Correlation IDs
Mail Service / Nodemailer
OpenAPI / Swagger
Testing
BugSnag
SonarQube
```

---

# 128. Updated Key Architectural Decisions

| Area | Decision |
|---|---|
| Architecture | Modular monolith |
| Frontend | Next.js + TypeScript |
| Mobile | PWA + Capacitor Android |
| Database | Supabase PostgreSQL |
| Authentication | Phone + email + password |
| Account uniqueness | Phone and email both unique |
| Confirmation | Email confirmation |
| Email provider | Nodemailer abstraction |
| Password reset | Temporary random password + forced password change |
| Authorization | RLS + application authorization |
| Multi-tenancy | `bakery_id` |
| Business logic | Service layer |
| Database access | Repository layer |
| Validation | Zod |
| Shared code | Shared TypeScript types/constants |
| Error handling | Global centralized error handler |
| Error messages | Central error constants |
| Error logging | Detailed structured ErrorLogger |
| Audit logging | Detailed centralized AuditLogger |
| Request tracing | Correlation/request ID |
| Baker errors | Central error modal + inline validation |
| Orders | Cart/draft → bill → confirmation |
| Payments | Status + method + optional reference on order |
| Payment table | Not required for V1 |
| Billing | Directly from Add Order |
| Extra charges | Supported during order creation |
| Discounts | Supported during order creation |
| Delivery | Address, Google Maps link, or both |
| Inventory | Ledger-based |
| Dashboard | Summary card + pending orders |
| Dashboard sorting | Due date by default |
| Dashboard filtering | Preparation status + payment status |
| Background jobs | PostgreSQL-backed queue |
| Redis | Not required initially |
| Notifications | Worker-based |
| User uploads | Bakery logo only; maximum 500 KB; one active logo per bakery |
| API documentation | OpenAPI + Swagger UI |
| Swagger production access | DEV-only/protected |
| Receipts | Generated on demand; not stored; native share/download |
| Analytics | Database queries + aggregates |
| Public menu | SSG/ISR |
| QR | One permanent QR per baker |
| UI | Mobile-first responsive |
| Themes | Clean White + Peach Bakery |
| Error monitoring | BugSnag before release |
| Code quality | SonarQube before release |
| Phase 1 | Internal bakery management |
| Phase 2 | Menu Builder + public QR menu |

---

# 129. Production-Grade Hardening — Complete 48-Point Checklist

This section consolidates the **48 production-hardening suggestions** discussed for the Home Bakery Management Platform. These are hardening and reliability decisions, not new business features. They should be implemented according to the project phases below and should not introduce unnecessary infrastructure or feature scope.

## 1. Make Order Creation Strongly Transactional

Order confirmation is a critical business operation and must be handled as one PostgreSQL transaction wherever possible.

```text
Validate Draft
→ Begin Transaction
→ Create Order
→ Create Order Items
→ Create Adjustments
→ Apply Inventory Changes
→ Record Critical Audit Data
→ Commit
→ Trigger Post-Commit Jobs/Events
```

If a critical step fails, the transaction must roll back instead of leaving a partially created order.

---

## 2. Add Idempotency for Critical Mutations

Prevent double creation caused by double taps, retries, network retries, or duplicate requests.

Use an idempotency key for operations such as:

- Order creation
- Inventory transactions
- Payment-status updates
- Receipt generation
- Other non-repeatable critical mutations

The server must detect an already-processed key and return the original result rather than performing the operation again.

---

## 3. Make Inventory Concurrency-Safe

Inventory must never depend on an unsafe read-then-write sequence.

Example race to prevent:

```text
Stock = 5

Order A requests 4
Order B requests 3

Both read 5
Both succeed
```

Use PostgreSQL transactions with row locking and/or atomic conditional updates so that only valid stock deductions can succeed.

The inventory ledger remains the source of truth.

---

## 4. Use Soft Deletion / Deactivation Where History Matters

Do not physically delete business records that are referenced by historical orders or reports unless there is a strong reason to do so.

Prefer fields such as:

```text
is_active
archived_at
```

This is especially important for products, categories, and other records whose historical references must remain valid.

---

## 5. Preserve Historical Order Snapshots

Orders must not change historically when a product is edited later.

Store snapshots such as:

```text
product_name
unit_price
quantity
subtotal
```

inside `order_items`.

Historical bills must remain correct even after product names, prices, or descriptions change.

---

## 6. Enforce Business Rules at the Database Level

Important invariants should not rely only on frontend or service validation.

Use PostgreSQL constraints for things such as:

- Required fields
- Valid numeric ranges
- Foreign keys
- Unique bakery-scoped identifiers
- Valid status values where appropriate
- Non-negative monetary values where appropriate

Application validation remains necessary, but the database is the final integrity boundary.

---

## 7. Design Indexes Around Real Queries

Add indexes based on actual application access patterns rather than indexing every column.

Important examples include:

```text
(bakery_id, status, delivery_date)
(bakery_id, payment_status)
(bakery_id, phone)
(bakery_id, is_active)
```

Review indexes as query patterns evolve.

---

## 8. Paginate Large Lists

Never load unbounded datasets into the client.

Pagination is required for:

- Orders
- Customers
- Expenses
- Audit logs
- Error logs
- Notifications
- Other potentially large lists

Prefer server-side pagination and return only the required page.

---

## 9. Use Server-Side Search and Filtering

Search and filters should be performed by PostgreSQL/API queries rather than downloading the complete dataset and filtering in the browser.

This is particularly important for orders, customers, products, expenses, audit logs, and analytics.

---

## 10. Persist the Order Cart Draft Locally

The Add Order cart should survive accidental navigation, browser/app closure, or temporary network problems where possible.

Use a lightweight local draft mechanism such as IndexedDB/local storage for the in-progress cart.

The draft is not authoritative. The server revalidates everything at confirmation.

---

## 11. Calculate Final Order Totals on the Server

The frontend may calculate totals for instant UI feedback, but the backend must recalculate the authoritative amount.

Server-side calculation must include:

```text
Subtotal
+ Delivery Charges
+ Other Charges
- Discounts
+ Tax (if enabled)
= Total
```

Never trust client-provided totals.

---

## 12. Store Money as Integer Minor Units

Avoid floating-point arithmetic for monetary values.

For INR, store amounts as paise where practical:

```text
₹125.50 → 12550
```

Convert to rupees only at the presentation boundary.

This avoids floating-point rounding problems in totals, discounts, charges, and analytics.

---

## 13. Make Business Dates and Times Timezone-Aware

Use an explicit bakery timezone for business operations.

For the expected Indian deployment, `Asia/Kolkata` should be configured rather than relying blindly on the server timezone.

Delivery dates, overdue calculations, dashboard grouping, notifications, and analytics must use the bakery's business timezone.

---

## 14. Centralize the Order Status State Machine

Do not allow arbitrary status changes from the UI/API.

Centralize allowed transitions:

```text
PENDING
  ↓
IN_PROGRESS
  ↓
IN_TRANSIT
  ↓
DELIVERED
```

Cancellation rules must also be centralized.

The same state-transition rules must be used by every entry point that can update order status.

---

## 15. Separate Business Errors from Technical Errors

Use typed application errors such as:

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
BusinessRuleError
ExternalServiceError
InternalServerError
```

Business errors should be safe and understandable to bakers. Technical failures should be logged internally and exposed through a generic safe message.

---

## 16. Propagate Request Correlation IDs

Every API request should have a `requestId`.

The same identifier should be available to:

```text
Controller
→ Service
→ Repository
→ Audit Logger
→ Error Logger
→ Worker/Job metadata where applicable
```

This makes debugging a single user operation across multiple layers much easier.

---

## 17. Sanitize Sensitive Data from Logs

Never log:

- Passwords
- Temporary passwords
- Authentication tokens
- Session secrets
- API keys
- Database credentials
- Payment credentials
- Other secrets

Be deliberate about PII as well. Structured logging should support explicit redaction rather than relying on developers to remember every sensitive field.

---

## 18. Make Email Delivery Asynchronous and Retriable

Account confirmation and password-reset emails should preferably be jobs rather than blocking registration/login-related requests.

Use:

```text
Mail Job
→ Attempt
→ Failure
→ Backoff
→ Retry
→ Final Failure / FAILED state
```

The MailService remains provider-agnostic so Nodemailer/SMTP can be replaced later without changing business logic.

---

## 19. Harden Authentication and Session Handling

Authentication must include:

- Secure password handling through Supabase Auth
- Proper session/cookie handling
- Forced password change after temporary-password reset
- Session invalidation where required after sensitive account changes
- Protection of authenticated routes
- Server-side authorization checks

Do not rely on hidden UI elements as an authorization mechanism.

---

## 20. Rate-Limit Abuse-Prone Endpoints

Apply appropriate limits to operations that can be abused or accidentally hammered:

- Login
- Forgot password
- Confirmation resend
- Password reset flows
- Order creation
- Receipt generation
- Other expensive or externally connected operations

The exact limits should be tuned after observing real usage.

---

## 21. Test RLS as a First-Class Security Boundary

Supabase Row Level Security is mandatory for tenant isolation.

Tests must verify at minimum:

```text
Baker A → can access Bakery A
Baker A → cannot read Bakery B
Baker A → cannot modify Bakery B
DEV     → follows explicitly defined platform-access rules
```

Do not consider frontend filtering a substitute for RLS.

---

## 22. Keep Controller, Service, and Repository Responsibilities Separate

Maintain the architecture:

```text
Controller/API
      ↓
Validation
      ↓
Service
      ↓
Repository
      ↓
PostgreSQL/Supabase
```

Controllers should remain thin, services should own business rules, and repositories should own persistence concerns.

This makes testing and future changes easier without turning the application into unnecessary microservices.

---

## 23. Use Database Migrations for Every Schema Change

Production schema changes must go through version-controlled migrations.

Do not make undocumented manual production schema edits.

Migrations should be reviewable, repeatable, and safe to run in the intended environment.

---

## 24. Maintain Deterministic Seed Data

Create controlled seed scripts for development/testing.

Seeds should provide realistic fake data for:

- Baker accounts
- Customers
- Products
- Categories
- Orders
- Inventory
- Expenses

Do not use real customer data as test data.

---

## 25. Separate Development, Staging, and Production Environments

Use separate configuration and, where appropriate, separate Supabase projects/environments.

Never allow development credentials or test data to accidentally target production.

Environment variables must be managed securely and production secrets must never be committed to source control.

---

## 26. Implement Backups and Test Restoration

A backup strategy is incomplete unless restoration is tested.

The production plan should define:

- What is backed up
- Backup frequency/retention according to the selected Supabase plan
- Who/what performs restoration
- How restoration is verified
- Recovery procedures

Perform restore tests before relying on the system for important business data.

---

## 27. Claim Background Jobs Atomically

For the PostgreSQL-backed queue, workers must claim jobs atomically.

Use a pattern based on PostgreSQL row locking such as:

```sql
FOR UPDATE SKIP LOCKED
```

This prevents multiple workers from processing the same pending job at the same time.

---

## 28. Recover Stale Processing Jobs

Workers can crash after claiming a job.

Store lock/processing metadata such as:

```text
locked_at
locked_by
```

If a job remains `PROCESSING` beyond the configured timeout, another worker can safely reclaim it according to the recovery rules.

---

## 29. Use Retry Policies with Backoff

Transient failures should not immediately become permanent failures.

Use bounded retries with increasing delays for operations such as:

- Email delivery
- Notifications
- Receipt generation
- Analytics jobs
- External service calls

Do not retry permanent validation/business-rule failures.

---

## 30. Keep a Failed/Dead-Letter State for Jobs

Jobs that repeatedly fail should not be retried forever.

After the configured maximum attempts:

```text
PENDING
→ PROCESSING
→ FAILED
```

Store the final error and relevant metadata so DEV can investigate and manually retry when appropriate.

---

## 31. Make Critical Audit Logging Reliable

Important business mutations should produce audit records reliably.

Audit records should capture the actor, bakery, action, entity, before/after values where appropriate, request ID, and timestamp.

For critical mutations, avoid a design where the business operation succeeds but its required audit record can silently disappear.

---

## 32. Make Domain Events and Side Effects Reliable

Use internal events for non-critical post-transaction work such as:

```text
OrderCreated
OrderStatusChanged
PaymentStatusChanged
StockAdded
StockLow
ExpenseCreated
CustomerCreated
ReceiptGenerated
```

Keep critical state changes inside the transaction. Queue asynchronous side effects after the transaction commits, with retry/recovery behavior.

---

## 33. Avoid N+1 Database Queries

List screens should not execute one query per row.

For example, an order list should not fetch every customer/product/payment detail through separate requests for every order.

Use appropriate joins, selected columns, batched queries, or purpose-built repository methods.

Measure query behavior rather than guessing.

---

## 34. Keep Expensive Analytics off the Operational Dashboard

The dashboard is for immediate operational decisions:

```text
Today's Orders
Today's Revenue
Pending Orders
Pending Payments
```

Expensive trend calculations belong in the Analytics area or asynchronous aggregates/materialized data when needed.

Do not allow a heavy analytics query to make the main dashboard slow.

---

## 35. Introduce Caching Only Where It Solves a Measured Problem

Do not add Redis or a complex caching layer by default.

The initial architecture should use PostgreSQL/Supabase and application-level optimizations.

If profiling later shows a real bottleneck, add caching to the specific read path that needs it and define invalidation rules explicitly.

---

## 36. Implement Complete Loading, Empty, Success, and Error States

Every important screen should define its state behavior.

Examples:

```text
Loading
Empty
Loaded
Error
Retrying
Success
```

Do not leave users staring at blank screens or indefinite spinners.

---

## 37. Handle Network Failure Without Losing the Order Draft

If the network fails during confirmation, clearly tell the baker that confirmation did not complete unless the server response proves otherwise.

Example UX:

```text
Couldn't connect.
Your order hasn't been confirmed.

[Retry] [Save Draft]
```

Never create ambiguity about whether an order was actually created. Idempotency plus local draft persistence should support safe recovery.

---

## 38. Treat Accessibility as a Release Requirement

The mobile-first interface should support:

- Adequate contrast
- Accessible touch targets
- Screen-reader labels
- Keyboard navigation where relevant
- Visible focus states
- Logical form labels
- Error announcements
- Accessible modals
- Meaning that is not conveyed by color alone

Accessibility should be tested during implementation rather than added only at the end.

---

## 39. Set a Practical Mobile Performance Budget

The primary user experience is mobile-first.

Optimize for:

- Fast initial render
- Small client bundles
- Minimal unnecessary JavaScript
- Efficient database queries
- Pagination
- Responsive images/assets where applicable
- Avoiding unnecessary re-renders

Do not optimize prematurely; establish basic performance measurements and improve measured bottlenecks.

---

## 40. Avoid Premature API Versioning

Use a clean REST-ish API structure and consistent response contracts.

Do not introduce `/v1`, `/v2`, or multiple API versions until there is an actual compatibility requirement.

When versioning becomes necessary, introduce it deliberately with a migration/deprecation strategy.

---

## 41. Keep OpenAPI / Swagger as the API Contract

Maintain OpenAPI documentation for the meaningful API surface.

Document:

- Endpoint
- HTTP method
- Authentication
- Request body
- Query parameters
- Path parameters
- Response schema
- Error schema
- Examples

Swagger UI should be DEV-only or protected in production.

---

## 42. Build End-to-End Tests Around the Critical Business Journey

At minimum, cover:

```text
Login
→ Create Customer
→ Create Product
→ Add Stock
→ Create Order Cart
→ Add Items
→ Delivery Details
→ Charges/Discount
→ Payment
→ Bill Preview
→ Confirm Order
→ Inventory Update
→ View/Share Bill
→ Update Order Status
```

Also cover failure paths such as insufficient stock and failed network/retry behavior.

---

## 43. Use Unit and Integration Tests for Business Rules

Unit tests should cover pure business rules such as:

- Order totals
- Discounts
- Extra charges
- Inventory calculations
- Status transitions
- Validation
- Error mapping

Integration tests should cover:

- Supabase/PostgreSQL interactions
- Transactions
- RLS
- Authentication/authorization
- Workers
- Critical API flows

---

## 44. Add BugSnag During Final Release Hardening

BugSnag should be introduced in the final hardening phase rather than becoming a reason to add unnecessary infrastructure early.

Capture relevant runtime failures from:

- Frontend
- API
- Workers

Configure release tracking and environment information.

Redact secrets and sensitive user data before sending error reports.

---

## 45. Add SonarQube to CI Quality Gates

SonarQube should evaluate the codebase for issues such as:

- Bugs
- Vulnerabilities
- Code smells
- Duplication
- Maintainability
- Test coverage where configured

The CI pipeline should fail the release when configured critical quality/security gates are not satisfied.

---

## 46. Make the CI/CD Pipeline Enforce the Quality Process

The release pipeline should follow a predictable sequence:

```text
Push / Pull Request
        ↓
Install Dependencies
        ↓
Lint
        ↓
Format Check
        ↓
Type Check
        ↓
Unit Tests
        ↓
Integration Tests
        ↓
E2E Tests
        ↓
Build
        ↓
SonarQube
        ↓
Quality Gate
        ↓
Staging
        ↓
Smoke Test
        ↓
Production
        ↓
BugSnag / Monitoring
```

Production deployment should not proceed when required quality/security checks fail.

---

## 47. Perform a Security, Reliability, and Tenant-Isolation Release Review

Before production, perform a final review across the existing architecture rather than adding more features.

Checklist:

- RLS policies verified
- Bakery isolation verified
- Server-side authorization verified
- No secrets in client bundles
- Sensitive logs redacted
- Authentication flows tested
- Password reset tested
- Rate limits tested
- Database constraints verified
- Critical transactions verified
- Inventory race conditions tested
- Idempotency tested
- Worker recovery tested
- Backup/restore procedure tested
- Error responses do not expose internals
- Swagger access is protected
- Production environment variables verified

---

## 48. Final Production-Grade Architecture Checklist — and What Not to Add Yet

The final architecture should remain a **modular monolith** with strong boundaries and reliable infrastructure rather than being split into microservices prematurely.

```text
Next.js
├── UI / PWA / Capacitor
├── API Controllers
├── Validation
├── Services
├── Repositories
├── Domain Events
├── PostgreSQL-backed Jobs
└── Cross-Cutting Infrastructure
       ├── Auth
       ├── RLS
       ├── Error Handling
       ├── Error Logging
       ├── Audit Logging
       ├── Request IDs
       ├── Mail Service
       ├── OpenAPI
       ├── BugSnag
       └── SonarQube

Supabase
├── PostgreSQL
├── Auth
├── RLS
└── Realtime where actually required
```

The production hardening plan intentionally does **not** add unnecessary infrastructure or unrelated business features at this stage.

Do not add by default:

- Microservices
- Redis solely because workers exist
- Kubernetes
- A separate payment table when the V1 payment model does not require it
- Full offline-first architecture
- User image-upload infrastructure
- Premature API versioning
- Complex caching without measured need
- Additional business features outside the agreed roadmap

The goal is a system that is **transaction-safe, tenant-safe, observable, testable, maintainable, and deployable** while remaining simple enough for the current scale.

---

# 130. Implementation Priority for the 48 Hardening Items

The 48 items should not all be implemented at once. Use the following priority order.

### P0 — Must Have Before Production

```text
1   Transactional order creation
2   Idempotency
3   Concurrency-safe inventory
5   Historical order snapshots
6   Database constraints
7   Critical indexes
11  Server-side totals
12  Integer money representation
13  Timezone correctness
14  Order state machine
15  Error classification
16  Request IDs
17  Log sanitization
19  Authentication/session hardening
20  Rate limiting
21  RLS tests
23  Database migrations
25  Environment separation
26  Backup/restore procedure
27  Atomic job claiming
28  Stale-job recovery
29  Retry/backoff
30  Failed/dead-letter jobs
31  Reliable audit logging
37  Network failure recovery
38  Accessibility baseline
42  Critical E2E tests
43  Unit/integration tests
47  Final security/reliability/tenant review
```

### P1 — Strongly Recommended

```text
4   Soft deletion/deactivation
8   Pagination
9   Server-side search/filtering
10  Local order draft persistence
18  Async/retriable email
22  Controller/service/repository boundaries
24  Deterministic seed data
32  Reliable domain side effects
33  N+1 prevention
34  Analytics separation
36  Complete UI state handling
39  Mobile performance budget
41  OpenAPI/Swagger contract
44  BugSnag
45  SonarQube
46  CI/CD quality gates
```

### P2 — Add Only When the System Demonstrates the Need

```text
35  Caching
40  API versioning
```

These are deliberately deferred until actual usage, profiling, or compatibility requirements justify them.

---

# 131. Final Hardening Principle

The project should optimize for **correctness before complexity**.

The preferred progression is:

```text
Correct Business Rules
        ↓
Database Integrity
        ↓
Transaction Safety
        ↓
Tenant Isolation
        ↓
Reliable Background Jobs
        ↓
Observability
        ↓
Testing
        ↓
Performance Optimization
        ↓
Scale Infrastructure Only When Needed
```

This keeps the Home Bakery Management Platform production-grade without turning the initial implementation into an unnecessarily complex distributed system.

---

# 132. Final File and Receipt Storage Rules

These rules are authoritative for the current implementation scope:

| Resource | Persistence | Rule |
|---|---|---|
| Bakery logo | Supabase Storage + current DB reference | Only user upload; max 500 KB; one active logo; replace deletes previous file/reference |
| Product images | None | User uploads not supported |
| Customer files/images | None | User uploads not supported |
| Expense receipts | None | User uploads not supported |
| Order attachments | None | User uploads not supported |
| Receipt PDFs | None | Generate on demand only |
| Receipt history | None | Not stored; regenerate from confirmed order snapshot |
| Menu images | None | User uploads not supported in current scope |

## Receipt generation requirement

The confirmed order remains the source of truth. Because order items, prices, discounts, charges, payment information, customer information, and delivery information are preserved as historical order data/snapshots, a receipt can be regenerated whenever needed without storing a PDF.

```text
Open Order
    ↓
Generate Receipt On Demand
    ↓
Render PDF / Preview
    ↓
Share or Download
    ↓
Discard Generated Artifact
```

Do not introduce a receipt bucket, receipt-files table, receipt-history table, or persistent receipt worker unless a future requirement explicitly changes this decision.

## Logo replacement requirement

Logo replacement must be safe and tenant-scoped:

```text
Upload candidate
      ↓
Validate type + signature + <= 500 KB
      ↓
Persist candidate
      ↓
Atomically update current logo reference
      ↓
Delete previous logo
```

If the candidate upload or database update fails, the existing logo should remain usable.

---

# 133. Implementation Gap Register

This section records what the plan asks for that the codebase does **not** yet do, as of 2026-09-22. It exists so the remaining work is visible in the plan itself rather than rediscovered later. Every item below was verified against the code, not inferred.

Nothing here is a change of scope. These are parts of the approved plan that are unbuilt, stubbed, or built in a way the plan does not accept. When one is implemented, delete its entry.

Legend for **Blocks**: what cannot be trusted or used until the item is done.

---

## 133.1 Authentication — built (Phase 1, closed 2026-09-23)

Every gap recorded here has been implemented. The entry is kept rather than deleted so the numbering of the rest of this register stays stable, and so what was built is on record.

| Was | Now |
|-----|-----|
| No sign-in, register or forgot-password screens. | `/login`, `/register`, `/forgot-password`, `/change-password` and `/confirm-email`, built on the shared UI kit in `src/features/auth/components`. |
| Nothing stored the session. | Signing in sets HttpOnly `SameSite=Lax` cookies (`src/features/auth/cookies.ts`); the browser never holds a token. |
| The browser client never sent a credential. | It no longer needs to: cookies ride with every same-origin request, and `src/lib/api/client.ts` refreshes the session once and retries when one is refused for an expired token. |
| No route protection. | `src/proxy.ts` sends a signed-out visitor to sign-in remembering where they were, and a signed-in one off the sign-in screen. It gates on cookie presence only — authorization stays in the route guard and RLS. |
| The forced password change was not enforced. | `RequireAuth` redirects in the browser and `withBakeryRoute` refuses on the server, so hiding the screens is not what does the work (plan §95). |
| `assertRole` allowed every role by default. | It has no default. `withBakeryRoute` serves `BAKERY_ROLES` (`BAKER`), so DEV does not inherit business data (plan §5). |

**Still open, tracked elsewhere:** rate limiting on sign-in and password reset (§133.11 — it needs shared state, and the blocker is recorded in changelog.md); account deactivation from a screen (§64); the DEV platform surface — system logs, worker status, health — which has no routes yet (§5, §8).

---

## 133.2 Bakery profile and logo (Phase 1 — §56, §118)

| # | Gap | Where |
|---|-----|-------|
| B1 | No bakery profile endpoint. The Settings name and phone fields were hard-coded and have been removed; the section says so. **Closed 2026-09-25 by R2.6:** `GET, PATCH /api/business` and Business details. | no `/api/bakery` route |
| B2 | No logo upload: no storage bucket, no server-side size and content-type validation, no atomic replace-then-delete. **Closed 2026-09-25 by R2.7:** the private `business-logos` bucket, the size and first-bytes checks, and store → switch → delete. | §56, §118 |
| B3 | `bakeries` has a SELECT policy only. An UPDATE policy is needed before profile editing can work at all. **Closed 2026-09-25 by R2.6** as §139.11.2 decided instead: `bakeries` stays SELECT-only, and edits go through owner-checked functions (`0008_business_profile.sql`). | `supabase/migrations/0001_auth_foundation.sql` |
| B4 | **Closed 2026-09-26 by R4.1:** the bill is built from the business profile. The receipt header prints a hard-coded `"Ovenly Bakery"` instead of the bakery's own name. | `src/features/receipts/api.ts` |

---

## 133.3 Orders — correctness gaps (Phase 2 — §53, §109–§114, §21)

| # | Gap | Why it matters |
|---|-----|----------------|
| C1 | **Closed 2026-09-25 by R3.1 (`create_order`, a691c58).** Order creation is **not transactional**. It inserts the order, then items, then adjustments, then ledger lines, and on failure compensates with a hard delete. A crash between steps leaves a partial order. §114 asks for one transaction — a Postgres function called over RPC. | Data integrity |
| C2 | **Closed 2026-09-25 by R3.1 and R3.12 (an idempotency key on placing and on a payment, a691c58); the screen keeps its key through a refresh (R3.9, 2026-09-26).** **No idempotency** anywhere. A double-tapped Place Order creates two orders; a retried payment records twice. §24 of AGENTS.md requires critical mutations to be safe against duplicate submission. | Money |
| C3 | **Closed 2026-09-26: the draft by R3.9, the estimate by R3.13 and the bill before saving by R4.3.** No cart/draft state and **no bill-preview step** before Confirm. The plan's flow is Cart → Bill → Confirm (§110–§112); the screen is one long form with a running total. | Approved UX |
| C4 | **Closed 2026-09-25 by R3.3 (stocked products only, a691c58).** **Stock can be oversold.** Nothing reads the balance before an `ORDER_RESERVATION` is posted, so an order can reserve stock that is not there (§21). | Inventory truth |
| C5 | **Closed 2026-09-24 by R0.7 (218d78d), and kept inside `change_order_status` by R3.4.** **A delivered order deducts its stock twice.** `checkout.ts` posts `ORDER_RESERVATION` at `-quantity` and `status.ts` posts `ORDER_CONSUMPTION` at `-quantity` on first delivery, and nothing ever releases the reservation. Every balance in the app is therefore short by the quantity of every delivered order. Consumption should release the reservation, not repeat it. | Inventory truth **Closed 2026-09-24 by R0.7.** |
| C6 | **Closed 2026-09-25 by R3.4 (`change_order_status`, ca826b9).** **`updateOrderStatus` is not transactional either.** It persists the status, then the ledger line, then the audit row, then enqueues the notification. Observed on 2026-09-23: a failure at the last step left the status changed, the stock consumed and the audit written, and the retry then saw `before.status === 'DELIVERED'` and silently skipped the notification. Same fix as C1. | Data integrity |

---

## 133.4 Product categories (Phase 2 — §14)

| # | Gap |
|---|-----|
| D1 | The `categories` table exists with RLS, and `products.category_id` is written by the API — but there is no categories endpoint, no categories UI, and no way for a baker to create one. The field can never be set from the app. **Dropped 2026-09-25 by the user: products need no categories; R5.6 removes the table and the column.** |

---

## 133.5 Notifications (Phase 4 — §25)

| # | Gap |
|---|-----|
| E1 | **Closed 2026-09-26 by R5.10.** The `notifications` table exists with RLS and is never read or written. There is no notifications screen and no bell. |
| E2 | Push delivery is a mock that logs (`CapacitorPushProvider`). There is no device-token registry, so every `SEND_PUSH_NOTIFICATION` job finds no device and completes without sending. |
| E3 | `processPayment` still enqueues a literal `token: "mock-token"`. Remove it when the token registry lands. |

---

## 133.6 The worker system (Phase 5 — §26, §27)

The queue table and the claim/complete/fail helpers exist. Nothing runs them.

| # | Gap |
|---|-----|
| F1 | **Closed 2026-09-25 by R2.1 (F1–F5).** **Nothing drains the queue.** `processNextJob` is never called — there is no cron route, scheduled function or worker process. Every job enqueued so far is still `pending`. |
| F2 | `registerNotificationWorker` and `registerAnalyticsWorker` are never called, so no handler is registered even if the queue did run. |
| F3 | `claimNextJob` is **not atomic**: it updates `status = 'pending'` with a limit and no `FOR UPDATE SKIP LOCKED`, so two workers can claim the same job. AGENTS.md §17 requires atomic claiming. |
| F4 | `claimNextJob` **sets** `attempts: 1` instead of incrementing it, so `processNextJob`'s `attempts < maxAttempts` check never trips and a failing job retries forever. Nothing reaches the dead-letter state. |
| F5 | No stale-job recovery: `locked_at` is written and cleared but never reclaimed, so a job whose worker died stays `processing` for good. |
| F6 | Backoff is a fixed five minutes, not exponential. |
| F7 | `MenuBuildWorker` and `CleanupWorker` (§27) do not exist. |
| F8 | Jobs are enqueued with the **caller's** Supabase client, so the insert arrives as `authenticated`, but `jobs` has no `bakery_id` and so no row can be scoped to a tenant. `0004_api_role_grants.sql` therefore grants INSERT and withholds SELECT, and `createJob` no longer reads the row back — a baker must not be able to read another bakery's queued work. The queue is infrastructure, not tenant data: enqueuing belongs on the service-role client, which is the same threading change as the audit actor in §133.7. |

---

## 133.7 Audit (Phase 5 — §36)

| # | Gap |
|---|-----|
| G1 | **Closed 2026-09-25 by R2.10.** `audit_logs.user_id` is written as `null` for every mutation — the trail records what changed but not who changed it. The audit call is centralised in `tenantRecords`, and `withBakeryRoute` already holds the session, so the fix is to thread the acting user through the data layer. Preferred shape: feature functions take the `BakeryContext` object rather than `(client, bakeryId, …)`, so the argument list stops growing. |

---

## 133.8 Receipts (Phase 4 — §24)

| # | Gap |
|---|-----|
| H1 | **Closed 2026-09-26 by R4.4 and R4.5:** Share sends the bill as a PNG, and Download PDF makes the PDF on demand; nothing is stored. The receipt is an on-screen HTML view with browser print. There is no PDF generation, no native share, no WhatsApp share and no download (§24). Generation stays on demand and nothing is stored — that part of §24 is respected and must stay that way. |
| H2 | `/receipts` is in the navigation (§9) but no page exists, so the link 404s. Either build the screen or take the entry out of `src/constants/navigation.ts`. **Closed 2026-09-24 by R0.4** (the entry was removed). |

---

## 133.9 Analytics and dashboard (Phase 3 — §39, §40, §116–§117)

| # | Gap |
|---|-----|
| I1 | **Closed 2026-09-26 by R5.9:** the Customers tab lists the ten saved customers who spent most in the period, Guests left out. Top Customers (§40) is not built. |
| I2 | **Closed 2026-09-26 by R5.15:** Home's orders due filter by preparation and payment, combined, in a sheet. Dashboard filters (§116–§117) are not built. |
| I3 | **Closed 2026-09-26 by R5.9:** Analytics reads `GET /api/analytics/overview`, which works the period out on the server; the browser adds nothing up. `/api/analytics/overview` exists and nothing calls it. The Analytics screen fetches every order and expense and adds them up in the browser, which will not survive a real dataset. Move the aggregation to the endpoint and page the rest. |
| I4 | No pagination anywhere. Every list fetches every row. |

---

## 133.10 PWA, Capacitor and offline (Phase 7 — §50, §51)

| # | Gap |
|---|-----|
| J1 | No PWA at all: there is no `public/` directory, so no manifest, no service worker and no icons. |
| J2 | No Capacitor: no config, no dependency, and no native-capability abstraction beyond the mock push provider. |
| J3 | No offline strategy (§51). |

---

## 133.11 Quality gates and production hardening (Phase 5 — §119–§125)

| # | Gap |
|---|-----|
| K1 | No OpenAPI/Swagger document and no Swagger UI (§119–§120). |
| K2 | No BugSnag (§123). |
| K3 | No SonarQube and no CI pipeline — there is no `.github/` directory, so none of §125 runs anywhere (§124–§125). |
| K4 | The "E2E" suite is a Vitest test that reads route files and checks their shape. There is no browser journey and no Playwright (§121). |
| K5 | There are no integration tests against a real database. `tests/db` reads the migration SQL as text; it proves the file says the right thing, not that the database does. |
| K6 | No rate limiting on authentication or on any mutation. |

---

## 133.12 Suggested order of work

> **Superseded 2026-09-24** by the phased roadmap in **§139.18**. Every open
> item in this register is mapped to a row of the **§139.19** tracker.

```text
1. Authentication end to end        (133.1)  — DONE 2026-09-23
2. Order transaction + idempotency  (133.3)  — money and stock correctness
3. Oversell guard                   (133.3)
4. Audit actor                      (133.7)  — one threading change, do it with 2
5. Bakery profile + logo            (133.2)
6. Categories                       (133.4)
7. Worker runner + atomic claim     (133.6)  — before anything relies on a job
8. Notifications                    (133.5)
9. Receipt PDF and sharing          (133.8)
10. Analytics aggregation + paging  (133.9)
11. OpenAPI, CI, Sonar, BugSnag     (133.11)
12. PWA, then Capacitor             (133.10)
```

Items 1–4 are correctness. Everything below them is feature completion, and none of it should start before an order can be created safely by a signed-in baker. Item 1 is done; item 2 is next.

---

## 133.13 Impeccable UI/UX, Mobile Containers & Production Hardening Backlog (Deferred Implementation)

The following UI/UX, native platform integration, and production hardening items are logged for subsequent phase execution:

| # | Feature / Enhancement | Target Architecture | Implementation Details |
|---|-----------------------|----------------------|------------------------|
| **L1** | **PWA Manifest & Service Worker** | Web / PWA | Create `public/manifest.json`, PWA icons (192x192, 512x512), service worker caching strategy for offline access, and PWA install prompt. |
| **L2** | **Capacitor Android Native Container** | Android App | Configure `@capacitor/core`, `@capacitor/android`, native capability abstractions (Push, Filesystem, Haptics), and Android build scripts. |
| **L3** | **OpenAPI / Swagger Documentation** | API Spec | Export OpenAPI 3.0 contract (`src/docs/openapi.json`) and developer-protected Swagger UI endpoint (`/api/docs`). |
| **L4** | **Playwright E2E Test Suite** | Testing | Implement browser-based E2E journey tests (`Login -> Customer -> Product -> Stock -> Order -> Bill -> Share`) verifying tenant isolation. |
| **L5** | **GitHub Actions CI/CD & SonarQube** | DevOps | Create `.github/workflows/ci.yml` pipeline enforcing typecheck, vitest unit/component tests, Playwright E2E, Next build, and SonarQube quality gate. |
| **L6** | **PDF Export & WhatsApp Receipt Share** | Receipts | Add on-demand client-side PDF generation (`jspdf`/`html2canvas`) and WhatsApp direct share URL (`wa.me`) while preserving the zero-storage policy (§132). |
| **L7** | **BugSnag Production Monitoring** | Observability | Integrate BugSnag runtime exception monitoring on client and server boundaries. |
| **L8** | **Impeccable Layout & Mobile-First Container System** | UI / Responsive Layout | Optimize screen container constraints (360px, 390px, 414px mobile, fluid desktop sidebar), bottom navigation bar, dynamic viewport height, sheet modal placement, and responsive data grid views. |
| **L9** | **Impeccable Quieter Design & Noise Reduction** | Visual Design / UI Polish | Perform visual noise reduction across all screens: implement subtle micro-animations, softened status badges, restrained color palettes, muted borders/shadows, and high-density typography optimized for home bakery operations. |
| **L10** | **Impeccable Bolder Design & Visual Impact** | Visual Identity / Contrast | Elevate visual impact across dashboard and operational views: implement bold display typography hierarchy, high-contrast KPI metric cards, expressive brand color accents (warm terracotta & cacao), and high-visibility action triggers. |
| **L11** | **Impeccable Operational Layout & Geometry System** | Responsive Layout / Spatial UX | Standardize screen spatial geometry: enforce `dvh` dynamic viewport containers, `safe-area` insets for PWA/Capacitor, responsive 4-column desktop grids vs 1-column mobile cards, right-aligned tabular currency formatting, and sticky sheet modal footers. |
| **L12** | **Impeccable Design Critique & Comprehensive Polish Audit** | Design Quality / Accessibility | Comprehensive design critique: verify dual-theme visual token harmony (`Clean Bakery` vs `Peach Bakery`), WCAG AAA text contrast, 44px touch ergonomics, glassmorphic headers, smooth micro-interactions, and accessibility focus traps. |


---

# 134. Impeccable Polish Pass — Findings (2026-09-23)

A polish inspection of the shipped surface, run against the live app on local
Supabase with the demo bakery signed in. **Nothing here was fixed** — this
section is the record, so the work can be scheduled.

**How it was gathered.** The mechanical detector over `src/app`, `src/components`
and `src/features`; then every route captured at 390×844 and 1440×900 with a
real browser, signed out and signed in, with console and page errors recorded;
then the source read against what the captures showed. Findings are ordered by
the triage in the polish playbook: broken first, cosmetic last. Every one names
the file and line it lives at.

> The two detector hits (`border-l-4`, `src/app/page.tsx:144` and `:215`) appear
> below as **P4-1**. A near-clean detector run is not evidence of quality; the
> defects that matter here were found by using the app.

---

## 134.1 P0 — Broken

| # | Finding |
|---|---------|
| **P0-1** | **`/inventory` throws on every load.** `TypeError: Cannot read properties of undefined (reading 'id')`, reproduced on both viewports. `InventoryAdjustmentSheet` guards with `if (!product) return null` — but the guard sits *after* `useApiMutation`, and the callback closes over `product!.id` (`src/features/inventory/components/InventoryAdjustmentSheet.tsx:58`). With `reactCompiler: true` the React Compiler lifts that read into a memo dependency (`if ($[6] !== product.id)` in the emitted chunk), so it runs at render, before the guard, while the sheet is closed and `product` is `undefined`. The screen still paints because React recovers, but it throws on every visit and any error boundary would catch it. **Fix:** drop the `!` and read `product.id` inside the callback body after a null check, or move the guard above the hook. **The class of bug matters more than the instance:** under the React Compiler, any `x!.y` inside a hook argument that is guarded by a later early return becomes a render-time read. This is the only occurrence in a component today (`src/features/orders/checkout.ts` has three more, but that file is server-side and not compiled). **Closed 2026-09-24 by R0.3.** |
| **P0-2** | **No error boundary anywhere.** There is no `error.tsx` or `global-error.tsx` in `src/app`. A render error in any screen takes the whole app to a blank page in production, with no recovery and no way back. Given P0-1 exists, this is not hypothetical. **Closed 2026-09-24 by R0.4.** |

---

## 134.2 P1 — Missing states

| # | Finding |
|---|---------|
| **P1-1** | **No `not-found.tsx`.** `/receipts` is in the app's own sidebar and More sheet (`src/constants/navigation.ts`) and has no page, so a baker who taps it lands on Next's stock black-on-white "404 — This page could not be found": no shell, no nav, no theme, no way back. Verified at both sizes. Either build the screen (§133.8) or remove the nav entry — but ship a branded `not-found.tsx` regardless, because a mistyped URL does the same thing. **Closed 2026-09-24 by R0.4.** |
| **P1-2** | **No `loading.tsx` on any route.** Every screen renders its own skeleton once the client component mounts, so navigation shows the previous screen until the new one hydrates. **Closed 2026-09-24 by R0.4.** *Revised 2026-09-27: the root loading screen is gone; a slow navigation shows the next screen's skeleton in the page's place, and screens arrive with their data (the answers of 2026-09-27).* |
| **P1-3** | **The forced-password-change screen is unreachable in practice, so its state is unverified.** `/change-password` is only reached after a temporary-password sign-in, which needs the reset email. It renders, but the "you are here because of a temporary password" path has never been walked end to end. Worth one manual pass through Mailpit before release. |
| **P1-4** | **Sign-in leaves focus on the submit button after a refusal.** On both an empty submit and a wrong password, focus stays where it was; nothing moves to the banner or the first invalid field. The per-field `role="alert"` fires, but several simultaneous alerts are unreliable — a keyboard or screen-reader user has to hunt for what went wrong. |

---

## 134.3 P2 — Flow, hierarchy and system drift

| # | Finding |
|---|---------|
| **P2-1** | **The dashboard greets the role, not the person, and ignores the clock.** `src/app/page.tsx:67` hard-codes `Good morning, Baker!`. The sidebar two inches away reads "Priya Baker" from the session, and the capture that says "Good morning" was taken at 23:15. Both halves of the sentence are wrong, and the session has had the name since authentication shipped. |
| **P2-2** | **A delivery date is printed as a timestamp.** `src/app/page.tsx:156` uses `formatDateTime`, so the due list reads "23 Sep 2026, 11:08 PM". There is no time-slot column in `orders` — the minute is an artefact of whatever `created_at`-like value produced the date, and every seeded order shows the same one, which reads as broken data. Worse, it changes behaviour: an order due *today* flips to **OVERDUE** partway through the day. The dashboard capture shows #1003 dated 23 Sep, on 23 Sep, badged OVERDUE. For a bakery, "due today" should stay "today" until the day ends. Use `formatDate`, and bucket by day. |
| **P2-3** | **The same theme control means opposite things at two breakpoints.** `src/components/nav/AppShell.tsx:99` (sidebar) labels it with the *next* theme — "Peach Theme"; `:111` (phone header) labels it with the *current* one — "Clean". Same button, same product, contradictory reading depending on window width. The signed-out `AuthCard` follows the sidebar convention, so signing in on a phone changes what the control claims. |
| **P2-4** | **Settings leads with two dead sections.** "Brand Logo" offers a full-width, primary-styled "Upload New Logo" control (`src/app/settings/page.tsx:76`) that can only ever fail — there is no endpoint (§133.2) — and "Bakery Profile" is a paragraph plus a permanently disabled "Save Details" button (`:100`) that has nothing to save. The only section that works, "Your Account", is third. Either disable the upload affordance as visibly as the button below it, or hold both sections until §133.2 lands. |
| **P2-5** | **Quick Actions interrupts the operational scan.** Plan §20 orders the dashboard: what needs attention → pending orders → pending payments → today → low stock → snapshot. Quick Actions currently sits between Pending Orders and Low Stock Alerts, so the baker reads two overdue orders, then four buttons, then the stock warning. |
| **P2-6** | **No skip link.** With a nine-item sidebar on every screen, a keyboard user tabs through the whole nav before reaching content, on every navigation. |
| **P2-7** | **Only the five auth screens set a title.** Every other page inherits the root metadata, so eleven routes share the tab title "Ovenly — Home Bakery Management" — indistinguishable in history, bookmarks and tab strips. |

---

## 134.4 P3 — Visual and interaction

| # | Finding |
|---|---------|
| **P3-1** | **An invalid field that has focus shows two conflicting colours.** `*:focus-visible` paints a 2px `--color-primary` (brown) outline globally (`src/app/globals.css:138`), while the field's own border goes `--color-danger` red (`src/components/ui/text-field.tsx:24`). The result, visible in the empty-submit capture, is a red box inside a brown halo. The focus ring should take the error colour when the field is invalid. |
| **P3-2** | **Cards are nearly invisible against the page.** `--color-background: #ffffff` and `--color-surface: #f8f9fa` are ~2% apart in luminance, so every card, sheet and tile depends entirely on a 1px `#e5e7eb` border. Most visible on the signed-out auth screens, where a 448px card floats in white with almost no edge. |
| **P3-3** | **Twenty-four instances of sub-12px type** — one at 9px, nineteen at 10px, four at 11px — carrying real content: stock units, low-stock thresholds, status eyebrows, role labels. On a mobile-first product used in a kitchen this is the wrong floor. |
| **P3-4** | **"Forgot password?" is stranded between the password field and the primary button**, right-aligned, so it competes with the CTA and leaves a ragged edge. It belongs beside the password label or below the button. |
| **P3-5** | **The four "Business Today" tiles use three different colour treatments** — two neutral, one green-tinted, one red-tinted — and "Pending orders" renders its value in orange inside a neutral tile. Colour is not carrying a consistent meaning across four items of the same role. |
| **P3-6** | **The 500 KB logo hint is styled as a warning** (amber background, `src/app/settings/page.tsx:86`) when it is neutral guidance. |
| **P3-7** | **1440px is mostly empty on the auth screens.** The mobile card is centred with no desktop composition. Acceptable for Operate, but it is the first screen anyone sees. |

---

## 134.5 P4 — Content and code

| # | Finding |
|---|---------|
| **P4-1** | **Side-tab accent borders** — `border-l-4` on the overdue order rows and the low-stock row (`src/app/page.tsx:144`, `:215`). Both detector hits; it is the most recognisable tell of generated UI. |
| **P4-2** | **"Phone number" vs "Mobile number".** Every label and hint on the sign-in screen says *Mobile number*; the refusal banner says "The phone number or password is incorrect" (`ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS`). One term. |
| **P4-3** | **Unpluralised and inaccurate stock copy.** `src/app/page.tsx:224` renders "5 piece left • alerts below 5" — the unit is never pluralised, and the threshold is `<=`, so 5 *is* the alert, not below it. `InventoryAdjustmentSheet` pluralises the other way, by appending "s" to any unit, which yields "kgs" and "boxs". |
| **P4-4** | **"Dashboard" appears three times** in the top-left of the desktop dashboard: sidebar active item, sticky header, and the eyebrow above the greeting. |
| **P4-5** | **The signed-out screens fire a session request that always 401s**, and the fetcher then spends a refresh attempt on it before giving up — two wasted round trips on every visit to `/login`, `/register`, `/forgot-password` and `/confirm-email`. Harmless but visible in the console on every load. |
| **P4-6** | **The bakery's phone is printed raw.** Settings shows `+919876543210`; `formatPhoneDigits` exists in `src/lib/phone.ts` and is unused. |

---

## 134.6 What was checked and found sound

Recording this so the next pass does not redo it: `prefers-reduced-motion` is
honoured for all four animations (`src/app/globals.css:212`); `*:focus-visible`
gives every control a visible ring; `.touch-target` holds a 44px minimum and is
applied on the controls that need it; `--color-text-muted` on `--color-surface`
is 4.83:1, which clears AA; the shared field components tie label, control,
hint and error together with real ids; and no route except `/inventory` logged
a console or page error at either size.

**Suggested order:** P0-1 and P0-2 together (the crash and the boundary that
would have surfaced it), then P1-1, then P2-1 and P2-2, which are the two
findings a baker would notice first.

---

# 135. Impeccable Delight Pass — Findings (2026-09-23)

A delight inspection of the shipped surface, run against the live app on local
Supabase with the demo bakery signed in. **Nothing here was fixed** — this
section is the record.

This is an **Operate** product, so delight belongs at the moments that earn it:
first use, completion, recovery, and the one artifact that leaves the app.
Reliability carries everything else, and §134 covers reliability. What follows
is about character, and about the places where the product currently has none.

**The thesis it is missing.** A home baker is running a business out of a
kitchen, usually alone, usually on a phone, usually between other tasks. The
feeling the app should produce is *nothing is slipping*. Every moment below is
a place where the product could have said that and says nothing instead.

---

## 135.1 The bill is the product's one public artifact, and it belongs to the wrong brand

The bill is the only thing a customer ever sees. It is the bakery's face,
delivered by this software. Captured from order #1004 on a phone:

| # | Finding |
|---|---------|
| **D1-1** | **It is signed "Ovenly Bakery".** `src/features/receipts/api.ts:14` hard-codes the platform's name, so every bill Priya hands a customer is branded with her software vendor instead of *Sweet Delights Home Bakery*. This is logged as a data gap in §133.2 B4; through this lens it is the single most damaging detail in the product. |
| **D1-2** | **The only action is "Print Receipt".** Plan §12 ends the order flow at "View / **Share** Bill" and §15 says "Preview / PDF → **Share / Download**". On a phone, in India, for a home baker, print is the one action nobody will take. There is no WhatsApp share, no image, no PDF, no copy-link. The payoff of the entire order flow is a print dialog. |
| **D1-3** | **The bill is a dead end for the customer.** It carries no bakery phone, no address, no way to order again — nothing but line items and "THANK YOU!". The one moment the bakery is in a customer's hand, it asks for nothing and offers nothing. |
| **D1-4** | **It does not say whether it has been paid.** #1004 is UNPAID and the bill shows Subtotal / Tax / Total with no balance due and no PAID mark. That is the fact both parties most need. |
| **D1-5** | **It discards the visual world entirely.** `ReceiptPrintView` is `font-mono` on hard-coded `bg-white text-black` with `border-gray-200` and `bg-gray-50` — not one design token. The app is warm brown `#6b4226` with Fredoka headings and peach accents; the bill looks like a thermal till roll from a different product, and it renders identically in both approved themes. The receipt idiom is a legitimate choice, but it is currently an accident rather than a decision, and it leaves no room for the logo §133.2 is meant to add. |
| **D1-6** | **"Generated at 23 Sep 2026, 11:28 PM"** is machine exhaust printed on a customer-facing document. |
| **D1-7** | **A ₹0 tax line** is printed for a baker who charges no tax. |
| **D1-8** | **The dismiss control is nearly invisible** — a 20px grey X on grey, against a heavy black "Print Receipt" pill. The weights are backwards for a modal whose likeliest next action is "close". |
| **D1-9** | **What is already right:** the dashed tear-line under the masthead and the dotted rule above the footer are real receipt material behaviour. That is the one existing delight seed in the product, and it is worth building the rest of the bill's character on rather than replacing. |

---

## 135.2 Completion: the app never confirms anything

| # | Finding |
|---|---------|
| **D2-1** | **There is no confirmation system at all.** The only `aria-live` region in the entire codebase is the one in `AuthPending`. Creating an order, collecting a payment, adjusting stock, saving a customer, moving an order to DELIVERED — every mutation completes in silence. For a product whose promise is *nothing is slipping*, nothing ever says that something landed. |
| **D2-2** | **Placing an order — the highest-stakes action in the product — is a silent route change.** `src/app/orders/new/page.tsx:135` does `router.push(/orders/{id})` and nothing else. No order number announced, no "created", no transition. The baker is simply somewhere else. Per plan §12 this is exactly where "View / Share Bill" should begin. |
| **D2-3** | **Payment collected and stock adjusted just close their sheets.** The amount that was taken, the new balance — neither is ever stated back. |
| **D2-4** | **Marking an order DELIVERED is the emotional peak of the daily loop** — the cake left the kitchen, the job is done — and it produces a badge change. It is the most repeatable satisfying moment the product owns and it is entirely unmarked. |

---

## 135.3 First use: a new bakery is handed an operational dashboard with nothing to operate

| # | Finding |
|---|---------|
| **D3-1** | **"Nothing is waiting on you. Every order is delivered or cancelled."** (`src/app/page.tsx:113`) is shown to a bakery that has never taken an order. The line is good — it is the app's warmest sentence — but it conflates *you are caught up* with *you have not started*, and on day one it is simply false. These are two different states and the better one is being wasted on the wrong person. |
| **D3-2** | **There is no first-run path.** A new baker signs in to four zeros, an empty due list and an empty stock list. Nothing sequences the work — add a product, add a customer, take an order — even though that order is forced by the data model. The dashboard has no empty state of its own. |
| **D3-3** | **All five empty states are the same sentence in five costumes:** "No customers yet" / "No products yet" / "No orders yet" / "No expenses recorded" / "No active products", each followed by "Start adding…" or "Start tracking…". None of them knows it is a bakery. |
| **D3-4** | **The inventory empty state has no action and names a screen that does not exist:** "Add active products in the **Menu** to manage their stock" (`src/app/inventory/page.tsx:87`) — the nav item is called **Products**; Menu Builder is Phase 2. It is also the only empty state with no button, so the one screen that tells you to go elsewhere does not take you there. |

---

## 135.4 Waiting and recovery

| # | Finding |
|---|---------|
| **D4-1** | **Waiting says nothing.** `SkeletonRows` is the whole vocabulary. For the two reads that are genuinely slow — building a bill, loading the dashboard's three parallel queries — there is no product-specific language, no truthful progress, nothing that reads as *this product doing its work*. |
| **D4-2** | **Recovery has no warmth and no route out.** Every failure is a red `ScreenNotice` with a sentence and, on a list, a retry. There is no illustration, no "this is usually a connection problem", and — per §134 P1-1 — a 404 drops the baker on an unstyled Next error page with no way back. Plan §55's stakes here are money and orders; the current treatment is a flat red box. |

---

## 135.5 Defects found through this lens

Two of these are hard defects rather than missed opportunities, and both were
measured live rather than inferred.

| # | Finding |
|---|---------|
| **D5-1** | **On a phone, `/orders/new` hides the entire bottom navigation.** Measured at 390×844: two `position: fixed; bottom: 0` bars occupy the same 60px band — the Place Order bar (`src/app/orders/new/page.tsx:365`, `z-40`, top 783, height 61) sits directly on top of AppShell's bottom nav (`src/components/nav/AppShell.tsx:127`, `z-30`, top 784, height 60). Neither offsets for the other, so while building an order the baker cannot see or reach Dashboard, Orders, Customers or More. |
| **D5-2** | **Every order defaults to a delivery at whatever minute it was created, tomorrow.** `tomorrow()` (`src/app/orders/new/page.tsx:41`) returns now + 24h, and the field is a `datetime-local`, so an order entered at 11:18 PM proposes delivery tomorrow at 11:18 PM. This is the root of §134 P2-2: the form collects a precision the product has no use for and defaults it to an absurd hour. A bakery delivers in slots — morning, afternoon, evening — and the schema has no time-slot column to hold one. |
| **D5-3** | **"No extra charges or discounts applied."** is italic grey passive text where an invitation belongs. It states an absence instead of offering the capability. |
| **D5-4** | **"Place Order" is enabled on an untouched form**, so the first thing a first-time baker can do is submit nothing and collect validation errors. |
| **D5-5** | **Order items truncate on the order detail** — "Blueberry Cheesec… ×1" at 390px, with room to spare. The one line that says what was actually baked is the line being cut. |

---

## 135.6 Where the character should live

Recording the judgement so the next pass does not start from zero. The product
already owns three things worth building on: the **receipt's tear-line
material**, the **due-date buckets** (Overdue / Today / Tomorrow / Later is a
genuinely good operational idea), and the **"nothing is waiting on you"**
voice. Those are the seeds. The moments that would earn the most, in order:

1. **The bill** (D1-1 … D1-9) — it is the only artifact that leaves the app, it carries the wrong name today, and it cannot be shared.
2. **Order placed** (D2-2) — the flow's payoff, currently a silent redirect.
3. **First run** (D3-1 … D3-4) — the one impression that cannot be retaken.
4. **Delivered** (D2-4) — the most repeated satisfying moment in the product.

Everything here is Enhance work and none of it should start before §134's P0
and P1 are closed: a crash and a missing error boundary are not a backdrop for
personality.

---

# 136. Impeccable Layout Pass — Findings (2026-09-23)

A layout inspection of the shipped surface — reading order, grouping, rhythm,
structure, density, adaptation — run against the live app on local Supabase at
390×844 and 1440×900. **Nothing here was fixed**; this section is the record
for later implementation.

Two assessments were run in the order the playbook prescribes: the rendered
assessment first, then the mechanical scan, kept apart so neither contaminated
the other.

> **The mechanical scan is clean.** `impeccable detect --scope layout` over
> `src/app`, `src/components` and `src/features` returns `[]`, and there is not
> one arbitrary bracket spacing value (`p-[13px]` and the like) in the codebase.
> That is worth knowing and worth keeping. It also proves nothing about
> hierarchy or rhythm — every finding below came from looking at the rendered
> screens.

---

## 136.1 Reading order — the squint test fails on every screen

Blur the detail and the app becomes a stack of identical grey rounded
rectangles. Nothing declares what leads.

| # | Finding |
|---|---------|
| **L1-1** | **The order detail is six equal cards.** `Panel` (`src/app/orders/[id]/page.tsx:47`) is one fixed shape — `rounded-2xl border border-border bg-surface p-5 shadow-card` — with no variant for primacy, so the header, Order Status, Payment Status, Delivery, Notes and Order Items all render at identical weight. Squinting, you cannot tell which card holds the money and which holds a free-text note. |
| **L1-2** | **The screen's real subject is stated twice, 1,400px apart.** ₹950 and UNPAID sit in the header card; TOTAL ₹950 repeats at the bottom of Order Items. Neither placement is made primary, and no relationship is drawn between them. |
| **L1-3** | **An overdue unpaid order has no visually primary action.** "Generate Receipt" (top) and "Collect Payment" (mid-page) are both rendered as low-emphasis buttons. The one thing this screen exists to make happen — take the money — has the same weight as printing. |
| **L1-4** | **Analytics gives equal width to a derived value and its two inputs.** Total Revenue, Total Expenses and Net Profit are a 3-up grid of identical tiles, but Net Profit *is* the other two subtracted. The layout asserts three peers where there is one answer and two operands. |
| **L1-5** | **Every stat tile wastes its own area.** The icon sits top-right in a tinted circle and the value bottom-left, leaving a large empty diagonal in each tile at both breakpoints. |

---

## 136.2 Grouping — containers are doing work that proximity should do

| # | Finding |
|---|---------|
| **L2-1** | **The order detail prints the same label twice, 8px apart.** `src/app/orders/[id]/page.tsx:144` opens `<Panel title="Order Status">` and `:146` puts `label="Order Status"` on the select inside it; `:154` and `:157` repeat the trick for Payment Status. Two type sizes, two colours, one word. The card heading and the field label are competing to name the same control. |
| **L2-2** | **Two single selects occupy two full cards.** Order Status and Payment Status are the same kind of decision and consume roughly 380px of phone height between them, each with its own icon, heading, label and border. They belong in one group. |
| **L2-3** | **Group headings are not separated from their groups.** On Expenses, "SEP 2026" sits ~18px above the first card while the cards sit 16px apart — the heading is no more separated from its contents than the contents are from each other, so the grouping reads as decoration. |
| **L2-4** | **Card headings are inconsistently marked.** On the order detail, ORDER STATUS, PAYMENT STATUS and ORDER ITEMS carry icons; NOTES does not. Same role, two treatments. |

---

## 136.3 Rhythm — one interval, repeated

| # | Finding |
|---|---------|
| **L3-1** | **Every top-level section on every screen is separated by the same value.** `src/components/nav/AppShell.tsx:120` sets `space-y-6` (`lg:space-y-8`) on `<main>`, so the gap between a page header and its first section is identical to the gap between two sibling cards. There is no tight-versus-generous contrast anywhere above the component level, which is why the squint test in §136.1 fails. |
| **L3-2** | **Twenty-eight distinct spacing values are in use with no documented meaning** — `gap-2` (22 uses), `gap-4` (21), `gap-3` (15) and `space-y-3`/`-4`/`-5`/`-6`/`-8` are applied interchangeably, alongside half-steps `mt-0.5`, `mb-0.5`, `gap-1.5`, `gap-2.5`, `mt-1.5`, `space-y-2.5`. The values are all on Tailwind's scale — the problem is that no rule says which relationship earns which step, so the same relationship gets a different interval on different screens. |
| **L3-3** | **A three-step header stack with no scale:** on Expenses the sequence is title → 12px → subtitle → 16px → button → 40px → group label. Three different intervals, none of which expresses a different relationship. |

---

## 136.4 Structure and density

| # | Finding |
|---|---------|
| **L4-1** | **The expenses row spends its scarcest space on its least useful element.** In 358px the row is: a 48px category-initial circle, the title/meta block, the amount, and a 48px edit button. The pencil has a fixed claim on every row; the title has none, and truncates on two of four rows ("Belgian chocolate and…", "Cake boxes and ribbon…"). |
| **L4-2** | **The category initial duplicates text already on the row.** "D", "I", "P", "U" in a circle, with DELIVERY, INGREDIENTS, PACKAGING, UTILITIES printed in full two lines below — about 64px of row width restating a word that is already there. The circles are also all the same pink tint, so the colour carries no category meaning either. |
| **L4-3** | **Order-item columns give fixed width to the numbers and let the name absorb every loss.** "Blueberry Cheesec… ×1 ₹950" truncates the only line that says what was baked, at a width where `×1` and `₹950` both have slack. |
| **L4-4** | **Analytics commits ~1,200px of bar to rank five values.** The widest element on the page carries the least information, and the bar encodes revenue while "1 sold" — printed under it — is quantity, four of five of which are identical. The chart invites a misreading of its own axis. |
| **L4-5** | **The rank badge does not align to anything.** The numbered circle is vertically centred against a four-part row (name, value, bar, quantity), so it floats between the product name and the bar rather than sitting on either. |
| **L4-6** | **Analytics is thin for its own screen** — three tiles and one list, ending at roughly 80% of the viewport height with nothing below. |

---

## 136.5 Adaptation and extremes

| # | Finding |
|---|---------|
| **L5-1** | **The primary create action is placed differently on every screen.** Expenses puts "Add Expense" inline under the subtitle; Create Order anchors "Place Order" in a fixed bottom bar; the order detail scatters its actions between a top row and a mid-page card. The same class of action has no consistent home. |
| **L5-2** | **Two fixed bottom bars collide on `/orders/new`.** Measured at 390×844: the Place Order bar (`src/app/orders/new/page.tsx:365`, `z-40`, top 783, height 61) sits directly on top of AppShell's bottom nav (`src/components/nav/AppShell.tsx:127`, `z-30`, top 784, height 60). Neither offsets for the other, so the nav is entirely covered while an order is being built. *(Also recorded as §135 D5-1 — it is both a layout defect and a delight one.)* |
| **L5-3** | **The desktop composition is the mobile one, centred.** The auth screens place a 448px card in a 1440px viewport with the brand top-left and the theme pill top-right and nothing relating them. Inside the app, `max-w-5xl` keeps content in a single column at every width above the sidebar; no screen uses the second dimension a wide viewport offers. |
| **L5-4** | **Long content was never designed for.** Two of four expense titles truncate at the default seed length, as does the single order item on the order detail. These are not edge cases — they are the ordinary content the product ships with. |

---

## 136.6 The spatial thesis to set before implementing

None of the above is fixed by moving individual boxes. Name these first, then
the fixes follow:

1. **One primary per screen.** The order detail's is *collect the money*; Analytics' is *net profit*; a list's is *the next row to act on*. `Panel` needs a variant that can carry primacy instead of one fixed shape.
2. **Two intervals, not one.** A documented pair — tight for within-group, generous for between-group — applied through `<main>` and the card components, so the squint test has something to reveal. Today `space-y-6` does both jobs.
3. **Row budget before row content.** Decide what a list row owes the scarcest width to (the name), and what earns a fixed claim (rarely the edit affordance).
4. **A rule for where a create action lives**, applied to all five list screens and both form screens.

---

## 136.7 What was checked and found sound

Recording this so the next pass does not redo it: the mechanical layout scan is
clean; there are **no arbitrary bracket spacing values** anywhere in the
codebase — every value sits on the Tailwind scale; `<main>`'s container,
max-width and safe-area padding are defined once in `AppShell` rather than
restated per page; `gap` is used for sibling rhythm rather than child margins
in the shared components; and the DOM order matches the visual order on every
screen inspected, so keyboard and assistive-technology traversal agrees with
what is seen.

**Suggested order:** L2-1 (the duplicated labels, a two-line fix), then L3-1
and L1-1 together — the single interval and the single card shape are the same
problem seen twice, and fixing them is what makes the squint test pass.

---

# 137. Mobile UI Redesign — "Flour Room" Direction (planned 2026-09-24)

The user supplied three reference images and approved this as the product's
visual direction. They are kept locally in `design-references/` and are
**gitignored on purpose** — they are not committed.

| File | What it establishes |
|---|---|
| `mobile-direction.png` | Home, Orders and Products at phone width — the brief. |
| `hero-photography.png` | The palette source: warm cream, dusty rose, terracotta, cream buttercream, soft daylight. |
| `tablet-desktop-direction.png` | The same system at tablet and desktop. Phase B. |

**Two decisions were taken with the user before this was written:**

1. **No photography.** The references lean on food photography in every row; §16 and §56 forbid any upload but the bakery logo, and that stays. Product thumbnails are replaced by a typographic **bake tile**. No new table, no bucket, no plan change. This is the hardest constraint in the redesign and §137.3 is the answer to it.
2. **Mobile is build-ready here; tablet and desktop are specified as Phase B** (§137.9), so nothing is left undesigned while the build starts where it was asked to.

---

## 137.1 Scope change, recorded under §31

This replaces the *look* of the two approved visual directions. It does not add
a third, and it changes no product truth, content, function or data.

| Plan section | Today | After |
|---|---|---|
| §21 Approved visual directions | "Clean Bakery", "Peach Bakery" | Same two directions, same `data-theme` switch, restyled. Still exactly two. |
| §9 Mobile navigation | Home · Orders · Customers · More | Home · Orders · **Products** · Customers · More. Products is promoted out of the More sheet; everything else stays behind More. |
| Typography | Fredoka + Plus Jakarta Sans | An editorial serif for display, a neutral sans for UI (§137.4). |
| §16 / §56 uploads | Logo only | **Unchanged.** Logo only. |
| Tables, endpoints, statuses, money | — | **Unchanged.** |

Nothing else in the plan moves. The order flow (§12), the ledger (§14), receipts
(§15), roles (§5) and RLS (§7) are untouched by this section.

---

## 137.2 The direction

**Thesis: the ground is warm, the cards are white, and the type is the
decoration.** Today the app is white-on-near-white with a rounded display face;
every card dissolves into the page (§134 P3-2) and nothing leads (§136 L1-1).
The reference inverts the relationship — a warm cream *ground* with white
*cards* lifting off it — and spends its elegance on typography rather than on
borders and tints. That inversion alone fixes the contrast finding and gives
the squint test something to find.

Five rules carry the whole direction:

1. **Cream ground, white card.** Never white-on-white. A card earns its edge from the ground behind it, not from a 1px border.
2. **Serif for what matters, sans for what works.** Money, headings and stat values are serif; labels, inputs, nav and body are sans.
3. **Hairlines, not boxes.** Rows in a list are separated by a hairline inside one card, not wrapped in a card each. Fewer edges, more rhythm.
4. **Status is a dot and a word.** No filled pills for order status. Colour is the dot; the word carries itself.
5. **One black action per screen.** The circular `+` is the only pure-black element in the UI, so the eye always knows where creation lives.

---

## 137.3 The bake tile — what replaces the photography

The references put a photograph in every row. Without one, a grey box would
make the design worse than what it replaces, so the tile has to be a designed
object in its own right:

- **Shape:** 56×56 on a row, 20px radius, sitting on the card.
- **Ground:** a two-stop vertical wash in the product's **category tint** (§137.5), roughly 12% → 4% opacity over the card. Warm, never flat grey.
- **Mark:** the product's initials — first letter of the first two words, one letter if there is only one — set in the **display serif**, optically centred, in the category tint at full strength.
- **Texture:** a single soft radial highlight at 30%/25% of the tile, 8% white. This is what stops it reading as a placeholder.
- **Fallback:** a product with no name renders the category's own initial.
- **Reuse:** the same tile renders on the order row for that order's first item, so an order and a product look like the same object across screens.

The tile is a shared component — `src/components/ui/bake-tile.tsx` — and is the
only place any of this is expressed.

---

## 137.4 Type

| Role | Face | Size / weight | Used for |
|---|---|---|---|
| Display | **Fraunces** (variable, optical size, `next/font/google`) | 28–34px, 600 | Screen titles, the greeting, money on a stat |
| Display small | Fraunces | 17–20px, 600 | Card titles, the quote block |
| UI | **Inter** | 15px/400, 13px/500, 11px/600 caps | Labels, body, nav, inputs, buttons |
| Numeric | Inter, `tabular-nums` | 15px/600 | Money inside rows and tables, so columns align |

Money is serif when it is a *headline* (a stat tile, an order total) and
tabular sans when it is *data in a column* (a list row). That distinction is
the single most useful typographic rule in the design.

**Retires** Fredoka and Plus Jakarta Sans. `--font-heading` / `--font-body` keep
their names, so no component changes.

**Fixes §134 P3-3:** the 9/10/11px type is gone. The floor is 11px, and only for
uppercase tracked labels; everything else is 13px or more.

---

## 137.5 Tokens

Both themes keep the existing `data-theme` switch and every existing token
name, so nothing outside `globals.css` has to change.

### Clean — warm cream

```text
--color-background   #F7F3EC   ground (was #ffffff)
--color-surface      #FFFFFF   cards  (was #f8f9fa)  ← the inversion
--color-surface-hover#FAF7F1
--color-primary      #6B4226   unchanged — the brand brown
--color-primary-hover#54331C
--color-accent       #B4663F   terracotta, from the hero
--color-text         #241C16
--color-text-muted   #7C6F65
--color-border       #E8E0D5   hairline
--color-action       #1A1512   the black FAB / active nav  ← new token
```

### Peach — blush

```text
--color-background   #FDF1EA
--color-surface      #FFFDFB
--color-surface-hover#FBF2EC
--color-primary      #C85A32   unchanged
--color-primary-hover#AF4720
--color-accent       #C9797A   dusty rose, from the hero florals
--color-text         #2D1E18
--color-text-muted   #8A6E62
--color-border       #F4DCD0
--color-action       #2A1A14
```

### Status and category

Status keeps the existing enum and `ORDER_STATUS_LABELS` exactly — Pending,
Baking, Out for delivery, Delivered, Cancelled. Only the rendering changes, to
a dot plus the word:

```text
PENDING       amber  #C77D22
IN_PROGRESS   clay   #B4663F
IN_TRANSIT    blue   #4A6FA5
DELIVERED     green  #3F7D58
CANCELLED     rose   #B5555A
```

Category tints for the bake tile, drawn from the hero photograph:

```text
Cakes     #B4663F  terracotta
Cupcakes  #C9797A  dusty rose
Cookies   #A8763C  warm gold
Breads    #8A6A4F  crust brown
Other     #7C6F65  stone
```

**Fixes §134 P3-5** (four tiles, three colour treatments) — a stat tile is never
tinted; colour belongs to the delta and the status dot only.

---

## 137.6 Components

New, in `src/components/ui/`:

| Component | Replaces / adds |
|---|---|
| `bake-tile.tsx` | §137.3. New. |
| `stat-tile.tsx` | Rewritten: serif value, sans label, optional `delta` (`↑12%`) in green / `↓` in rose. No tinted backgrounds. |
| `segmented.tsx` | Today / This Week / This Month. Dark filled pill for the active segment. |
| `tab-bar.tsx` | Scrollable tabs with optional count badges — Orders and Products. Underline for active. |
| `fab.tsx` | The one black circular `+`. Fixed, bottom-right, above the nav, with safe-area inset. |
| `row.tsx` | One list row: tile · title block · trailing block · optional chevron. Hairline divider between rows, one card around the group. |
| `quote-block.tsx` | "Small bakes. Big smiles." — centred serif on a tinted panel. |
| `status-dot.tsx` | Dot + word. Replaces the filled `status-badge` for order status (payment status keeps a badge). |

**Fixes §136 L4-1 and L1-1:** `row.tsx` gives the title the flexible width and
lets the trailing block size to content, and a list is one card of hairline-
separated rows instead of N identical cards.

Rewritten: `AppShell` (5-item nav, cream ground, no theme pill in the header —
it moves to Settings), `PageHeader` (serif title + sans subtitle, no icon).

---

## 137.7 Screens — mobile, build-ready

### Home (`src/app/page.tsx`)

1. **Header band.** Wordmark left; bell and account right. On the cream ground, with a soft radial wash in `--color-accent` at 6% bleeding from the right edge — the compositional role the cake photo played, done with colour.
2. **Greeting.** `Good morning, {profile.name.split(" ")[0]}` in display serif over two lines, with the time-of-day chosen from the clock. **Fixes §134 P2-1** — both halves of that sentence are currently hard-coded.
3. **Tagline.** "Fresh bakes. Brighter days." — muted sans.
4. **Segmented control.** Today / This Week / This Month, driving the three stats below. New capability: `summarise()` takes a period.
5. **Three stat tiles.** Total Sales · Orders · New Customers, each with a delta. *The delta needs period-over-period data the API does not compute today (§137.8).* Until it lands, the tile renders without a delta rather than a fake one.
6. **Quote block.**
7. **Recent Orders**, "View all →", three rows via `row.tsx`: bake tile, order number + product name, time, status dot.
8. **Low stock** keeps its place from plan §20 but loses the `border-l-4` side tab. **Fixes §134 P4-1.**

Order of sections follows plan §20, so Quick Actions moves below the due list — **fixes §134 P2-5**. The FAB replaces the four Quick Action buttons entirely.

### Orders (`src/app/orders/page.tsx`)

Serif title + subtitle; black FAB. Search field with a filter button beside it.
Tab bar: All · Pending · Baking · Out for delivery · Delivered · Cancelled,
each with a count computed client-side from the orders already loaded — no new
endpoint. Rows: bake tile, `#1028` + product name + customer name + due date,
then status dot, amount (tabular), chevron.

**The due date renders through `formatDate`, never `formatDateTime`, and the
overdue bucket compares whole days — fixes §134 P2-2.**

### Products (`src/app/products/page.tsx`)

Serif title + subtitle; black FAB. Category tab bar: All · Cakes · Cupcakes ·
Cookies · Breads — these are the `categories` table, which exists with RLS and
has no UI today (§133.4). **Until §133.4 is built the tab bar renders "All"
only**, and the rest arrives with it. Rows: bake tile, name, category, price,
`Active` pill, `⋮` overflow.

### Order detail (`src/app/orders/[id]/page.tsx`)

One card, not six. `Panel` gains a `tone` so the header can lead. Order Status
and Payment Status become one "Status" group with two selects and **one label
each** — **fixes §136 L2-1 and L2-2**. Collect Payment becomes the screen's
primary button when a balance is due — **fixes §136 L1-3**.

### Customers · Inventory · Expenses

The same `row.tsx` pattern. Expenses drops the category-initial circle (the
category is already written on the row) and the always-present edit pencil, which
moves into a row press — **fixes §136 L4-1 and L4-2**. The amount is ink, not
red; only a negative delta is red.

### Settings

Gains the theme switch (Clean / Peach) as a labelled two-option control,
removed from the app header. **Fixes §134 P2-3** — the control can no longer
contradict itself between breakpoints, because there is only one of it.

---

## 137.8 What this needs that does not exist

| # | Need | Note |
|---|---|---|
| N1 | Period-over-period deltas for the three stats | New computation over existing data. Until then, no delta rendered. |
| N2 | `summarise()` accepting Today / This Week / This Month | Pure function change, no API work. |
| N3 | Product categories with a UI | Already tracked as §133.4. The Products tab bar degrades to "All" without it. |
| N4 | A `not-found.tsx` and `error.tsx` in the new direction | Already tracked as §134 P0-2 and P1-1; build them in this style rather than twice. |
| N5 | Fraunces + Inter via `next/font/google` | Replaces two existing faces; no new dependency. |

---

## 137.9 Phase B — tablet and desktop (specified, not scheduled)

From `tablet-desktop-direction.png`, for when mobile has landed:

- **Sidebar** on the cream ground, white active pill, account block pinned to the bottom, wordmark at the top. Close to today's structure, restyled.
- **Global search** in the top bar with a `⌘K` hint.
- **Dashboard** becomes four stat tiles with sparklines, a **Sales Overview** bar chart (7/30-day), **Top Products**, an **Order Status** donut, and **Recent Customers**. All five need aggregation the API does not compute — this is the real cost of Phase B, not the layout.
- **Orders** becomes a true data table: Order · Customer · Items · Amount · Status · Date.
- **Products** becomes a card grid rather than rows.
- **Analytics** gains a tab bar, a sales trend line and a sales-by-category donut.

**Fixes §136 L5-3** — the app finally uses the second dimension a wide viewport
offers, instead of centring the phone layout.

---

## 137.10 Build order

> **Superseded 2026-09-24** by **§139.18** (phases) and **§139.19** (tracker).
> §139.20 lists what of §137 is kept and what is replaced.

1. **Tokens, fonts, ground inversion** (§137.4, §137.5). One commit, and every existing screen immediately improves: card contrast (§134 P3-2) and type floor (§134 P3-3) are fixed before a single screen is rebuilt.
2. **`bake-tile`, `row`, `status-dot`, `stat-tile`, `fab`, `segmented`, `tab-bar`, `quote-block`.** Shared kit first, per AGENTS.md §5.
3. **`AppShell`** — 5-item nav, FAB slot, theme control out of the header.
4. **Home**, then **Orders**, then **Products** — the three screens the reference actually specifies.
5. **Order detail**, then Customers · Inventory · Expenses on the same row pattern.
6. **Settings**, including the theme switch.
7. **Peach** verified against every screen — it is a token swap, so it lands with step 1 and is *checked* here.
8. `not-found.tsx` and `error.tsx` in the new style (N4).

**Do not start before §134's P0-1 and P0-2 are closed.** The inventory screen
throws on every load and there is no error boundary; rebuilding its visuals on
top of that would bury a crash under a nicer surface.

---

## 137.11 What this redesign closes

Recording the overlap so the same work is not scheduled twice. Fixed as a
consequence of the direction: §134 P2-1, P2-2, P2-3, P2-5, P3-2, P3-3, P3-5,
P4-1, P4-4; §135 D3-1 (the quote and greeting give the empty dashboard a
voice); §136 L1-1, L1-3, L2-1, L2-2, L4-1, L4-2, L5-1, L5-3.

Explicitly **not** closed by it, and still open: §134 P0-1, P0-2, P1-1, P1-2,
P3-1; §135 D1-1 … D1-9 (the bill), D2-1 … D2-4 (no confirmations); §136 L5-2
(the two colliding fixed bars — the FAB work in step 3 must resolve it, not
inherit it).

---

# 138. Authentication Screens — Flour Room (built 2026-09-24)

Two further references were supplied and are the brief for the sign-in and
register screens. They live in `design-references/` and are **gitignored**.

| File | Screen |
|---|---|
| `auth-signin-direction.png` | Sign in |
| `auth-register-direction.png` | Register |

**Scope:** these two screens only, as asked. Forgot password, change password
and confirm email keep the previous `AuthCard` and are unchanged — the product
is deliberately split until they are brought across (§138.5).

---

## 138.1 What the references establish

A full-bleed photographic scene — warm wall, soft daylight through a window, a
bake and dried florals — with the bakery's mark, wordmark and a large serif
promise set over it, and a cream sheet rising from the bottom carrying the
form. Fields are sentence-case labels over rounded inputs with a leading icon;
the primary action is a dark full-width pill with a trailing arrow.

This is the same Flour Room world as §137, applied to the screens that come
before the app.

---

## 138.2 Where the references and the product disagree

Recorded because each is a decision, not an oversight.

| # | Reference asks for | What shipped, and why |
|---|---|---|
| **A** | **Email address** as the sign-in field. | **Mobile number.** Plan §7: bakers authenticate with phone and password. The product has no email sign-in to offer, and drawing one would be a promise it cannot keep. |
| **B** | **Phone number marked "(Optional)"** on register. | **Required.** It is the credential the account is signed in with. Optional is not available. |
| **C** | **No bakery name field.** | **Added, required.** `registerSchema` needs it and the `bakeries` row is created from it. |
| **D** | **No confirm-password field.** | **Added, required.** `registerSchema` requires it. |
| **E** | **Continue with Google / Apple.** | **Not built.** New authentication methods need explicit approval under §31, and none is in the plan. The dividers and buttons are omitted rather than shown dead. |
| **F** | **Terms of Service / Privacy Policy links.** | **Not built.** Neither page exists; a link to nothing is worse than no link. |
| **G** | **A photographic background.** | **A composed one.** The references are mockups with the interface drawn into them, so there is no plate to cut out, and a geometric stand-in for a photographic subject reads worse than atmosphere. The canvas is built from light: three soft shafts with feathered edges, the shadow between them, a warm pool where a bake would sit, and daylight from the upper left. `--auth-photo` on `.auth-canvas` is the single hook a real photograph drops into — no other change needed. |

---

## 138.3 What was built

- **`AuthScene`** (`src/features/auth/components/AuthScene.tsx`) — the shared frame: canvas, mark, wordmark, headline, rule, intro, and the rising sheet. `AuthPromise` closes the sign-in screen.
- **`BrandMark`** — an authored SVG: a seed over two leaf pairs on a stem. The product's only ornament.
- **Tokens** — `--color-canvas`, `-canvas-deep`, `-sheet`, `-field`, `-ink`, `-ink-muted`, `-rule`, `-action`, `-action-hover`, `-action-text`, declared for **both** themes and mapped in `@theme inline`. The rest of the app adopts them at §137.10 step 1.
- **`.auth-sheet` re-points the semantic tokens** to the Flour Room palette, so the shared field and button components come out warm inside it **without any of them being restyled from a parent** (AGENTS.md §5).
- **Fraunces** as `--font-display`, alongside the existing faces. Nothing else changed voice.
- **Shared kit gained, rather than being worked around:** `Button` has an `action` variant, `lg` size, `pill` shape and `iconPosition`; `TextField` has `leading` and `labelCase`; `PasswordField` forwards both.
- **Browser surfaces themed** — selection, caret, accent colour, scrollbars, underline offset, and a `.tabular` numeric class.
- **One authored motion** — the sheet rises once on arrival, exponential ease-out, disabled under `prefers-reduced-motion`.

---

## 138.4 Two defects found by building it

| # | Finding |
|---|---|
| **B1** | **Every heading in the app ignored its font utility.** `globals.css` set `h1…h6 { font-family: var(--font-heading) }` **outside any layer**, and unlayered rules beat Tailwind's utility layer — so `font-display` on an `<h1>` silently lost while the same class on a `<p>` worked. The base rules are now inside `@layer base`, which keeps them as the default and lets a utility override. This had been true for every heading on every screen. |
| **B2** | **`next/font` rejects `weight` alongside `axes`** on a variable font: "Axes can only be defined for variable fonts when the weight property is nonexistent or set to `variable`." It compiles and typechecks, then fails at runtime — `tsc` and `eslint` were both clean while the app would not render. Caught by loading the page, not by the toolchain. |

---

## 138.5 Left open

- ~~**Three auth screens still on the old design**~~ — forgot password, change password, confirm email. **Closed by §138.6.**
- **Desktop is contained, not composed.** The scene centres itself in a `max-w-xl` column from tablet up and the sheet becomes a card, so wide viewports are tidy rather than stretched. The real wide-screen treatment is §137.9.
- **`--auth-photo` is unused.** Supply a clean photographic plate — no interface drawn on it, ~1600px wide, under 200 KB — and set it on `.auth-canvas` to switch the backdrop on.
- **The required asterisk** is kept on every field. The references have none; it is retained because it is the product's existing convention for a required field and is read out by assistive technology.


---

# 138.6 The remaining authentication screens (built 2026-09-24)

Forgot password, change password and confirm email brought onto the same
scene, closing the split recorded in §138.5. No product truth, route, schema
or endpoint changed.

## 138.6.1 What was built

| Screen | Headline | Scene |
|---|---|---|
| Forgot password | "Let's get you back in." | Back link to sign in; no counterpart — there is no second door to offer. |
| Change password | "A fresh password." | **Neither** back link nor counterpart: a baker holding a temporary password cannot reach another screen until this is done (§95), so the scene must not offer one. |
| Confirm email | "Nearly there." | No links; the screen acts on the link that opened it. |

The headline for confirm email is deliberately state-neutral. The screen is
three things at once — working, confirmed, or looking at a link that expired —
and a headline of "Confirming your email" is a lie in two of them.

Shared work rather than per-screen work:

- **`AuthScene`** — `counterpart` is now optional; the screens behind the front door have no second door.
- **`AuthPending`** gained an `inline` form: the confirmation screen waits *inside* its sheet, and the full-screen version was painting its own background over the scene.
- **`LinkButton`** gained `shape` and `fullWidth`, so "Back to sign in" is the same pill as every other action instead of a smaller near-miss.
- **`AuthCard` is deleted.** It had no callers left. The app now has one authentication frame, not two.
- **The sent state of forgot password** offers the step that follows instead of ending on a notice with nothing to press.
- **Copy moved to `UI_TEXT.auth`.** All five titles and subtitles were inline strings in the page files (AGENTS.md §5).

## 138.6.2 Three defects found by building it

| # | Finding |
|---|---|
| **C1** | **The peach theme never got the Flour Room palette, and the clean theme got peach's.** Both token blocks were written into the same `:root, [data-theme="clean"]` rule in §138, so the blush values overwrote the cream ones, and `[data-theme="peach"]` — which also matches `:root` — inherited them. Every auth screen rendered blush in both themes. Screenshots did not catch it: both themes looked *consistent*, which is exactly what a theme check looks for. Caught by reading `getComputedStyle(document.documentElement)` per theme instead. The blush block now lives in `[data-theme="peach"]`, verified as `#efe7d9` vs `#f3ddd0`. |
| **C2** | **`.safe-top` / `.safe-bottom` were silently deleting padding utilities.** Both are unlayered, so they beat Tailwind's utility layer on the same property — `safe-bottom pb-8` resolved to `padding-bottom: 0px`, measured live. The helpers now **add** to the element's own padding: `padding-bottom: calc(var(--safe-pb, 0px) + env(safe-area-inset-bottom, 0px))`, written as `safe-bottom [--safe-pb:2rem]`. This is the same failure mode as **B1** — unlayered CSS beating a utility — in a second place. |
| **C3** | **Muted text and every placeholder in the app failed contrast.** `--color-ink-muted` measured 3.36–4.11:1 against the three Flour Room grounds, below the 4.5:1 floor (AGENTS.md §21) — it carries the intro line, field hints and the counterpart link. Worse, the shared control set placeholders to `text-text-muted/50`: **1.66:1** inside the auth sheet and **1.99:1** on an app screen. Muted is now `#766353` / `#7b5c4d` (4.62–5.64:1) and placeholders use the muted colour at full strength (4.83:1 on an app screen). The placeholder fix lands on every field in the product, not only these screens. |

## 138.6.3 Left open

- **The theme switch is gone from the signed-out screens.** It lived only in `AuthCard`. A stored preference is still honoured — a baker who chose Peach still sees Peach here — but it cannot be *changed* before signing in, and §137.6 moves the app's pill to Settings, which a signed-out visitor cannot reach. Decide whether the auth scene carries one; the references show none.
- **C2 is fixed in the helper but not at five call sites.** `AppShell`'s bottom nav (`py-2`), the checkout bar in `orders/new` (`p-4`), `form-sheet`, `MoreSheet` and `AppShell`'s mobile header all still pair a `safe-*` class with a padding utility, so their bottom or top padding is currently `0`. Each is a one-class edit — `p-4` → `[--safe-pb:1rem]`. Not done here because it moves the layout of app screens this pass did not verify; **do it in §137.10, which rewrites all four components anyway.** **Closed 2026-09-24 by R1.6** (all five call sites, measured under a faked notch).
- **Desktop remains contained, not composed** (unchanged from §138.5). The wide treatment is §137.9.

---

# 139. Ovenly v2 — Redesign, Product Expansion and the Android App (planned 2026-09-24)

> **Status: planned only. Nothing in this section is implemented.** It is the
> plan of record for the next body of work, and **§139.19 is its tracker** —
> update a row's Status as the work lands, and never delete a row.

## The brief (2026-09-24)

- Redesign **every screen** from the new references, in **two colour themes — Golden and Peach** — and make every screen **responsive**.
- **Check for bugs and improvements.** Use **safe areas** properly, so the Android app behaves.
- **Registration** asks for: business name (**required**), a catch phrase such as "your friendly baker" (**optional**), city, address, email (**required**) and mobile number (**required**). **Sign-in stays by mobile number.**
- **Trim every form input**, and take care of the other small things of that kind.
- Replace toast-style feedback with a **response card**, used the same way across the web app and the Android app.
- The product widens from home bakers to **home businesses** — hampers, gift flowers and the like. The **BAKER role becomes USER**; the roles are **USER and DEV**.
- **An order no longer needs a customer.** It can be a **Guest** order, and those roll up as **Guest sales**.
- A customer can be **created on the fly from the order screen**: name, phone, address, map link (optional). Picking a saved customer **fills the delivery address and map link**, which stay **editable** for that order.
- A **View bill** button **before the order is saved**, with **Share** available from there.
- **A proper bill:** the business's name, catch phrase and address; the contents; and the app's name and web link at the bottom.
- A **phase-wise implementation plan**, and after it the **Capacitor Android app**.
- Evaluate moving **tests into `/tests`** instead of beside the code.

**References:** eleven images in `design-references/`, prefixed `v2-`. That
folder is gitignored and the images are **not committed**. The illustration
masters are the exception: they are app artwork, and they are committed under
`artwork/illustrations/` (§139.11.10).

## Answers and additions (2026-09-24, later the same day)

- **Q1:** a customer's **address and map link are both optional**, as §92 had it. Name and phone stay required.
- **Q3:** **yes.** Add `READY`, rename "Baking" to "Preparing", and show "Completed" for a finished pickup.
- **Q5:** **yes.** A custom item is a **name and an amount** the user types.
- **Q6:** **still no uploads.** The photographs supplied with the references may be used as **backgrounds** wherever a screen needs one (§139.11.12).
- **Q7:** **none** of the reference-only features, Help & Support included.
- **Expenses and Analytics** carry the **graphs and visual analytics the references show** (§139.11.11).
- **An illustration library.** 26 files were supplied; after de-duplication and splitting they make 28 illustrations. They are stored in the codebase in their own folder under **constant names**. Every product and every expense category starts on a **default illustration**, and the user can pick **any** illustration from the library instead (§139.11.10).

## Answers and additions (2026-09-25)

- **Products need no categories** (the user, recorded under §31). A product is found by its name and known by its **illustration**, which the owner picks from the library when creating or editing it (§139.11.10, R5.6). Every expense category keeps its own illustration, picked the same way (R5.16). So:
  - There are **no category chips** on the create-order grid or on Products, **no Manage categories**, and **no `/api/categories`**. §133.4 D1 is closed as dropped.
  - R5.6 drops what is left of them: the unused `categories` table and `products.category_id`, so no dead schema stays behind (§2.2).
  - **Sales by category** leaves Analytics with them. Custom items, which it used to show, appear as one **"Custom items"** row in the Products tab's ranking, so their sales are still counted.
  - **Expenses keep their categories** — the eight in §22 — each with an illustration the owner picks from the library (R5.16). Each side starts on its own default: a product on `default-product`, an expense category on `default-expense` (§139.11.10), and either can be changed to any illustration in the library. *Superseded 2026-09-26: the eight stay on `default-expense` and cannot be changed; a business's own categories take a picture from the library (see the answers of that day).*
- **Something not on the menu yet** (the user): **Add custom item** takes a name, a **description if one is needed** — printed under it on the bill, as the line's note — and the amount (§139.11.7). Or the owner adds the product on the **Products** screen and comes back: the draft is kept on the device (R3.9). Products are made only on Products; there is **no New product on the order screen**. A **new customer**, by contrast, is made on the fly from the order screen (§139.11.4). In Analytics every custom line counts under **one "Custom items"** row; every Guest order counts under **Guest sales** (§139.11.3).
- **The oversell guard checks stocked products only.** A product is checked once any stock has been recorded for it by hand — a stock in, adjustment, wastage or return. A product nobody stocks is made to order and is never refused (§21's "made-to-order rule", R3.3).

## Answers and additions (2026-09-26)

- **Sales by product** replaces sales by category on Analytics' Overview, as the design reference shows it (the user; R5.9).
- **Expense categories: the eight defaults, and the business's own** (the user, recorded under §31). This supersedes the line above that the eight in §22 are all there is. So:
  - **The eight defaults stay exactly as they are.** Every business has them. Their names are fixed, they show `default-expense`, and they can be neither edited nor deleted, picture included.
  - **A business may add categories of its own.** It adds one from the Categories tab, or on the spot from the expense form's **+**, which chooses it. Each has a name and an illustration picked from the library. A name is unique within the business, whatever its case, and is never one of the eight's.
  - **Only the business that made a category sees it.** Another business sees only the defaults and its own.
  - **Editing and deleting.** The owner can rename one of its own or change its picture; a rename takes its expenses with it. The owner can delete one **only while no expense is filed under it** — the database refuses otherwise.
- **An expense can be edited and deleted.** Tapping it opens the form, which also offers **Delete expense**, confirmed first.
- **Products stays one read** (the user; R5.13). A business's products are a menu, not a growing ledger. The order screen prices its draft from that read, and Order again checks what is still on sale against it. So Products, and Inventory's list of the same products, are read whole and searched on the device. Every list that grows with the business is paged, with its search on the server.
- **Profile details change once every 30 days** (the user; R5.17):
  - **Which details:** the owner's name, the sign-in number, the email address, and the business's name.
  - **The rule:** each may change again 30 days after its own last change. A new account makes its first change whenever it likes.
  - **Password:** the sign-in number and the email ask for the current password first.
  - **A new email:** it takes effect only once confirmed. The same confirmation email as at registration goes to the new address, through the same queue, and until its link is followed the current address stays in use.
  - **Enforcement:** the database holds the rule on the rows themselves (`0021_profile_changes`), and the screens say beforehand when a detail opens again.
  - **The confirmation mail:** its own wording is set up later, as the user asked.
- **About credits the app's maker, not the illustrations** (the user; R5.11). Settings → About reads **Crafted by · jaFFa**, in place of Q16's "Illustrations: Vecteezy.com". Q16's other half stands: the licence of every illustration is confirmed before the Play release (Phase 8), since Vecteezy's free licence asks for a credit and only its Pro licence does not.
- **Notifications** (R5.10):
  - **What notifies:** the events of §25 and §28 — an order placed, an order moved, a payment received, a product falling to the low-stock mark, a customer added — and, at the user's request, **an order due soon and an order overdue**.
  - **Due is counted in days**, as everywhere in the app (IMP-05): *due soon* when an open order's day is today or tomorrow, *overdue* once its day has passed. Each order is told once of each, from 8 AM in the business's day, so a push (R8.6) never lands at midnight.
  - **The bell carries the count** (the user suggested 1 to 10, then "10+"; the production choice is **1 to 9, then "9+"**, which keeps the badge a small two-character circle). Its name says the exact number to a screen reader.
  - **The tabs:** Orders holds orders and payments; Customers, new customers; System, stock alerts and anything else.
  - **Settings' Notifications row** is the Android permission, so it comes with push (R8.6); the inbox needs no permission.
- **Delight becomes Phase 9** (the user, through `/impeccable delight`; recorded under §31, not yet built). Four moments get personality: **the order milestones**, **empty states in the app's own art**, **the inbox caught up**, and **warmer system screens**. The tone is **warm and quiet**, not playful, because the owner meets these many times a day. The specification is §139.21, and the rows are in the Phase 9 tracker.

## Answers and additions (2026-09-27)

After the layout pass, the user chose three of the items it had left open:

- **Sign-in screens side by side on a desktop.** From 1024 px the scene stands on the left and the form on the right, so Register's first step is on screen whole. The frame is shared, so Sign in, Forgot password, Change password and Confirm email take it too, and moving between them never changes layout.
- **Customers: a Balance due tab** beside All, Regular and New. It lists the customers who still owe the business money, the most owed first, and pages and searches on the server like the others (`0024_customer_balance`). Every customer's row shows what they owe, on every tab, whenever they owe anything. **Customer detail leads with Balance due.**
- **Create order: Add custom item sits above the search and the grid**, so a special request is one tap away however long the menu is.

Later the same day:

- **More illustrations** (the user: "there are some new illustrators in the root folder, add those to the platform"). The 17 files make **31 illustrations**, since two were sheets. That brings the library to **59**, in **three new groups**: Hearts and love, Home and everyday, and Characters. Every product and every category of the business's own can take any of them. As before, **nothing is uploaded and no migration is needed**. They fall under Q16 with the rest: each one's licence is confirmed before the Play release. The build now also clears **holes** in the ground (a donut's hole, a cup's handle), which fixes four of the first 28 as well (§139.11.10, R5.18).
- **Screens arrive ready** (the user, after the audit and the loading measurements). A screen used to arrive as placeholders that filled in once the browser had asked for its data, and it waited for the session check first. From now on:
  - **The server reads the session** as it draws the page. An access token that has run out (the usual state of an app opened after an hour away) is renewed by the proxy before the page is drawn, so the page is almost always drawn signed in. An owner still owing a password change is sent to replace it before anything is drawn.
  - **The server reads a screen's first data** — the business, the bell's count, and each screen's first list or figures — and the page arrives with it, in the same shape its API route sends. The browser does not ask again for what came with the page. Analytics, Expenses and Guest sales keep their period on the device, so their figures are still read in the browser.
  - **No full-screen loader.** The root `loading.tsx` is removed: a streamed placeholder was held on screen for at least 0.3 s. **This supersedes §134 P1-2's loading screen.** A navigation that is still on its way after 150 ms shows the next screen's **skeleton in the page's place**, with the header and the navigation kept. Create order's steps change the address without asking the server.
  - **Heavy sheets and forms load when needed**: they are left out of the screen's first download and fetched once the screen is idle, so opening one rarely waits.
  - **Each account's data stays its own.** Signing in, signing out and confirming an email load a new page. Each signed-in account's reads are kept in a cache of its own, begun afresh when who is signed in changes.
- **Orders can be changed, and moved to any status in one step** (the user: "option to edit an order and option to directly change status of the order instead of clicking prepare>done … by mistake order status as preparing can revert back too. edit order allows to add more items to the order also").
  - **Edit** on an open order changes its items (more of something, a new product or custom item, one taken off), who it is for, the handover, the discounts and charges, and the notes. A line already on the order keeps the price it was ordered at; one added now takes today's. What has been paid stays as it is: the total may not come to less than that (§139.11.13).
  - **Change status** offers every status an open order can take: straight on to Delivered or Completed, or back to an earlier one when it was moved by mistake (§139.11.8, revised).
  - **Delivered or Completed, and Cancelled, stay final.** Asked, the user chose to keep them so: stock has followed them.
- **What cannot be undone asks first** (the user: "keep confirm prompt on such cases, are sure the order is complete, are sure you want to logout, such no reversible actions need a confirm dialog"). Marking an order Delivered or Completed, cancelling it, and signing out now ask on a confirm card. Deleting an expense or a category, clearing an order being built and replacing it with Order again already asked.
- **Every choice opens the app's own list** (the user: "some of the select dropdown is not having css instead using native list, fix that too, like in analytics the days dropdown list"). The period on Analytics, Expenses and Guest sales, Daily or Weekly beside a trend, and every choice in a form — a payment method, a unit, a stock movement, a category filter, a discount or a charge — open a list in paper and hairline with the chosen one ticked, never the browser's own. It is one kit component (`select-menu`); the range picker's native select is gone.
  - Opening it no longer shows a different period after the page loads: the remembered period is read once the page has hydrated, so the server's page and the browser's first draw agree.
- **A profile picture in place of initials** (the user: "split this, and when a new person registers, randomly give one from these 9 as profile icon … when clicked on the avatar icon will show the dialog or modal to change it with any of the 9 available, these icons are only for the profile, nothing else").
  - The supplied sheet of nine animals is cut into **nine pictures that ship with the app**. Nothing is uploaded, and only the chosen one's key is kept.
  - **A new account is given one at random**, and every existing account was given one the same way.
  - **Tapping the picture on Settings** opens the nine to choose from; the choice is saved at once, as often as the owner likes.
  - **Only the owner's own account wears one**: the top bar, the account menu and Settings. Customers keep their initials (§139.11.14).
- **No worker for now** (the user: "move notifications and mail sender from workers to directly handled by nextjs app, as iam not able to host workers now. notifications now show for only about to due or already due orders. others for now leave it, to reduce the load. dont remove those code completely as in future i may switch to workers").
  - **Emails are sent by the app itself**, as they are asked for: the confirmation at registration and its Resend, and a new email address's link.
  - **Notifications are only for orders due soon and overdue.** The app looks for them as the bell is read.
  - **The other notifications are paused, not removed**: an order placed or moved, a payment, a customer added, stock running low. They come back with a worker (§139.11.15).
- **Every date opens the app's own calendar** (the user: "look into calendar picker, its native now, change it to something which will match our design"). A custom period's two ends, the orders filter's due dates, an expense's date and an order's delivery day open a calendar in paper and hairline, with the month in the display serif, the chosen day in caramel and today ringed. The delivery's time is picked from a list every quarter of an hour, and a time already saved between two quarters is kept. It is one kit component (`date-picker`), placed as the select's list is.
  - Analytics no longer asks for a custom period until both its dates are chosen, as Expenses and Guest sales already did.
- **A developer console** (the user: "create a simple dev app ui. simple white and blue theme for now, no write operations, just count of total users in the app, users details, error logs, audit logs … show whatever log is being saved now, dont create anything new now"). A developer who signs in lands on `/admin`, a read-only console in white and blue, and never on a business's screens (§139.11.16).
  - **Overview:** who is signed in, and the counts of users (owners and developers), businesses and audit entries.
  - **Users:** every account, with its business and how it signs in.
  - **Audit log:** what was done in every business, by whom, with the values before and after.
  - **Not shown**, because nothing keeps them: **server errors** are only in the server's output, so there is no error log page. The **job queue** has no page either while no worker runs (the user asked; §139.11.15).
  - A developer's account has **no business** (`0028_developer_accounts`). It is added from the Supabase dashboard, never by registering.

---

## 139.1 Scope changes this brief approves (§31)

Each row replaces what the plan said before. Rows marked *Q#* have an open
detail in §139.2 but the change itself is approved.

| # | Area | The plan said | From now on | Supersedes |
|---|---|---|---|---|
| 1 | **Roles** | `BAKER`, `DEV` | **`USER`, `DEV`.** USER is the business owner and keeps every right BAKER had. DEV is unchanged and still does not inherit business data. | §5, §6, AGENTS §8 |
| 2 | **Audience** | Home bakers | **Home businesses** — bakers, hamper makers, florists, gift makers. User-facing copy says *business*, not *bakery*. Internal names (`bakeries`, `bakery_id`, `bakeryId`) **stay** — §139.11.1. | §1; copy everywhere |
| 3 | **Registration** | Name, bakery name, phone, email, password | Adds **catch phrase** (optional), **city** and **business address**. *Q2* | §7, §92 (registration) |
| 4 | **Visual directions** | Clean Bakery, Peach Bakery | **Golden** and **Peach** — still exactly two. Clean is retired, and a stored `clean` choice becomes Golden. | §42, §137.5, AGENTS §21 |
| 5 | **Order customer** | Required (`orders.customer_id NOT NULL`) | **Optional.** An order is for a saved customer or for a **Guest**. Guest orders are reported as **Guest sales**. *Q12* | §15, §16, §86, §100 |
| 6 | **Creating a customer** | Customers screen only | Also **inline from the order screen**. | §11, §16 |
| 7 | **Customer fields** | name, phone, email, address, maps link, notes | **Unchanged:** name and phone required; address, map link, email and notes optional (Q1, answered). A delivery order still needs an address or a map link on the order itself (§96). | — |
| 8 | **When a bill exists** | After the order is created (§70, §72) | A **draft bill (estimate)** can be viewed and shared **before the order is saved**; the confirmed bill follows creation. **Neither is stored** — §15 and §132 are unchanged. | §70, §72 |
| 9 | **What a bill shows** | Business name, lines, totals, payment | Adds the **catch phrase, address and phone**, delivery details and **balance due**; the footer credits the app by **name and web link**. The business leads and the credit is a small footer — this settles §134's "bill branded with the vendor" finding in the brief's favour. | §72, §99, §133.2 B4 |
| 10 | **Feedback** | Inline banners; success mostly silent | A **response card** for every action's outcome, app-wide (§139.6). | §101, §102 |
| 11 | **Input hygiene** | Most schemas trim | **Every** text input is normalised by one set of primitives (§139.7). | §33 |
| 12 | **Responsive** | Mobile now; desktop specified but not scheduled (§137.9) | **Every screen ships phone, tablet and desktop together.** | §41, §137.9 |
| 13 | **Mobile navigation** | Home · Orders · Products · Customers · More (§137.1) | **Unchanged** — the references confirm it. | — |
| 14 | **Where tests live** | Beside the code (AGENTS §26) | **`/tests`, mirroring `src/`** — recommended in §139.16. | AGENTS §26 |
| 15 | **Android** | Phase 7 (§60) | **Phase 8 of this roadmap**, after the web app is redesigned and hardened (§139.17). | §60 |
| 16 | **Illustrations** | Products show a typographic monogram tile (§137.3); nothing marks an expense category | **An app-owned illustration library** (§139.11.10). Each product and each expense category shows an illustration: a default until the user picks another. **Not an upload.** The art ships with the app, and §16 is unchanged. | §137.3; §137 decision 1 |
| 17 | **Photography** | None (§137 decision 1) | **App-owned photographic plates** as backgrounds where a screen needs one: the auth screens, the Home hero, the Analytics and Expenses bands, and the desktop panels (§139.11.12). There are still **no uploaded photographs** of anything. | §137 decision 1 |
| 18 | **Order statuses** | Pending · In progress · Out for delivery · Delivered · Cancelled | Adds **`READY`**. "In progress" reads **Preparing**, and a finished pickup reads **Completed** (Q3, answered). | §17, §85 |
| 19 | **Order lines** | Catalogue products only | Also **custom items**: a typed name and amount that move no stock (Q5, answered). | §15 |
| 20 | **Charts** | Numbers on Analytics; a list on Expenses | The **graphs the references show**, on Expenses and Analytics (§139.11.11). The Dashboard stays operational (§10, AGENTS §20). | — |

---

## 139.2 Open questions

Each question blocks **only** the tracker rows that name it (§139.19). Everything
else proceeds, and a question left unanswered is built on its **default**.
**Answered** questions keep their row. The answer replaces the default, and the
tracker rows that waited on them no longer wait.

| # | Question | Default if unanswered | Recommendation | Waits on it |
|---|---|---|---|---|
| **Q1** | **Is a customer's address required?** The brief listed it as required; the reference form marks it "(Optional)". | **Answered 2026-09-24: no.** Address and map link are both optional, as §92 had it. | — | R3.7 |
| **Q2** | **Are city and address required at registration?** They are listed without "optional". | Required — the bill prints them | Required | R2.4 |
| **Q3** | **Order statuses.** The references show Pending · Preparing · Ready · Out for delivery · Delivered · Completed · Cancelled. The product has Pending · Baking · Out for delivery · Delivered · Cancelled. | **Answered 2026-09-24: yes.** Rename to "Preparing", **add `READY`**, and keep `DELIVERED` as the single finished state, labelled **"Completed"** for a pickup and **"Delivered"** for a delivery (§139.11.8). | — | R3.11 |
| **Q4** | **Tax.** The references show "Tax (GST 5%)"; `totals.ts` charges none, and most home businesses sit below the GST threshold. | No tax; the tax row is hidden when it is 0 | Not in v2. If wanted later: a per-business setting (registered, GSTIN, rate). | — |
| **Q5** | **Custom items.** The desktop reference has "Add custom item — for special requests or non-listed items". The schema already allows it (`order_items.product_id` is nullable and keeps a name and price snapshot). | **Answered 2026-09-24: yes.** A custom item name with a custom amount; it moves no stock (§139.11.7). | — | R3.10 |
| **Q6** | **Photography.** The references are photo-led. §16/§118 allow **only** the logo upload. | **Answered 2026-09-24: no uploads, as planned.** The supplied photographs are used as **backgrounds** where needed (§139.11.12). Products show **illustrations** (§139.11.10), not photographs. | — | R1.13, R2.8 |
| **Q7** | **Reference features outside the plan:** Messages/chat, Staff/team, Suppliers, a Wholesale customer type, Language and Currency settings, Payment-methods settings, a barcode scanner, a dark-mode toggle, a multi-business switcher, "Today's special", Help & Support, and the copy "the customer will be notified". | **Answered 2026-09-24: omit all of them**, Help & Support included. The **Regular / New** customer tabs stay: they are derived from order history and are not on this list. | — | R5.11 |
| **Q8** | **Wording for the wider audience.** The tagline "Home Bakery", the auth headlines ("Good bakes start here.") and the product units (piece, kg, gram, box, dozen) are bakery-only. | Tagline "Home Business"; neutral auth headlines; units add **set, bunch, pack** | Same as the default | R1.14, R2.8, R5.6 |
| **Q9** | **How the Android app ships:** the hosted app inside a native shell, or a static export bundled into the APK (§139.17.1). | Hosted app in a native shell | Hosted app in a native shell | R8.1 |
| **Q10** | **Android identity and Play requirements:** the application id (e.g. `app.ovenly`), the Play developer account, a **Privacy Policy page**, and **account deletion** (in the app and via the web). Play requires both for an app that creates accounts and stores personal data — here, the customers' names, phones and addresses. **Neither exists** (§138.2 F). | — | Build both pages in Phase 8 | R8.2, R8.10 |
| **Q11** | **Order-flow sequence.** The references put items first and the customer second; AGENTS §12 puts the customer first. | Items first | **Items first** — a Guest walk-in never needs a customer step | R3.9 |
| **Q12** | **Guest orders:** anonymous, or with an optional name for the bill? | Anonymous; the bill reads "Guest" | Anonymous | R3.5 |
| **Q13** | **Success cards:** close on their own after about 3 seconds when they offer no next step, or always need a tap? | Close on their own | Close on their own (errors and confirmations never do) | R1.10 |
| **Q14** | **Theme choice:** remembered per device (today, `localStorage`), or saved on the account so it follows the user into the Android app (one column on `profiles`)? | Per device | Per account | R1.4 |
| **Q15** | **A theme switch on the signed-out screens** (§138.6.3 left this open). | None — the stored choice is honoured | None | R2.9 |
| **Q16** | **The illustrations' licence.** Three of the files are Vecteezy downloads. `IMG_2470` is the same picture as one of them, so the `IMG_` files are probably from Vecteezy too. Vecteezy's free licence asks for a credit; its Pro licence does not. | ~~A credit, "Illustrations: Vecteezy.com", in Settings → About~~ — **no credit in the app** (the user, 2026-09-26: About shows "Crafted by · jaFFa") | Confirm the licence for every file before the Play release (Phase 8) | R1.15, R5.11 |

---

## 139.3 What the references establish

| File | Screens | Theme |
|---|---|---|
| `v2-home-mobile-peach.png` | Home: the **business's own** name and catch phrase in the header, a greeting, a hero plate, search, four stat tiles with deltas, a promo card, recent orders, and the five-item bottom nav | Peach |
| `v2-analytics-expenses-mobile-golden.png` | **Analytics** (range picker, tabs, four KPIs, sales-trend line, top products, sales-by-category donut, quote) and **Expenses** (tabs, two KPIs, category donut, daily bars, recent expenses) | Golden |
| `v2-board-home-customers-more-analytics-expenses.png` | A Home variant with category chips and featured products; **Customers** with segment tabs; **More**, with the reasoning for putting Analytics and Expenses there; wide Analytics and Expenses | Golden |
| `v2-board-customer-profile-notifications-settings.png` | Customers, **Customer detail** (stats; Orders / Notes / Addresses tabs; Create order), Messages, **Profile**, Analytics, Expenses, **Notifications** (tabs, mark all read), **Settings** | Golden |
| `v2-plate-cake-clean.png` | A **clean photographic plate** with no type on it — usable as a hero asset | — |
| `v2-hero-cake-with-type.png`, `v2-hero-brownie-with-type.png` | The hero composition: a two-line serif, a short rule and a tracked line on the left, the subject on the right | — |
| `v2-tablet-desktop-layouts.png` | The **tablet and desktop shell**: sidebar, a top bar with global search, a greeting row, KPI tiles with sparklines, charts, orders as a table; desktop Orders, a Products grid, Analytics | Golden |
| `v2-order-flow-mobile.png` | **Create order** (product grid, category chips, cart bar), **Order details** (customer, items with steppers, note, summary), the **Select customer** sheet and the **New customer** form | Peach |
| `v2-order-create-desktop.png` | **Two-pane create order**; Select customer and Add new customer as dialogs | Peach |
| `v2-order-create-desktop-success.png` | Grouped sidebar, **"Add custom item"**, and **"Order placed successfully"** — the model for the response card | Peach |

**What we take from them**

- **Cream ground, white cards,** a serif for display and a sans for everything you operate (confirms §137.2 rules 1 and 2).
- **The business's identity in the header** — its name and catch phrase, not the app's.
- **Stat tiles:** a tinted icon medallion, the value, the label, and a delta against the previous period.
- **Status as a tinted pill with a dot.** This supersedes §137.2 rule 4 ("a dot and a word").
- **Lists as hairline rows inside one card** (§137.6 `row.tsx`).
- **Create order as two panes on wide screens,** and as a grid with a cart bar on phones.
- **Tabs:** underlined for sections, and a filled pill for a segmented range.
- **Charts:** a line for the sales trend, bars for daily expenses, a donut for category share — each with a tooltip.
- **A result card:** an illustrated medallion, a strip of key facts, and two actions.
- **A grouped sidebar:** the daily work, then the business, then the rest.

**What we do not take** — product truth wins (§139.2 Q6, Q7):

- **Customer and profile photos** become **initials avatars**. Photo uploads are outside §16. *(Revised 2026-09-27, the user: the owner's own picture is one of nine animals that ship with the app, §139.11.14; customers keep their initials.)*
- **Product photos** become the product's **illustration** (§139.11.10). The supplied photographs appear only as app-owned backgrounds (§139.11.12).
- The **"Admin" and "Baker" role labels** become **"Owner"**.
- **"The customer will be notified"** — customers receive nothing from this product, so the copy must not promise it.
- **The mock's own inconsistencies** are not specifications: an average order value of "4.8", and a cart that says ₹1,410 over a summary of ₹1,570.

---

## 139.4 Themes — Golden and Peach

One vocabulary for the whole app. The separate Flour Room tokens from §138
(`canvas`, `sheet`, `field`, `ink`, `ink-muted`, `rule`) **merge into the
semantic names** the components already use, so the auth screens and the app
stop having two palettes:

| Retired | Becomes |
|---|---|
| `canvas` | `background` |
| `sheet` | `surface` |
| `field` | `sunken` (new) |
| `ink`, `ink-muted` | `text`, `text-muted` |
| `rule` | `border` |
| `action`, `action-hover`, `action-text` | kept — the one dark control |

**Every value below was checked for contrast** — the ratios are measured
against the ground the token is used on.

### Golden (replaces Clean)

| Token | Value | Used for | Contrast |
|---|---|---|---|
| `background` | `#F6EFE5` | Page ground | — |
| `surface` | `#FFFCF8` | Cards, sheets, the response card | — |
| `sunken` | `#F1E8DB` | Fields, tile wells, the quote block | — |
| `border` | `#E6DACB` | Hairlines | decorative |
| `text` | `#2B1D14` | Body and headings | 14.3 : 1 on background |
| `text-muted` | `#6B5747` | Secondary text, placeholders, hints | 5.97 on background · 6.67 on surface · 5.62 on sunken |
| `primary` | `#7A4A25` | Caramel — active tab, links, icons, filled buttons | 7.25 as text on surface; `#FFF8F0` on it 7.04 |
| `primary-soft` | `#F3E6D6` | Tinted medallions, the active nav pill | — |
| `accent` | `#A67628` | Gold — highlights and chart accent. **Not for text.** | 3.30 on sunken, 3.92 on surface (≥ 3 : 1 for UI marks) |
| `action` | `#2A1B12` | The one dark control per screen | `#FFF8F0` on it 15.8 |

### Peach

| Token | Value | Used for | Contrast |
|---|---|---|---|
| `background` | `#FBEEE6` | Page ground | — |
| `surface` | `#FFFAF6` | Cards, sheets | — |
| `sunken` | `#F7E6DA` | Fields, wells | — |
| `border` | `#F0DBCD` | Hairlines | decorative |
| `text` | `#33201A` | Body and headings | 13.6 on background |
| `text-muted` | `#77574A` | Secondary text | 5.69 on background · 6.24 on surface · 5.32 on sunken |
| `primary` | `#A94A26` | Terracotta | 5.48 as text on surface; `#FFF8F3` on it 5.41 |
| `primary-soft` | `#FBE3D6` | Medallions, the active nav pill | primary on it 4.62. *Was `#FADFD0`, which measured 4.47 when built (R1.3).* |
| `accent` | `#C46A3C` | Highlights and chart accent. **Not for text.** | 3.70 on surface |
| `action` | `#3A2119` | The one dark control | `#FFF8F3` on it 14.2 |

### Status and payment colours (both themes)

A status pill is its colour at **12 % over `surface`**, with a 6 px dot and the
word in the full colour. **Every pair is at least 4.5 : 1** in both themes.

| Status | Colour | Label |
|---|---|---|
| `PENDING` | `#8A5208` | Pending |
| `IN_PROGRESS` | `#944616` | **Preparing** (was "Baking" — Q3) |
| `READY` *(if Q3)* | `#2F6F5E` | Ready |
| `IN_TRANSIT` | `#355F9A` | Out for delivery |
| `DELIVERED` | `#2E7048` | Delivered · **Completed** for pickup (Q3) |
| `CANCELLED` | `#A63A34` | Cancelled |
| neutral | `#5E5550` | Inactive, archived |

Payment: `UNPAID` uses the cancelled red, `PARTIALLY_PAID` the pending amber,
`PAID` the delivered green.

**Chart colours are not chosen here.** They are §139.11.11's `--color-chart-1`
to `6` per theme, taken from the references' browns and oranges and validated
with the chart kit (R1.17); the screens that use them are R5.8 and R5.9.

### Theme mechanics

- **No flash on load** (BUG-15): a small inline script in `<head>` sets `data-theme` before first paint, so a Peach user never sees Golden flash first.
- **`theme-color`** follows the theme — the browser toolbar, and the Android status bar through the native layer.
- **The picker lives in Settings → Appearance**, as two swatches. The signed-out screens honour the stored choice (Q15).
- **A stored `clean` value is read as `golden`,** so nobody loses their choice in the rename.
- **Type follows §137.4:** Fraunces for display, Inter for the interface. Fredoka and Plus Jakarta Sans are retired.
- **Icons:** lucide at a 1.75 stroke, set inside tinted medallions where the references use them.

---

## 139.5 The component system

Everything lives in `src/components/ui` (kebab-case files). **No screen restyles
a shared component** (AGENTS §5).

| Component | New / rewrite | What it is |
|---|---|---|
| `AppShell` | Rewrite | **Phone:** a top bar with the business mark, name and catch phrase, a bell and the owner's profile picture (§139.11.14; initials until 2026-09-27); a five-item bottom nav with a tinted active pill. **Tablet:** an icon rail. **Desktop:** a grouped sidebar — *Home, Orders, Products, Customers* · *Analytics, Expenses* · *Inventory, Notifications, Business details, Settings* — and a top bar with the bell and the account menu (no global search: the user's decision, 2026-09-25). Safe areas on every edge. |
| `page-header` | Rewrite | Back, a serif title, a sans subtitle, and a trailing action (a range picker or a `+`). |
| `hero` | New | An optional photographic plate (§139.11.12), a two-line serif, a rule and a tracked line. **Home only on phones**; Analytics and Expenses get a compact band, so their numbers stay above the fold. |
| `stat-tile` | Rewrite | Medallion icon, value (serif when it is a headline amount), label, a delta against the previous period (up green, down rose), and an optional sparkline on desktop. |
| `tabs` | New | Underlined, scrollable, with optional counts. |
| `segmented`, `range-picker` | New | Today / Week / Month, and "Last 30 days". *Since 2026-09-27 the range picker opens the kit's own list (`select-menu`), as every select does.* |
| `row`, `row-list` | New | Tile or avatar · title block · trailing block (amount, pill) · chevron, with hairline dividers inside **one** card. |
| `status-pill` | Rewrite of `status-badge` | A tinted pill with a dot (§139.4). |
| `avatar` | New | Initials on a tint picked deterministically from the name, within the theme's palette. |
| `product-tile` | New (replaces the §137.3 bake tile) | The product's **illustration** (§139.11.10) on a rounded tile in the theme's sunken tone, or `default-product` until one is chosen. 40 px in a row, 48 px in a desktop table, and the full width of a card. |
| `illustration` | New | Renders a library key from the registry through `next/image`. Decorative (`alt=""`) beside a name, and labelled where it stands alone. An unknown key renders the default. |
| `illustration-picker` | New | A sheet on phones and a dialog from tablet up: the library by group, a filter by name, the current choice marked, and **Use default**. A radio group with arrow-key movement, each option named by its label. |
| `product-card` | New | Tile, name, price and a `+`, for grids. |
| `cart-bar` | New | A count badge, the running total and a go-on button. Sticky, clear of the safe area. |
| `quantity-stepper` | New | − / value / + with 44 px targets, long-press repeat and keyboard support. |
| `search-field` | Rewrite of `search-input` | Fixes placeholder contrast (BUG-24). Optional filter button. *(The global variant with ⌘K was dropped with global search, 2026-09-25.)* |
| `sheet` / `dialog` | Rewrite of `form-sheet` | A bottom sheet on phones and a dialog from tablet up. Focus trap, `inert` background, `dvh` height, a footer that rides above the keyboard, safe areas (BUG-25). |
| `response-card` + `ResponseProvider` | New | §139.6. |
| `charts` | New | `line-trend`, `bar-trend`, `donut` with legend, and `sparkline`. Authored SVG, each with a data-table fallback for screen readers (§139.11.11). |
| `quote-block` | New | The centred serif panel. |
| `fab` | New | The one dark circular `+` on a phone screen; on desktop it becomes a header button. |
| `choice-chips` | New | One-of-many filters — a payment method, a range. (Not product categories: dropped 2026-09-25.) |
| `customer-picker` | New | Search by name or phone, radio rows, **Guest pinned first**, and "Add new customer". |
| `bill` | New | §139.11.6. |
| Field kit | Update | **Sentence-case labels become the default** (the references use them everywhere); optional fields say "(Optional)" as the references do; the required asterisk stays (§138.5); a phone field gets a `+91` prefix adornment. |
| `empty-state`, skeletons | Keep and restyle | — |

**Motion** (2026-09-26). The kit moves only on a change, never because a screen loaded. Under reduced motion nothing travels; each move becomes a short fade.

- **Sheets and cards** (`Modal`):
  - **Arrive:** a sheet slides up from a phone's bottom edge. From 768 px it is a centred card that rises a little and settles. The page dims in step.
  - **Leave:** the way it came, in 200 ms, faster than it arrived. This is a progressive enhancement: where the browser can keep a closing dialog on top (the `overlay` property), it plays; elsewhere the sheet closes at once.
  - **While leaving:** focus returns and the page is live straight away, and a sheet keeps showing its record (`useKept`).
  - **Response cards and notices:** the same exit, and the next card follows.
- **Tabs:** one underline slides to the chosen tab. The tab's view comes in 8 px from that side.
- **Lists** (`RowList`, `ListScreen`'s cards; `useListMotion`):
  - **Changes:** when an item leaves, the rest close the gap, and the list's edge follows up. A reordered item slides to its new place, and a new one drops in.
  - **When it doesn't play:** on a list's first showing, on a list that is hidden, or when more than six items change at once, which only fades in the new ones.
- **Loading:** content fades in over the skeleton it replaces, on every screen, because the app's main region watches for it (`useSettle`). Cached content simply shows.
- **Controls:** the Custom dates drop in, and a pressed control shrinks slightly and eases back. Only colour, shadow, opacity and transform animate, never layout.

---

## 139.6 The response card — one way to report an outcome, app-wide

**What it replaces.** The app has no toast library. Today an action's result is
either an inline `ScreenNotice` banner or nothing at all — most saves close their
sheet and say nothing. The response card is the single answer to "what just
happened?", on the web and in the Android app. The model is the reference's
**"Order placed successfully"** screen.

**Anatomy**

```text
┌──────────────────────────────────────┐
│              ( ✓ )                   │  medallion: tinted circle + drawn icon
│         Order placed                 │  serif title — short, says the outcome
│   ORD-1028 is saved and ready to     │  one or two lines of plain text
│   share.                             │
│ ┌──────────┬───────────┬──────────┐  │  facts strip — up to three key/values
│ │ Order    │ Customer  │ Total    │  │
│ │ ORD-1028 │ Priya M.  │ ₹1,817   │  │
│ └──────────┴───────────┴──────────┘  │
│ [ View bill ]        [ New order ]   │  primary + secondary
└──────────────────────────────────────┘
```

**Kinds**

| Kind | Medallion | Role | Closes |
|---|---|---|---|
| `success` | primary-soft, check | `dialog`, announced politely | On its own after ~3 s **when it offers no next step** (Q13); otherwise by an action or ✕ |
| `info` | sunken, info | `dialog` | As success |
| `warning` | amber tint | `alertdialog` | Only by a choice |
| `error` | red tint | `alertdialog` | Only by a choice — **never on its own** |
| `confirm` | amber or red tint | `alertdialog` | Resolves a promise: `await respond.confirm(…)` returns `true` or `false` |

**Behaviour**

- **Placement:** a bottom sheet on phones (thumb reach, clear of the safe area), a centred card (max 420 px) from tablet up.
- **Focus** moves to the primary action, is **trapped** inside the card and **returns** to the control that caused it. The rest of the app is `inert`. Escape closes success, info and error cards and means *No* for a confirmation.
- **Auto-close** shows a hairline progress bar and **pauses** on hover, focus or touch (WCAG 2.2.1).
- **One at a time.** A newer card replaces an older one of lower severity, and identical cards are not stacked.
- **Motion:** rises in 240 ms with an exponential ease-out; under reduced motion it only fades.
- **Android:** a haptic tick for success, warning and error, through the native layer (§139.17.2).
- **Words come from `messages.ts`.** An error shows the API envelope's message — never raw text — and the `requestId` in small type, so a user can quote it.

**API** — `src/components/ui/response-card.tsx` plus a provider mounted once in the root layout:

```ts
const respond = useResponse();
respond.success({ title, message, facts?, primary?, secondary?, autoClose? });
respond.error({ title, message, requestId?, retry? });
if (await respond.confirm({ title, message, confirmLabel, tone: "danger" })) { … }
```

**What stays inline — and why**

| Stays inline | Why |
|---|---|
| **Field validation**, next to the field | The problem belongs where it can be fixed, and is announced by the field (§21). |
| **A screen that could not load** (`ScreenNotice` with Retry) | Nothing was attempted; there is no outcome to report. |

Everything that reports **the outcome of an action** — saved, created, recorded,
refused, failed — is a response card. A server refusal on a form (a duplicate
phone, say) is a card **over the form, which stays open** beneath it.

**Examples**

| Action | Card |
|---|---|
| Order placed | success · facts: Order, Customer or Guest, Total · **[View bill] [New order]** · no auto-close |
| Payment recorded | success · facts: Amount, Balance due · auto-close |
| Customer saved from the order screen | success · auto-close · the new customer is selected |
| Phone already belongs to a customer | error · **[Use that customer] [Edit]** |
| Network down | error · **[Try again]** |
| Cancel an order | confirm (danger): "Cancel ORD-1028? Its stock is released." |
| Delete an expense | confirm (danger) |
| Not enough stock | error: "Only 2 left of Red Velvet Cake." (C4 blocks oversell) |
| Session expired | info: "You were signed out. Sign in again to continue." |

---

## 139.7 Input hygiene — trim and normalise everything

One set of primitives in `src/lib/validation/primitives.ts` does this. Forms and
routes parse the **same** schema, so the server is authoritative and the client
simply agrees with it. The database repeats the important rules as CHECK
constraints.

| Kind of input | Rule | Primitive |
|---|---|---|
| **Single-line text** — names, business name, city, catch phrase, product, category, adjustment name | Unicode NFC; strip zero-width characters (U+200B–U+200D, U+FEFF — they arrive when text is pasted from WhatsApp) and control characters; collapse runs of whitespace into one space; trim; then check min/max | `requiredLine(label, {min, max})`, `optionalLine(label, max)` |
| **Multi-line text** — address, notes, description | NFC; strip zero-width and control characters except newlines; CRLF → LF; trim each line's end; collapse three or more blank lines into one; trim | `requiredLines(…)`, `optionalLines(…)` |
| **Email** | Trim and lower-case (exists) | `requiredEmail`, `optionalEmail` |
| **Mobile number** | Digits → `+91` E.164 (exists) | `indianMobile` |
| **Link** (map link) | Trim; **`http:` and `https:` only** (BUG-13); max 1000 | `optionalLink` |
| **Money** | Trim; **accept `₹`, commas and spaces** ("₹1,500"); at most 2 decimals; bounded (0 – ₹10,00,000 per field) so the `integer` columns cannot overflow (BUG-10, BUG-12) | `paiseText` |
| **Whole numbers** | Trim; accept commas; bounded (quantity 1 – 9,999) | `wholeNumberText`, `quantity` |
| **Search** | Trim and collapse; match phone numbers on digits (BUG-23) | client helper |
| **Password** | **Never altered — not even trimmed.** A password is a secret, not text to tidy; only its length is checked. The one documented exception. | `password` |

**Every message comes from `VALIDATION_MESSAGES`.** A schema may not fall back
to Zod's defaults (BUG-11). A test feeds boundary values to every schema and
fails if any message reads like Zod's ("Invalid input…", "Too big…").

**The small things, in the field kit:** `autoComplete`, `inputMode` and
`enterKeyHint` on every field; `autoCapitalize="words"` on names;
`spellCheck={false}` and `autoCorrect="off"` on emails, links and codes; the
submit button is busy while a request is in flight, and critical mutations carry
an idempotency key (C2).

**Database** (R1.11): `char_length(trim(x)) between 1 and N` on customer,
product and category names, the city and the catch phrase; categories unique per
business on `lower(name)`.

---

## 139.8 Safe areas, the viewport and the device

**Today the safe-area helpers do nothing on an iPhone** (BUG-14): the root
`viewport` export has no `viewportFit: "cover"`, so `env(safe-area-inset-*)` is
always 0 there. On Android the insets matter even more: recent target SDKs draw
the app edge to edge, behind the status and navigation bars.

1. **Viewport:** `viewportFit: "cover"`, plus `interactiveWidget: "resizes-content"` so the on-screen keyboard resizes the layout rather than covering it.
2. **One set of variables:** `--safe-top/right/bottom/left: env(safe-area-inset-*, 0px)` on `:root`. **Every inset flows through them**, so the native layer can override them if a WebView under-reports (§139.17.3), and tests can set them to fake a notch.
3. **The additive helpers from §138.6** (`safe-bottom [--safe-pb:…]`), applied at **all five call sites** still pairing a helper with a padding utility (§138.6.3).
4. **Who pays which inset:**

| Element | Insets |
|---|---|
| Phone top bar; full-bleed heroes (content padded, image behind the status bar) | top, left, right |
| Bottom nav | bottom, left, right |
| FAB | bottom = nav height + bottom inset + 16 px |
| Sheets, dialogs, the response card | bottom |
| Sticky action bars (cart bar, checkout, customer "Create order") | bottom |
| Sidebar and icon rail | left (landscape notch) |
| Main content | bottom padding = nav height + bottom inset (replaces the fixed `pb-24`) |

5. **Heights:** `dvh` and `svh`, never `vh` (sheets use `max-h-[90vh]` today).
6. **Keyboard:** a sheet's footer rides above the keyboard (`visualViewport`); the focused field scrolls into view; on Android, the Capacitor Keyboard plugin's resize mode is set to match.
7. **Status bar:** colour and icon style follow the theme — `theme-color` on the web, the StatusBar plugin on Android. The PWA uses `black-translucent`, which is why the top inset matters.
8. **Touch:** 44 × 44 px minimum targets; primary actions in the bottom third on phones.
9. **Verification:** every screen at 360, 390, 414, 768, 1024 and 1440 px wide, with the inset variables set to 47 px top / 34 px bottom, and in landscape. No horizontal scroll, and nothing under the notch or the home indicator.

---

## 139.9 Responsive layout

| Width | Navigation | Content |
|---|---|---|
| **< 768 px** — phones (360, 390, 414 are the targets) | Top bar + five-item bottom nav + FAB | One column. Lists are rows; KPI tiles 2 × 2; product grid in 2 columns. |
| **768 – 1023 px** — tablets | 72 px icon rail, labels in tooltips; top bar with the bell and the account | KPI tiles 4 across; product grid in 3 columns; lists can open detail beside them. |
| **≥ 1024 px** — laptop and desktop | 248 px grouped sidebar; top bar with the bell and the account | Max width 1200 px. Orders and customers become **tables**; create order is **two panes**; charts sit side by side; product grid in 4–5 columns. |

Text stays readable at 200 % zoom, and the layout never scrolls sideways.

---

## 139.10 Screens

Every screen ships **phone, tablet and desktop together**, in **both themes**,
with **loading, empty, error and populated** states, and with its strings in
`messages.ts` (BUG-30). What each one shows follows the plan; how it looks
follows the references.

### Authentication (built in §138)

Re-tokened to Golden and Peach, the hero plate behind the scene (Q6), neutral
headlines (Q8). **Register becomes two short steps** in one request, so a
half-finished sign-up never creates an account:

1. **You** — your name, mobile number, email, password, confirm password.
2. **Your business** — business name, catch phrase (optional), city, address.

A step indicator reads "Step 1 of 2". Validation runs per step; the server parses
the whole payload once.

From 1024 px every authentication screen stands side by side — the scene
left, the form right (the user, 2026-09-27).

### Home

- **Phone:** the header band (business mark, name and catch phrase; bell; avatar); **"Good morning, {first name}"** with the time of day taken from the business's clock (§134 P2-1); the catch phrase or a neutral line beneath; the hero plate at the right (*2026-09-27, layout pass:* below 1024 px the greeting takes the kit's compact band, so the orders due start on a phone's first screen). Then **four stat tiles** laid out as in the reference but **carrying the §20 priorities** — *orders due today*, *sales* (for the chosen period), *to collect* (balance due) and *low stock* — with a Today / Week / Month switch; **Orders due**, grouped Overdue / Today / Tomorrow and sorted by due date (§20, AGENTS §20), with "View all"; **Low stock**; the quote block; and the FAB for a new order.
- **Desktop:** a greeting row with the date and the quote; four tiles with sparklines; a sales bar chart for the period; top products; an order-status donut; recent customers.

### Orders

Tabs with counts: All · Pending · Preparing · Ready · Out for delivery ·
Delivered · Cancelled. Search, and a filter for dates, payment status and Guest.

- **Phone rows:** the first item's illustration (or the Guest mark) · `ORD-1028` · the first item "+2 more" · the customer or "Guest" · due date · status pill · amount · chevron.
- **Desktop:** a table — Order, Customer, Items, Amount, Status, Due — with **New order** in the header. The table starts at 1280 px, where its six columns have room; rows below that (2026-09-26).

### Create order (§139.11.3 – §139.11.5)

1. **Items** — **Add custom item** first (the user, 2026-09-27), then search and the product grid with `+` on each card (no category chips — products need none, 2026-09-25). Once a product is in the order its `+` grows into **− count +**, so one can come off without leaving the grid, and the last one off takes it out (the user, 2026-09-26); a custom item is a name and an amount (§139.11.7); the cart bar shows the count and total.
2. **Order details** — **Customer** (a saved customer or **Guest**, plus **+ New customer**); **Delivery** (pickup or delivery, date and time; the address and map link **filled from the customer** and editable); the items with steppers; a **note** printed on the bill (a cake message, for example) kept separate from **internal notes**, which never are; discounts and charges; the summary. Buttons: **[View bill]** and **[Proceed to payment]**.
3. **Payment** — Unpaid / Paid in full / Part paid (**asks for the amount**) · method · reference. Buttons: **[View bill]** and **[Place order]**.
4. → **Response card:** "Order placed", with the facts, **[View bill] [New order]**.

**Desktop:** two panes — the product grid on the left, and a sticky Order
details panel on the right holding customer, items, summary and payment, with
**Clear all**. Select customer and New customer open as dialogs.

**The draft survives** a refresh or a back navigation (§110) until it is placed
or cleared.

### Order detail

A header with the number, status pill and due date. The customer (or Guest) with
Call, WhatsApp and Map. Items, totals, **payments** with **Collect payment**, and
the **balance due**. **One next-step button** (Pending → Preparing → …), with the
remaining transitions in a menu; **Cancel** asks through a confirm card.
**Bill:** view, share, download — **[View bill]** opens it, and **[Share]** is inside it (§139.11.6); there is no print.

### Customers

Tabs: **All · Regular · New · Balance due**, derived from order history —
*Regular* is three or more orders; *New* is created in the last 30 days;
*Balance due* is everyone who still owes, the most owed first (the user,
2026-09-27). What a customer owes shows at the end of their row, on every tab. **A pinned "Guest sales"
row** at the top — its count and total for the period — opens Guest sales. Rows:
initials avatar · name · "12 orders · last order 2 days ago" · segment pill ·
chevron. Search by name, or by phone in **any** format (BUG-23). The `+` button
creates a customer. *As built (2026-09-26):* the pill sits beside the name, so
the order line has the row's width at 360 px; *New* is added in the last 30 days
and not yet Regular, since Regular wins; the Guest sales row reads the period
Guest sales was last read for on the device; and a new customer's screen opens
once they are saved.

### Customer detail

Initials avatar, name, segment; phone (tap to call), email, city and address
with the map link. Actions: Call · WhatsApp · Map · Edit. Stats: **balance
due** first (the user, 2026-09-27), then orders, total spent, customer since. Tabs: **Orders · Notes · Addresses** —
Addresses are **the distinct delivery addresses from this customer's orders**,
so no new table is needed. A sticky **Create order** with this customer already
selected — it keeps whatever the order being built already holds (IMP-04). **Order
again** sits on each order, beside its items: it rebuilds the draft from that order,
asking first if one is being built, and says what is no longer on sale (IMP-03,
2026-09-26).

### Guest sales

The period's count and total, then guest orders as order rows. Also reachable
from Orders' Guest filter and from Analytics.

### Products

Search. There are no categories (the user, 2026-09-25): a product is known by
its name and its illustration.

- **Phone rows:** tile · name · unit · price · Active pill · overflow menu (edit, deactivate, stock).
- **Desktop:** a grid of product cards with **+ Add product**.

Units add set, bunch and pack (Q8). The product form has an **Icon** field:
the current illustration and **Change**, which opens the picker (§139.11.10).
*As built (2026-09-26):* the field reads **Picture**; each product's menu offers
**Edit**, **Take off sale** / **Put back on sale** and **Record stock**; the Active
pill sits on the price line so the name keeps the row's width; cards from 1024 px.

### Inventory

Stock per product with a low-stock pill; **Adjust** opens a sheet (and no longer
crashes — §134 P0-1); each product's ledger. *As built (2026-09-26):* a row opens
the product's history — on the shelf now, then each movement signed and dated,
an order's line opening that order — with **Record stock**; a product nobody
counts reads "Made to order" and is never low.

### Expenses

As `v2-analytics-expenses-mobile-golden.png` shows: a compact photographic band
(§139.11.12), a range picker and **+ Add**. Tabs: **Overview · Categories ·
Transactions** (Suppliers omitted — Q7). The charts follow §139.11.11.

- **Overview:** two KPI tiles, **Total expenses** and **Daily average**, each with its change on the previous period. For a cost, up reads rose and down reads green. Then **Expenses by category**, a donut with the total in its centre and a legend of each category's share; **Expense trend**, daily bars (weekly beyond 31 days) with the peak marked and a tooltip; **Recent expenses**, each with the category's illustration, the description, the category, the date and the amount, and **View all**; and the quote block.
- **Categories:** the eight defaults and the business's own, the largest first, each with its illustration, the period's total, its share and its count (2026-09-26).
  - **A default** opens its transactions when tapped; it is never changed or deleted.
  - **One of the business's own** has its illustration tapped to change it (§139.11.10). Its row offers **See its expenses**, **Edit name and picture**, and **Delete category**, which is confirmed first and refused while any expense is filed under it.
  - **New category** adds one: a name and a picture.
- **Transactions:** grouped by month, and filterable by category, the business's own among them. An expense opens the form, to be edited or deleted.
- **Desktop:** the KPIs in a row, the donut and the bars side by side, and recent expenses as a table.

The expense form's **Category** field shows each category's illustration beside
its name, the business's own after the eight. A **+** at the end makes a new
category on the spot and chooses it. Editing an expense offers **Delete
expense**, confirmed first (2026-09-26).

### Analytics

As the references show: a compact photographic band, and a range picker. Tabs:
**Overview · Sales · Orders · Customers · Products**. The charts follow
§139.11.11.

- **Overview:** four KPI tiles with deltas: **Total sales**, **Total orders**, **New customers** and **Average order value** (in rupees). Then **Sales trend**, a line with a soft fill, Daily / Weekly and a tooltip, with the previous period as a dashed comparison on desktop; **Top selling products**, with the illustration, name, orders and sales, and **View all**; **Sales by product**, a donut of what each product brought in — the top five and Others, custom items as one "Custom items" slice, the items' total in its centre ("Item sales", since charges and discounts are not a product's) — where the reference has sales by category (the user, 2026-09-26); and the quote block. (Sales by category was dropped with product categories, 2026-09-25.)
- **Sales:** the trend against the previous period; **Guest and customer** sales as a split; and collected against still to collect.
- **Orders:** orders per day as bars; orders **by status** as a donut; and pickup against delivery.
- **Customers:** new against returning; and **Top customers** (§133.9 I1), with guests left out.
- **Products:** every product ranked by sales and by quantity, with custom items as one **"Custom items"** row.

Everything is **aggregated on the server** (§133.9 I3), in the business's
timezone, with the previous period for every delta.

### Notifications

A bell in the top bar, carrying the unread count — 1 to 9, then "9+" (the user,
2026-09-26). The screen has **Mark all as read** and tabs **All · Orders ·
Customers · System** — which needs a `kind` column on the existing
`notifications` table. Tapping a row follows its `action_url` and marks it read
(§133.5 E1). *Built 2026-09-26 (R5.10): the worker writes each notification
from its job (`0022_notification_kind`); orders due soon and overdue are swept
every minute (`0023_order_due_notifications`).*

### More (phone)

Analytics · Expenses · Inventory · Business details · Settings · Sign out, each
with a medallion icon and a chevron. There is no Help entry (Q7).

### Settings

A profile card (the owner's profile picture, tapped to choose another — §139.11.14 — name, "Owner · {business}", the catch phrase as a
quote). Then **Business details**; **Account** (name, email, the sign-in number,
change password); **Appearance** (Golden or Peach); **Notifications** (the
Android permission); **About** (the version, the privacy policy, and **Crafted by · jaFFa** — the user, 2026-09-26, in place of the illustration credit); **Sign out**.
The Notifications row — the Android permission — joins with push (R8.6), and the privacy policy with its page (R8.10); until then About shows the version and the maker.
The reference's separate Profile screen is folded in here.

### Business details

Business name, catch phrase, city, address, the business phone (printed on the
bill; it starts as the sign-in number), and the logo (§133.2 B2). A **live
preview of the bill header** sits beside the form.

### System screens

`not-found`, an error boundary, route loading states (§134 P0-2, P1-1, P1-2),
and an offline screen (PWA and Android).

---

## 139.11 Product changes — specifications

### 139.11.1 Roles: USER and DEV, and the wider audience

- **Database:** `alter type public.user_role rename value 'BAKER' to 'USER'`, and the `profiles.role` default becomes `'USER'`. Existing rows follow the rename with no rewrite.
- **Code:** `USER_ROLES = ["USER", "DEV"]`; `ROLE_LABELS.USER = "Owner"`; `BAKERY_ROLES` becomes `BUSINESS_ROLES = ["USER"]`; guards, seed and tests follow. **DEV still gets no business data** (§5).
- **Stop writing `role` into Supabase `user_metadata`** (BUG-17). Users can edit their own metadata, so a role stored there must never be trusted — and today nothing needs it.
- **Names:** the table `bakeries`, the column `bakery_id` and the identifier `bakeryId` **stay**. Renaming them would touch every table, policy and module, for no user-visible gain. **User-facing copy says "business".** AGENTS.md records the rule, so new code does not mix the two words.

### 139.11.2 Registration and the business profile

| Field | Stored in | Rule |
|---|---|---|
| Your name | `profiles.name` | Required, 2–120 (the greeting and the profile use it) |
| Mobile number | `profiles.phone`, `bakeries.phone` | Required, unique; `+91` E.164; **the sign-in credential** |
| Email | `profiles.email` | Required, unique, lower-cased |
| Password, Confirm | Supabase Auth | Required, 8–72, must match; never trimmed |
| **Business name** | `bakeries.business_name` | Required, 2–160 |
| **Catch phrase** | `bakeries.tagline` (new) | Optional, up to 80 — "Your friendly home baker" |
| **City** | `bakeries.city` (new) | Required (Q2), 2–80 |
| **Address** | `bakeries.address` | Required (Q2), up to 300, multi-line |

- **The confirmation email is queued, not sent inline** (BUG-16). Registration no longer fails, and rolls the new account back, just because mail is down. Settings offers **Resend confirmation**.
- **Business details are editable** in Settings. This needs the `/api/business` endpoint and an update rule (§133.2 B1, B3). Updates run on the server with the owner check, because `bakeries` stays SELECT-only for the API role.
- **The catch phrase appears** under the business name in the app's top bar, on the bill, and as the quote on the profile card.

### 139.11.3 Guest orders and Guest sales

- **Database:** `orders.customer_id` drops `NOT NULL`. `NULL` means Guest.
- **API:** the order's customer is **explicit**, never an accidental `null`:
  `customer: { kind: "GUEST" } | { kind: "CUSTOMER", id }`.
- **The picker** pins **Guest** first, and it is one tap.
- **A guest order** can be pickup or delivery. A delivery still needs an address or a map link (§96).
- **The bill** reads "Billed to: Guest".
- **Reporting:** `GET /api/orders?customer=guest`; the **Guest sales** screen; a **guest against customer** split in Analytics; and guest orders are **left out of Top Customers**.
- **Orders detail** handles the missing customer instead of asking for `customers/null` (today it builds that URL from `order.customerId`).

### 139.11.4 Customers on the fly, and the delivery address

- **New customer from the order screen:** the sheet (phone) or dialog (desktop) posts to `/api/customers` as it does today, and **the new customer is selected** in the draft. A **phone that already exists** answers with a card: **[Use that customer]** or **[Edit]**.
- **Fields:** name* and phone*. Address, map link, email and notes are optional (Q1, answered; as §92 had it). The column is `customers.google_maps_link`, and the label becomes **"Map link"** because any maps service will do.
- **Autofill:** choosing a customer for a **delivery** fills the order's delivery address and map link **only if those fields are empty or still hold the previous autofill**. A value the user typed is kept, and a **"Use {name}'s address"** link offers the swap. A customer with no address fills nothing, so a delivery then needs the address typed on the order. The values are a **snapshot on the order** (§93), and editing them **never** changes the customer's record.
- **Rule:** a delivery order needs an **address or a map link** (§96). Today that is not enforced (BUG-22).

### 139.11.5 View bill before saving — the estimate

- **[View bill]** on the Order details and Payment steps opens the bill sheet **in estimate mode**: the ribbon reads **ESTIMATE · not yet confirmed**, there is **no order number**, it is dated today, and payment shows as selected so far.
- **The numbers come from the server:** `POST /api/orders/preview` takes the draft, validates it with the **same** schema as creation, re-reads the products, runs the **same** `orderTotals`, checks stock, and **writes nothing**. The estimate is therefore exactly what Place order will create (AGENTS §13).
- **[Share]** from the estimate works as for any bill (§139.11.6). **[Place order]** is available in the sheet too.
- **Nothing is stored** — not the estimate, and not the image or PDF (§15, §132).

### 139.11.6 The bill

```text
┌────────────────────────────────────┐
│ [logo or monogram]                  │
│ The Flour Room                      │  business name — serif
│ Homemade happiness                  │  catch phrase — italic, if set
│ 12 Rose Street, Kochi · 98765 43210 │  address, city, phone
│─────────────────────────────────────│
│ BILL   ORD-1028         24 Sep 2026 │  ESTIMATE: no number, ribbon
│ Billed to   Priya Menon · 98765 43… │  or "Guest"
│ Delivery    Fri 26 Sep · Delivery   │  address; "Map link" if one is set
│─────────────────────────────────────│
│ Chocolate Truffle Cake              │
│ 1 × ₹1,250                  ₹1,250  │
│   "Happy birthday, Anu"             │  the customer-facing note
│ Vanilla Cupcake                     │
│ 2 × ₹160                      ₹320  │
│─────────────────────────────────────│
│ Subtotal                    ₹1,570  │
│ Festive discount             −₹100  │
│ Delivery                      +₹80  │
│ Total                       ₹1,550  │  serif, large
│ Paid · UPI · ref 3248…        ₹500  │
│ Balance due                 ₹1,050  │
│─────────────────────────────────────│
│ Thank you for your order!           │
│ Made with Ovenly · ovenly.app       │  app name + web root link, small
└─────────────────────────────────────┘
```

- **Content:** the **business profile** (not the hard-coded "Ovenly Bakery" — §133.2 B4); the order number and date **in the business's timezone** (BUG-07); the customer or Guest; delivery; items with quantity × unit price and the line total; each adjustment by name; tax **only if it is not 0**; total; paid; **balance due**; payment method by its **label** (BUG-27). Internal order notes **never** appear on a bill.
- **Footer:** "Made with Ovenly" and the host of `NEXT_PUBLIC_APP_URL`, linked in the PDF.
- **Look:** a white sheet with near-black text for print and legibility; the theme shows only in the header rule and the total; the serif for the name and total; **tabular numerals** for money; no monospace (it reads as a costume). Designed at receipt width, and scaling cleanly to A5 for the PDF.
- **Output — every one generated on demand, none stored:**
  - **Share as an image (PNG)** — WhatsApp shows an image inline, and it is the common case. Web Share with files where it is supported; download plus copied text where it is not; the native share sheet on Android (§139.17).
  - **Download PDF** — an on-demand route, never stored (§133.8 H1).
  - ~~**Print** — a print stylesheet.~~ **Dropped 2026-09-26 (the user):** a bill has no print action. **[View bill]** opens the bill, and inside it **[Share]** stands where Print was, with **[Download PDF]** beside it on a placed order.
- **File names:** a shared or downloaded bill is named **`{order number} - {business name}`** — `ORD-1028 - Sweet Delights Home Bakery.png`, and `.pdf` for the PDF (the user, 2026-09-26). An estimate has no number yet, so it is `Estimate - {business name}`. Characters a file name cannot hold (`/ \ : * ? " < > |`) are dropped.
- **Accessibility:** the preview is a real dialog with a heading, and the bill reads in order to a screen reader.

### 139.11.7 Custom items (Q5, approved)

The draft's item is a union: `{ productId, quantity, note }` **or**
`{ custom: { name, unitPrice }, quantity, note }`. A custom line is stored with
`product_id = NULL` and its name and price snapshot. **It posts no inventory
line** — the ledger code must skip it, where today it would fail on
`item.product_id!` (`status.ts:40`, `checkout.ts:90`).

- **Adding one:** **Add custom item** opens a small sheet with **Item name** (required, trimmed, 2–120 characters), a **Description** if one is needed (up to 500, printed under the line on the bill as its note — 2026-09-25) and **Amount**, the price of one (required, above ₹0, within the BUG-12 bounds). The quantity starts at 1 and uses the stepper like any other line.
- **On screen** the line shows the `default-product` illustration and a "Custom" mark. **On the bill** it prints like any other line.
- **In reports** custom lines count toward sales, and the Products tab's ranking shows them as one "Custom items" row, as does Overview's Sales by product ring (Sales by category was dropped with product categories, 2026-09-25). **Top products** lists catalogue products only.

### 139.11.8 Order statuses and transitions

*Revised 2026-09-27 (the user): an open order may take any other open status,
on or back, or go straight to Delivered/Completed or Cancelled. Until then
Pending led only to Preparing, and nothing went back
(`0025_edit_orders.sql`).*

| From | Allowed next |
|---|---|
| Pending | Preparing, Ready, Out for delivery *(delivery only)*, Delivered/Completed, Cancelled |
| Preparing | Ready, Out for delivery *(delivery only)*, Delivered/Completed, **back to** Pending, Cancelled |
| Ready | Out for delivery *(delivery only)*, Delivered/Completed, **back to** Preparing or Pending, Cancelled |
| Out for delivery | Delivered, **back to** Ready, Preparing or Pending, Cancelled |
| Delivered / Completed | — (final) |
| Cancelled | — (final) |

The server refuses anything else (BUG-05). **Out for delivery** exists only for
a delivery order. The order screen keeps **one next-step button** for the usual
next step; **Change status** beside it offers the rest. A move between open
statuses moves no stock: the reservation stands until the order is delivered or
cancelled. **Delivered/Completed and Cancelled ask first**, wherever they are
chosen, since neither can be undone.

**Labels** (`ORDER_STATUS_LABELS`): Pending · **Preparing** (`IN_PROGRESS`) ·
**Ready** (`READY`, new) · Out for delivery (`IN_TRANSIT`) · **Delivered** for a
delivery or **Completed** for a pickup (`DELIVERED`) · Cancelled. No stored value
changes, apart from the new `READY`.

**Stock follows the transitions:**

- **Created:** reserved (−q).
- **Delivered or Completed:** the reservation is released (+q) and consumption posted (−q), so the balance does not move again (§133.3 C5).
- **Cancelled:** the reservation is released (+q) (BUG-04).

A status change is **one transaction** (§133.3 C6).

### 139.11.9 Payment when the order is placed

**Paid in full** or **Part paid** at creation **records a `payments` row** —
part paid asks for the amount — and `payment_status` is **derived** from the
payments, never chosen. The hand-set payment-status control on the order
detail is removed (BUG-02, BUG-06). This supersedes §68's "no payments table in
V1": the table exists and is the source of truth.

### 139.11.10 Illustrations for products and expense categories

The user supplied 26 illustration files on 2026-09-24, and 17 more on
2026-09-27: 59 illustrations in all. They are **app-owned
artwork**: they ship with the app and the user chooses among them. **Nothing is
uploaded**, so the rule in §16 and §56 that the logo is the only upload stands.

**Where everything lives**

| Path | What | Committed |
|---|---|---|
| `artwork/illustrations/<key>.jpg` | **The masters.** One illustration per file, on a white ground, as supplied (1920 px square, or the split's own size). Never served. | Yes (2026-09-24) |
| `design-references/illustration-originals/` | The 43 files exactly as supplied, under their original names | No (gitignored) |
| `src/assets/illustrations/<key>.webp` | What the app ships, generated from the masters | Yes, when R1.15 builds it |
| `src/constants/illustrations.ts` | The registry: `ILLUSTRATIONS` (key → asset, label, group), `ILLUSTRATION_KEYS`, `DEFAULT_PRODUCT_ILLUSTRATION = "default-product"` and `DEFAULT_EXPENSE_ILLUSTRATION = "default-expense"` | Yes, when R1.15 builds it |

**How the 26 files became 28 illustrations**

- `IMG_2470.JPG` is the Vecteezy gold-coins file saved again (perceptual-hash distance 1 of 256). It was **dropped as a duplicate**, and `gold-coins` keeps the Vecteezy original.
- `IMG_2474.JPG` was **four illustrations on one sheet**. It was split on its blank gutters into `heart-gift-box`, `teddy-bear`, `rose-bunch` and `gift-box-pink`, each centred on a white square with the same margin as the rest.
- Every other file was copied **byte for byte** under its key. The user's own names were kept for the two defaults.

**How the 17 files of 2026-09-27 became 31 more**

- `IMG_2519.JPG` was **nine illustrations on a sheet**, three by three: `heart`, `gift-box-red`, `lace-heart`, `cupid`, `chocolate-heart`, `ribbon-bow`, `two-hearts`, `gift-stack` and `heart-pink`.
- `IMG_2520.JPG` was **seven on a sheet**, loosely laid out: `gift-box-white-bow`, `love-letter`, `heart-padlock`, `crowned-heart`, `xoxo-heart`, `love-locks` and `bow-and-arrow`.
- Each sheet was split by its drawings, not by a grid: every drawing is the ink connected to itself, a stray speck joins the drawing nearest it, and whatever else falls in its box is cleared to white. Each is centred on a white square with a 15% margin, as the 2026-09-24 splits were.
- The other 15 were copied **byte for byte** under their keys.
- **None is a duplicate.** The closest pair in the library is `chocolate-heart` and `heart`, at 26 of 256, well clear of 10.

**Naming rules**

- **The file name is the key.** It is lowercase kebab-case and names the thing shown. A colour or a size appears only to tell two apart (`gift-box`, `gift-box-pink`).
- **A key is stored in the database, so it is permanent.** It is never renamed and never reused. Retiring one takes a migration that moves its users to another key.
- **No duplicates.** A new file is compared with the library by content hash and by perceptual hash (dHash, 256 bits). A distance of 10 or less is a duplicate. The build script refuses both kinds (R1.15).

**The catalogue**

| Key | Shows | Group | Supplied as |
|---|---|---|---|
| `default-product` | A price tag | Basics | `default-product.JPG` |
| `default-expense` | A receipt | Basics | `default-expense.JPG` |
| `gold-coins` | Stacked gold coins | Basics | `vecteezy_stacked-gold-coins…_77459804.jpg` |
| `savings-jar` | A jar of notes and coins labelled "Saving" | Basics | `IMG_2508.JPG` |
| `shopping-bags` | A shopper with bags | Basics | `IMG_2488.JPG` |
| `delivery-scooter` | A delivery rider on a scooter | Basics | `IMG_2484.JPG` |
| `delivery-ninja` | A courier with a parcel | Basics | `IMG_2483.JPG` |
| `donut` | A sprinkled donut | Bakes and sweets | `IMG_2469.JPG` |
| `cupcake` | A cupcake with a cherry | Bakes and sweets | `IMG_2472.JPG` |
| `choco-chip-muffin` | A chocolate-chip muffin | Bakes and sweets | `IMG_2471.JPG` |
| `chocolate-cake-slice` | A slice of chocolate cake | Bakes and sweets | `IMG_2473.JPG` |
| `strawberry-cake-slice` | A slice of pink cake | Bakes and sweets | `IMG_2492.JPG` |
| `strawberry-cake` | A whole strawberry cake | Bakes and sweets | `vecteezy_whimsical-hand-drawn-layered-cake…_78313078.jpg` |
| `glazed-cake` | A glazed cake on a plate | Bakes and sweets | `IMG_2480.JPG` |
| `pudding` | A pudding with chocolate sauce | Bakes and sweets | `IMG_2479.JPG` |
| `cake-squares` | Layered cake squares on a board | Bakes and sweets | `IMG_2478.JPG` |
| `cookie-cup` | A cookie in a cup | Bakes and sweets | `IMG_2481.JPG` |
| `chocolate-bar` | A chocolate bar | Bakes and sweets | `IMG_2477.JPG` |
| `choco-sponge-bar` | A chocolate-topped sponge bar | Bakes and sweets | `IMG_2476.JPG` |
| `gift-box` | A gift box with a rose bow | Gifts and flowers | `IMG_2475.JPG` |
| `gift-box-pink` | A pink gift box | Gifts and flowers | `IMG_2474.JPG`, bottom right |
| `heart-gift-box` | A heart-shaped gift box | Gifts and flowers | `IMG_2474.JPG`, top left |
| `teddy-bear` | A teddy bear with a heart | Gifts and flowers | `IMG_2474.JPG`, top right |
| `rose-bouquet` | A wrapped rose bouquet | Gifts and flowers | `vecteezy_hand-drawn-style-rose-bouquet…_77459823.jpg` |
| `rose-bunch` | A small bunch of roses | Gifts and flowers | `IMG_2474.JPG`, bottom left |
| `heart-balloons` | Two children with heart balloons | Gifts and flowers | `IMG_2482.JPG` |
| `chick-gift` | A chick holding a gift | Gifts and flowers | `IMG_2485.JPG` |
| `gift-box-red` | A red gift box with a bow | Gifts and flowers | `IMG_2519.JPG`, top middle |
| `gift-box-white-bow` | A pink gift box with a white bow | Gifts and flowers | `IMG_2520.JPG`, top left |
| `gift-stack` | A stack of three gifts | Gifts and flowers | `IMG_2519.JPG`, bottom middle |
| `ribbon-bow` | A red ribbon bow | Gifts and flowers | `IMG_2519.JPG`, middle right |
| `puppy-flowers` | A puppy with a basket of flowers | Gifts and flowers | `IMG_2521.JPG` |
| `hamster-daisies` | A hamster holding daisies | Gifts and flowers | `IMG_2522.JPG` |
| `heart` | A red heart | Hearts and love | `IMG_2519.JPG`, top left |
| `heart-pink` | A pink heart | Hearts and love | `IMG_2519.JPG`, bottom right |
| `two-hearts` | A red heart and a pink one | Hearts and love | `IMG_2519.JPG`, bottom left |
| `lace-heart` | A heart edged in lace | Hearts and love | `IMG_2519.JPG`, top right |
| `crowned-heart` | A pink heart wearing a crown | Hearts and love | `IMG_2520.JPG`, centre |
| `chocolate-heart` | A chocolate heart reading "Be mine" | Hearts and love | `IMG_2519.JPG`, centre |
| `xoxo-heart` | A heart and a box reading "xoxo" | Hearts and love | `IMG_2520.JPG`, middle right |
| `love-letter` | An envelope sealed with a heart | Hearts and love | `IMG_2520.JPG`, top right |
| `heart-padlock` | A heart-shaped padlock | Hearts and love | `IMG_2520.JPG`, middle left |
| `love-locks` | A pair of heart padlocks | Hearts and love | `IMG_2520.JPG`, bottom left |
| `cupid` | Cupid with a bow | Hearts and love | `IMG_2519.JPG`, middle left |
| `bow-and-arrow` | A bow and a heart-tipped arrow | Hearts and love | `IMG_2520.JPG`, bottom right |
| `fried-chicken` | A plate of fried chicken | Food | `IMG_2486.JPG` |
| `taco` | A taco | Food | `IMG_2487.JPG` |
| `popcorn` | A tub of popcorn | Food | `IMG_2518.JPG` |
| `light-bulb` | A smiling light bulb | Home and everyday | `IMG_2506.JPG` |
| `mop-bucket` | A mop and a bucket | Home and everyday | `IMG_2514.JPG` |
| `astronaut-builder` | An astronaut in a hard hat, with a hammer | Home and everyday | `IMG_2509.JPG` |
| `doctor` | A doctor with a stethoscope | Home and everyday | `IMG_2510.JPG` |
| `doctor-germs` | A masked doctor among germs | Home and everyday | `IMG_2511.JPG` |
| `grandma-cooking` | A grandmother cooking at a stove | Home and everyday | `IMG_2515.JPG` |
| `giraffe-car` | A giraffe driving a small car | Home and everyday | `IMG_2507.JPG` |
| `capybara-duck` | A capybara riding a rubber duck | Characters | `IMG_2512.JPG` |
| `capybara-headphones` | A capybara in headphones | Characters | `IMG_2517.JPG` |
| `shark-float` | A shark in a flamingo float | Characters | `IMG_2513.JPG` |
| `dragon-gamer` | A dragon with a game controller | Characters | `IMG_2516.JPG` |

The picker shows the groups in that order, with the defaults first. The three
groups of 2026-09-27 (the user asked for the files to be added and left their
arrangement open) follow what each picture is for:

- **Hearts and love** is its own group, beside Gifts and flowers, for occasions: Valentine's Day, anniversaries, Mother's Day. The sheets' gift boxes and the bow go with the other gifts.
- **Home and everyday** holds what an expense category of the business's own is likely to need: electricity, cleaning, repairs, a doctor, the kitchen, travel.
- **Characters** holds the animals that are there for fun, for a themed cake or a children's hamper. The puppy and the hamster hold flowers, so they go with the gifts, as the chick with its gift already did.

**What the app ships (R1.15).** `scripts/illustrations.mjs` runs `sharp`, pinned
as a devDependency, and is deterministic:

1. **The white ground becomes transparent.** Only white connected to the border changes, using colour-to-alpha against white, so the soft ground shadows become translucent instead of grey patches on a cream theme. White inside an outline stays opaque: the cupcake's cream, the cup, the receipt.
   - **A hole is ground too** (2026-09-27): the donut's hole, inside the cookie cup's handle, the price tag's loop, the balloons' strings against the children's arms, under the capybara's headband, inside a padlock's shackle, between a bow and its string. The border cannot reach them, so `HOLES` in the script names a point inside each, and the ground is cleared from there as from the border. A point that is not ground fails the build.
2. **Trim to the content**, and centre it on a square with 8% padding.
3. **480 × 480 WebP with alpha**, quality 82, **≤ 40 KB each**.
   - **A drawing too busy for 40 KB at quality 82** takes the first step down that fits (78, 74, 70), and the build says which. Only `cupid` needs it, at 78.
   - **The library's total is not capped** (2026-09-27; it was ≤ 1 MB for 28). No screen downloads a library file: `next/image` sends each place a copy drawn to its size, and a 64 px picker choice is a few KB. The per-file limit is the one that counts. At 59 illustrations the library is about 1.5 MB.
4. **It refuses** a duplicate (above) and a file name that is not a valid key.

The WebPs are imported statically by the registry. A missing file therefore
fails the build, the URLs are hashed and cached for good, and `next/image`
serves the size each place draws.

**Where they appear**

- **Products:** the product tile in rows, cards, the create-order grid, the cart lines, and top products on Home and in Analytics. This replaces the §137.3 monogram tile.
- **Expenses:** each expense row shows its **category's** illustration, and so do the Categories tab and the expense form's category field.
- **Custom order lines** show `default-product`.
- **Not on the bill.** A bill is a document (§139.11.6).

**Choosing one**

- **A product:** the product form's **Icon** field opens the picker. The choice is stored as `products.icon_key`, and NULL means `default-product`.
- **An expense category:** the eight defaults always show `default-expense` and cannot be changed (the user, 2026-09-26). A category the business made takes any illustration, chosen when it is made — from the Categories tab or the expense form's **+** — and changed from the Categories tab. The choice is stored **per business** in `bakeries.expense_category_icons`, a JSON object mapping a category to a key; a category it does not mention uses `default-expense`. The category, not each expense, carries the illustration, because the brief ties icons to categories. The category functions of `0020_expense_categories` write it on the server with the owner check, because `bakeries` stays SELECT-only for the API role.
- **Validation:** the server accepts only registry keys (`z.enum(ILLUSTRATION_KEYS)`). The database checks only the key's shape, so adding an illustration needs no migration. A stored key the registry no longer knows renders the default.

**Accessibility and theme.** The illustration sits on a rounded tile in the
theme's sunken tone, so it reads on Golden and on Peach alike. Beside a name it
is decorative. In the picker, each option is named by its label ("Rose
bouquet").

### 139.11.11 Charts on Expenses and Analytics

The graphs follow `v2-analytics-expenses-mobile-golden.png` and
`v2-tablet-desktop-layouts.png`. They are **authored SVG** in
`src/components/ui/charts/`, with **no chart library**. Four small chart types
do not justify a dependency that brings its own styling and its own
accessibility gaps (§2.2).

| Chart | Where | What it draws |
|---|---|---|
| `line-trend` | Analytics' sales trend; the Sales tab | A smooth monotone line with a soft fill beneath it, and horizontal gridlines only. Compact rupee ticks on the y axis (₹2K … ₹8K; lakh from ₹1,00,000). Five or six date ticks on the x axis. A tooltip bubble with the value and date on hover, tap or keyboard focus, with the chosen point marked. An optional **previous-period** series, dashed and muted, with a two-item legend. |
| `bar-trend` | Expense trend; orders per day; the desktop Home sales overview | Round-topped bars. The peak or the chosen bar is in the strong tone and the rest in a lighter tone of it, with the same tooltip. Daily up to 31 days, and weekly beyond that or by the toggle. |
| `donut` | Expenses by category; sales by product; orders by status | A ring with the **total in its centre** in the serif, and a legend with a dot, the name and the share. The legend sits beside the ring once its longest name fits there in full, and beneath it until then (2026-09-26): short names sit beside it from a 360 px phone, a product's from a tablet. A name is never cut to a few letters. The top five plus **Others**, with a 2 px surface-coloured gap between segments. |
| `sparkline` | Desktop stat tiles | A 2 px line with no axes and a dot on the last point. `aria-hidden`, because the tile states its delta in words. |

- **Colour:** `--chart-1` to `--chart-6` per theme, taken from the references' browns and oranges. They are validated as §139.4's tokens were, and the line and the strong bar tone must be **≥ 3:1** against the card (WCAG 1.4.11). Donut segments need not be, because the legend carries every value as text.
- **Data:** the server aggregates, in the business's timezone (BUG-07), with the previous period for each delta. The client never sums raw rows. Endpoints: `GET /api/expenses/summary` and `GET /api/analytics/overview` (§139.13).
- **Ranges:** Last 7 days, Last 30 days, This month, Last month and Custom. The choice is remembered per screen.
- **Numbers:** `formatPaise` for every value, and a compact form (`formatPaiseCompact`, in `src/lib/format/currency.ts`) for the axes.
- **Accessibility:** each chart is a `figure` with a heading and `role="img"`, with a one-sentence summary as its label ("Sales rose 12% to ₹45,280 over the last 30 days"). A visually hidden **table** carries the same numbers. Arrow keys move the tooltip from point to point. Under `prefers-reduced-motion` there is no draw-in.
- **Touch and size:** each point or bar has a hit column at least 44 px wide, and the tooltip stays inside the chart. The SVG takes its size from its container with a `ResizeObserver`, so its text is drawn at real pixel sizes rather than scaled by a `viewBox`. Narrow widths draw fewer ticks.
- **States:** a skeleton in the chart's own shape while loading; an empty state that names the period ("No expenses in the last 7 days") with the next action; and an error with **Try again**.

### 139.11.12 Photographic plates (Q6)

- **The sources** are the supplied photographs in `design-references/`: `v2-plate-cake-clean.png` as it is, and `v2-hero-cake-with-type.png` and `v2-hero-brownie-with-type.png` **cropped to their right-hand half**, clear of the type printed on their left. (`hero-photography.png` is the same file as the clean plate.)
- **What is committed** is only the derived plates, at `src/assets/plates/<name>.webp`: WebP, **≤ 200 KB** each, and wide enough for a 1536 px render. The source PNGs stay uncommitted.
- **Where they are used:** behind the auth scene (§138); the Home hero on phones; the compact bands on Analytics and Expenses; the desktop panels; and the small picture in the quote blocks.
- **Text is never set on a photograph without a scrim** that keeps it at ≥ 4.5:1. The LCP plate alone is `priority`.
- **App-owned only.** Products and customers never get photographs (§16).

### 139.11.13 Changing an order (the user, 2026-09-27)

- **Which:** an open order — Pending, Preparing, Ready or Out for delivery. A
  delivered or cancelled one is refused (`ORDER_NOT_EDITABLE`): stock has
  followed it.
- **Where:** **Edit** on the order screen opens `/orders/{id}/edit`, the create
  screen's own parts: the product grid and custom items, then the details —
  the items with their steppers and notes, the customer (saved, new on the
  spot, or Guest), the handover with the address filled from the customer
  (§139.11.4), the discounts and charges, the internal notes — then **Save
  changes**. There is no payment step: payments are collected on the order,
  and the summary shows what has been paid so far and the balance left.
- **Prices:** a line already on the order keeps the name and price it was
  ordered at, whatever the menu says now; a line added takes today's price
  (§139.11.5's pricing, `priceOrder`).
- **What the server does** (`PUT /api/orders/{id}`, `update_order`), in one
  transaction:
  - the reservation follows each product's change in quantity: more reserves
    more, less releases it, and more is checked against stock as a new order
    is (§133.3 C4);
  - the totals must add up, and **may not come to less than has been paid**
    (`ORDER_TOTAL_BELOW_PAID`); the payment status is derived again;
  - a line the order no longer has, or one at another price, means it changed
    elsewhere (`ORDER_CHANGED`);
  - an order out for delivery cannot become a pickup (`ORDER_IN_TRANSIT_PICKUP`);
  - a due date moved to another day is told about afresh (0023's notices);
  - the change is audited, before and after (§11).
- **The lines keep their order** (`order_items.position`): kept lines stay
  where they were, and new ones follow.

### 139.11.14 Profile pictures (the user, 2026-09-27)

- **What:** the owner's own picture is one of **nine animals** — Pomeranian,
  Hamster, Blue bear, Husky, Polar bear, Cream kitten, Ginger cat, Beagle,
  Tiger — cut from the sheet the user supplied by `scripts/avatars.mjs`
  (`src/assets/avatars/`). The sheet stays in `design-references/`; the nine
  pictures are committed. They are app-owned art, **not an upload** (§16): only
  the key is stored, in `profiles.avatar`.
- **Who has one:** every account. A new one is **given one at random** as its
  profile is made, whatever path makes it (`random_avatar()`, the column's
  default), and every account that already existed was given one the same way.
  Only the nine keys are taken (`avatar_keys()`, and `AVATAR_KEYS` in the app).
- **Where it shows:** the owner's own account only — the phone's top bar, the
  account menu from 768 px, and the profile card on Settings. **Customers keep
  their initials**, and nothing else uses the pictures.
- **Changing it:** tapping the picture on Settings (it carries a small pencil)
  opens the nine, each named by its animal, the one in use marked — a bottom
  sheet on a phone, a dialog from 768 px. Tapping another saves it at once
  (`PATCH /api/auth/avatar`, audited) and says so on a response card; tapping
  the one in use closes it. It changes as often as the owner likes: the 30-day
  rule is for the name, the sign-in number and the email only.
- **Licence:** the sheet falls under Q16 with the illustrations: its licence
  is confirmed before the Play release.

### 139.11.15 No worker for now (the user, 2026-09-27)

This suspends, for now, §17's "use the queue for email delivery" and §25's
event → job → worker → notification. The queue, the worker and every handler
stay as they are, behind one switch: `WORKER_ENABLED` in the app and
`worker_enabled()` in the database (`0027_no_worker`), both false.

- **Email** is sent by the request that asks for it:
  - **the confirmation at registration** — the account is made whether or not
    the mail goes, and a failure is logged; Settings offers Resend;
  - **Resend** on Settings — a failure is said on its card;
  - **a new email's link** — the address waits whether or not the link goes,
    and Settings offers Send the link again.

  The temporary password was already sent directly (§94).
- **Notifications** are only for **orders due today or tomorrow, and orders
  overdue**, each told once, from the business's morning (0023's rules). The
  app looks for them as the owner's bell or inbox is read
  (`take_due_order_notices`): every signed-in screen reads the bell, and the
  bell asks again every minute. A business is looked at once a minute at most,
  so a notice arrives within a minute of the app being open. Orders left open
  long past their day when this arrived were taken as known.
- **Paused**: an order placed, an order moved, a payment, a customer added,
  stock running low. The database holds them back at the queue, so nothing
  piles up there, and the app queues none. The inbox's tabs stay as they are.
- **The worker refuses to start** while the switch is off: its sweep would mark
  orders as told while their notices were held back.
- **Running a worker again**: set both switches true (a migration for the
  database's) and run `npm run worker` beside the app. Every notification then
  comes back, and email goes through the queue with its retries.

### 139.11.16 The developer console (the user, 2026-09-27)

§37's developer pages, read-only for now.

- **Who:** DEV only. The routes are `/api/admin/overview`, `/api/admin/users`
  and `/api/admin/audit`, each behind `withDevRoute`, which refuses every other
  role and anyone owing a password change. They are fixed, read-only queries
  made as the server, since the console reads across every business. A
  developer's business screens send them to `/admin`; an owner's `/admin`
  sends them home.
- **Pages:** `/admin` (who is signed in; users, owners, developers,
  businesses, audit entries), `/admin/users` (every account: role, mobile,
  email, business, joined, and whether it is deactivated, unconfirmed or owes
  a password change) and `/admin/audit` (every business's trail, newest first,
  with before and after).
- **Only what is kept:** no new logging. Server errors are written to the
  server's output only, so §37's `/admin/logs` and §103's `error_logs` are not
  built. `/admin/workers` waits for a worker.
- **Look:** white and blue, sans throughout (`data-theme="dev"`), on the
  page only while the console is open.
- **Accounts:** a developer owns no business (`profiles.bakery_id` may be null
  for DEV only, 0028). One is added from the Supabase dashboard: the user with
  its mobile number, then a `profiles` row with the role DEV.

---

## 139.12 Data model and migrations

Numbers are indicative; each is the next free sequential number when it is
built (AGENTS §23). Tests in `tests/db` cover each one.

| Migration | Contents | Phase |
|---|---|---|
| `…_tenant_integrity` | `unique (bakery_id, id)` on customers, products, categories, orders; **composite foreign keys** — `orders(bakery_id, customer_id)`, `payments(bakery_id, order_id)`, `inventory_transactions(bakery_id, product_id)`, `products(bakery_id, category_id)` — so no row can point into another business (BUG-19). The **payments, audit_logs and notifications** policies use `current_profile_bakery_id()` and `to authenticated` (BUG-18). `payments.amount > 0`, and a check on `payments.payment_method` (BUG-21). | 0 |
| `…_roles_user` | Rename `BAKER` → `USER`; default `USER`. | 2 |
| `…_business_profile` | `bakeries.tagline` (≤ 80), `bakeries.city`, trimmed-length checks; `bakeries.next_order_number` (int, default 1001). *Landed 2026-09-25 as `0008_business_profile`, with the logo reference, the owner-only edit functions and the logo bucket (R2.6, R2.7); `next_order_number` moves to R3.2's migration, which uses it.* | 2 |
| `…_guest_orders` | `orders.customer_id` drops NOT NULL; a partial index on `(bakery_id, created_at) where customer_id is null`. | 3 |
| `…_order_rpc` | **`create_order(payload jsonb, idempotency_key uuid)`** and **`change_order_status(order_id, status)`** as `security invoker` functions, so RLS still applies and each is **one transaction** (C1, C6); the order number is taken from `next_order_number` inside it (BUG-08); stock is checked before it is reserved (C4). `orders.idempotency_key uuid` with `unique (bakery_id, idempotency_key)` — no new table (C2); the same on `payments`. | 3 |
| `…_status_ready` | Add `READY` to the status CHECK (Q3, answered). | 3 |
| `…_illustrations` | `products.image` is renamed **`icon_key`** (text; NULL means the default). Any existing value that is not a key's shape is cleared, and a CHECK allows only `^[a-z0-9]+(-[a-z0-9]+)*$` up to 64 characters. `bakeries.expense_category_icons` is `jsonb not null default '{}'`, with a CHECK that it is an object. The server checks keys against the registry, so a new illustration needs no migration. | 1 |
| `…_text_hygiene` | Trimmed-length checks on customer, product and category names; categories unique per business on `lower(name)`. | 1 |
| `…_list_views` | *Added 2026-09-26 as `0017_list_views` (R5.2, R5.3).* Two read-only, `security_invoker` views, so RLS still decides: **`order_search`** — each order beside its customer's name and phone, so one PostgREST `or` finds an order by its number, its customer or their phone digits (BUG-23), which it cannot do across an embed; and **`customer_stats`** — each customer with their order count and last order, cancelled ones not counted, so Customers can page and keep to Regular on the server. Select for `authenticated` only. No table. | 5 |
| `…_drop_categories` | *Added 2026-09-26 as `0018_drop_categories` (R5.6).* Drops `products.category_id` with its composite reference and index, then the unused `categories` table with its policy, trigger and checks. Expense categories (`expenses.category`) are untouched. | 5 |
| `…_stock_levels` | *Added 2026-09-26 as `0019_stock_levels` (R5.7).* A read-only, `security_invoker` view adding each product's ledger up in the database — balance, `stocked` (the oversell guard's own test, 0015) and last movement — because a read of the lines stops at the API's 1,000-row limit and the sums were quietly short past it. Inventory and Home's low stock read it. No table. | 5 |
| `…_expense_categories` | *Added 2026-09-26 as `0020_expense_categories` (R5.8, R5.16; the user's decision of that day).* **`expense_categories`** — a business's own categories: RLS to the business, SELECT only for the API role, names unique per business on `lower(btrim(name))`, 1–40 characters, never one of the eight. **`expenses.category`**: the CHECK of the eight becomes a trigger that takes a default or one of the expense's own business's categories, locking it for share against a rename or delete. Owner-only `security definer` functions: **`create_expense_category`**; **`update_expense_category`**, whose rename moves the category's expenses and picture in one transaction; and **`delete_expense_category`**, refused while an expense is filed under the category. The eight are never changed or deleted. | 5 |
| `…_customer_balance` | *Added 2026-09-27 as `0024_customer_balance` (the user).* `customer_stats` also adds up each customer's **balance due** — every order not cancelled, its total less what was paid, never below nothing — so the Balance due tab pages on the server. Still a read-only, `security_invoker` view. | 5 |
| `…_notification_kind` | *Added 2026-09-26 as `0022_notification_kind` (R5.10).* `notifications.kind` (`ORDER`, `PAYMENT`, `STOCK`, `CUSTOMER`, `SYSTEM`); indexes `(bakery_id, created_at desc, id)` and `(bakery_id, is_read, created_at desc)`. Written by the worker only: `authenticated` loses INSERT and UPDATE, and may update `is_read` alone. Triggers queue the plan's events in their own transactions: an order placed, a customer added, and a counted product on sale falling to the low-stock mark (`low_stock_mark()`, equal to `LOW_STOCK_THRESHOLD`) — once as it crosses, never for a consumption line. | 5 |
| `…_order_due_notifications` | *Added 2026-09-26 as `0023_order_due_notifications` (R5.10; the user).* `orders.due_notified_at` and `orders.overdue_notified_at`; a partial index on open orders by `delivery_date`; **`queue_due_order_notifications(p_from_hour)`**, the worker's alone, which marks and queues in one statement each open order due today or tomorrow, and each overdue, in its business's timezone, from the hour given. Open orders more than a day overdue when it arrives are marked as told. | 5 |
| `…_profile_avatars` | *Added 2026-09-27 as `0026_profile_avatars` (the user).* `profiles.avatar`, not null, one of **`avatar_keys()`**'s nine; its default **`random_avatar()`** draws one for each new profile, and drew one for each existing profile as the column was added. Both functions are the server's only. | 5 |
| `…_no_worker` | *Added 2026-09-27 as `0027_no_worker` (the user).* **`worker_enabled()`** (false for now); a `before insert` trigger on `jobs` that holds back `SEND_PUSH_NOTIFICATION` while it is false; open orders long past their day taken as told; **`take_due_order_notices(bakery, from_hour)`**, the service role's, which marks one business's orders due soon and overdue and hands back the facts. | 5 |
| `…_developer_accounts` | *Added 2026-09-27 as `0028_developer_accounts` (the user).* `profiles.bakery_id` may be null, for a developer only (`profiles_owner_has_business`). Nothing else. | 5 |
| `…_audit_writes` | Revoke `INSERT` on `audit_logs` from `authenticated`; audit is written by the server with the acting user (§133.7 G1, BUG-20). | 2 |
| `…_device_tokens` | The push-token registry (§133.5 E2). | 8 |
| `…_profile_theme` *(if Q14)* | `profiles.theme`. | 1 |

---

## 139.13 API changes

| Endpoint | Change |
|---|---|
| `POST /api/auth/register` | Adds tagline, city and address; the confirmation is queued. |
| `PATCH /api/auth/name` | The owner's name, once in 30 days (the user, 2026-09-26). |
| `PATCH /api/auth/phone` | The sign-in number, with the current password, once in 30 days. |
| `POST /api/auth/email` | A new email address, with the current password, once in 30 days. It waits in `pending_email`, and the current one stays in use, until its link is followed. |
| `POST /api/auth/email/resend` | Sends the waiting address its link again. |
| `POST /api/auth/email/confirm` | The link was followed: the token proves the address, so no session is needed. |
| `GET, PATCH /api/business` | New — the business profile (§133.2 B1). |
| `POST /api/business/logo` | New — the logo upload, under §56 rules (§133.2 B2). |
| `GET /api/dashboard` | New (R5.1, 2026-09-26) — `?period=TODAY\|WEEK\|MONTH&status=&payment=`. Home worked out on the server: the four tiles, the orders due (overdue, today, tomorrow), low stock, and the period's sales by day, orders by status, top products and recent customers. |
| `GET /api/orders` | `?customer=guest\|{id}&status=&payment=&from=&to=&search=&cursor=` — filters and pagination (§133.9 I4). `from`/`to` are due days; `search` matches the number, the customer's name or their phone digits. Answers a page of list rows (`OrderListItem`): All newest first, an open status soonest due first, delivered and cancelled most recently due first. Done 2026-09-26 (R5.2). |
| `GET /api/orders/counts` | New (R5.2, 2026-09-26) — the same filters; how many orders each tab holds, counted in the database. |
| `POST /api/orders` | Calls `create_order`; takes an `Idempotency-Key` header, the customer union, and custom items. |
| `POST /api/orders/preview` | New — the estimate. Validates, prices and checks stock; **writes nothing**. |
| `PATCH /api/orders/{id}/status` | The transition table; `paymentStatus` is **no longer accepted**. |
| `GET /api/orders/{id}/bill` | Replaces `/receipt`: the bill view-model, including the business profile. |
| `GET /api/orders/{id}/bill.pdf` | New — generated on demand, never stored. |
| `POST /api/orders/{id}/payments` | Fixed amount handling (BUG-01); `Idempotency-Key`. |
| `GET /api/customers` | `?search=` matches phone numbers on digits; pagination. Done 2026-09-26 (R5.3): `?segment=REGULAR\|NEW&search=&cursor=`, a page by name from `customer_stats`, each with their orders, last order and segment. *2026-09-27:* `segment=DUE` keeps to those who owe, the most owed first, and every customer carries `balanceDue`. |
| `GET /api/customers/{id}/summary` | New — stats, and the delivery addresses taken from orders. Done 2026-09-26 (R5.4): orders and spend (cancelled not counted), balance due, last order, segment, and the distinct delivery places, most recent first. |
| `GET /api/guest-sales` | New — `?range&from&to&cursor`, a period as Analytics takes it. Done 2026-09-26 (R5.5): the count and total of the period's Guest orders, cancelled left out, and a page of them. |
| `GET /api/analytics/overview` | `?range&from&to&interval=DAY\|WEEK` — a preset, or `CUSTOM` with both dates (1–366 days). Returns the KPIs with their previous-period values, the sales series and the previous period's, the orders series, every product's sales (with their `iconKey`; custom items as one row), orders by status, pickup against delivery, the Guest split, collected against to collect, new against returning, and the top customers (§133.9 I1, I3, §139.11.11). Done 2026-09-26. |
| `GET /api/expenses` | `?range&from&to&category=&cursor=` — the Transactions tab: a page of the period's expenses, newest day first, one category or all. Done 2026-09-26 (R5.8). |
| `GET /api/expenses/summary` | New — `?from&to&interval=day\|week`. Returns the total and daily average, each with the previous period's; totals by category; the series; and the five most recent (§139.11.11). Done 2026-09-26 (R5.8): `?range&from&to&interval`, every category of the business — its own too — always there. |
| `GET, POST /api/expense-categories`, `PATCH, DELETE /api/expense-categories/{category}` | New (§139.11.10; the user, 2026-09-26). GET lists the eight, then the business's own, each with its illustration. POST `{ name, iconKey }` adds one of its own; PATCH `{ name, iconKey }` renames it or changes its picture; DELETE removes one no expense is filed under. The eight are never changed (`EXPENSE_CATEGORY_DEFAULT_FIXED`), a name is taken once (`EXPENSE_CATEGORY_ALREADY_EXISTS`), and a category in use stays (`EXPENSE_CATEGORY_IN_USE`). Done 2026-09-26 (R5.16). |
| `POST /api/products`, `PATCH /api/products/{id}` | Accept `iconKey`: a registry key, or null for the default. |
| ~~`GET, POST, PATCH /api/categories`~~ | **Dropped 2026-09-25:** products need no categories. |
| `GET /api/notifications`, `POST /api/notifications/read-all` | New (§133.5 E1). GET `?tab=ALL\|ORDERS\|CUSTOMERS\|SYSTEM&cursor=` pages the inbox, newest first; read-all answers how many it marked. Done 2026-09-26 (R5.10). |
| `GET /api/notifications/unread`, `POST /api/notifications/{id}/read` | New (R5.10): the bell's count, and one notification marked read as it is opened — one of another business's is not found. |

**OpenAPI** is updated with every change (§133.11 K1).

---

## 139.14 Bugs found in this pass

Verified against the code on 2026-09-24. **Phase 0 fixed twelve of them the same day,
Phase 1 four more, Phase 2 three more, and Phase 3 eight more** (marked in the Row
column; changelog, "Phase 0" to "Phase 3"). Severity:
**S1** corrupts money, stock or data · **S2** a feature does not work · **S3**
wrong but survivable · **S4** polish.

| # | Sev | Finding | Where | Fix | Row |
|---|---|---|---|---|---|
| **BUG-01** | **S1** | **Every payment is recorded at 100 times its amount.** The form parses rupees to paise and the schema carries paise, then `processPayment` runs `rupeesToPaise` on it **again**: a ₹500 payment arrives as 50,000 paise and is stored as 5,000,000 — ₹50,000. In practice, **any payment above 1 % of the order total is refused** with "payment exceeds order total", so Collect payment does not work. No test covers `processPayment`. | `src/features/payments/api.ts:43` | The amount is already paise — drop the conversion; add tests | R0.1 · **fixed 2026-09-24** |
| **BUG-02** | **S1** | **An order placed as Paid or Part paid records no payment, and Part paid never asks how much.** The payments table, the balance due and the dashboard disagree from the first minute. | `src/app/orders/new/page.tsx:51`, `checkout.ts:59–61` | §139.11.9 | R3.12 · **fixed 2026-09-26** |
| **BUG-03** | **S1** | **"Pending payments" counts the full total of part-paid orders**, ignoring what has been paid. | `src/features/dashboard/summary.ts:37` | Total minus payments | R0.2 · **fixed 2026-09-24** |
| **BUG-04** | **S1** | **Cancelling an order never releases its stock.** The reservation stays, so every cancelled order lowers stock permanently. §133.3 C5 covers the double count on delivery; this is the other half. | `src/features/orders/status.ts` (no cancel branch) | §139.11.8 | R0.7 · **fixed 2026-09-24** |
| **BUG-05** | **S2** | **Any status can follow any other.** A free select fires on change, with no confirmation, and the server has no transition rules. Delivered → Pending → Delivered consumes stock twice; Cancelled → Delivered is allowed. | `src/app/orders/[id]/page.tsx:145`, `status.ts:20` | §139.11.8 | R0.6 · **fixed 2026-09-24** |
| **BUG-06** | **S2** | **Payment status can be set by hand** to Paid with nothing recorded. | `src/app/orders/[id]/page.tsx:156` | Derive it; remove the control | R3.12 · **fixed 2026-09-26** |
| **BUG-07** | **S3** | **Dates are taken in UTC.** Between midnight and 05:30 IST, a bill and the customer's order list show **yesterday's date**, and a new expense **defaults to yesterday**. | `ReceiptPrintView.tsx:72`, `CustomerProfileClient.tsx:235` (`createdAt.slice(0, 10)`); `ExpenseFormSheet.tsx:28` | `dayKey()` / `todayKey()` | R0.5 · **fixed 2026-09-24** |
| **BUG-08** | **S3** | **Order numbers read like `#13-482`:** a count plus one, and a random suffix. They are not sequential; a number is **reused** after a rollback deletes an order; and two can collide on the unique key and answer 500. | `src/features/orders/api.ts:136–147` | A per-business counter inside the transaction → `ORD-1001` | R3.2 · **fixed 2026-09-26** |
| **BUG-09** | **S2** | **A failed order leaves stock reserved.** The compensation deletes the order but not the ledger lines already posted. (One instance of §133.3 C1.) | `src/features/orders/checkout.ts:101–107` | The `create_order` transaction | R3.1 · **fixed 2026-09-26** |
| **BUG-10** | **S3** | **The running total shows "₹NaN"** once a charge contains a comma ("1,000"), and "1,000" or "₹500" is refused as an amount. | `src/app/orders/new/page.tsx:126`; `primitives.ts` `paiseText` | Tolerant money parsing (§139.7) | R0.8 · **fixed 2026-09-24** |
| **BUG-11** | **S3** | **Zod's own English reaches the screen:** "Too big: expected string to have <=100 characters"; an empty quantity gives "Invalid input: expected number, received NaN". | `customer.ts:9`, `product.ts:10`, `expense.ts:14`, `order.ts:16, 82` | Every message from `VALIDATION_MESSAGES` (§139.7) | R0.14 · **fixed 2026-09-24** |
| **BUG-12** | **S2** | **Unbounded numbers overflow the database.** Money and quantities have no maximum; the `integer` columns overflow, and the user gets a 500 instead of a message. | `primitives.ts` (`paiseText`, `wholeNumberText`), `order.ts:16, 82` | Bounds (§139.7) | R0.9 · **fixed 2026-09-24** |
| **BUG-13** | **S3** | **Map links accept any scheme.** `URL.canParse` accepts `javascript:` and `data:`. React 19.2 blocks `javascript:` in `href` when it renders, so the two links on screen today are safe — but the link now goes onto **shared bills and native share text**, where nothing blocks it. | `src/lib/validation/primitives.ts:94` | `http:`/`https:` only | R0.10 · **fixed 2026-09-24** |
| **BUG-14** | **S2** | **Safe areas are inert on iPhone** — no `viewportFit: "cover"`. Also: the five call sites of §138.6.3; the main content's fixed `pb-24` ignores the inset; sheets use `90vh`. | `src/app/layout.tsx:38–42`, `AppShell.tsx:120`, `form-sheet.tsx:89` | §139.8 | R1.6 · **fixed 2026-09-24** |
| **BUG-15** | **S3** | **The theme flashes on every load.** The server renders `data-theme="clean"`, and the stored theme is applied only after hydration; the client's first render also differs from the server's. The `theme-color` never changes. | `src/app/layout.tsx:41, 52`; `ThemeProvider.tsx:44–54` | An inline pre-paint script; `theme-color` per theme | R1.4 · **fixed 2026-09-24** |
| **BUG-16** | **S2** | **Registration fails whenever mail does.** The confirmation is sent inline, and a send failure rolls the whole account back. AGENTS §17 puts mail on the queue. | `src/features/auth/api.ts:314, 328` | Queue it; Resend confirmation | R2.5 · **fixed 2026-09-25** |
| **BUG-17** | **S3** | **The role is written into `user_metadata`**, which users can edit themselves. Nothing reads it today — a future read would be a privilege escalation. | `src/features/auth/api.ts:289–292` | Stop writing it | R2.3 · **fixed 2026-09-25** |
| **BUG-18** | **S2** | **The payments, audit-log and notifications policies skip the `is_active` check** the rest of the schema uses, and are not `to authenticated`. Once deactivation exists (§64), a deactivated user would keep reading those three tables. | `supabase/migrations/0003_payments_and_jobs.sql` | Use `current_profile_bakery_id()` | R0.11 · **fixed 2026-09-24** |
| **BUG-19** | **S3** | **Nothing stops a row pointing into another business.** Foreign keys are checked without RLS, so an order can reference another business's customer — `createOrder` never checks — and the same holds for a payment's order, a ledger line's product and a product's category. RLS hides them on read, but the rows are corrupt. | `checkout.ts:56`; FKs in `0002`, `0003` | Composite FKs; check at the route | R0.12 · **fixed 2026-09-24** |
| **BUG-20** | **S3** | **The audit trail can be forged:** `authenticated` may INSERT into `audit_logs`, so any signed-in user can write audit rows for their business directly. | `supabase/migrations/0004_api_role_grants.sql:34` | The server writes audit (G1) | R2.10 · **fixed 2026-09-25** |
| **BUG-21** | **S3** | **`payments` has no amount check and no method check**, unlike `orders` and `expenses`. | `0003` | Constraints | R0.13 · **fixed 2026-09-24** |
| **BUG-22** | **S3** | **A delivery order is accepted with neither an address nor a map link**, against §96. | `src/lib/validation/schemas/order.ts:43–48` | A refinement on the delivery type | R3.8 · **fixed 2026-09-26** |
| **BUG-23** | **S3** | **Customer search misses numbers as they are written.** Phones are stored as `+919876543210`, so typing "98765 43210" finds nothing. | `src/app/customers/page.tsx:23` | Match on digits | R5.3 — **fixed 2026-09-26**: Customers, the order screen's picker and Orders match a phone on its digits, on the server |
| **BUG-24** | **S3** | **The search box's placeholder and icon fail contrast** (`text-muted/60`) — §138.6 C3 fixed the text field but not this one. | `src/components/ui/search-input.tsx:28, 36` | Full-strength muted | R1.12 · **fixed 2026-09-24** |
| **BUG-25** | **S3** | **Dialogs do not keep focus.** Tab walks out of the form sheet and the More sheet into the page behind, which is not `inert`. The receipt view is **not a dialog at all** — no role, no Escape, no focus handling. | `form-sheet.tsx`, `MoreSheet.tsx`, `ReceiptPrintView.tsx` | §139.5 sheet/dialog | R1.9 · **fixed 2026-09-25** |
| **BUG-26** | **S4** | **Notifications print raw values:** "Order #13-482 is now IN_PROGRESS"; "Payment of 50000 received" — paise, in inline English. | `status.ts:66`, `payments/api.ts:81` | Labels, `formatPaise`, `messages.ts` | R3.4 · **fixed 2026-09-26** |
| **BUG-27** | **S4** | **The receipt prints raw enums** (`CASH`, `BANK_TRANSFER`) and "Tax ₹0.00" on every bill, and restores `body.style.overflow` to `'unset'` instead of its previous value. | `ReceiptPrintView.tsx:135, 27` | The new bill (§139.11.6) | R4.6 · **fixed 2026-09-26** |
| **BUG-28** | **S4** | **The new-order default date is fixed when the module loads,** so a tab left open overnight offers yesterday's "tomorrow". | `src/app/orders/new/page.tsx:47–51` | Compute it on mount | R3.16 · **fixed 2026-09-26** |
| **BUG-29** | **S4** | **`console.error` in the order compensation** bypasses the structured logger and loses the request id (§11). | `src/features/orders/checkout.ts:104` | The logger | R3.16 · **fixed 2026-09-26** |
| **BUG-30** | **S4** | **136 hard-coded UI strings** in JSX attributes alone (`label=`, `title=`, `placeholder=`) — AGENTS §5. | `src/app`, `src/components`, `src/features` | Swept screen by screen as each is rebuilt | R5.14 |
| **BUG-31** | **S2** | **Sums over a read that stops at 1,000 rows.** The API answers at most `max_rows` (1,000) rows a read without saying so; Home, Inventory, Analytics, Guest sales and a customer's summary added up what came back, so past that many ledger lines or orders their figures were quietly short. Found 2026-09-26. | `src/features/{dashboard,inventory,analytics,customers}` | Stock added up in the database (`0019_stock_levels`), order counts from `customer_stats`, and every other long read done a window at a time (`readAll`) | R5.7 · **fixed 2026-09-26** |

**Still open from earlier passes when this was written, and closed by Phase 0:**
§134 **P0-1** (the `/inventory` crash — R0.3) and **P0-2** (no `error.tsx`,
`global-error.tsx`, `not-found.tsx` or `loading.tsx` — R0.4). Every other open item in §133–§138 is mapped to a tracker row in
§139.19 rather than repeated here.

---

## 139.15 Improvements (not bugs)

| # | Improvement | Row |
|---|---|---|
| IMP-01 | ~~**Global search** — the Home search and ⌘K on desktop, across orders, customers and products.~~ **Dropped by the user, 2026-09-25:** there is no search on Home or in the top bar. Search stays in the lists that need it — Orders, Customers, Products, Inventory, the create-order grid and the customer picker — and moves to the server with each list's pagination. | R5.13 (was R5.12) |
| IMP-02 | **WhatsApp, with no integration:** tap to chat with a customer (a `wa.me` link to their number), and share a bill to WhatsApp through the share sheet. | R3.15, R4.4 |
| IMP-03 | **Order again** from a customer's past order — the draft is prefilled. | R5.4 (done 2026-09-26 — on the order, beside its items, opened from the customer's Orders tab) |
| IMP-04 | **Create order from a customer** with the customer already selected (in the reference). | R5.4 (done 2026-09-26) |
| IMP-05 | **"Today" stays today** until the day ends, instead of turning overdue at the due minute (§134 P2-2). | R5.1 |
| IMP-06 | **A next-step status button** — one tap moves an order on. | R3.15 |
| IMP-07 | **Balance due shown wherever money is owed** — order rows, order detail, customer detail and the bill. | R3.15, R5.2 |
| IMP-08 | **An offline banner with retry** (PWA and Android). | R7.2, R8.9 |
| IMP-09 | **Haptics** for success and error on Android. | R8.3 |
| IMP-10 | **Deltas against the previous period** on every KPI. | R5.9 (done 2026-09-26) |
| IMP-11 | **Pagination** or infinite scroll on every list (§133.9 I4). | R5.13 |
| IMP-12 | **Money typed the way people write it** — "₹1,500" and "1,500" are both accepted. | R0.8 |

---

## 139.16 Tests — moving them into `/tests`

**Today:** 60 test files sit beside their subjects in `src/`, and 59 of them import
or mock by relative path. `tests/` holds only `tests/db` and a route-shape
contract test that is named `e2e` but runs no browser.

| For `/tests` | Against |
|---|---|
| `src/` holds only code that ships, which makes it easier to read — and the redesign is about to rewrite most of `src/components` and `src/features` anyway. | A test no longer moves when its subject moves; the mirrored path has to be kept up. A check script fails the build when a test's subject no longer exists. |
| One root for SonarQube (`sonar.sources=src`, `sonar.tests=tests`) and for coverage, with no `*.test.*` exclusions scattered through `src`. | Imports become `@/…` aliases instead of `./…` — longer, but they survive moves. |
| Setup, auth stubs and fixtures live in one support folder instead of `src/test-utils` inside the app. | A missing test is less visible than a gap beside the component — the 100 % UI coverage gate (AGENTS §26) catches it instead. |
| It matches how `tests/db` and the end-to-end suite already work. | |

**Recommendation: do it — first thing in Phase 1 (R1.1), before the redesign.**
Moving 60 files later means moving files that are being rewritten at the same time.

**Layout**

```text
tests/
├── unit/        mirrors src/ exactly:
│                src/lib/money.ts                         → tests/unit/lib/money.test.ts
│                src/features/customers/components/X.tsx  → tests/unit/features/customers/components/X.test.tsx
├── db/          database contracts; later, real integration tests against local Supabase (§133.11 K5)
├── contract/    route-shape contracts (today's tests/e2e/auth-flow-contract.test.ts moves here)
├── e2e/         Playwright browser journeys (§133.11 K4)
└── support/     setup (from vitest.setup.ts), auth stubs (from src/test-utils), fixtures
```

**Rules:** a test's path is its subject's path with `src/` replaced by
`tests/unit/` and `.test` before the extension. Imports and `vi.mock` use `@/`
paths only. Vitest resolves a mock to the module's file, so
`vi.mock("@/features/auth/api.client")` still intercepts a component that
imports `../api.client` — **confirm this on the first moved file before scripting
the rest.**

**Steps:**

1. `git mv` each file, so git keeps the history.
2. Codemod the relative imports and mocks to `@/`.
3. Move `src/test-utils` and `vitest.setup.ts` into `tests/support`.
4. Update `vitest.config.mts` (`include`, `setupFiles`, coverage), `tsconfig` and the ESLint globs.
5. Add the path-check script.
6. Rewrite AGENTS.md §26.
7. The suite passes with the **same test count** (490 today).

---

## 139.17 The Android app (Capacitor)

### 139.17.1 How it ships (Q9)

| | **A. The hosted app in a native shell** (recommended) | **B. A static export bundled into the APK** |
|---|---|---|
| **How** | The WebView loads the deployed HTTPS app. The native bridge is available to it. A small bundled page covers offline and error states. | `next build` exports static files into the APK; the API stays on the server. |
| **Fits today's code?** | **Yes.** Route handlers, `proxy.ts`, server rendering and the HttpOnly `SameSite=Lax` session cookies are all first-party, exactly as on the web. | **No.** A static export drops route handlers and the proxy; dynamic routes need rework; and the API becomes **cross-site** — the cookies would need `SameSite=None` plus credentialed CORS, or bearer tokens held in JavaScript, which AGENTS §9 forbids. |
| **Updates** | A web deploy updates the app. | Every UI change needs a Play release. |
| **Offline** | Needs the network — the product is online-first (§51) — plus a bundled offline screen. | The shell opens offline, but data still needs the network. |
| **Store policy** | The app must add native value — push, native share, haptics, deep links — which this plan does. | Fine. |
| **Risk** | Capacitor describes `server.url` mainly for live reload. **Re-check the current Capacitor guidance and Play policy when this phase starts,** and record the decision. | A rework of authentication and routing. |

### 139.17.2 The native capability layer

`src/lib/native/` — the only place that knows whether the app is running inside
Capacitor (AGENTS §18, §19). Every capability has a **web implementation** and a
**native one**, chosen at runtime; screens import `@/lib/native` and nothing
else. The existing mock `features/notifications/capacitor-push.service.ts` folds
into it.

| Capability | Web | Android |
|---|---|---|
| `share(file, text)` | Web Share with files; else download plus copied text | Filesystem (cache) + Share |
| `saveFile(blob, name)` | `<a download>` | Filesystem + Share — **a WebView cannot download a blob URL**, so the bill PDF has to go through here |
| `haptic(kind)` | no-op | Haptics |
| `statusBar(theme)` | `theme-color` | StatusBar: colour and icon style |
| `keyboard` | `visualViewport` | Keyboard plugin (resize mode) |
| `app` | — | Back button, resume, deep links |
| `network` | `online`/`offline` events | Network |
| `push` | Web Push later, if at all | Push Notifications (FCM) |

### 139.17.3 Behaviour on the device

- **Edge to edge:** the safe-area system (§139.8). **Verify on real devices that the WebView reports the insets;** if one does not, the native layer writes them into `--safe-*`.
- **Status bar** colours follow the theme.
- **The back button** closes the response card, then any sheet, then goes back a screen; on Home it leaves the app.
- **Links:** map links, `tel:` and `wa.me` open **outside** the app (only the app's own domain is navigable inside the WebView).
- **Deep links:** Android App Links (`/.well-known/assetlinks.json`) open the confirmation and password-reset links **in the app**; the Supabase redirect URLs are updated to match.
- **Splash screen and adaptive icon** are drawn from `BrandMark`.
- **Offline:** a bundled screen with Retry.

### 139.17.4 Push notifications (§133.5 E2, E3)

A `device_tokens` table (business, profile, token, platform, last seen). Tokens
are registered on sign-in and removed on sign-out. The NotificationWorker sends
through FCM HTTP v1, with its service-account key as a secret. The mock token is
removed (E3).

### 139.17.5 Release

- **Before anything else (Q10):** the application id, the Play developer account, a **Privacy Policy page**, and **account deletion** both in the app and through a web link. Play requires both for an app that creates accounts and stores personal data.
- **Signing:** an upload keystore held as a CI secret, never in the repository. `versionCode` comes from the CI build number.
- **Target SDK:** whatever Play requires at the time.
- **Play Console:** the data-safety form — the app stores the business's customers' names, phone numbers and addresses, and sells nothing. Release to internal testing → closed testing → production.
- **Device matrix:** Android 10–15; a small 360 dp phone, a large phone and a tablet; gesture and three-button navigation; a display cutout; both themes.

---

## 139.18 The phases

Each phase ends **shippable**: typecheck, lint, the full suite and the build are
green; the screens it touched are captured at every width in both themes;
`changelog.md` is updated; and its tracker rows read DONE.

| Phase | Goal | Depends on | Done when |
|---|---|---|---|
| **0 — Correctness and security** | Stop the bugs that corrupt money, stock or tenant data, and the crash. **No redesign.** | — | Payments record their real amount; cancelling releases stock; status changes follow the table; dates are local; RLS and foreign keys are tenant-tight; every screen has an error boundary. |
| **1 — Foundation** | Tests in `/tests`; AGENTS.md updated; Golden and Peach tokens; the safe-area system; the new shell and component kit; the response card; input hygiene; the illustration library, the photographic plates and the chart kit. | 0 | Every existing screen runs inside the new shell with the new tokens, nothing sits under a notch, and every product shows an illustration. |
| **2 — Accounts and the business** | USER/DEV; the new registration; the business profile and logo; the queue actually running; audit that records who. | 1 | A new user registers with every field, edits their business, and the confirmation arrives through the queue. |
| **3 — Orders** | One-transaction creation with idempotency; order numbers; the oversell guard; Guest; customers on the fly; delivery autofill; custom items; statuses; payment at creation; the estimate endpoint. | 2 | A guest order and a new-customer order can each be placed twice by a double tap and produce **one** order; stock and payments reconcile. |
| **4 — The bill** | The bill component; the estimate before saving; share as an image; the PDF; print. | 3 | A bill and an estimate share to WhatsApp from a phone, and nothing is stored. |
| **5 — Screens** | Home, Orders, Customers and Guest sales, Customer detail, Products and categories (with the icon picker), Inventory, Expenses and Analytics (with their charts and the category illustrations), Notifications, More, Settings, Business details — responsive, both themes. | 1, 3 (for order screens), 4 | Every screen matches §139.10 at 360 – 1440 px in both themes, the charts match §139.11.11, and no hard-coded strings remain. |
| **6 — Hardening** | The worker system completed, rate limiting, OpenAPI, CI with SonarQube, Playwright journeys, database integration tests, BugSnag, an accessibility pass. | 5 | CI runs the full §125 pipeline, and the E2E journey in AGENTS §26 passes, tenant isolation included. |
| **7 — PWA** | Manifest, icons, the service worker, the offline page, install. | 6 | Installable on Android Chrome and iOS Safari; opens offline to the offline page. |
| **8 — Android** | The Capacitor app (§139.17). | 7, Q9, Q10 | A signed build on the Play internal track passes the device matrix. |
| **9 — Delight** | Personality at the moments that earn it, warm and quiet (§139.21): the order milestones, empty states in the app's own art, the inbox caught up, warmer system screens. | 5 (the milestone haptic: R8.3) | Each moment matches §139.21 at 360 – 1440 px in both themes and under reduced motion; routine saves are unchanged; the detector is clean; every changed component is at 100% coverage. |

**The menu builder** (§45–§49) stays a later product phase and is not part of this
roadmap.

---

## 139.19 Tracker

**How to use it.** Status is one of **TODO**, **DOING**, **DONE (date · commit)**
or **BLOCKED (reason)**. When a row is done, also close whatever its *Source*
names (§133, §134 and so on). *Waits on* names the open question whose answer
the row needs; without an answer it is built on that question's default
(§139.2). Rows are never deleted.

### Phase 0 — Correctness and security

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R0.1 | Payments store their real amount; tests for `processPayment` | BUG-01 | — | DONE (2026-09-24 · 29ca506) |
| R0.2 | "Pending payments" counts total minus paid | BUG-03 | — | DONE (2026-09-24 · 2fb09b4) |
| R0.3 | Fix the `/inventory` crash | §134 P0-1 | — | DONE (2026-09-24 · 3165b44) |
| R0.4 | Error boundary, not-found and loading states; remove the dead Receipts nav entry | §134 P0-2, P1-1, P1-2; §133.8 H2 | — | DONE (2026-09-24 · 87a4499) |
| R0.5 | Dates in the business's timezone | BUG-07 | — | DONE (2026-09-24 · 8953040) |
| R0.6 | A status transition table on the server; confirm before Cancel | BUG-05 | — | DONE (2026-09-24 · 218d78d) |
| R0.7 | Stock follows status — cancel releases, delivery converts | BUG-04; §133.3 C5 | — | DONE (2026-09-24 · 218d78d) |
| R0.8 | Tolerant money parsing; no "₹NaN" | BUG-10; IMP-12 | — | DONE (2026-09-24 · 5aba1c6) |
| R0.9 | Bounds on money and quantities | BUG-12 | — | DONE (2026-09-24 · 5aba1c6) |
| R0.10 | Links accept `http:`/`https:` only | BUG-13 | — | DONE (2026-09-24 · 5aba1c6) |
| R0.11 | RLS: `is_active` and `to authenticated` on payments, audit logs, notifications | BUG-18 | — | DONE (2026-09-24 · dab556e) |
| R0.12 | Tenant-integrity foreign keys; the customer checked at order creation | BUG-19 | — | DONE (2026-09-24 · dab556e) |
| R0.13 | Payment amount and method constraints | BUG-21 | — | DONE (2026-09-24 · dab556e) |
| R0.14 | Every validation message from the catalogue | BUG-11 | — | DONE (2026-09-24 · 5aba1c6) |

### Phase 1 — Foundation

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R1.1 | Tests into `/tests`, mirroring `src/` | §139.16 | — | DONE (2026-09-24 · e050735) |
| R1.2 | AGENTS.md updated: roles, themes, response card, input hygiene, tests, "business" wording, and app-owned art (illustrations and plates are not uploads) | §139.1 | — | DONE (2026-09-24 · 84c4aea) |
| R1.3 | Golden and Peach tokens; the Flour Room tokens merged; Clean retired; stored `clean` → `golden` | §139.4 | — | DONE (2026-09-24 · 92eb1c5) |
| R1.4 | No theme flash; `theme-color` per theme; the theme on the account if chosen | BUG-15 | Q14 | DONE (2026-09-24 · 92eb1c5; per device, Q14 default) |
| R1.5 | Type: Fraunces and Inter; Fredoka and Plus Jakarta Sans retired | §137.4 | — | DONE (2026-09-24 · 92eb1c5) |
| R1.6 | The safe-area system: `viewport-fit`, `--safe-*`, `dvh`, keyboard, the five call sites | BUG-14; §138.6.3 | — | DONE (2026-09-24 · 86b7f6a) |
| R1.7 | AppShell: business header, five-item bottom nav, icon rail, grouped sidebar, top bar | §139.5 | — | DONE (2026-09-25 · 4b77d0d, ebe8ea2; the business name with R2.6, the bell R5.10, search R5.12) |
| R1.8 | The component kit | §139.5 | — | DONE (2026-09-25 · 81de82a…0930e1f; `sheet`/`dialog` with R1.9, the response card R1.10, `customer-picker` R3.6, the bill R4.2 — in `features/receipts`, `illustration-picker` R5.6) |
| R1.9 | Sheets and dialogs trap focus, make the page `inert` and return focus. A form stays mounted while its sheet is closed, and every change is checked in the browser — a form mounted only while open lost its typed value under the React Compiler, which jsdom does not run (changelog, R0.3) | BUG-25 | — | DONE (2026-09-25 · 4010937; the receipt's dialog semantics with R4.6) |
| R1.10 | The response card and provider; action outcomes moved onto it | §139.6 | Q13 | DONE (2026-09-25 · f0ce049; Q13 default; the haptic tick with R8.3) |
| R1.11 | Input-hygiene primitives and the text-hygiene migration | §139.7 | — | DONE (2026-09-24 · edeea38) |
| R1.12 | Search field contrast | BUG-24 | — | DONE (2026-09-24 · e5b566e) |
| R1.13 | Photographic plates from the supplied photographs, WebP ≤ 200 KB | §139.11.12 | Q6 (answered) | DONE (2026-09-25 · ede9c36) |
| R1.14 | Shared copy for the wider audience — tagline, empty states, errors | §139.1 #2 | Q8 | DONE (2026-09-25 · 3b2aa4c; Q8 default; auth headlines with R2.8, units R5.6) |
| R1.15 | The illustration library ships: the build script (transparent WebP, the duplicate check), `src/assets/illustrations`, the registry, the `illustration` component, and the product tile built on it | §139.11.10 | Q16 | DONE (2026-09-24 · 92cdcb1; credit on Q16 default) |
| R1.16 | The `…_illustrations` migration: `products.icon_key` and `bakeries.expense_category_icons` | §139.12 | — | DONE (2026-09-24 · 92cdcb1) |
| R1.17 | The chart kit — line, bar, donut, sparkline; the chart palette per theme; compact rupee ticks | §139.11.11 | — | DONE (2026-09-25 · 96ddd2f) |

### Phase 2 — Accounts and the business

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R2.1 | The worker system runs: runner, atomic claim, attempts, stale-job recovery | §133.6 F1–F5 | — | DONE (2026-09-25 · 570aa82; how it is hosted in production is open — changelog) |
| R2.2 | `BAKER` → `USER`: migration, constants, guards, seed, tests | §139.11.1 | — | DONE (2026-09-25 · df711e8) |
| R2.3 | Stop writing the role into `user_metadata` | BUG-17 | — | DONE (2026-09-25 · 1d4db4a) |
| R2.4 | Registration: catch phrase, city, address; two steps | §139.11.2 | Q2 | DONE (2026-09-25 · 671a73b; Q2 default) |
| R2.5 | The confirmation mail through the queue; Resend confirmation | BUG-16 | — | DONE (2026-09-25 · d94f5a3) |
| R2.6 | The business profile endpoint and the Business details screen | §133.2 B1, B3 | — | DONE (2026-09-25 · d027464; built ahead of the phase at the user's request; the catch phrase and city at registration with R2.4) |
| R2.7 | Logo upload | §133.2 B2; §56 | — | DONE (2026-09-25 · d027464; on the bill with R4.1) |
| R2.8 | Auth screens re-tokened; neutral headlines; the hero plate | §138 | Q6 (answered), Q8 | DONE (2026-09-25 · 6671e63; Q8 default) |
| R2.9 | A theme switch on the signed-out screens | §138.6.3 | Q15 | DONE (2026-09-25 · 6671e63; Q15 default: none, the stored choice honoured — verified, nothing to build) |
| R2.10 | Audit records the acting user and is written by the server only | §133.7 G1; BUG-20 | — | DONE (2026-09-25 · 3c8ebe5) |

### Phase 3 — Orders

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R3.1 | `create_order` as one transaction, with an idempotency key | §133.3 C1, C2; BUG-09 | — | DONE (2026-09-25 · a691c58; proved again by the exit test, 2026-09-26) |
| R3.2 | Order numbers `ORD-1001` from a per-business counter | BUG-08 | — | DONE (2026-09-25 · a691c58) |
| R3.3 | The oversell guard | §133.3 C4 | — | DONE (2026-09-25 · a691c58; stocked products only — the user, 2026-09-25) |
| R3.4 | `change_order_status` as one transaction; readable notification text | §133.3 C6; BUG-26 | — | DONE (2026-09-25 · ca826b9) |
| R3.5 | Guest orders; `?customer=guest` | §139.11.3 | Q12 | DONE (2026-09-25 · 94a5759) |
| R3.6 | The customer picker: Guest pinned, search, add new inline, the duplicate-phone card | §139.11.4 | — | DONE (2026-09-26 · e670f7f, 2c0e8ef) |
| R3.7 | Customer fields: name and phone required; address, map link, email and notes optional (unchanged from §92) | §139.11.4 | Q1 (answered) | DONE (2026-09-25 · e670f7f; Q1 answered) |
| R3.8 | Delivery address and map link filled from the customer; the address-or-link rule | §95, §96; BUG-22 | — | DONE (2026-09-26 · e670f7f, 2c0e8ef) |
| R3.9 | Items-first flow: grid, cart bar → details → payment; the draft survives a refresh, and a trip to Products to add one (no chips — products need no categories; no New product here — 2026-09-25) | §139.10; §110 | Q11 | DONE (2026-09-26 · 2c0e8ef; View bill on the steps is R4.3) |
| R3.10 | Custom items: a typed name and amount, no stock | §139.11.7 | Q5 (answered) | DONE (2026-09-26 · 98ddeb3, 2c0e8ef) |
| R3.11 | Statuses: Preparing; `READY`; Completed for pickup | §139.11.8 | Q3 (answered) | DONE (2026-09-25 · 4097c47) |
| R3.12 | Payment at creation records a payment; part paid asks the amount; the manual status control removed | BUG-02, BUG-06 | — | DONE (2026-09-26 · a691c58, ca826b9, 2c0e8ef) |
| R3.13 | `POST /api/orders/preview` | §139.11.5 | — | DONE (2026-09-25 · 93272d6) |
| R3.14 | Place order → a response card with the facts and actions | §139.6 | — | DONE (2026-09-26 · 2c0e8ef; the card offers View order until the bill lands, R4.3) |
| R3.15 | Order detail: next-step button, confirm on cancel, payments, balance due, bill actions, WhatsApp | IMP-02, IMP-06, IMP-07 | — | DONE (2026-09-26 · 99bce3c; share and download of the bill are R4.4, R4.5) |
| R3.16 | The new-order date computed on mount; structured logging in checkout | BUG-28, BUG-29 | — | DONE (2026-09-26 · 2c0e8ef; the compensation and its console.error went with R3.1, a691c58) |

### Phase 4 — The bill

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R4.1 | The bill view-model, with the business profile | §133.2 B4 | — | DONE (2026-09-26 · d806e56; `GET /api/orders/{id}/bill` replaces `/receipt`) |
| R4.2 | The bill component — estimate and confirmed | §139.11.6 | — | DONE (2026-09-26 · d806e56; `BillView` and `BillSheet` live with the receipts feature, whose document they draw) |
| R4.3 | View bill before saving, with Share | §139.11.5 | — | DONE (2026-09-26 · 48c3349; **View bill** sits beside the Order summary's title on each step, and on the Order placed card) |
| R4.4 | Share as a PNG — Web Share with files, else download; **[Share]** inside the bill, the file named `{order number} - {business name}` (2026-09-26) | IMP-02 | — | DONE (2026-09-26 · a0dff8c; drawn on a canvas in the browser, the web half of `src/lib/native`) |
| R4.5 | The PDF on demand, never stored | §133.8 H1; §15 | — | DONE (2026-09-26 · a0dff8c; `GET /api/orders/{id}/bill.pdf`, pdfkit, A5) |
| R4.6 | ~~Print stylesheet;~~ dialog semantics; labels, not enums — print dropped (2026-09-26, the user: Share stands where Print was) | BUG-27 | — | DONE (2026-09-26 · d806e56) |
| R4.7 | The footer: app name and web link | §139.1 #9 | — | DONE (2026-09-26 · d806e56) |

### Phase 5 — Screens

**Status (2026-09-26): closed.** Every row is done, R5.10 Notifications last. The exit test holds for every screen:

- **Screens:** 16 routes at 360, 390, 414, 820, 1280 and 1440 px in Golden and Peach, with no sideways scroll and no page errors.
- **Charts:** they follow §139.11.11.
- **Copy:** no hard-coded strings remain.
- **Build:** `next build` passes.

Phase 5 closed on 2026-09-26 with R5.10.

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R5.1 | Home | §139.10; IMP-05 | — | DONE (2026-09-26 · Home; `GET /api/dashboard` works it out on the server, so Home no longer reads every order) |
| R5.2 | Orders list | §139.10; IMP-07 | — | DONE (2026-09-26 · tabs with counts, server search and filters, a page at a time; `0017_list_views`) |
| R5.3 | Customers: segments, the pinned Guest sales row, search on digits | §139.10; BUG-23 | — | DONE (2026-09-26 · paged on `customer_stats`; the order screen's picker searches the server too) |
| R5.4 | Customer detail: stats, orders, notes, addresses, create order, order again | IMP-03, IMP-04 | — | DONE (2026-09-26 · `GET /api/customers/{id}/summary`; Order again sits on the order) |
| R5.5 | Guest sales | §139.11.3 | — | DONE (2026-09-26 · `/customers/guest`; also from Orders' Guest filter and Analytics' Guest split) |
| R5.6 | Products; neutral units; the **Icon** field and picker — the owner picks the product's illustration from the library; ~~managing categories~~ dropped (2026-09-25), and a migration removes the unused `categories` table and `products.category_id` | §139.11.10; §133.4 D1 (dropped) | Q8 | DONE (2026-09-26 · `0018_drop_categories`; the picker is in the kit for R5.16) |
| R5.7 | Inventory | §139.10 | — | DONE (2026-09-26 · `0019_stock_levels`; each product's history, a page at a time) |
| R5.8 | Expenses as the reference shows: KPIs, the category donut, daily bars, recent expenses; the Categories and Transactions tabs; `GET /api/expenses/summary`; expenses edited and deleted (the user, 2026-09-26) | §139.10; §139.11.11 | — | DONE (2026-09-26 · summed on the server; Transactions a page at a time) |
| R5.9 | Analytics as the reference shows: KPIs with deltas, the sales-trend line, top products (custom items as one row in the Products tab); ~~sales by category~~ dropped with categories (2026-09-25), **sales by product** in its place (the user, 2026-09-26); the Sales, Orders, Customers and Products tabs; server aggregation; Top Customers; the guest split | §133.9 I1, I3; IMP-10; §139.11.11 | — | DONE (2026-09-26 · worked out on the server; the period is remembered on the device) |
| R5.10 | Notifications inbox and bell; the `kind` column; orders due soon and overdue (the user, 2026-09-26) | §133.5 E1; §25, §28 | — | DONE (2026-09-26 · `0022_notification_kind`, `0023_order_due_notifications`; the bell counts to "9+"; Settings' permission row comes with push, R8.6) |
| R5.11 | More and Settings (Appearance, Account, About with ~~the illustration credit~~ the maker, the user 2026-09-26); no Help | §139.10 | Q7 (answered), Q16 | DONE (2026-09-26 · the profile folded into Settings; the theme moved there from More and the account menu; the Notifications row waits for R5.10, the privacy policy for R8.10) |
| R5.12 | ~~Global search~~ | IMP-01 | — | DROPPED (2026-09-25, the user's decision: search stays in each list, R5.13) |
| R5.13 | Pagination on every list; each list's search runs on the server with it — debounced, tenant-scoped, with loading, empty and error states | §133.9 I4; IMP-11; IMP-01 (2026-09-25) | — | DONE (2026-09-26 · Orders, Customers, a customer's orders, Guest sales, the customer picker, Expenses' transactions and each product's stock history are paged. Products — and Inventory's list of the same products — stays one read: a menu, not a ledger (the user, 2026-09-26)) |
| R5.14 | Hard-coded strings swept, screen by screen | BUG-30 | — | DONE (2026-09-26 · the customer, stock and payment forms, the four sign-in screens' placeholders and hints, the nav's names, the page's title and description; field labels in sentence case) |
| R5.15 | Dashboard filters | §133.9 I2 | — | DONE (2026-09-26 · with R5.1: preparation and payment, combined, on the orders due) |
| R5.17 | Profile details once every 30 days: the owner's name, sign-in number and email from Settings, the business's name on Business details; the sign-in number and email with the current password; a new email confirmed before it takes effect (the user, 2026-09-26) | §139.10 | — | DONE (2026-09-26 · `0021_profile_changes`; the confirmation mail is registration's until the user sets its own) |
| R5.16 | Expense category illustrations: the Categories tab, the picker, the expense form's category field, `/api/expense-categories`; **the business's own categories** — made, renamed, pictured and deleted while unused, the eight defaults fixed (the user, 2026-09-26) | §139.11.10 | — | DONE (2026-09-26 · `0020_expense_categories`) |
| R5.18 | The library grows (the user, 2026-09-27): 17 files, two of them sheets, make 31 illustrations, in three new groups; the build clears named holes and steps a busy drawing's quality down to fit 40 KB | §139.11.10 | Q16 | DONE (2026-09-27 · 59 illustrations; no migration) |

### Phase 6 — Hardening

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R6.1 | Jobs enqueued with the service role; exponential backoff; the Menu and Cleanup workers | §133.6 F6–F8 | — | TODO |
| R6.2 | Rate limiting | §133.11 K6 | — | BLOCKED (the counter store needs a decision — changelog, 2026-09-23) |
| R6.3 | OpenAPI and Swagger | §133.11 K1 | — | TODO |
| R6.4 | CI pipeline with SonarQube | §133.11 K3 | — | TODO |
| R6.5 | Playwright journeys, tenant isolation included | §133.11 K4 | — | TODO |
| R6.6 | Database integration tests against local Supabase | §133.11 K5 | — | TODO |
| R6.7 | BugSnag | §133.11 K2 | — | TODO |
| R6.8 | An accessibility and responsive pass across every screen | §139.8, §139.9 | — | TODO |

### Phase 7 — PWA

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R7.1 | Manifest, maskable icons, theme colours | §133.10 J1 | — | TODO |
| R7.2 | Service worker: shell cache and the offline page | §133.10 J1, J3; IMP-08 | — | TODO |
| R7.3 | Install prompt; iOS standalone meta and status-bar style | §139.8 | — | TODO |

### Phase 8 — Android

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R8.1 | Record the delivery-model decision | §139.17.1 | Q9 | TODO |
| R8.2 | Capacitor project, application id, config | §139.17 | Q10 | TODO |
| R8.3 | The native capability layer | §139.17.2; IMP-09 | — | TODO |
| R8.4 | Insets and edge-to-edge verified on devices | §139.17.3 | — | TODO |
| R8.5 | The back button and App Links | §139.17.3 | — | TODO |
| R8.6 | Push: device tokens, FCM, the worker | §133.5 E2, E3 | — | TODO |
| R8.7 | Native bill sharing, PNG and PDF | §139.17.2 | — | TODO |
| R8.8 | Splash screen and adaptive icon | §139.17.3 | — | TODO |
| R8.9 | The offline screen | IMP-08 | — | TODO |
| R8.10 | A Privacy Policy page and account deletion | §139.17.5 | Q10 | TODO |
| R8.11 | Signing, versioning, the CI build, Play internal testing, data safety | §139.17.5 | — | TODO |
| R8.12 | The device matrix | §139.17.5 | — | TODO |

### Phase 9 — Delight

Added 2026-09-26 by the user; not started. It waits only on Phase 5, so it
may be taken up before Phases 6 – 8 if the user asks; its one haptic waits on
the native layer (R8.3).

| ID | Work | Source | Waits on | Status |
|---|---|---|---|---|
| R9.1 | The milestone card: the response card takes an illustration in place of its medallion, settling in | §139.21.2 | — | TODO |
| R9.2 | Order placed: the order's own illustration, and one warm line | §139.21.3 | R9.1 | TODO |
| R9.3 | Paid in full: its own card when a payment clears the balance | §139.21.3 | R9.1 | TODO |
| R9.4 | Delivered and Completed: their own card when an order finishes | §139.21.3 | R9.1 | TODO |
| R9.5 | Empty states in the app's own art | §139.21.4 | — | TODO |
| R9.6 | The inbox caught up: the badge leaves, and the list says so | §139.21.5 | — | TODO |
| R9.7 | Warmer system screens: not found, the error boundary, the global error | §139.21.6 | — | TODO |
| R9.8 | A light haptic on the three milestones, on Android | §139.21.2 | R8.3 | TODO |
| R9.9 | The exit test: captures, reduced motion, detector, coverage | §139.21.7 | R9.1 – R9.7 | TODO |

---

## 139.20 How this section relates to the ones before it

- **§137 (the Flour Room mobile direction) is superseded where the two differ:** status rendering (a pill with a dot, not a dot and a word); photography (Q6); theme values (§137.5 → §139.4); desktop, now in scope (§137.9 → §139.9, §139.10); and the build order (§137.10 → §139.18). **Kept from §137:** the navigation (§137.1), the type (§137.4), the tile's place in every row (§137.3, now `product-tile`, showing an illustration), hairline rows, and one dark action per screen.
- **§137 decision 1 ("no photography") and the §137.3 monogram** are superseded by §139.11.12 and §139.11.10. **§16 and §56 are not:** the logo is still the only upload.
- **§133 (the gap register):** every open item is mapped to a tracker row through its *Source* column. Close both when the work is done.
- **§134 – §136:** folded into Phases 0, 1 and 5. Those sections remain as the record of what was found.
- **§138:** the authentication screens are built; R2.8 re-tokens them, and §138.6.3's two open items become R1.6 and Q15.
- **Superseded in the earlier plan:** §68 ("no payments table in V1") by §139.11.9; the bill timing in §70 and §72 by §139.1 #8; the customer-first order flow in AGENTS §12 by Q11.

---

## 139.21 Delight (Phase 9)

*Added 2026-09-26 by the user, through `/impeccable delight`, and recorded
under §31. Nothing here is built yet.*

### 139.21.1 The thesis, and its rules

**The owner should feel an order land.** Placing an order, taking the last of
its payment, and handing it over are the moments a home business works for.
The app marks those three moments, in the business's own bakes and gifts, and
stays plainly out of the way everywhere else.

- **Warm and quiet** (the user's choice over playful). The owner meets these
  moments many times a day, so each must still feel good on the hundredth
  order.
- **Only where it is earned.** A routine save — a customer, a product, stock,
  an expense, a setting — keeps today's plain check card. Nothing new appears
  for an ordinary tap.
- **One warm phrase at most** per moment. Titles stay plain and factual.
  Every word lives in `messages.ts`.
- **Motion:** an illustration settles in with a short drop, 400 ms at most, on
  the kit's `--ease-out-expo`. Under reduced motion it only fades. Nothing
  loops, bounces or plays a sound.
- **Art:** only the illustration library the app already ships (§139.11.10).
  There are no new assets and no new dependencies, and the licence check of
  Q16 still applies. An illustration is decorative (`alt=""`); the card's
  title and message carry the meaning.
- **Nothing is delayed.** No moment holds up the task behind it, and the card
  closes, or offers its next step, exactly as it does today.

### 139.21.2 The milestone card (R9.1, R9.8)

- **The kit:** the response card (§139.6) accepts an **illustration** — a
  library key — in place of its medallion, drawn larger than the medallion. It
  settles in as §139.21.1 says.
- **Only three callers** pass one: §139.21.3's milestones.
- **On Android**, a milestone card also plays one light haptic through the
  native layer's `haptic(kind)` (§139.17.2). The web plays none.

### 139.21.3 The three order milestones (R9.2 – R9.4)

| Moment | When | Illustration | Title | Message |
|---|---|---|---|---|
| **Order placed** | The order is created (today's card) | The illustration of the order's first catalogue item; `default-product` for an order of custom items only | Order placed | "{ORD-1002} is on the counter." |
| **Paid in full** | A recorded payment brings the balance to nothing | `gold-coins` | Paid in full | "{ORD-1002} is settled." |
| **Delivered** / **Completed** | The order moves to `DELIVERED` (§139.11.8) | Delivery: `delivery-scooter`. Pickup: `gift-box` | Delivered / Completed | "{ORD-1002} is with {customer}." A Guest order reads "…is on its way home." |

- **What does not change:**
  - Order placed keeps its facts strip and its **View bill** and **New order**
    actions.
  - Paid in full shows the amount and the order's total as its facts. A part
    payment keeps today's card, balance due and all.
  - The routine moves — Preparing, Ready, Out for delivery — and Cancelled
    keep their plain cards.
  - Paid in full at the moment of placing is Order placed's moment, not a
    second card.

### 139.21.4 Empty states in the app's own art (R9.5)

- **The kit:** `EmptyState` accepts an illustration in place of its lucide
  icon. It keeps its title, its hint and its one action, and settles in with
  the screen (`useSettle`).

| Screen | Illustration | Title |
|---|---|---|
| Orders | `delivery-scooter` | unchanged |
| Products, and the order screen's empty grid | `cupcake` | unchanged |
| Customers | `heart-gift-box` | unchanged |
| Expenses | `gold-coins` | unchanged |
| Inventory | `cake-squares` | unchanged |
| Notifications | `teddy-bear` | **All quiet** (in place of "Nothing yet") |

- **Stays plain:** a search or a tab that matches nothing ("No customer
  matches that") is not an empty state. It keeps its plain line.

### 139.21.5 The inbox caught up (R9.6)

- **The badge:** when the last unread notification is read — opened, or
  **Mark all as read** — the bell's badge leaves with a short shrink and fade,
  the reverse of its arrival, rather than vanishing. Under reduced motion it
  only fades.
- **The list:** on the All tab, an inbox with notifications and none unread
  ends with a quiet line, **"You're all caught up."**
- **No card:** marking all read stays self-evident, as it is today.

### 139.21.6 Warmer system screens (R9.7)

Recovery stays first: the way home and **Try again** remain the headline
actions, and the words never make light of a failure.

| Screen | Illustration | Title | Line |
|---|---|---|---|
| Not found | `donut` | This page didn't rise | "The link may be old, or the page has moved." |
| The error boundary and the global error | none — the danger medallion stays | Something didn't bake right | "Try again, or head back home. Nothing you saved is lost." |

- **"Nothing you saved is lost"** is a claim, so it is written only where it
  is true. The boundary catches a screen that failed to draw; a save that
  failed is reported on its own card (§139.6).
- **The offline screen** (R8.9) is written in the same voice when it is built.

### 139.21.7 The exit test (R9.9)

- **Captures:** each milestone, each empty state, the inbox caught up and
  both system screens, at 360, 390, 820, 1280 and 1440 px in Golden and Peach,
  and once more under reduced motion.
- **Unchanged:** a routine save still shows the plain check card.
- **Detector:** the Impeccable detector is clean over the changed files.
- **Coverage:** every changed component is at 100%, asserted through roles
  and labels — never an illustration's file name.

