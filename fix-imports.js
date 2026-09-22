const fs = require('fs');
const path = require('path');

const features = ['auth', 'customers', 'products', 'orders', 'inventory', 'expenses', 'analytics'];

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

    for (const feature of features) {
      // e.g. customers.service -> service
      const regex1 = new RegExp(`@/features/${feature}/${feature}\\.(types|validation|service|repository|security|guard)`, 'g');
      if (regex1.test(content)) {
        content = content.replace(regex1, `@/features/${feature}/$1`);
        changed = true;
      }
      
      // In tests using relative imports like `../../src/features/auth/auth.service` -> `../../src/features/auth/service`
      const regex2 = new RegExp(`src/features/${feature}/${feature}\\.(types|validation|service|repository|security|guard)`, 'g');
      if (regex2.test(content)) {
        content = content.replace(regex2, `src/features/${feature}/$1`);
        changed = true;
      }
      
      // Also for ./customers.repository
      const regex3 = new RegExp(`\\./${feature}\\.(types|validation|service|repository|security|guard)`, 'g');
      if (regex3.test(content)) {
        content = content.replace(regex3, `./$1`);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated renamed imports in ${file}`);
    }
  }
};

replaceInFiles();
