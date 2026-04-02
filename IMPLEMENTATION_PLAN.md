# Implementation Plan: Create a Dashboard to manage DSC resources

## Overview
Continue the partially-implemented FDSC Dashboard by building out read-only views for CCS and ODRL Policies (Phase 1), then adding full CRUD functionality for all three resource types (Phase 2). Each step follows the established TIL pattern (Pinia store + list view + detail view) and maintains the project's conventions for i18n, theming, and error handling. Finally, add a test framework and unit tests.

## Steps

### Step 1: Create CCS Pinia store
Create `src/stores/ccs.ts` following the TIL store pattern in `src/stores/til.ts`. The store must manage:
- **List state:** `services` (array of `Service`), `totalServices`, `pageSize` (default 10), `currentPage`, `listLoading`, `listError`.
- **Detail state:** `selectedService` (`Service | null`), `detailLoading`, `detailError`.
- **Computed:** `isEmpty`, `totalPages`.
- **Actions:** `fetchServices(page?, size?)` calling `ServiceService.getServices()`, `fetchServiceDetail(id)` calling `ServiceService.getService()`, `$reset()`.

Import types from `@/api/generated/ccs` (`Service`, `Services`, `ServiceService`, `ApiError`). The CCS API uses standard page-based pagination (`page`, `pageSize` params) unlike TIR's `pageAfter` — adapt accordingly.

**Files:** `src/stores/ccs.ts` (new)

**Acceptance criteria:**
- Store exports `useCcsStore` with all listed state, computed, and actions.
- All public members have JSDoc comments.
- `DEFAULT_PAGE_SIZE` extracted as a named constant.
- Error handling distinguishes `ApiError` from generic errors.

### Step 2: Implement CCS list view
Replace the stub in `src/views/ccs/CcsListView.vue` with a fully functional paginated list view following `src/views/til/TilListView.vue` as the reference pattern.

**Requirements:**
- Use `v-data-table-server` with columns: Service ID (`ccs.serviceId`), Default OIDC Scope (`ccs.defaultOidcScope`), Number of Scopes (computed count of `oidcScopes` keys).
- Computed i18n headers.
- Row click navigates to `/ccs/:id` (route name `ccs-detail`).
- Error alert with refresh button.
- Empty state with `mdi-file-certificate-outline` icon and `ccs.noServices` message.
- Loading skeleton.
- `onMounted` calls `store.fetchServices()`.

**Files:** `src/views/ccs/CcsListView.vue` (replace stub)

**Acceptance criteria:**
- Table renders mock data (2 services) when running with `docker compose up`.
- Pagination controls work.
- Row click navigates to detail view.
- All strings use i18n keys from `en.json`.

### Step 3: Implement CCS detail view
Replace the stub in `src/views/ccs/CcsDetailView.vue` with a full detail view following `src/views/til/TilDetailView.vue`.

**Requirements:**
- Back button linking to `/ccs`.
- Three-state rendering: loading skeleton, error alert with refresh, content.
- Service info card showing: Service ID, Default OIDC Scope, Authorization Type.
- OIDC Scopes section using `v-expansion-panels` (one panel per scope entry from `oidcScopes` map).
- Each scope panel shows its credentials in a `v-table` with columns: Credential Type, Trusted Issuers Lists (comma-joined URLs), Trusted Participants Lists (if present).
- Display `flatClaims` boolean and `holderVerification` if present in the scope entry.
- `onMounted` calls `store.fetchServiceDetail(id)`.

**Files:** `src/views/ccs/CcsDetailView.vue` (replace stub)

**Acceptance criteria:**
- Detail renders correctly for both mock services (happy-pets-service, packet-delivery-service).
- All OIDC scopes are displayed in expansion panels.
- Credentials table renders with correct data.
- All strings use i18n keys.

### Step 4: Create ODRL Policies Pinia store
Create `src/stores/policies.ts` following the TIL store pattern.

