-- ============================================================
-- Brio — demo data for local development
--
-- Sign in with:   mobile 9876543210   password Password123!
-- The developer console (/admin):   mobile 9123456789   password Password123!
--
-- The account is created in auth.users here, not only in profiles:
-- bakeries.owner_id and profiles.id both reference auth.users(id), and a
-- password that exists nowhere is not a password. Everything below belongs to
-- that one bakery, so RLS has something real to isolate.
-- ============================================================

set search_path = public, auth, extensions;

do $$
declare
  v_user_id     uuid := 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
  v_bakery_id   uuid := 'b1c2d3e4-f5a6-4890-abcd-ef1234567890';

  v_email       text := 'baker@sweetdelights.com';
  v_phone       text := '+919876543210';
  -- GoTrue stores and looks a phone number up as digits only; the app's own
  -- columns keep the E.164 "+" it normalises to. Both have to be written in
  -- the form their owner expects, or the sign-in simply never matches.
  v_auth_phone  text := '919876543210';
  v_password    text := 'Password123!';

  v_cust_anu    uuid := 'c1111111-1111-4111-8111-111111111111';
  v_cust_rahul  uuid := 'c2222222-2222-4222-8222-222222222222';
  v_cust_meena  uuid := 'c3333333-3333-4333-8333-333333333333';
  v_cust_farida uuid := 'c4444444-4444-4444-8444-444444444444';

  v_prod_cake   uuid := 'd1111111-1111-4111-8111-111111111111';
  v_prod_cup    uuid := 'd2222222-2222-4222-8222-222222222222';
  v_prod_bread  uuid := 'd3333333-3333-4333-8333-333333333333';
  v_prod_brown  uuid := 'd4444444-4444-4444-8444-444444444444';
  v_prod_cheese uuid := 'd5555555-5555-4555-8555-555555555555';

  v_order_1     uuid := 'e1111111-1111-4111-8111-111111111111';
  v_order_2     uuid := 'e2222222-2222-4222-8222-222222222222';
  v_order_3     uuid := 'e3333333-3333-4333-8333-333333333333';
  v_order_4     uuid := 'e4444444-4444-4444-8444-444444444444';
  v_order_5     uuid := 'e5555555-5555-4555-8555-555555555555';
