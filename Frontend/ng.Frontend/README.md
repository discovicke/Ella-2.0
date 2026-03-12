# ELLA Frontend

This project is the Angular frontend for the ELLA booking system. It follows a **Standalone Component** architecture with strict separation between Layouts and Pages.

## 🚀 Getting Started

The frontend is usually started via the root orchestration script:
```bash
# From the project root
npm start
```

If you need to work strictly on the frontend:
```bash
# From Frontend/ng.Frontend
npm start
```

## 🛠️ Developer Workflow

### Custom Generators
We use custom scripts to enforce naming conventions and architecture. **Do not use `ng generate component` for pages or layouts.**

- **Generate a Page:** `npm run g-page <path/name>`
- **Generate a Layout:** `npm run g-layout <path/name>`

### API Synchronization
TypeScript models are automatically generated from the Backend's OpenAPI spec. To manualy sync:
```bash
# From the project root
npm run sync:models
```
This runs `swagger-typescript-api` and updates `src/app/models/models.ts` and `input-limits.ts`.

## 🧪 Testing
We use **Vitest** for unit testing.
```bash
npm test
```

## 🏗️ Architecture
- **Pages:** Routable components located in `src/app/pages`.
- **Layouts:** Shell components containing sidebars/topbars and a `<router-outlet>`.
- **Shared:** Reusable dumb components, services, and pipes.
- **Core:** Auth guards, interceptors, and global session management.

For more details, see the [MASTER_GUIDE.md](./_docs/MASTER_GUIDE.md).