**State:**
- **List:** `policies` (array of `Policy`), `totalPolicies`, `pageSize` (default 10), `currentPage`, `listLoading`, `listError`.
- **Detail:** `selectedPolicy` (`Policy | null`), `detailLoading`, `detailError`.
- **Computed:** `isEmpty`, `totalPages`.
- **Actions:** `fetchPolicies(page?, size?)` calling `PolicyService.getPolicies()`, `fetchPolicyDetail(id)` calling `PolicyService.getPolicyById()`, `$reset()`.

Import types from `@/api/generated/odrl` (`Policy`, `PolicyList`, `PolicyService`, `ApiError`).

Note: The ODRL list endpoint returns `PolicyList` with `policies` array (not `items`), and uses `pageNumber`/`pageSize` for pagination.

**Files:** `src/stores/policies.ts` (new)

**Acceptance criteria:**
- Store exports `usePoliciesStore` with all listed state, computed, and actions.
- JSDoc on all public members.
- Proper error handling.

### Step 5: Implement Policies list view
Replace the stub in `src/views/policies/PolicyListView.vue` with a paginated list.

**Requirements:**
- `v-data-table-server` with columns: Policy ID (`policies.policyId`), ODRL UID (`policies.odrlUid`), Policy Type (extracted from parsed ODRL JSON `@type` field).
- Parse `odrl` string field as JSON to extract display metadata (type, target asset, action).
- Row click navigates to `/policies/:id` (route name `policy-detail`).
- Error alert, empty state (`mdi-gavel` icon, `policies.noPolicies`), loading skeleton.
- `onMounted` calls `store.fetchPolicies()`.

**Files:** `src/views/policies/PolicyListView.vue` (replace stub)

**Acceptance criteria:**
- Table renders 3 mock policies.
- Pagination works.
- Row click navigates to detail.
- ODRL UID and type are correctly extracted and displayed.

### Step 6: Implement Policies detail view
Replace the stub in `src/views/policies/PolicyDetailView.vue`.

**Requirements:**
- Back button to `/policies`.
- Three-state rendering.
- Policy info card: Policy ID, ODRL UID.
- ODRL Policy section: Parse the `odrl` JSON string and render it in a formatted, readable way. Show permissions with target, action, and constraints in a structured layout (not raw JSON). Use `v-card` sections for each permission with `v-chip` for constraint values.
- Rego Code section: Display `rego` field in a `<pre><code>` block with monospace styling.
- `onMounted` calls `store.fetchPolicyDetail(id)`.

**Files:** `src/views/policies/PolicyDetailView.vue` (replace stub)

**Acceptance criteria:**
- All 3 mock policies render correctly with parsed ODRL and Rego.
- Permissions, targets, actions, and constraints are clearly displayed.
- All strings use i18n keys.

### Step 7: Add CRUD operations to TIL store and create TIL form components
Extend `src/stores/til.ts` with create, update, and delete actions:
- `createIssuer(issuer: TrustedIssuer)` calling `IssuerService.createTrustedIssuer()`.
- `updateIssuer(did: string, issuer: TrustedIssuer)` calling `IssuerService.updateIssuer()`.
- `deleteIssuer(did: string)` calling `IssuerService.deleteIssuerById()`.

Create `src/views/til/TilFormView.vue` — a form component used for both create and edit:
- DID input field (editable on create, read-only on edit).
- Dynamic credentials list: add/remove credentials, each with type, validFrom, validTo.
- Dynamic claims list per credential: add/remove claims with name, path, allowedValues.
- Form validation using Vuetify's built-in validation (required fields).
- Submit calls store create or update action; on success, navigate to detail view.

Add route `/til/new` (name `til-create`) and `/til/:did/edit` (name `til-edit`) in `src/router/index.ts`.

Add delete confirmation dialog to `TilDetailView.vue` with a delete button in the header.

**Files:**
- `src/stores/til.ts` (modify — add CRUD actions)
- `src/views/til/TilFormView.vue` (new)
- `src/views/til/TilDetailView.vue` (modify — add delete button + dialog)
- `src/router/index.ts` (modify — add create/edit routes)

