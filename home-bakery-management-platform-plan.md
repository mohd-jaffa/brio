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