begin
  -- ----------------------------------------------------------
  -- 1. The account. The password is hashed by pgcrypto exactly as GoTrue
  --    would hash it, so signing in works without the app having to register.
  --    The token columns are set to '' rather than left null: GoTrue reads
  --    them into non-nullable Go strings and fails the sign-in otherwise.
  -- ----------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password, email_confirmed_at,
    phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    created_at, updated_at, last_sign_in_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    v_auth_phone, now(),
    '{"provider":"phone","providers":["phone","email"]}'::jsonb,
    jsonb_build_object('name', 'Priya Baker'),
    '', '', '', '',
    now() - interval '90 days', now(), null
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, created_at, updated_at
  )
  values
    (v_user_id::text, v_user_id,
     jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
     'email', now(), now()),
    (v_auth_phone, v_user_id,
     jsonb_build_object('sub', v_user_id::text, 'phone', v_auth_phone, 'phone_verified', true),
     'phone', now(), now())
  on conflict (provider_id, provider) do nothing;

  -- ----------------------------------------------------------
  -- 2. The bakery and the baker's profile
  -- ----------------------------------------------------------
  insert into public.bakeries (id, owner_id, business_name, phone, address, currency, timezone, created_at)
  values (
    v_bakery_id, v_user_id, 'Sweet Delights Home Bakery', v_phone,
    '14, Lake View Road, Indiranagar, Bengaluru 560038', 'INR', 'Asia/Kolkata',
    now() - interval '90 days'
  )
  on conflict (id) do nothing;

  insert into public.profiles (id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at, created_at)
  values (
    v_user_id, v_phone, v_email, 'Priya Baker', 'USER', v_bakery_id, true, false,
    now(), now() - interval '90 days'
  )
  on conflict (id) do nothing;

  -- ----------------------------------------------------------
  -- 3. Customers
  -- ----------------------------------------------------------
  insert into public.customers (id, bakery_id, name, phone, email, address, notes)
  values
    (v_cust_anu,    v_bakery_id, 'Anu Sharma',   '+919812345678', 'anu@example.com',    'Flat 302, Sunrise Apartments, M.G. Road', 'Prefers eggless cakes'),
    (v_cust_rahul,  v_bakery_id, 'Rahul Verma',  '+919823456789', 'rahul@example.com',  'Villa 12, Palm Meadows, Whitefield',      'Regular weekend customer'),
    (v_cust_meena,  v_bakery_id, 'Meena Gupta',  '+919834567890', 'meena@example.com',  'Block B-404, Green Park',                 'Loves chocolate cupcakes'),
    (v_cust_farida, v_bakery_id, 'Farida Khan',  '+919845678901', null,                 'Shop 7, Commercial Street',               'Orders for her café')
  on conflict (id) do nothing;

  -- ----------------------------------------------------------
  -- 4. Products — prices in whole paise (AGENTS.md §13)
  -- ----------------------------------------------------------
  -- Each with an illustration from the library (plan §139.11.10), except the
  -- sourdough, which shows the default — both cases are on screen.
  insert into public.products (id, bakery_id, name, description, default_price, unit, icon_key, is_active)
  values
    (v_prod_cake,   v_bakery_id, 'Chocolate Truffle Cake (1 kg)',   'Belgian chocolate sponge layered with dark ganache.',  120000, 'kg',    'chocolate-cake-slice', true),
    (v_prod_cup,    v_bakery_id, 'Red Velvet Cupcakes (Box of 6)',  'Soft red velvet topped with cream cheese frosting.',    45000, 'box',   'cupcake',              true),
    (v_prod_bread,  v_bakery_id, 'Sourdough Bread Loaf',            'Naturally fermented, 24-hour proof, crisp crust.',      25000, 'piece', null,                   true),
    (v_prod_brown,  v_bakery_id, 'Fudgy Brownie Box (4 pcs)',       'Dark chocolate brownies with walnuts.',                 38000, 'box',   'cake-squares',         true),
    (v_prod_cheese, v_bakery_id, 'Blueberry Cheesecake (500 g)',    'Baked cheesecake with a fresh blueberry compote.',      95000, 'piece', 'glazed-cake',          true)
  on conflict (id) do nothing;

  -- ----------------------------------------------------------
  -- 5. Orders. One of each state the screens have to draw: delivered and
  --    paid, in progress, part-paid, overdue, and cancelled.
  -- ----------------------------------------------------------
  --    Each takes its number, ORD-1001 onwards, from the business's counter
  --    as it is inserted (0015), in the order listed. The payment status is
  --    derived from the payments in step 8.
  insert into public.orders (
    id, bakery_id, customer_id, status, payment_method, payment_reference,
    subtotal, discount, delivery_charge, tax, total,
    delivery_type, delivery_date, delivery_address, notes, created_at
  )
  values
    (v_order_1, v_bakery_id, v_cust_anu,   'DELIVERED',   'UPI',  'UPI987654321',
     120000, 0, 5000, 0, 125000,
     'DELIVERY', now() - interval '1 day',  'Flat 302, Sunrise Apartments, M.G. Road', 'Birthday cake — "Happy Birthday Anu" on top', now() - interval '3 days'),

    (v_order_2, v_bakery_id, v_cust_rahul, 'IN_PROGRESS', null,   null,
     45000, 5000, 0, 0, 40000,
     'PICKUP',   now() + interval '1 day',  null, 'Regular customer discount', now()),

    (v_order_3, v_bakery_id, v_cust_meena, 'PENDING',     'CASH', null,
     101000, 0, 5000, 0, 106000,
     'DELIVERY', now(),                     'Block B-404, Green Park', 'Half paid on booking', now()),

    (v_order_4, v_bakery_id, v_cust_farida,'PENDING',     null,   null,
     95000, 0, 0, 0, 95000,
     'PICKUP',   now() - interval '3 days', null, 'Café order — chase this one', now() - interval '6 days'),

    (v_order_5, v_bakery_id, v_cust_anu,   'CANCELLED',   null,   null,
     50000, 0, 0, 0, 50000,
     'DELIVERY', now() - interval '2 days', 'Flat 302, Sunrise Apartments, M.G. Road', 'Cancelled by customer', now() - interval '4 days')
  on conflict (id) do nothing;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
  values
    (v_order_1, v_prod_cake,   'Chocolate Truffle Cake (1 kg)',  120000, 1, 120000),
    (v_order_2, v_prod_cup,    'Red Velvet Cupcakes (Box of 6)',  45000, 1,  45000),
    (v_order_3, v_prod_brown,  'Fudgy Brownie Box (4 pcs)',       38000, 2,  76000),
    (v_order_3, v_prod_bread,  'Sourdough Bread Loaf',            25000, 1,  25000),
    (v_order_4, v_prod_cheese, 'Blueberry Cheesecake (500 g)',    95000, 1,  95000),
    (v_order_5, v_prod_bread,  'Sourdough Bread Loaf',            25000, 2,  50000)
  on conflict do nothing;

  insert into public.order_adjustments (order_id, type, name, amount)
  values
    (v_order_1, 'CHARGE',   'Delivery',          5000),
    (v_order_2, 'DISCOUNT', 'Regular customer',  5000),
    (v_order_3, 'CHARGE',   'Delivery',          5000)
  on conflict do nothing;

  -- ----------------------------------------------------------
  -- 6. Stock ledger (AGENTS.md §14). Movements only — a balance is their sum,
  --    so what leaves is stored negative, exactly as the app posts it: a
  --    reservation when an order is placed; on delivery the reservation is
  --    released and consumption posted, so stock is taken once; on cancel the
  --    reservation is released (plan §139.11.8).
  -- ----------------------------------------------------------
  insert into public.inventory_transactions (bakery_id, product_id, type, quantity, reference_type, reference_id, created_at)
  values
    (v_bakery_id, v_prod_cake,   'STOCK_IN', 15, null, null, now() - interval '7 days'),
    (v_bakery_id, v_prod_cup,    'STOCK_IN', 30, null, null, now() - interval '7 days'),
    (v_bakery_id, v_prod_bread,  'STOCK_IN', 20, null, null, now() - interval '7 days'),
    (v_bakery_id, v_prod_brown,  'STOCK_IN',  8, null, null, now() - interval '7 days'),
    (v_bakery_id, v_prod_cheese, 'STOCK_IN',  6, null, null, now() - interval '7 days'),

    (v_bakery_id, v_prod_cake,   'ORDER_RESERVATION',  -1, 'ORDER', v_order_1::text, now() - interval '3 days'),
    (v_bakery_id, v_prod_cake,   'ORDER_RESERVATION',   1, 'ORDER', v_order_1::text, now() - interval '1 day'),
    (v_bakery_id, v_prod_cake,   'ORDER_CONSUMPTION',  -1, 'ORDER', v_order_1::text, now() - interval '1 day'),
    (v_bakery_id, v_prod_cup,    'ORDER_RESERVATION',  -1, 'ORDER', v_order_2::text, now()),
    (v_bakery_id, v_prod_brown,  'ORDER_RESERVATION',  -2, 'ORDER', v_order_3::text, now()),
    (v_bakery_id, v_prod_bread,  'ORDER_RESERVATION',  -1, 'ORDER', v_order_3::text, now()),
    (v_bakery_id, v_prod_cheese, 'ORDER_RESERVATION',  -1, 'ORDER', v_order_4::text, now() - interval '6 days'),
    (v_bakery_id, v_prod_bread,  'ORDER_RESERVATION',  -2, 'ORDER', v_order_5::text, now() - interval '4 days'),
    (v_bakery_id, v_prod_bread,  'ORDER_RESERVATION',   2, 'ORDER', v_order_5::text, now() - interval '2 days'),

    (v_bakery_id, v_prod_bread,  'WASTAGE', -1, null, null, now() - interval '2 days')
  on conflict do nothing;

  -- ----------------------------------------------------------
  -- 7. Expenses — amounts in whole paise
  -- ----------------------------------------------------------
  insert into public.expenses (bakery_id, category, description, amount, expense_date, payment_method)
  values
    (v_bakery_id, 'Ingredients', 'Belgian chocolate and flour, bulk',  450000, current_date - 2, 'UPI'),
    (v_bakery_id, 'Packaging',   'Cake boxes and ribbon roll',         120000, current_date - 5, 'CASH'),
    (v_bakery_id, 'Delivery',    'Local courier charges',               35000, current_date - 1, 'UPI'),
    (v_bakery_id, 'Utilities',   'Electricity, September',             220000, current_date - 8, 'BANK_TRANSFER')
  on conflict do nothing;

  -- ----------------------------------------------------------
  -- 8. Payments taken
  -- ----------------------------------------------------------
  insert into public.payments (bakery_id, order_id, amount, payment_method, reference, paid_at)
  values
    (v_bakery_id, v_order_1, 125000, 'UPI',  'UPI987654321', now() - interval '1 day'),
    (v_bakery_id, v_order_3,  50000, 'CASH', null,           now())
  on conflict do nothing;
