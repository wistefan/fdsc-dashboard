#!/usr/bin/env bash
# --------------------------------------------------------------------------
# download-specs.sh
#
# Downloads versioned OpenAPI specifications from their upstream repositories.
# Spec versions are pinned in spec-versions.env so that builds are
# reproducible.  To bump a version, update spec-versions.env and re-run:
#
#   npm run download:specs
#
# Prerequisites: curl
# --------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SPECS_DIR="${PROJECT_ROOT}/specs"

# Load pinned versions
# shellcheck source=spec-versions.env
source "${PROJECT_ROOT}/spec-versions.env"

mkdir -p "${SPECS_DIR}"

# GitHub raw content base URL
GH_RAW="https://raw.githubusercontent.com"

# --------------------------------------------------------------------------
# Spec sources – each entry maps a local filename to its upstream location.
# The version (git tag or branch) comes from spec-versions.env.
# --------------------------------------------------------------------------

declare -A SPEC_URLS=(
  ["trusted-issuers-list.yaml"]="${GH_RAW}/FIWARE/trusted-issuers-list/${TIL_VERSION}/api/trusted-issuers-list.yaml"
  ["trusted-issuers-registry.yaml"]="${GH_RAW}/FIWARE/trusted-issuers-list/${TIR_VERSION}/api/trusted-issuers-registry.yaml"
  ["credentials-config-service.yaml"]="${GH_RAW}/FIWARE/credentials-config-service/${CCS_VERSION}/api/credentials-config-service.yaml"
  ["odrl-pap.yaml"]="${GH_RAW}/SEAMWARE/odrl-pap/${ODRL_VERSION}/api/odrl.yaml"
)

FAILED=0

for filename in "${!SPEC_URLS[@]}"; do
  url="${SPEC_URLS[${filename}]}"
  dest="${SPECS_DIR}/${filename}"

  echo "==> Downloading ${filename} from ${url} ..."
  if curl --fail --silent --show-error --location -o "${dest}" "${url}"; then
    echo "    Saved to ${dest}"
  else
    echo "    ERROR: Failed to download ${filename}" >&2
    FAILED=1
  fi
done

if [ "${FAILED}" -eq 1 ]; then
  echo "ERROR: One or more spec downloads failed." >&2
  exit 1
fi

echo "==> All specs downloaded successfully."
