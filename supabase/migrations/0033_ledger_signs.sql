-- ============================================================
-- A stock line moves stock the way its kind says (AGENTS §14; tracker R6.6).
--
-- The app has always checked it (`signIsRight`, src/lib/validation/schemas/
-- inventory.ts), but only the app: a request made straight to the database's
-- API with an owner's token could write a stock-in of −5, and the balance
-- would believe it. The integration tests found it. Now the database checks
-- the same rule, which a test keeps equal to the app's:
--
--   stock in, a return            add            quantity > 0
--   a consumption, wastage        take away      quantity < 0
--   a reservation, an adjustment  either way     quantity <> 0
--
-- A reservation goes either way: placing takes it (−q), and delivering or
-- cancelling gives it back (+q), 0016.
--
-- `not valid`: every new line is checked, and lines already written are left
-- as they are, so no database with an old mistake in it fails to migrate.
-- ============================================================

alter table public.inventory_transactions
  add constraint inventory_transactions_sign_check check (
    case
      when type in ('STOCK_IN', 'RETURN') then quantity > 0
      when type in ('ORDER_CONSUMPTION', 'WASTAGE') then quantity < 0
      else quantity <> 0
    end
  ) not valid;
