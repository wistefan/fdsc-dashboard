#!/usr/bin/env bash
# --------------------------------------------------------------------------
# generate-api-clients.sh
#
# Downloads the latest pinned OpenAPI specs from upstream repositories and
# regenerates typed TypeScript API clients.  Run this script whenever an
# upstream service publishes a new version of its OpenAPI spec:
#
#   npm run generate:api
#
# To change pinned spec versions, edit spec-versions.env first.
#
# Prerequisites:
#   npm install          (installs openapi-typescript-codegen as a devDep)
#   curl                 (for downloading specs)
# --------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Download specs from upstream before generating clients
echo "==> Downloading upstream OpenAPI specs..."
bash "${SCRIPT_DIR}/download-specs.sh"
echo ""

SPECS_DIR="${PROJECT_ROOT}/specs"
OUTPUT_DIR="${PROJECT_ROOT}/src/api/generated"

# Common flags passed to every generation run.
COMMON_FLAGS="--client fetch --useOptions --useUnionTypes"

echo "==> Generating TIL (Trusted Issuers List) client..."
npx openapi-typescript-codegen \
  --input "${SPECS_DIR}/trusted-issuers-list.yaml" \
  --output "${OUTPUT_DIR}/til" \
  ${COMMON_FLAGS}

echo "==> Generating TIR (Trusted Issuers Registry) client..."
npx openapi-typescript-codegen \
  --input "${SPECS_DIR}/trusted-issuers-registry.yaml" \
  --output "${OUTPUT_DIR}/tir" \
  ${COMMON_FLAGS}

echo "==> Generating CCS (Credentials Config Service) client..."
npx openapi-typescript-codegen \
  --input "${SPECS_DIR}/credentials-config-service.yaml" \
  --output "${OUTPUT_DIR}/ccs" \
  ${COMMON_FLAGS}

echo "==> Generating ODRL-PAP client..."
npx openapi-typescript-codegen \
  --input "${SPECS_DIR}/odrl-pap.yaml" \
  --output "${OUTPUT_DIR}/odrl" \
  ${COMMON_FLAGS}

# ---- Post-generation fixes ------------------------------------------------
# The ODRL spec defines 'Id' both as a schema and a parameter, which causes
# openapi-typescript-codegen to emit a duplicate export.  Remove the dupe.
echo "==> Applying post-generation fixes..."
ODRL_INDEX="${OUTPUT_DIR}/odrl/index.ts"
if [ -f "${ODRL_INDEX}" ]; then
  # Remove consecutive duplicate "export type { Id }" lines
  awk '!seen[$0]++' "${ODRL_INDEX}" > "${ODRL_INDEX}.tmp" && mv "${ODRL_INDEX}.tmp" "${ODRL_INDEX}"
fi

echo "==> All API clients generated successfully."
