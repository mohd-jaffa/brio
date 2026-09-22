-- ============================================================
-- Ovenly Home Bakery Platform — Seed Data
-- Demo Bakery: Sweet Delights Home Bakery
-- Credentials: Phone: 9876543210 / Password: Password123!
-- ============================================================

-- Enable pgcrypto if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_bakery_id UUID := 'b1c2d3e4-f5a6-7890-abcd-ef1234567890';
  v_cust_1 UUID := 'c1111111-1111-1111-1111-111111111111';
  v_cust_2 UUID := 'c2222222-2222-2222-2222-222222222222';
  v_cust_3 UUID := 'c3333333-3333-3333-3333-333333333333';
  v_prod_1 UUID := 'p1111111-1111-1111-1111-111111111111';
  v_prod_2 UUID := 'p2222222-2222-2222-2222-222222222222';
  v_prod_3 UUID := 'p3333333-3333-3333-3333-333333333333';
  v_prod_4 UUID := 'p4444444-4444-4444-4444-444444444444';
  v_order_1 UUID := 'o1111111-1111-1111-1111-111111111111';
  v_order_2 UUID := 'o2222222-2222-2222-2222-222222222222';
BEGIN
  -- 1. Create Baker Profile and Bakery
  INSERT INTO bakeries (id, owner_id, business_name, phone, currency, timezone)
  VALUES (v_bakery_id, v_user_id, 'Sweet Delights Home Bakery', '+919876543210', 'INR', 'Asia/Kolkata')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, phone, email, name, role, bakery_id, is_active, must_change_password)
  VALUES (v_user_id, '+919876543210', 'baker@sweetdelights.com', 'Priya Baker', 'BAKER', v_bakery_id, TRUE, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Seed Customers
  INSERT INTO customers (id, bakery_id, name, phone, email, address, notes)
  VALUES 
    (v_cust_1, v_bakery_id, 'Anu Sharma', '+919812345678', 'anu@example.com', 'Flat 302, Sunrise Apartments, M.G. Road', 'Prefers eggless cakes'),
    (v_cust_2, v_bakery_id, 'Rahul Verma', '+919823456789', 'rahul@example.com', 'Villa 12, Palm Meadows, Whitefield', 'Regular weekend customer'),
    (v_cust_3, v_bakery_id, 'Meena Gupta', '+919834567890', 'meena@example.com', 'Block B-404, Green Park', 'Loves chocolate cupcakes')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Seed Products
  INSERT INTO products (id, bakery_id, name, description, default_price, unit, is_active)
  VALUES
    (v_prod_1, v_bakery_id, 'Chocolate Truffle Cake (1 kg)', 'Rich Belgian chocolate sponge layered with dark chocolate ganache.', 120000, 'kg', TRUE),
    (v_prod_2, v_bakery_id, 'Red Velvet Cupcakes (Box of 6)', 'Soft red velvet cupcakes topped with cream cheese frosting.', 45000, 'box', TRUE),
    (v_prod_3, v_bakery_id, 'Sourdough Bread Loaf', 'Artisanal naturally fermented sourdough with a crispy crust.', 25000, 'piece', TRUE),
    (v_prod_4, v_bakery_id, 'Fudgy Brownie Box (4 pcs)', 'Fudgy dark chocolate brownies with walnuts.', 38000, 'box', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Initial Stock Transactions
  INSERT INTO inventory_transactions (bakery_id, product_id, type, quantity)
  VALUES
    (v_bakery_id, v_prod_1, 'STOCK_IN', 15),
    (v_bakery_id, v_prod_2, 'STOCK_IN', 30),
    (v_bakery_id, v_prod_3, 'STOCK_IN', 20),
    (v_bakery_id, v_prod_4, 'STOCK_IN', 25)
  ON CONFLICT DO NOTHING;

  -- 5. Seed Expenses
  INSERT INTO expenses (bakery_id, category, description, amount, expense_date, payment_method)
  VALUES
    (v_bakery_id, 'Ingredients', 'Belgian Chocolate & Flour Bulk Order', 450000, CURRENT_DATE - INTERVAL '2 days', 'UPI'),
    (v_bakery_id, 'Packaging', 'Cake Boxes & Ribbon Roll', 120000, CURRENT_DATE - INTERVAL '5 days', 'CASH'),
    (v_bakery_id, 'Delivery', 'Local Courier Charges', 35000, CURRENT_DATE - INTERVAL '1 day', 'UPI')
  ON CONFLICT DO NOTHING;

  -- 6. Seed Orders
  INSERT INTO orders (id, bakery_id, customer_id, order_number, delivery_date, delivery_time_slot, delivery_address, subtotal, discount, delivery_charge, tax, total, status, payment_status, notes)
  VALUES
    (v_order_1, v_bakery_id, v_cust_1, '#1001', CURRENT_DATE, '16:00-18:00', 'Flat 302, Sunrise Apartments', 120000, 0, 5000, 0, 125000, 'DELIVERED', 'PAID', 'Birthday cake order'),
    (v_order_2, v_bakery_id, v_cust_2, '#1002', CURRENT_DATE + INTERVAL '1 day', '11:00-13:00', 'Villa 12, Palm Meadows', 45000, 5000, 0, 0, 40000, 'IN_PROGRESS', 'UNPAID', 'Party cupcakes order')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
  VALUES
    (v_order_1, v_prod_1, 'Chocolate Truffle Cake (1 kg)', 1, 120000, 120000),
    (v_order_2, v_prod_2, 'Red Velvet Cupcakes (Box of 6)', 1, 45000, 45000)
  ON CONFLICT DO NOTHING;

  INSERT INTO payments (bakery_id, order_id, amount, payment_method, reference)
  VALUES
    (v_bakery_id, v_order_1, 125000, 'UPI', 'UPI987654321')
  ON CONFLICT DO NOTHING;

END $$;