**Acceptance criteria:**
- Create form submits a valid TrustedIssuer payload.
- Edit form pre-populates from store state.
- Delete shows confirmation dialog and calls API on confirm.
- Success/error feedback via i18n-translated snackbar or alert.
- All new i18n keys added to `en.json`.

### Step 8: Add CRUD operations to CCS store and create CCS form components
Extend `src/stores/ccs.ts` with CRUD actions:
- `createService(service: Service)` calling `ServiceService.createService()`.
- `updateService(id: string, service: Service)` calling `ServiceService.updateService()`.
- `deleteService(id: string)` calling `ServiceService.deleteServiceById()`.

Create `src/views/ccs/CcsFormView.vue`:
- Service ID input (editable on create, read-only on edit).
- Default OIDC Scope input.
- Authorization Type selector.
- Dynamic OIDC Scopes section: add/remove scope entries, each with scope name and credentials list.
- Each credential has: type, trusted issuers lists (multi-value input), trusted participants lists.
- Form validation.

Add routes `/ccs/new` and `/ccs/:id/edit` in router. Add delete to `CcsDetailView.vue`.

**Files:**
- `src/stores/ccs.ts` (modify)
- `src/views/ccs/CcsFormView.vue` (new)
- `src/views/ccs/CcsDetailView.vue` (modify — add delete)
- `src/router/index.ts` (modify)
- `src/locales/en.json` (modify — add any missing CRUD i18n keys)

**Acceptance criteria:**
- Form correctly builds the nested Service object with oidcScopes map.
- Dynamic add/remove of scopes and credentials works.
- Delete with confirmation dialog.
- All strings use i18n.

### Step 9: Add CRUD operations to Policies store and create Policy form components
Extend `src/stores/policies.ts` with CRUD actions:
- `createPolicy(policy: OdrlPolicyJson)` calling `PolicyService.createPolicy()`.
- `updatePolicy(id: string, policy: OdrlPolicyJson)` calling `PolicyService.createPolicyWithId()` (PUT).
- `deletePolicy(id: string)` calling `PolicyService.deletePolicyById()`.

Create `src/views/policies/PolicyFormView.vue`:
- Policy ID input (auto-generated or manual on create).
- ODRL Policy editor: structured form for building ODRL JSON with context, type selector (Set/Offer/Agreement), UID, and dynamic permissions.
- Each permission: target input, action selector, dynamic constraints (leftOperand, operator dropdown, rightOperand).
- Show live ODRL JSON preview.
- Form validation.

Add routes `/policies/new` and `/policies/:id/edit`. Add delete to `PolicyDetailView.vue`.

**Files:**
- `src/stores/policies.ts` (modify)
- `src/views/policies/PolicyFormView.vue` (new)
- `src/views/policies/PolicyDetailView.vue` (modify — add delete)
- `src/router/index.ts` (modify)
- `src/locales/en.json` (modify)

**Acceptance criteria:**
- Form builds valid OdrlPolicyJson payloads.
- Permissions with constraints can be dynamically added/removed.
- JSON preview updates live.
- Delete with confirmation.

### Step 10: Add action buttons to list views and HomeView enhancements
Update all three list views to include a "Create" button (FAB or toolbar button) that navigates to the respective create form.

Enhance `src/views/HomeView.vue`:
- Add summary cards for each resource type showing count (fetched from list endpoints).
- Each card links to the respective list view.
- Use `v-card` with icon, title, count, and "View All" action.

**Files:**
- `src/views/til/TilListView.vue` (modify — add create button)
- `src/views/ccs/CcsListView.vue` (modify — add create button)
- `src/views/policies/PolicyListView.vue` (modify — add create button)
- `src/views/HomeView.vue` (modify — add resource summary cards)

**Acceptance criteria:**
- Each list view has a visible "Create" button.
- Home page shows resource counts from mock data.
- All new strings use i18n.

### Step 11: Update mock backends to support CRUD operations
Enhance the mock nginx configurations and/or add mock response files to support POST, PUT, and DELETE operations for testing CRUD locally.

