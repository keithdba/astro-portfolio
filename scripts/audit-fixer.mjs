import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const packagePath = join(process.cwd(), 'package.json');

const addOverride = (pkgName, version) => {
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    if (!pkg.overrides) {
      pkg.overrides = {};
    }
    
    pkg.overrides[pkgName] = version;
    
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Successfully added override for ${pkgName} to version ${version}`);
  } catch (error) {
    console.error('Error updating package.json overrides:', error);
    process.exit(1);
  }
};

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/audit-fixer.mjs <package-name> <version>');
  process.exit(1);
}

addOverride(args[0], args[1]);
