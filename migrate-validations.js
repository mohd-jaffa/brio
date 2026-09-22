const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const libDir = path.join(srcDir, 'lib');
const validationDir = path.join(libDir, 'validation');
const schemasDir = path.join(validationDir, 'schemas');

// Create directories
if (!fs.existsSync(libDir)) fs.mkdirSync(libDir);
if (!fs.existsSync(validationDir)) fs.mkdirSync(validationDir);
if (!fs.existsSync(schemasDir)) fs.mkdirSync(schemasDir);

// 1. Create primitives.ts
const primitivesContent = `import { z } from 'zod';
import { VALIDATION_MESSAGES } from '@/constants/messages';

export function optionalNumberText(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === '') return null;
      if (!/^\\d+(\\.\\d+)?$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: VALIDATION_MESSAGES.number(label) });
        return z.NEVER;
      }
      return Number(text);
    });
}

export function optionalText() {
  return z
    .string()
    .trim()
    .transform((text) => (text === '' ? null : text));
}

export function optionalEmail(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === '') return null;
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: VALIDATION_MESSAGES.email(label) });
        return z.NEVER;
      }
      return text;
    });
}
`;
fs.writeFileSync(path.join(validationDir, 'primitives.ts'), primitivesContent, 'utf8');

// Mapping of old feature validation names to new schema names
const featureToSchema = {
  auth: 'auth.ts',
  customers: 'customer.ts',
  products: 'product.ts',
  orders: 'order.ts',
  inventory: 'inventory.ts',
  expenses: 'expense.ts',
};

const exportsList = [];

// 2. Move and rename validation files
for (const [feature, schemaFile] of Object.entries(featureToSchema)) {
  const oldPath = path.join(srcDir, 'features', feature, 'validation.ts');
  const newPath = path.join(schemasDir, schemaFile);

  if (fs.existsSync(oldPath)) {
    let content = fs.readFileSync(oldPath, 'utf8');
    
    // Fix internal imports in the validation files
    // If they import from types in the same feature folder, update the path
    // e.g. import { ... } from "./types" -> from "@/features/feature/types"
    content = content.replace(/from "\.\/(types|schema|constants.*)"/g, `from "@/features/${feature}/$1"`);
    content = content.replace(/from "\.\.\/\.\.\/constants\/messages"/g, `from "@/constants/messages"`);
    
    fs.writeFileSync(newPath, content, 'utf8');
    fs.unlinkSync(oldPath);
    exportsList.push(`export * from './schemas/${schemaFile.replace('.ts', '')}';`);
  }
}

// 3. Create index.ts
exportsList.push("export * from './primitives';");
fs.writeFileSync(path.join(validationDir, 'index.ts'), exportsList.join('\\n') + '\\n', 'utf8');

// 4. Update imports across the codebase
const getAllFiles = (dir, filesList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        getAllFiles(fullPath, filesList);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
};

const allFiles = getAllFiles(srcDir);
if (fs.existsSync(path.join(process.cwd(), 'tests'))) {
  allFiles.push(...getAllFiles(path.join(process.cwd(), 'tests')));
}

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [feature] of Object.entries(featureToSchema)) {
    // e.g. import { createCustomerSchema } from "@/features/customers/validation"
    // or   import { ... } from "../validation" if inside the same feature
    const regex1 = new RegExp(`@/features/${feature}/validation`, 'g');
    if (regex1.test(content)) {
      content = content.replace(regex1, `@/lib/validation`);
      changed = true;
    }

    const regex2 = new RegExp(`\\.\\./${feature}/validation`, 'g');
    if (regex2.test(content)) {
      content = content.replace(regex2, `@/lib/validation`);
      changed = true;
    }

    // if inside the feature folder: import { ... } from "./validation"
    if (file.includes(`/features/${feature}/`)) {
      const regex3 = new RegExp(`from "\\./validation"`, 'g');
      if (regex3.test(content)) {
        content = content.replace(regex3, `from "@/lib/validation"`);
        changed = true;
      }
    }
    
    // tests/backend importing ../../src/features/auth/auth.validation or validation
    const regex4 = new RegExp(`\\.\\./\\.\\./src/features/${feature}/validation`, 'g');
    if (regex4.test(content)) {
      content = content.replace(regex4, `@/lib/validation`); // wait, tests are not compiled with webpack by default so `@/` might break if tsconfig paths aren't fully set up for tests? Wait, tsconfig paths work in vitest. We'll use absolute `@/` imports.
      changed = true;
    }
  }

  // Final catch for any remaining ../../src/features/*/validation in tests
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated imports in ${file}`);
  }
}

console.log("Migration complete.");