**Options (choose simplest):**
- Configure nginx to return appropriate status codes (201 for POST, 200 for PUT, 204 for DELETE) for write endpoints using `if ($request_method = ...)` directives.
- Alternatively, add a lightweight mock server script if nginx is insufficient.

**Files:**
- `mocks/til/til-nginx.conf` (modify)
- `mocks/ccs/ccs-nginx.conf` (modify)
- `mocks/odrl/odrl-nginx.conf` (modify)

**Acceptance criteria:**
- `POST /service` returns 201 with Location header.
- `PUT /service/{id}` returns 200 with the service JSON.
- `DELETE /service/{id}` returns 204.
- Same pattern for TIL and ODRL endpoints.
- Dashboard CRUD operations complete without network errors in the mock environment.

### Step 12: Set up test framework and add unit tests for stores
Add Vitest and @vue/test-utils to the project. Configure `vitest.config.ts`.

Write unit tests for all three Pinia stores:
- `src/stores/__tests__/til.spec.ts` — test `fetchIssuers`, `fetchIssuerDetail`, `createIssuer`, `updateIssuer`, `deleteIssuer`, `$reset`, error handling.
- `src/stores/__tests__/ccs.spec.ts` — test `fetchServices`, `fetchServiceDetail`, CRUD actions, `$reset`, error handling.
- `src/stores/__tests__/policies.spec.ts` — test `fetchPolicies`, `fetchPolicyDetail`, CRUD actions, `$reset`, error handling.

Mock API service calls using `vi.mock()`. Use parameterized tests (`it.each`) for similar test patterns across success/error cases.

**Files:**
- `package.json` (modify — add vitest, @vue/test-utils, jsdom as dev dependencies)
- `vitest.config.ts` (new)
- `src/stores/__tests__/til.spec.ts` (new)
- `src/stores/__tests__/ccs.spec.ts` (new)
- `src/stores/__tests__/policies.spec.ts` (new)

**Acceptance criteria:**
- `npm run test` runs all store tests and passes.
- Each store has tests for: list fetch, detail fetch, CRUD operations, error handling, reset.
- API calls are mocked (no real network requests).
- Parameterized tests used where applicable.

### Step 13: Add component tests for list and detail views
Write component tests using @vue/test-utils + Vitest for the 6 main view components:
- `src/views/__tests__/TilListView.spec.ts`
- `src/views/__tests__/TilDetailView.spec.ts`
- `src/views/__tests__/CcsListView.spec.ts`
- `src/views/__tests__/CcsDetailView.spec.ts`
- `src/views/__tests__/PolicyListView.spec.ts`
- `src/views/__tests__/PolicyDetailView.spec.ts`

Test rendering of loading, error, and data states. Verify navigation on row click. Mock Pinia stores.

**Files:**
- `src/views/__tests__/TilListView.spec.ts` (new)
- `src/views/__tests__/TilDetailView.spec.ts` (new)
- `src/views/__tests__/CcsListView.spec.ts` (new)
- `src/views/__tests__/CcsDetailView.spec.ts` (new)
- `src/views/__tests__/PolicyListView.spec.ts` (new)
- `src/views/__tests__/PolicyDetailView.spec.ts` (new)

**Acceptance criteria:**
- All component tests pass.
- Each view is tested for loading, error, and populated states.
- Navigation behavior is verified.
- i18n and Vuetify are properly set up in test harness.

### Step 14: i18n completeness audit and lint/type-check pass
Review and ensure all user-facing strings across all views and components use i18n keys. Add any missing translation keys to `src/locales/en.json`.

Run full lint and type-check to ensure zero errors:
- `npm run lint`
- `npx vue-tsc --noEmit`

Fix any issues found.

**Files:**
- `src/locales/en.json` (modify if needed)
- Any files with lint or type errors

**Acceptance criteria:**
- `npm run lint` passes with zero errors.
- `npx vue-tsc --noEmit` passes with zero errors.
- `npm run build` completes successfully.
- No hardcoded user-facing strings in any Vue component.
