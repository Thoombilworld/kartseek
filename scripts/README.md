# KARTSEEK — Scripts Directory

Utility and automation scripts organized by platform.

## Directory Structure

```text
scripts/
├── api/                                ← Backend (NestJS) scripts
│   ├── scaffold_microservices.js       ← Generate module/controller/service for all 23 microservices
│   ├── scaffold_project_structure.js   ← Initial project scaffolding (libs + apps + nest-cli.json)
│   ├── write_all_service_files.js      ← Write remaining service boilerplate (idempotent)
│   └── install_backend_dependencies.js ← Install all npm packages for the backend
│
├── mobile/                             ← Flutter mobile scripts
│   ├── run_customer_app.ps1            ← Clean build & run the Customer app
│   ├── run_partner_app.ps1             ← Build & run the Partner/Driver app (APK/IPA)
│   ├── fix_objective_c_bug.ps1         ← Workaround for Dart objective_c crash on Windows
│   ├── fix_const_errors.js             ← Remove invalid `const` keywords from Dart code
│   ├── fix_static_declarations.js      ← Convert static const arrays with RegionService to getters
│   ├── fix_undeclared_variables.js      ← Repair variables that lost `final` after const-removal
│   └── replace_hardcoded_currency.js   ← Replace ₹ symbols with dynamic RegionService currency
│
├── web/                                ← Next.js web scripts
│   └── fix_accessibility_lint.js       ← Add missing title/label attributes for a11y compliance
│
└── reorganize_project.ps1              ← One-time cleanup: moves old files to new locations
```

## Usage

All scripts are designed to be run from the **monorepo root** (`c:\KARTSEEKAPP\`):

```powershell
# Backend
node scripts/api/install_backend_dependencies.js
node scripts/api/scaffold_microservices.js

# Mobile (run from apps/mobile/ for Flutter scripts)
powershell -File scripts\mobile\run_customer_app.ps1
powershell -File scripts\mobile\run_partner_app.ps1

# Web
node scripts/web/fix_accessibility_lint.js
```
