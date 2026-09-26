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
  optionalUuid,
  paiseText,
  positiveWholeText,
  requiredEmail,
  requiredLine,
  requiredLines,
  wholeNumberText,
} from "./primitives";

export {
  changePasswordSchema,
  confirmEmailSchema,
  loginSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordResetRequestSchema,
  registerSchema,
  roleSchema,
  type ChangePasswordInput,
  type ChangePasswordPayload,
  type ConfirmEmailInput,
  type ConfirmEmailPayload,
  type LoginInput,
  type LoginPayload,
  type PasswordResetRequestInput,
  type PasswordResetRequestPayload,
  type RegisterInput,
  type RegisterPayload,
} from "./schemas/auth";

export {
  businessProfileSchema,
  type BusinessProfileInput,
  type BusinessProfilePayload,
} from "./schemas/business";

export {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type CreateCustomerPayload,
  type UpdateCustomerInput,
  type UpdateCustomerPayload,
} from "./schemas/customer";

export {
  createProductSchema,
  PRODUCT_UNIT_LABELS,
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

export {
  createExpenseSchema,
  expenseCategorySchema,
  expenseFormSchema,
  paymentMethodSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type CreateExpensePayload,
  type ExpenseFormPayload,
  type ExpenseFormValues,
  type UpdateExpenseInput,
  type UpdateExpensePayload,
} from "./schemas/expense";

export {
  logInventoryTransactionSchema,
  signedQuantity,
  stockAdjustmentFormSchema,
  type LogInventoryTransactionInput,
  type LogInventoryTransactionPayload,
  type StockAdjustmentFormPayload,
  type StockAdjustmentFormValues,
} from "./schemas/inventory";

export {
  catalogueItemSchema,
  createOrderSchema,
  customItemFormSchema,
  customItemSchema,
  customLineSchema,
  orderAdjustmentSchema,
  orderCustomerSchema,
  orderFormSchema,
  orderItemSchema,
  orderListQuerySchema,
  orderPaymentFormSchema,
  orderPaymentSchema,
  updateOrderStatusSchema,
  type CreateOrderAdjustmentInput,
  type CreateOrderInput,
  type CreateOrderItemInput,
  type CreateOrderItemPayload,
  type CustomItemFormPayload,
  type CustomItemFormValues,
  type CreateOrderPayload,
  type OrderCustomer,
  type OrderFormPayload,
  type OrderFormValues,
  type OrderListQuery,
  type OrderPayment,
  type OrderPaymentFormValues,
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
