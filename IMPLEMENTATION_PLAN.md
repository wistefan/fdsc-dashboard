# Implementation Plan: Create a Dashboard to manage DSC resources

## Overview

Build a web dashboard (Vue 3 + TypeScript + Vuetify) for managing Data Space Connector resources: Trusted Issuers List (TIL), Credentials Config Service (CCS), and ODRL-PAP Policies. The project is greenfield. Development follows two phases: first read-only visualization, then full CRUD. The dashboard must be locally testable, fully themable, and localizable.

## Steps

### Step 1: Project scaffolding and tooling setup

Set up a Vue 3 + TypeScript project using Vite. Install core dependencies: Vue Router, Pinia (state management), Vuetify 3 (Material Design component library for theming), and Vue I18n (localization).

**Files created:**
- `package.json` — project metadata and dependencies
- `vite.config.ts` — Vite configuration with proxy support for backend APIs
- `tsconfig.json` — TypeScript configuration
- `src/main.ts` — application entry point
- `src/App.vue` — root component with router-view and navigation shell
- `src/router/index.ts` — Vue Router setup with placeholder routes
- `src/stores/index.ts` — Pinia store initialization
- `.eslintrc.cjs` / `.prettierrc` — linting and formatting config
- `index.html` — HTML entry point
- `Dockerfile` — multi-stage build (node build + nginx serve)
- `docker-compose.yml` — local dev setup with mock backends

**Acceptance criteria:**
- `npm install && npm run dev` starts a working dev server
- `npm run build` produces a production build
- `docker compose up` starts the dashboard with all backend services mocked or stubbed
- Basic navigation shell renders with sidebar/drawer listing TIL, CCS, Policies sections

### Step 2: Theming and localization infrastructure

Configure Vuetify's theming system for full customizability and set up Vue I18n with English as the default locale. All user-facing strings must go through i18n.

**Files created/modified:**
- `src/plugins/vuetify.ts` — Vuetify plugin with light/dark theme definitions, custom color palette, and theme toggle support
- `src/plugins/i18n.ts` — Vue I18n plugin with English locale loaded by default
- `src/locales/en.json` — English translation strings (navigation labels, page titles, common actions like Create/Edit/Delete/Save/Cancel)
- `src/composables/useTheme.ts` — composable for theme switching with localStorage persistence
- `src/App.vue` — integrate theme toggle in app bar

**Acceptance criteria:**
- Theme can be toggled between light and dark modes via a UI control
- Custom theme colors (primary, secondary, accent) are defined and applied consistently
- All visible strings come from `en.json` locale file
- Adding a new locale requires only adding a new JSON file and registering it

### Step 3: API client generation and configuration

Generate TypeScript API clients from the upstream OpenAPI specifications for TIL, CCS, and ODRL-PAP. Use `openapi-typescript-codegen` or `openapi-generator-cli` to produce typed clients. Specs are downloaded at build time from their upstream repositories using pinned versions defined in `spec-versions.env`.

**Files created:**
- `spec-versions.env` — pinned git refs (tags/branches) for each upstream OpenAPI spec
- `scripts/download-specs.sh` — downloads versioned specs from upstream GitHub repos into `specs/`
- `src/api/generated/til/` — generated TIL client (services, models, types)
- `src/api/generated/tir/` — generated TIR client
- `src/api/generated/ccs/` — generated CCS client
- `src/api/generated/odrl/` — generated ODRL-PAP client
- `src/api/config.ts` — base URL configuration per service, read from environment variables
- `scripts/generate-api-clients.sh` — script to regenerate all clients from specs
- `package.json` — add `generate:api` npm script

**Acceptance criteria:**
- Running `npm run generate:api` regenerates all typed clients from the spec files
- Each generated client has typed request/response models matching the upstream OpenAPI
- Base URLs are configurable via environment variables (`VITE_TIL_API_URL`, `VITE_CCS_API_URL`, `VITE_ODRL_API_URL`, `VITE_TIR_API_URL`)
- API clients are importable from `@/api/generated/*`

### Step 4: TIL (Trusted Issuers List) visualization

Create a read-only view for Trusted Issuers. Since the TIL management API has no list endpoint, use the TIR (EBSI-compatible registry) API `GET /v4/issuers/` for listing and the management API `GET /issuer/{did}` for detail views.

