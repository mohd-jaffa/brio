import fs from 'fs';
import path from 'path';

const files = [
  "src/app/customers/_components/CustomerFormSheet.tsx",
  "src/app/expenses/_components/ExpenseFormSheet.tsx",
  "src/app/inventory/_components/InventoryAdjustmentSheet.tsx",
  "src/app/orders/[id]/page.tsx",
  "src/app/orders/new/page.tsx",
  "src/app/products/_components/ProductFormSheet.tsx",
  "src/app/settings/page.tsx",
  "src/infrastructure/env/server.ts",
  "src/infrastructure/mail/nodemailer.provider.ts",
  "src/modules/auth/auth.guard.ts",
  "src/modules/auth/auth.repository.ts",
  "src/modules/auth/auth.service.ts",
  "src/modules/customers/customers.repository.ts",
  "src/modules/expenses/expenses.repository.ts",
  "src/modules/inventory/inventory.repository.ts",
  "src/modules/orders/orders.repository.ts",
  "src/modules/orders/orders.service.ts",
  "src/modules/products/products.repository.ts",
  "src/shared/api/handler.ts",
  "src/shared/api/responses.ts",
  "src/shared/errors/app-error.ts"
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace imports
  content = content.replace(/@\/shared\/constants\/errors/g, '@/constants/messages');
  
  // Replace ERROR_CODES with ERROR_MESSAGES
  content = content.replace(/ERROR_CODES/g, 'ERROR_MESSAGES');
  
  // Replace ErrorCode with ErrorMessageCode
  content = content.replace(/ErrorCode/g, 'ErrorMessageCode');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
