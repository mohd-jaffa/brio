const fs = require('fs');
const path = require('path');

const replaceInFiles = () => {
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

  const allFiles = getAllFiles(path.join(process.cwd(), 'src'));
  if (fs.existsSync(path.join(process.cwd(), 'tests'))) {
    allFiles.push(...getAllFiles(path.join(process.cwd(), 'tests')));
  }

  for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix ERROR_MESSAGES.* being passed to AppErrors
    const errorCodes = [
      'VALIDATION_ERROR', 'VALIDATION_INVALID_JSON', 'AUTH_INVALID_CREDENTIALS',
      'AUTH_SESSION_REQUIRED', 'AUTH_SESSION_INVALID', 'AUTH_ACCOUNT_INACTIVE',
      'AUTH_ACCOUNT_NOT_CONFIRMED', 'AUTH_PASSWORD_CHANGE_REQUIRED', 'AUTH_ROLE_FORBIDDEN',
      'AUTH_EMAIL_ALREADY_EXISTS', 'AUTH_PHONE_ALREADY_EXISTS', 'CONFIG_INVALID',
      'MAIL_PROVIDER_NOT_CONFIGURED', 'EXTERNAL_SERVICE_ERROR', 'CONFLICT',
      'NOT_FOUND', 'INTERNAL_ERROR', 'SAVE_FAILED', 'UPLOAD_FAILED', 'RECORD_NOT_FOUND'
    ];

    for (const code of errorCodes) {
      const regex = new RegExp(`ERROR_MESSAGES\\.${code}`, 'g');
      if (regex.test(content) && (file.includes('repository.ts') || file.includes('service.ts') || file.includes('handler.ts') || file.includes('guard.ts') || file.includes('server.ts') || file.includes('nodemailer.provider.ts'))) {
        content = content.replace(regex, `"${code}"`);
        changed = true;
      }
    }

    // Fix `../client` to `@/shared/api/client` in api.client.ts files
    if (file.endsWith('api.client.ts')) {
      if (content.includes('from "../client"')) {
        content = content.replace(/from "\.\.\/client"/g, 'from "@/shared/api/client"');
        changed = true;
      }
    }
    
    // Fix CustomerProfileClient.tsx and others importing `getErrorMessage` or `ERROR_CODES` from `@/shared/constants/errors` incorrectly if left over
    if (content.includes('ERROR_CODES')) {
      content = content.replace(/ERROR_CODES/g, 'ERROR_MESSAGES');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed errors/imports in ${file}`);
    }
  }
};

replaceInFiles();