**Files created/modified:**
- `src/views/til/TilListView.vue` — paginated table of trusted issuers (DID, issuer type, number of credentials) using TIR API
- `src/views/til/TilDetailView.vue` — detail view showing issuer DID, all credentials with their types, validity periods, and claims
- `src/stores/til.ts` — Pinia store for TIL state (issuers list, selected issuer, loading/error states)
- `src/router/index.ts` — add routes `/til` and `/til/:did`
- `src/locales/en.json` — add TIL-related translation keys

**Acceptance criteria:**
- `/til` route displays a paginated data table of issuers fetched from TIR API
- Clicking an issuer row navigates to `/til/:did` showing full issuer details
- Credentials are displayed in an expandable/accordion format showing type, validity range, and claims
- Loading and error states are handled with appropriate UI feedback
- Empty state is displayed when no issuers exist

### Step 5: CCS (Credentials Config Service) visualization

Create a read-only view for Credentials Config Service entries using `GET /service` (list) and `GET /service/{id}` (detail).

**Files created/modified:**
- `src/views/ccs/CcsListView.vue` — paginated table of services (ID, default OIDC scope, number of scopes configured)
- `src/views/ccs/CcsDetailView.vue` — detail view showing service ID, authorization type, OIDC scopes with their credential configurations, presentation definitions, and trust anchors
- `src/stores/ccs.ts` — Pinia store for CCS state
- `src/router/index.ts` — add routes `/ccs` and `/ccs/:id`
- `src/locales/en.json` — add CCS-related translation keys

**Acceptance criteria:**
- `/ccs` route displays a paginated data table of services
- Clicking a service navigates to `/ccs/:id` with full detail
- OIDC scopes are displayed as expandable sections, each showing its credential requirements
- Presentation definitions and DCQL queries are rendered in a readable format (structured view or formatted JSON)
- Loading, error, and empty states are handled

### Step 6: Policies (ODRL-PAP) visualization

Create a read-only view for ODRL policies, supporting both global policies and service-scoped policies.

**Files created/modified:**
- `src/views/policies/PolicyListView.vue` — tabbed or segmented view: "Global Policies" tab listing policies from `GET /policy`, and "By Service" tab listing services from `GET /service` with expandable policy lists per service
- `src/views/policies/PolicyDetailView.vue` — detail view showing policy ID, ODRL UID, ODRL policy JSON (formatted/syntax-highlighted), and generated Rego code
- `src/stores/policies.ts` — Pinia store for policies state (global policies, services, service-scoped policies)
- `src/router/index.ts` — add routes `/policies`, `/policies/:id`, `/policies/service/:serviceId`
- `src/locales/en.json` — add policy-related translation keys
- `src/components/common/JsonViewer.vue` — reusable JSON syntax-highlighted viewer component (used for ODRL display)

**Acceptance criteria:**
- `/policies` route shows both global and service-scoped policies
- Policy detail view renders ODRL JSON in a readable, syntax-highlighted format
- Rego output is displayed in a code block
- Pagination works for both global policies and per-service policy lists
- Loading, error, and empty states are handled

### Step 7: TIL CRUD operations

Add create, update, and delete functionality for Trusted Issuers using the TIL management API.

**Files created/modified:**
- `src/views/til/TilCreateView.vue` — form to create a new trusted issuer: DID input, dynamic credential entries (type, validity from/to, claims with name/path/allowedValues)
- `src/views/til/TilEditView.vue` — pre-populated edit form (reuses form components from create view)
- `src/components/til/TilIssuerForm.vue` — shared form component for create/edit with validation
- `src/components/til/CredentialEditor.vue` — sub-form for adding/editing credentials with dynamic claim entries
- `src/stores/til.ts` — add create, update, delete actions
- `src/views/til/TilListView.vue` — add "Create" button, "Edit" and "Delete" actions per row
- `src/views/til/TilDetailView.vue` — add "Edit" and "Delete" buttons
- `src/locales/en.json` — add form labels, validation messages, success/error notifications

**Acceptance criteria:**
- Users can create a new trusted issuer with DID and one or more credential configurations
- Users can edit an existing issuer (DID is read-only on edit, credentials can be added/removed/modified)
- Users can delete an issuer with a confirmation dialog
- Form validation prevents submission of invalid data (required DID, at least one credential, valid date ranges)
- Success and error notifications are displayed after operations
- List refreshes after create/update/delete operations

