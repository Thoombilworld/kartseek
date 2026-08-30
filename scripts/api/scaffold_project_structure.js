/**
 * KARTSEEK — Initial Project Structure Scaffold
 * ────────────────────────────────────────────────────────────────────────
 * Creates the initial NestJS monorepo structure: all microservice apps,
 * shared libraries, tsconfig paths, and nest-cli.json entries.
 * Also installs core dependencies (mongoose, graphql, grpc, kafka).
 *
 * Location: scripts/api/scaffold_project_structure.js
 * Run from monorepo root:
 *   node scripts/api/scaffold_project_structure.js
 * ────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = path.resolve(__dirname, '..', '..', 'apps', 'api');

const apps = [
  'user-service', 'marketplace-service', 'grocery-service', 'restaurant-service',
  'pharmacy-service', 'doctor-service', 'taxi-service', 'delivery-service',
  'location-service', 'search-service', 'cart-service', 'order-service',
  'payment-service', 'wallet-service', 'loyalty-service', 'refund-service',
  'commission-service', 'payout-service', 'notification-service', 'admin-service',
  'seller-service', 'franchise-service', 'audit-log-service', 'report-service'
];

const libs = [
  'common', 'database', 'guards', 'decorators', 'validators', 'dto',
  'events', 'logger', 'security', 'grpc', 'kafka'
];

const packages = [
  '@nestjs/mongoose', 'mongoose',
  '@nestjs/graphql', '@nestjs/apollo', 'graphql', 'apollo-server-express',
  '@grpc/grpc-js', '@grpc/proto-loader',
  'kafkajs'
];

console.log('1. Installing dependencies...');
try {
  execSync(`npm install --save ${packages.join(' ')}`, { stdio: 'inherit', cwd: API_DIR });
  console.log('Dependencies installed successfully.');
} catch (e) {
  console.error('Error installing dependencies:', e.message);
}

const nestCliPath = path.join(API_DIR, 'nest-cli.json');
let nestCli = JSON.parse(fs.readFileSync(nestCliPath, 'utf8'));

console.log('2. Scaffolding Libraries...');
libs.forEach(lib => {
  const libRoot = `libs/${lib}`;
  const srcPath = `${libRoot}/src`;

  if (!fs.existsSync(path.join(API_DIR, srcPath))) {
    fs.mkdirSync(path.join(API_DIR, srcPath), { recursive: true });

    // Create index.ts
    fs.writeFileSync(path.join(API_DIR, srcPath, 'index.ts'), `export * from './${lib}.module';\n`);

    // Create module
    const moduleName = lib.charAt(0).toUpperCase() + lib.slice(1) + 'Module';
    fs.writeFileSync(path.join(API_DIR, srcPath, `${lib}.module.ts`), `import { Module } from '@nestjs/common';\n\n@Module({\n  providers: [],\n  exports: [],\n})\nexport class ${moduleName} {}\n`);

    // Create tsconfig
    fs.writeFileSync(path.join(API_DIR, libRoot, 'tsconfig.lib.json'), JSON.stringify({
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "declaration": true,
        "outDir": "../../dist/libs/" + lib
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
    }, null, 2));

    // Update nest-cli.json
    nestCli.projects[lib] = {
      type: "library",
      root: libRoot,
      entryFile: "index",
      sourceRoot: srcPath,
      compilerOptions: {
        tsConfigPath: `${libRoot}/tsconfig.lib.json`
      }
    };
    console.log(`- Created lib: ${lib}`);
  }
});

console.log('3. Scaffolding Microservices...');
apps.forEach(app => {
  const appRoot = `apps/${app}`;
  const srcPath = `${appRoot}/src`;

  if (!fs.existsSync(path.join(API_DIR, srcPath))) {
    fs.mkdirSync(path.join(API_DIR, srcPath), { recursive: true });

    // Create main.ts
    const funcName = app.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    fs.writeFileSync(path.join(API_DIR, srcPath, 'main.ts'), `import { NestFactory } from '@nestjs/core';\nimport { ${funcName.charAt(0).toUpperCase() + funcName.slice(1)}Module } from './${app}.module';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(${funcName.charAt(0).toUpperCase() + funcName.slice(1)}Module);\n  await app.listen(3000);\n}\nbootstrap();\n`);

    // Create module
    const moduleName = funcName.charAt(0).toUpperCase() + funcName.slice(1) + 'Module';
    fs.writeFileSync(path.join(API_DIR, srcPath, `${app}.module.ts`), `import { Module } from '@nestjs/common';\n\n@Module({\n  imports: [],\n  controllers: [],\n  providers: [],\n})\nexport class ${moduleName} {}\n`);

    // Create tsconfig
    fs.writeFileSync(path.join(API_DIR, appRoot, 'tsconfig.app.json'), JSON.stringify({
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "declaration": false,
        "outDir": "../../dist/apps/" + app
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
    }, null, 2));

    // Update nest-cli.json
    nestCli.projects[app] = {
      type: "application",
      root: appRoot,
      entryFile: "main",
      sourceRoot: srcPath,
      compilerOptions: {
        tsConfigPath: `${appRoot}/tsconfig.app.json`
      }
    };
    console.log(`- Created app: ${app}`);
  }
});

// Update tsconfig.json paths for libs
const tsconfigPath = path.join(API_DIR, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  let tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};
  if (!tsconfig.compilerOptions.paths) tsconfig.compilerOptions.paths = {};

  libs.forEach(lib => {
    tsconfig.compilerOptions.paths[`@app/${lib}`] = [`libs/${lib}/src`];
    tsconfig.compilerOptions.paths[`@app/${lib}/*`] = [`libs/${lib}/src/*`];
  });

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  console.log('4. Updated tsconfig.json with library paths.');
}

// Write nest-cli.json
fs.writeFileSync(nestCliPath, JSON.stringify(nestCli, null, 2));
console.log('5. Updated nest-cli.json with all projects.');

console.log('\n✅ Scaffolding complete! You can now start building the services.');
