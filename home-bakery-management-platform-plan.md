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
| B1 | No bakery profile endpoint. The Settings name and phone fields were hard-coded and have been removed; the section says so. | no `/api/bakery` route |
| B2 | No logo upload: no storage bucket, no server-side size and content-type validation, no atomic replace-then-delete. | §56, §118 |
| B3 | `bakeries` has a SELECT policy only. An UPDATE policy is needed before profile editing can work at all. | `supabase/migrations/0001_auth_foundation.sql` |
| B4 | The receipt header prints a hard-coded `"Ovenly Bakery"` instead of the bakery's own name. | `src/features/receipts/api.ts` |

---

## 133.3 Orders — correctness gaps (Phase 2 — §53, §109–§114, §21)

| # | Gap | Why it matters |
|---|-----|----------------|
| C1 | Order creation is **not transactional**. It inserts the order, then items, then adjustments, then ledger lines, and on failure compensates with a hard delete. A crash between steps leaves a partial order. §114 asks for one transaction — a Postgres function called over RPC. | Data integrity |
| C2 | **No idempotency** anywhere. A double-tapped Place Order creates two orders; a retried payment records twice. §24 of AGENTS.md requires critical mutations to be safe against duplicate submission. | Money |
| C3 | No cart/draft state and **no bill-preview step** before Confirm. The plan's flow is Cart → Bill → Confirm (§110–§112); the screen is one long form with a running total. | Approved UX |
| C4 | **Stock can be oversold.** Nothing reads the balance before an `ORDER_RESERVATION` is posted, so an order can reserve stock that is not there (§21). | Inventory truth |
| C5 | **A delivered order deducts its stock twice.** `checkout.ts` posts `ORDER_RESERVATION` at `-quantity` and `status.ts` posts `ORDER_CONSUMPTION` at `-quantity` on first delivery, and nothing ever releases the reservation. Every balance in the app is therefore short by the quantity of every delivered order. Consumption should release the reservation, not repeat it. | Inventory truth |
| C6 | **`updateOrderStatus` is not transactional either.** It persists the status, then the ledger line, then the audit row, then enqueues the notification. Observed on 2026-09-23: a failure at the last step left the status changed, the stock consumed and the audit written, and the retry then saw `before.status === 'DELIVERED'` and silently skipped the notification. Same fix as C1. | Data integrity |

---

## 133.4 Product categories (Phase 2 — §14)

| # | Gap |
|---|-----|
| D1 | The `categories` table exists with RLS, and `products.category_id` is written by the API — but there is no categories endpoint, no categories UI, and no way for a baker to create one. The field can never be set from the app. |

---

## 133.5 Notifications (Phase 4 — §25)

| # | Gap |
|---|-----|
| E1 | The `notifications` table exists with RLS and is never read or written. There is no notifications screen and no bell. |
| E2 | Push delivery is a mock that logs (`CapacitorPushProvider`). There is no device-token registry, so every `SEND_PUSH_NOTIFICATION` job finds no device and completes without sending. |
| E3 | `processPayment` still enqueues a literal `token: "mock-token"`. Remove it when the token registry lands. |

---

## 133.6 The worker system (Phase 5 — §26, §27)

The queue table and the claim/complete/fail helpers exist. Nothing runs them.

| # | Gap |
|---|-----|
| F1 | **Nothing drains the queue.** `processNextJob` is never called — there is no cron route, scheduled function or worker process. Every job enqueued so far is still `pending`. |
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
| G1 | `audit_logs.user_id` is written as `null` for every mutation — the trail records what changed but not who changed it. The audit call is centralised in `tenantRecords`, and `withBakeryRoute` already holds the session, so the fix is to thread the acting user through the data layer. Preferred shape: feature functions take the `BakeryContext` object rather than `(client, bakeryId, …)`, so the argument list stops growing. |

---

## 133.8 Receipts (Phase 4 — §24)

| # | Gap |
|---|-----|
| H1 | The receipt is an on-screen HTML view with browser print. There is no PDF generation, no native share, no WhatsApp share and no download (§24). Generation stays on demand and nothing is stored — that part of §24 is respected and must stay that way. |
| H2 | `/receipts` is in the navigation (§9) but no page exists, so the link 404s. Either build the screen or take the entry out of `src/constants/navigation.ts`. |

---

## 133.9 Analytics and dashboard (Phase 3 — §39, §40, §116–§117)

| # | Gap |
|---|-----|
| I1 | Top Customers (§40) is not built. |
| I2 | Dashboard filters (§116–§117) are not built. |
| I3 | `/api/analytics/overview` exists and nothing calls it. The Analytics screen fetches every order and expense and adds them up in the browser, which will not survive a real dataset. Move the aggregation to the endpoint and page the rest. |
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
| **P0-1** | **`/inventory` throws on every load.** `TypeError: Cannot read properties of undefined (reading 'id')`, reproduced on both viewports. `InventoryAdjustmentSheet` guards with `if (!product) return null` — but the guard sits *after* `useApiMutation`, and the callback closes over `product!.id` (`src/features/inventory/components/InventoryAdjustmentSheet.tsx:58`). With `reactCompiler: true` the React Compiler lifts that read into a memo dependency (`if ($[6] !== product.id)` in the emitted chunk), so it runs at render, before the guard, while the sheet is closed and `product` is `undefined`. The screen still paints because React recovers, but it throws on every visit and any error boundary would catch it. **Fix:** drop the `!` and read `product.id` inside the callback body after a null check, or move the guard above the hook. **The class of bug matters more than the instance:** under the React Compiler, any `x!.y` inside a hook argument that is guarded by a later early return becomes a render-time read. This is the only occurrence in a component today (`src/features/orders/checkout.ts` has three more, but that file is server-side and not compiled). |
| **P0-2** | **No error boundary anywhere.** There is no `error.tsx` or `global-error.tsx` in `src/app`. A render error in any screen takes the whole app to a blank page in production, with no recovery and no way back. Given P0-1 exists, this is not hypothetical. |

---

## 134.2 P1 — Missing states

| # | Finding |
|---|---------|
| **P1-1** | **No `not-found.tsx`.** `/receipts` is in the app's own sidebar and More sheet (`src/constants/navigation.ts`) and has no page, so a baker who taps it lands on Next's stock black-on-white "404 — This page could not be found": no shell, no nav, no theme, no way back. Verified at both sizes. Either build the screen (§133.8) or remove the nav entry — but ship a branded `not-found.tsx` regardless, because a mistyped URL does the same thing. |
| **P1-2** | **No `loading.tsx` on any route.** Every screen renders its own skeleton once the client component mounts, so navigation shows the previous screen until the new one hydrates. |
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
- **C2 is fixed in the helper but not at five call sites.** `AppShell`'s bottom nav (`py-2`), the checkout bar in `orders/new` (`p-4`), `form-sheet`, `MoreSheet` and `AppShell`'s mobile header all still pair a `safe-*` class with a padding utility, so their bottom or top padding is currently `0`. Each is a one-class edit — `p-4` → `[--safe-pb:1rem]`. Not done here because it moves the layout of app screens this pass did not verify; **do it in §137.10, which rewrites all four components anyway.**
- **Desktop remains contained, not composed** (unchanged from §138.5). The wide treatment is §137.9.
