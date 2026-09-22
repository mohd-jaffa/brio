const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const features = ['auth', 'customers', 'products', 'orders', 'inventory', 'expenses', 'analytics'];

// 1. Move modules -> features
for (const feature of features) {
  const modulePath = path.join(process.cwd(), 'src/modules', feature);
  const featurePath = path.join(process.cwd(), 'src/features', feature);
  
  if (fs.existsSync(modulePath)) {
    const files = fs.readdirSync(modulePath);
    for (const file of files) {
      if (file.endsWith('.ts')) {
        // e.g. customers.types.ts -> types.ts
        const newName = file.replace(`${feature}.`, '');
        fs.renameSync(path.join(modulePath, file), path.join(featurePath, newName));
      }
    }
  }
}

// 2. Move api clients -> features/*/api.ts
const clientsDir = path.join(process.cwd(), 'src/shared/api/clients');
if (fs.existsSync(clientsDir)) {
  const clients = fs.readdirSync(clientsDir);
  for (const client of clients) {
    const featureName = client.split('.')[0];
    if (features.includes(featureName)) {
      fs.renameSync(
        path.join(clientsDir, client),
        path.join(process.cwd(), 'src/features', featureName, 'api.client.ts') // keep .client.ts to avoid clash if api/ folder exists, or rename to frontendApi.ts
      );
    }
  }
}

// 3. Move components -> features/*/components
for (const feature of features) {
  const componentsPath = path.join(process.cwd(), 'src/app', feature, '_components');
  const targetComponentsPath = path.join(process.cwd(), 'src/features', feature, 'components');
  
  if (fs.existsSync(componentsPath)) {
    const files = fs.readdirSync(componentsPath);
    for (const file of files) {
      fs.renameSync(path.join(componentsPath, file), path.join(targetComponentsPath, file));
    }
    // Remove the now-empty _components dir
    fs.rmdirSync(componentsPath);
  }
}

// 4. Global Find and Replace for Imports
const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });

// We need to find all .ts and .tsx files and replace:
// '@/modules/customers/customers.types' -> '@/features/customers/types'
// '@/modules/customers/customers.validation' -> '@/features/customers/validation'
// '@/modules/customers/customers.service' -> '@/features/customers/service'
// '@/modules/customers/customers.repository' -> '@/features/customers/repository'
// '@/shared/api/clients/customers.client' -> '@/features/customers/api.client'
// '@/app/customers/_components' -> '@/features/customers/components'

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
  // include tests
  if (fs.existsSync(path.join(process.cwd(), 'tests'))) {
    allFiles.push(...getAllFiles(path.join(process.cwd(), 'tests')));
  }

  for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const feature of features) {
      // Types/Validation/Service/Repository
      const moduleRegex = new RegExp(`@/modules/${feature}/${feature}\\.(types|validation|service|repository|security|guard)`, 'g');
      if (moduleRegex.test(content)) {
        content = content.replace(moduleRegex, `@/features/${feature}/$1`);
        changed = true;
      }

      // API Client
      const clientRegex = new RegExp(`@/shared/api/clients/${feature}\\.client`, 'g');
      if (clientRegex.test(content)) {
        content = content.replace(clientRegex, `@/features/${feature}/api.client`);
        changed = true;
      }

      // Components
      const compRegex = new RegExp(`@/app/${feature}/_components`, 'g');
      if (compRegex.test(content)) {
        content = content.replace(compRegex, `@/features/${feature}/components`);
        changed = true;
      }
      const compRegexRelative = new RegExp(`\\./_components`, 'g');
      // For page.tsx files inside app/customers/ for instance
      if (file.includes(`src/app/${feature}`) && compRegexRelative.test(content)) {
        content = content.replace(compRegexRelative, `@/features/${feature}/components`);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated imports in ${file}`);
    }
  }
};

replaceInFiles();
