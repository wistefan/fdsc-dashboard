# FDSC Dashboard

A Vue 3 dashboard for managing FIWARE Data Space Connector (DSC) resources including Trusted Issuers Lists (TIL), Credentials Config Service (CCS), and ODRL Policies.

## Tech Stack

- **Vue 3** with Composition API and TypeScript
- **Vuetify 3** – Material Design component library
- **Vue Router** – client-side routing
- **Pinia** – state management
- **Vue I18n** – internationalization (English by default)
- **Vite** – build tooling and dev server
- **Vitest** – unit testing framework

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- npm (comes with Node.js)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (optional, for containerized setup)

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app starts at **http://localhost:3000**. Hot-module replacement is enabled so changes are reflected instantly.

### 3. Configure backend API URLs (optional)

By default the Vite dev server proxies API requests to local backend services:

| Service | Env Variable        | Default                |
|---------|---------------------|------------------------|
| TIL     | `VITE_TIL_API_URL`  | `http://localhost:8080` |
| TIR     | `VITE_TIR_API_URL`  | `http://localhost:8081` |
| CCS     | `VITE_CCS_API_URL`  | `http://localhost:8082` |
| ODRL    | `VITE_ODRL_API_URL` | `http://localhost:8083` |

Override them by setting environment variables before running the dev server:

```bash
VITE_TIL_API_URL=http://my-til-host:8080 npm run dev
```

## Running with Docker Compose (Mock Backends)

The project includes mock backend services that return empty collections so the UI can render without real services running. Docker Compose mounts a dedicated nginx config (`nginx-docker-compose.conf`) that routes API requests to the mock service containers.

```bash
# Build and start the dashboard with mock backends
docker compose up --build
```

This starts:

| Service        | Description                         |
|----------------|-------------------------------------|
| `dashboard`    | The dashboard UI on **http://localhost:8080** |
| `mock-til`     | Mock Trusted Issuers List service   |
| `mock-tir`     | Mock Trusted Issuers Registry       |
| `mock-ccs`     | Mock Credentials Config Service     |
| `mock-odrl`    | Mock ODRL-PAP service               |

Stop the stack with:

```bash
docker compose down
```

## Authentication

The dashboard can attach an `Authorization: Bearer <jwt>` header to every outbound call it makes to the four backend APIs (TIL, TIR, CCS, ODRL-PAP). When no token is configured, no `Authorization` header is sent and the dashboard behaves exactly as it did before the feature was introduced.

### Build-time environment variable

To seed a token at build time (typically for demo or deployment pipelines), set `VITE_AUTH_TOKEN` before running `npm run dev` or `npm run build`:

| Service          | Env Variable       | Default                |
|------------------|--------------------|------------------------|
| Auth token (JWT) | `VITE_AUTH_TOKEN`  | *(empty — no header)*  |

```bash
VITE_AUTH_TOKEN=eyJhbGciOi... npm run dev
```

The env-provided value is used only when no runtime token is present in the browser — it is **not** persisted to `localStorage`, so runtime changes always win.

### Runtime dialog (app bar)

Every page shows a shield icon in the top-right app bar:

| Icon                              | Meaning                             |
|-----------------------------------|-------------------------------------|
| `mdi-shield-lock` (locked)        | A JWT is configured and is being sent with every API request. |
| `mdi-shield-lock-open-outline`    | No JWT is configured; no `Authorization` header is sent. |

Click the icon to open the **Authentication Token** dialog. The dialog shows the current token (if any) in a monospace textarea. Paste a JWT and press **Save** to configure it, or press **Clear** to remove it. The change takes effect immediately on the next API call.

### Persistence

Runtime tokens are stored in the browser under the `localStorage` key `fdsc-dashboard-auth-token`. They survive page reloads and, within the same browser profile, separate tabs. Saving an empty value (or pressing **Clear**) deletes the key.

### Scope

All four generated API clients — `TilOpenAPI`, `TirOpenAPI`, `CcsOpenAPI`, and `OdrlOpenAPI` — share a single token resolver configured in `src/api/config.ts`. There is no way to send a token to one backend but not another: the dashboard either authenticates to all four or to none.

## Running Tests