end $$;

-- ============================================================
-- A developer, for the developer console (plan §5, §37). No business:
-- a developer reads the platform, never a business's data (0028).
-- ============================================================
do $$
declare
  v_dev_id     uuid := 'f1f2f3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
  v_email      text := 'dev@ovenly.local';
  v_phone      text := '+919123456789';
  v_auth_phone text := '919123456789';
  v_password   text := 'Password123!';
begin
  insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password, email_confirmed_at,
    phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    created_at, updated_at, last_sign_in_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_dev_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    v_auth_phone, now(),
    '{"provider":"phone","providers":["phone","email"]}'::jsonb,
    jsonb_build_object('name', 'Brio Developer'),
    '', '', '', '',
    now() - interval '30 days', now(), null
  )
  on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values
    (v_dev_id::text, v_dev_id,
     jsonb_build_object('sub', v_dev_id::text, 'email', v_email, 'email_verified', true),
     'email', now(), now()),
    (v_auth_phone, v_dev_id,
     jsonb_build_object('sub', v_dev_id::text, 'phone', v_auth_phone, 'phone_verified', true),
     'phone', now(), now())
  on conflict (provider_id, provider) do nothing;

  insert into public.profiles (id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at, created_at)
  values (v_dev_id, v_phone, v_email, 'Brio Developer', 'DEV', null, true, false, now(), now() - interval '30 days')
  on conflict (id) do nothing;
end $$;
