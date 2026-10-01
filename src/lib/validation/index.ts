/**
 * The app's validation, in one place (AGENTS.md §22). Each entity is declared
 * once in ./schemas — its fields, their limits, and the message for each
 * mistake — and the form that edits it and the route that accepts it use the
 * same declaration. A limit the database also enforces is written to match its
 * CHECK constraint.
 *
 * Nothing under src/features declares a schema of its own.
 */
export {
  amountText,
  firstIssue,
  indianMobile,
  optionalEmail,
  optionalNumberText,
  optionalLine,
  optionalLines,
  optionalUrl,
  paiseText,
  positiveWholeText,
  requiredEmail,
  requiredLine,
  requiredLines,
  wholeNumberText,
} from "./primitives";

export {
  changeAvatarSchema,
  changeEmailSchema,
  changeNameSchema,
  changePasswordSchema,
  changePhoneSchema,
  confirmEmailChangeSchema,
  confirmEmailSchema,
  deleteAccountSchema,
  loginSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordResetRequestSchema,
  registerSchema,
  roleSchema,
  type ChangeAvatarInput,
  type ChangeAvatarPayload,
  type ChangeEmailInput,
  type ChangeEmailPayload,
  type ChangeNameInput,
  type ChangeNamePayload,
  type ChangePasswordInput,
  type ChangePasswordPayload,
  type ChangePhoneInput,
  type ChangePhonePayload,
  type ConfirmEmailChangePayload,
  type ConfirmEmailInput,
  type ConfirmEmailPayload,
  type DeleteAccountInput,
  type DeleteAccountPayload,
  type LoginInput,
  type LoginPayload,
  type PasswordResetRequestInput,
  type PasswordResetRequestPayload,
  type RegisterInput,
  type RegisterPayload,
} from "./schemas/auth";

export { businessProfileSchema, type BusinessProfileInput, type BusinessProfilePayload } from "./schemas/business";

export {
  createCustomerSchema,
  customerListQuerySchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type CreateCustomerPayload,
  type CustomerListQuery,
  type UpdateCustomerInput,
  type UpdateCustomerPayload,
} from "./schemas/customer";

export {
  createProductSchema,
  PRODUCT_UNITS,
  productFormSchema,
  updateProductSchema,
  type CreateProductInput,
  type CreateProductPayload,
  type ProductFormPayload,
  type ProductFormValues,
  type UpdateProductInput,
  type UpdateProductPayload,
} from "./schemas/product";

export { cursorParam, listQuerySchema, searchParam, type ListQuery } from "./schemas/list";
export { dashboardQuerySchema, type DashboardQuery } from "./schemas/dashboard";
export {
  dayParam,
  MAX_RANGE_DAYS,
  pagedRangeQuerySchema,
  rangeQuerySchema,
  type PagedRangeQuery,
  type RangeQuery,
} from "./schemas/range";

export {
  createExpenseSchema,
  expenseCategoryFormSchema,
  expenseCategorySchema,
  expenseFormSchema,
  expenseListQuerySchema,
  paymentMethodSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type CreateExpensePayload,
  type ExpenseCategoryFormInput,
  type ExpenseCategoryFormPayload,
  type ExpenseFormPayload,
  type ExpenseFormValues,
  type ExpenseListQuery,
  type UpdateExpenseInput,
  type UpdateExpensePayload,
} from "./schemas/expense";

export {
  logInventoryTransactionSchema,
  signedQuantity,
  stockAdjustmentFormSchema,
  stockLedgerQuerySchema,
  type LogInventoryTransactionInput,
  type LogInventoryTransactionPayload,
  type StockAdjustmentFormPayload,
  type StockAdjustmentFormValues,
  type StockLedgerQuery,
} from "./schemas/inventory";

export {
  catalogueItemSchema,
  createOrderSchema,
  customItemFormSchema,
  customItemSchema,
  customLineSchema,
  editOrderFormSchema,
  editOrderItemSchema,
  orderAdjustmentSchema,
  orderCustomerSchema,
  orderFormSchema,
  orderItemSchema,
  orderCountsQuerySchema,
  orderListQuerySchema,
  orderPaymentFormSchema,
  orderPaymentSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  type CreateOrderAdjustmentInput,
  type CreateOrderInput,
  type CreateOrderItemInput,
  type CreateOrderItemPayload,
  type CustomItemFormPayload,
  type CustomItemFormValues,
  type CreateOrderPayload,
  type EditOrderFormPayload,
  type EditOrderFormValues,
  type OrderCustomer,
  type OrderFormPayload,
  type OrderFormValues,
  type OrderCountsQuery,
  type OrderListQuery,
  type OrderPayment,
  type OrderPaymentFormValues,
  type UpdateOrderInput,
  type UpdateOrderPayload,
  type UpdateOrderStatusInput,
  type UpdateOrderStatusPayload,
} from "./schemas/order";

export {
  createPaymentSchema,
  paymentFormSchema,
  type CreatePaymentInput,
  type CreatePaymentPayload,
  type PaymentFormPayload,
  type PaymentFormValues,
} from "./schemas/payment";

export {
  notificationIdSchema,
  notificationListQuerySchema,
  pushSubscriptionSchema,
  type NotificationListQuery,
  type PushSubscriptionInput,
  type PushSubscriptionPayload,
} from "./schemas/notification";

export {
  adminErrorQuerySchema,
  adminListQuerySchema,
  type AdminErrorQuery,
  type AdminListQuery,
} from "./schemas/admin";