The project uses [Vitest](https://vitest.dev/) as its test framework with `jsdom` for DOM emulation and `@vue/test-utils` for Vue component testing.

### Run all tests once

```bash
npm run test
```

This executes all `*.spec.ts` files under `src/` in a single run and exits.

### Run tests in watch mode

```bash
npm run test:watch
```

Vitest will re-run affected tests automatically whenever source or test files change. This is the recommended mode during development.

### Run a specific test file

```bash
npx vitest run src/stores/__tests__/til.spec.ts
```

### Run tests matching a name pattern

```bash
npx vitest run -t "should fetch issuers"
```

### Test file locations

Test files are co-located with the source code they cover:

| Store   | Test File                                |
|---------|------------------------------------------|
| TIL     | `src/stores/__tests__/til.spec.ts`       |
| CCS     | `src/stores/__tests__/ccs.spec.ts`       |
| Policies| `src/stores/__tests__/policies.spec.ts`  |

### Configuration

The Vitest configuration is defined in `vitest.config.ts` at the project root. It uses the `jsdom` test environment, enables global test APIs (`describe`, `it`, `expect`), and resolves the `@/` path alias to `src/`.

## Available Scripts

| Command                 | Description                                             |
|-------------------------|---------------------------------------------------------|
| `npm run dev`           | Start the Vite dev server with HMR                      |
| `npm run build`         | Type-check and build for production                     |
| `npm run preview`       | Preview the production build locally                    |
| `npm run test`          | Run all unit tests once                                 |
| `npm run test:watch`    | Run unit tests in watch mode                            |
| `npm run lint`          | Lint source files with ESLint (auto-fix)                |
| `npm run format`        | Format source files with Prettier                       |
| `npm run license:check` | Verify every in-scope source file has a license header  |
| `npm run license:apply` | Prepend the Apache 2.0 license header to any file that is missing it |

## Linting & Code Formatting

The project uses [ESLint](https://eslint.org/) for static analysis and [Prettier](https://prettier.io/) for code formatting.

### Run the linter

```bash
npm run lint
```

This runs ESLint across all `.vue`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.ts`, `.tsx`, `.cts`, and `.mts` files with the `--fix` flag, which automatically corrects fixable issues (e.g. missing semicolons, import order). Non-fixable issues are reported in the terminal output.

### Run the linter without auto-fix

To check for issues without modifying files:

```bash
npx eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts
```

### Lint a specific file or directory

```bash
npx eslint src/views/til/TilListView.vue --fix
npx eslint src/stores/ --fix
```

### Format code with Prettier

```bash
npm run format
```

This formats all files under `src/` using Prettier.

### ESLint configuration

The ESLint configuration lives in `.eslintrc.cjs` and extends:

| Preset                                  | Purpose                                  |
|-----------------------------------------|------------------------------------------|
| `plugin:vue/vue3-recommended`           | Vue 3 recommended rules                  |
| `eslint:recommended`                    | ESLint core recommended rules            |
| `plugin:@typescript-eslint/recommended` | TypeScript-specific recommended rules    |

Notable rule overrides:

- `vue/multi-word-component-names` is **off** — single-word component names are allowed.
- `vue/valid-v-slot` allows modifiers (e.g. `v-slot:item.actions`).
- Test files (`*.spec.ts`, `src/test-setup.ts`) have relaxed rules: `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` are disabled.

### Integrating with your editor

Most editors support ESLint integration:

- **VS Code**: Install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint). Enable "Format on Save" and set ESLint as the default formatter for `.vue` and `.ts` files.
- **WebStorm / IntelliJ**: ESLint support is built in. Go to *Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint* and select "Automatic ESLint configuration".

## License headers

Every in-scope source file must carry the Apache 2.0 copyright header defined in
[`scripts/license-header.txt`](scripts/license-header.txt). Header verification and
insertion are handled by the [`license-check-and-add`](https://www.npmjs.com/package/license-check-and-add)
npm package, which is driven by [`license-check-and-add-config.json`](license-check-and-add-config.json)
at the repo root.

### Scripts

- `npm run license:check` — verifies that every in-scope file starts with the
  expected header. Fails (non-zero exit) and prints the offending file paths when a
  file is missing the header. This is the command CI runs.
- `npm run license:apply` — prepends the header to any in-scope file that is
  missing it. The operation is idempotent: running it on an already-compliant tree
  leaves every file byte-identical.

### Scope

The default config limits the tool to `.ts` and `.vue` files under `src/`. The
following paths are intentionally excluded:

- `src/api/generated/**` — regenerated from upstream OpenAPI specs; headers are
  re-applied automatically by `scripts/generate-api-clients.sh` (see below).
- `src/locales/**` — JSON files cannot contain comments.
- `.github/**`, `mocks/**`, `public/**`, `scripts/**` and root-level config files
  (`vite.config.ts`, `tsconfig*.json`, `Dockerfile`, etc.) — not considered
  "source files" per the ticket scope.

### CI enforcement

The [`license-check`](.github/workflows/license-check.yml) GitHub Actions workflow
runs `npm run license:check` on every push to `main` and every pull request, so a
PR that introduces an unlicensed file will fail CI.

### Adding a new source file

Create the file as usual, then run:

```bash
npm run license:apply
```

…and commit the resulting change alongside your other modifications. Alternatively,
paste the content of `scripts/license-header.txt` (wrapped in a `/* … */` block
comment) at the top of the file manually.

### Regenerated API clients

When you run `npm run generate:api`, the script calls `license-check-and-add` a
second time using [`license-check-and-add-generated-config.json`](license-check-and-add-generated-config.json),
which is narrowed to `src/api/generated/**`. This keeps the generated output
license-compliant without forcing the default `license:check` task to scan
machine-written code.

## Building for Production

```bash
npm run build
```

The production bundle is output to the `dist/` directory. You can preview it with:

```bash
npm run preview
```

### Docker Image

Build a standalone Docker image:

```bash
docker build -t fdsc-dashboard .
docker run -p 8080:80 fdsc-dashboard
```

The image uses a multi-stage build (Node 20 for building, nginx for serving).

## Authentication (OAuth2 / OpenID Connect)

The dashboard supports optional OAuth2 / OpenID Connect authentication:

- **Default:** no OAuth2 providers are configured. The dashboard runs exactly as before — no sign-in screen, no router guards, no user menu.
- **Configured:** one or more providers are declared via a JSON configuration. All users must sign in before using the dashboard and every action is gated by their resolved role.

Two canonical roles are recognised:

| Role     | Capabilities                                          |
|----------|-------------------------------------------------------|
| `viewer` | Read-only access to every endpoint.                   |
| `admin`  | Full access, including create / update / delete.      |

### Runtime configuration with `AUTH_CONFIG_JSON`

In production the Docker image reads a single environment variable,
`AUTH_CONFIG_JSON`, at container start. The value must be a JSON string
that matches the `AuthConfig` shape declared in `src/auth/types.ts`:

```json
{
  "providers": [
    {
      "id": "keycloak",
      "displayName": "Keycloak",
      "issuer": "https://keycloak.example.com/realms/fdsc",
      "clientId": "fdsc-dashboard",
      "scopes": ["openid", "profile"],
      "rolesClaimPath": "realm_access.roles",
      "roleMapping": {
        "fdsc-admin": "admin",
        "fdsc-viewer": "viewer"
      },
      "silentRenew": true
    }
  ]
}
```

| Field            | Required | Description                                                                                             |
|------------------|----------|---------------------------------------------------------------------------------------------------------|
| `id`             | yes      | URL-safe identifier (used in callback URLs and storage keys).                                           |
| `displayName`    | yes      | Human-readable label shown in the login picker.                                                         |
| `issuer`         | yes      | OIDC issuer URL (discovery document is fetched from `<issuer>/.well-known/openid-configuration`).       |
| `clientId`       | yes      | OAuth2 client ID registered with the identity provider.                                                 |
| `scopes`         | no       | Space of scopes to request. Defaults to `["openid", "profile"]` when omitted.                           |
| `rolesClaimPath` | no       | Dotted path to the role list inside the ID/access-token claims. Defaults to `realm_access.roles`.       |
| `roleMapping`    | no       | Map of provider-specific role names to the canonical `viewer` / `admin` roles. Unmapped → `viewer`.     |
| `silentRenew`    | no       | Enable OIDC silent token renewal via a hidden iframe. Defaults to `false`.                              |

Launch an image with authentication enabled:

```bash
docker run -p 8080:80 \
  -e AUTH_CONFIG_JSON='{"providers":[{"id":"keycloak","displayName":"Keycloak","issuer":"https://keycloak.example.com/realms/fdsc","clientId":"fdsc-dashboard","roleMapping":{"fdsc-admin":"admin","fdsc-viewer":"viewer"}}]}' \
  fdsc-dashboard
```

If `AUTH_CONFIG_JSON` is **unset or empty**, the entrypoint falls back to
`{"providers":[]}` and the dashboard runs unauthenticated.

#### How it works

1. `public/config.template.js` contains the line
   `window.__AUTH_CONFIG__ = ${AUTH_CONFIG_JSON};`.
2. The image's nginx entrypoint runs
   `scripts/docker-entrypoint.d/10-render-config.sh`, which uses
   `envsubst` to substitute `AUTH_CONFIG_JSON` and writes the result to
   `/usr/share/nginx/html/config.js`. The unsubstituted template is then
   deleted so it is never served.
3. `index.html` loads `/config.js` **before** the application bundle, so
   `window.__AUTH_CONFIG__` is populated by the time
   `src/auth/config.ts#loadAuthConfig()` reads it.

Because the substitution happens at container start, operators can enable,
disable, or re-configure OAuth2 without rebuilding the image — just supply
a different value for `AUTH_CONFIG_JSON` (for example via Kubernetes
`env` / `envFrom`, Docker Compose, or `docker run -e`).

### Build-time fallback for local development

For local `npm run dev` there is no nginx, so the runtime templating step
does not run. Contributors can instead set the Vite environment variable
`VITE_AUTH_PROVIDERS` to the same JSON payload:

```bash
VITE_AUTH_PROVIDERS='{"providers":[{"id":"keycloak", ... }]}' npm run dev
```

The loader uses `window.__AUTH_CONFIG__` when present, otherwise falls back
to `VITE_AUTH_PROVIDERS`, otherwise disables auth.

### Example: Keycloak realm configuration

1. Create a realm (e.g. `fdsc`).
2. Add a public client `fdsc-dashboard` with:
   - **Client authentication:** off (the dashboard is a SPA; it uses PKCE).
   - **Valid redirect URIs:** `https://dashboard.example.com/callback/keycloak`
     (and `http://localhost:3000/callback/keycloak` for local dev).
   - **Valid post logout redirect URIs:** `https://dashboard.example.com/login`.
   - **Web origins:** `https://dashboard.example.com` (and `http://localhost:3000`).
3. Create two realm roles: `fdsc-admin` and `fdsc-viewer`.
4. Assign the appropriate role to each user or group.
5. Set `AUTH_CONFIG_JSON` to a JSON document pointing at the realm, as in
   the sample above.

## Project Structure

```
src/
  App.vue              # Root component with navigation drawer
  main.ts              # Application entry point
  router/index.ts      # Route definitions
  stores/index.ts      # Pinia store setup
    __tests__/           # Unit tests for stores
  plugins/
    vuetify.ts         # Vuetify configuration and theming
    i18n.ts            # Vue I18n setup
  locales/
    en.json            # English translations
  composables/
    useTheme.ts        # Theme toggle composable
  views/
    HomeView.vue       # Landing page
    til/               # Trusted Issuers List views
    ccs/               # Credentials Config Service views
    policies/          # ODRL Policy views
mocks/                 # Mock backend data and nginx configs
```

## Theming

The dashboard is fully themable via Vuetify's theming system. Light and dark themes are configured in `src/plugins/vuetify.ts`. A theme toggle is available in the UI via the `useTheme` composable.

## Localization

Translations are managed with Vue I18n. Language files live in `src/locales/`. Currently only English (`en.json`) is provided. To add a new language, create a new JSON file in that directory and register it in `src/plugins/i18n.ts`.

## Backend Services

This dashboard is designed to work with the following FIWARE services:

- **TIL** – [Trusted Issuers List](https://github.com/FIWARE/trusted-issuers-list)
- **TIR** – Global Trusted Issuers Registry (EBSI-compatible, same repo as TIL)
- **CCS** – [Credentials Config Service](https://github.com/FIWARE/credentials-config-service)
- **Policies** – [ODRL-PAP](https://github.com/SEAMWARE/odrl-pap)

API clients are kept in sync with the OpenAPI specifications published by these services.