### Step 8: CCS CRUD operations

Add create, update, and delete functionality for Credentials Config Service entries.

**Files created/modified:**
- `src/views/ccs/CcsCreateView.vue` — form to create a new service: ID, default OIDC scope, authorization type selector, dynamic OIDC scope entries with credential configurations
- `src/views/ccs/CcsEditView.vue` — pre-populated edit form
- `src/components/ccs/CcsServiceForm.vue` — shared form component with validation
- `src/components/ccs/ScopeEditor.vue` — sub-form for editing OIDC scope entries and their credential requirements
- `src/components/ccs/PresentationDefinitionEditor.vue` — editor for presentation definition JSON with basic structural validation
- `src/stores/ccs.ts` — add create, update, delete actions
- `src/views/ccs/CcsListView.vue` — add CRUD action buttons
- `src/views/ccs/CcsDetailView.vue` — add Edit/Delete buttons
- `src/locales/en.json` — add CCS form translation keys

**Acceptance criteria:**
- Users can create, edit, and delete service configurations
- OIDC scope management supports adding/removing scopes with their credential requirements
- Presentation definitions can be edited as structured JSON
- Trusted participant/issuer list URLs can be managed per credential
- Form validation enforces required fields
- Success/error feedback and confirmation dialogs are present

### Step 9: Policies CRUD operations

Add create, update, and delete functionality for ODRL policies (both global and service-scoped).

**Files created/modified:**
- `src/views/policies/PolicyCreateView.vue` — form to create a policy with ODRL JSON editor; option to create globally or under a specific service
- `src/views/policies/PolicyEditView.vue` — pre-populated edit form
- `src/views/policies/ServiceCreateView.vue` — simple form to create a new policy service (namespace)
- `src/components/policies/PolicyForm.vue` — shared policy form with ODRL JSON editor
- `src/components/policies/OdrlEditor.vue` — ODRL policy editor, potentially enhanced with mappings from `GET /mappings` endpoint to assist users in building valid ODRL
- `src/components/policies/PolicyValidator.vue` — inline validation panel using `POST /validate` to test a policy against a sample request
- `src/stores/policies.ts` — add CRUD actions for both global and service-scoped policies, plus validation action
- `src/views/policies/PolicyListView.vue` — add CRUD action buttons, service creation
- `src/locales/en.json` — add policy form translation keys

**Acceptance criteria:**
- Users can create, edit, and delete global policies
- Users can create and delete policy services (namespaces)
- Users can create, edit, and delete policies scoped to a service
- ODRL policy editor provides at minimum a JSON editor with syntax validation
- Policy validation against a test request is accessible from the editor
- Mappings endpoint is used to provide available ODRL vocabulary in the editor (actions, operators, etc.)
- Success/error feedback and confirmation dialogs are present

### Step 10: Testing setup and component tests

Set up the testing infrastructure and write unit/component tests for key functionality.

**Files created/modified:**
- `vitest.config.ts` — Vitest configuration for unit and component tests
- `src/test/setup.ts` — test setup file (Vuetify, i18n, router mocks)
- `src/test/mocks/` — MSW (Mock Service Worker) handlers for all three APIs, based on OpenAPI specs
- `src/stores/__tests__/til.spec.ts` — tests for TIL store (list, detail, CRUD actions, error handling)
- `src/stores/__tests__/ccs.spec.ts` — tests for CCS store
- `src/stores/__tests__/policies.spec.ts` — tests for policies store
- `src/views/__tests__/TilListView.spec.ts` — component test for TIL list rendering and interaction
- `src/views/__tests__/CcsListView.spec.ts` — component test for CCS list
- `src/views/__tests__/PolicyListView.spec.ts` — component test for policy list
- `src/components/__tests__/JsonViewer.spec.ts` — component test for JSON viewer
- `package.json` — add `test` and `test:coverage` scripts

**Acceptance criteria:**
- `npm test` runs all tests successfully
- Store tests verify API integration, state mutations, and error handling using MSW mocks
- Component tests verify rendering of list/detail views with mock data
- Tests use parameterized patterns where applicable (e.g., testing multiple error scenarios)
- Test coverage threshold is configured (aim for ≥ 80% on stores and components)
- All tests run in CI-compatible mode (no browser required)
