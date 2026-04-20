# FDSC Dashboard

## Overview
A Vue 3 + Vuetify web dashboard for managing FIWARE Data Space Connector (DSC) resources: Trusted Issuers List (TIL), Credentials Config Service (CCS), and ODRL-PAP Policies. Currently has TIL list/detail views implemented; CCS and Policies views are stubs.

## Tech Stack
- Language: TypeScript 5.4, Vue 3.4
- Build: Vite 5.2
- Framework: Vuetify 3.5 (Material Design 3 UI)
- State: Pinia 2.1
- Routing: Vue Router 4.3
- i18n: Vue I18n 9.10
- Icons: @mdi/font (Material Design Icons)
- API clients: Auto-generated via openapi-typescript-codegen 0.30
- CSS: Sass 1.72

## Project Structure
```
src/
  api/
    config.ts                    # Base URL configuration (VITE_*_API_URL env vars)
    generated/
      til/                       # TIL management API client (IssuerService)
      tir/                       # TIR read API client (TirService - EBSI format)
      ccs/                       # CCS API client (ServiceService)
      odrl/                      # ODRL Policy API client (PolicyService)
  composables/
    useLocale.ts                 # Locale switching with localStorage persistence
    useTheme.ts                  # Light/dark theme toggle with localStorage persistence
  locales/
    en.json                      # English translations (135 keys across 8 sections)
  plugins/
    i18n.ts                      # Vue I18n setup
    vuetify.ts                   # Vuetify theme configuration
  router/
    index.ts                     # Routes: /, /til, /til/:did, /ccs, /ccs/:id, /policies, /policies/:id
  stores/
    index.ts                     # Pinia initialization
    til.ts                       # TIL store (list + detail state, pagination, error handling)
  views/
    HomeView.vue                 # Dashboard home page
    til/
      TilListView.vue            # Paginated issuer list (IMPLEMENTED - reference pattern)
      TilDetailView.vue          # Issuer detail with credentials (IMPLEMENTED - reference pattern)
    ccs/
      CcsListView.vue            # STUB - needs implementation
      CcsDetailView.vue          # STUB - needs implementation
    policies/
      PolicyListView.vue         # STUB - needs implementation
      PolicyDetailView.vue       # STUB - needs implementation
  App.vue                        # Root: app bar, nav drawer, router-view
  main.ts                        # Entry point
mocks/
  til/                           # 3 mock issuers (nginx-served JSON)
  tir/                           # EBSI-format issuer list
  ccs/                           # 2 mock services (packet-delivery, happy-pets)
  odrl/                          # 3 mock policies with ODRL JSON + Rego
```

## Build & Test
```bash
# Install dependencies
npm install

# Development server (port 3000, requires mock backends or docker-compose)
npm run dev

# Full mock environment (dashboard + 4 mock API backends)
docker compose up

# Type-check and build
npm run build

# Lint
npm run lint

# Format
npm run format

# Regenerate API clients from OpenAPI specs
npm run generate:api
```

No test framework is currently configured. Tests will need vitest + @vue/test-utils.

## Key Conventions
- **Pinia stores**: Composition API (`defineStore` with `setup` function), separate list/detail state, `ApiError`-aware error handling, explicit `$reset()`.
- **Views**: Three-state rendering (loading skeleton -> error alert -> content), server-side paginated `v-data-table-server`, computed i18n headers, `onMounted` fetch.
- **Detail views**: Back button, expansion panels for nested data, `v-table` for tabular sub-items.
- **i18n**: All user-facing strings via `t('section.key')`. Keys organized by resource (til, ccs, policies) plus common.
- **API clients**: Auto-generated, never edited. Service methods use named parameter objects (e.g., `{ id }`, `{ requestBody }`).
- **Routing**: Lazy-loaded views, `props: true` for route params.
- **Code style**: JSDoc on all public functions/computed, no magic constants (extracted to named consts).

## Important Files
- `src/stores/til.ts` - Reference store implementation pattern
- `src/views/til/TilListView.vue` - Reference list view pattern
- `src/views/til/TilDetailView.vue` - Reference detail view pattern
- `src/api/generated/ccs/services/ServiceService.ts` - CCS API methods
- `src/api/generated/ccs/models/Service.ts` - CCS Service model
- `src/api/generated/ccs/models/Services.ts` - CCS paginated list model
- `src/api/generated/odrl/services/PolicyService.ts` - ODRL API methods
- `src/api/generated/odrl/models/Policy.ts` - ODRL Policy model
- `src/api/generated/odrl/models/PolicyList.ts` - ODRL paginated list model
- `src/locales/en.json` - Translation keys
- `src/router/index.ts` - Route definitions
- `vite.config.ts` - Dev proxy config (/api/til, /api/tir, /api/ccs, /api/odrl)
- `docker-compose.yml` - Full mock environment
