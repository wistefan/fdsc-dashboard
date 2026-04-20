#!/usr/bin/env bash
# check-labels.sh — validate that a PR carries exactly one semver bump label.
#
# Usage:
#   check-labels.sh "<comma-separated-labels>"
#
# Example:
#   check-labels.sh "minor,bug,documentation"   # OK — exactly one bump label
#   check-labels.sh "bug"                       # FAIL — no bump label
#   check-labels.sh "minor,patch"               # FAIL — conflicting labels
#
# Exits 0 on success, non-zero on failure. Prints a human-readable diagnostic
# on stderr when validation fails.

set -euo pipefail

# Accepted semver bump labels. Keep in sync with README and PR template.
readonly BUMP_LABELS=("major" "minor" "patch")

usage() {
    cat <<EOF >&2
Usage: $0 "<comma-separated-labels>"

Validates that the provided comma-separated label list contains exactly one of:
  ${BUMP_LABELS[*]}
EOF
    exit 2
}

if [[ $# -ne 1 ]]; then
    usage
fi

# Input may be empty when a PR has no labels at all.
raw_labels="$1"

# Split on commas, trim whitespace, drop empty entries.
IFS=',' read -r -a labels <<< "$raw_labels"

found=()
for label in "${labels[@]}"; do
    trimmed="$(echo "$label" | xargs)"
    for bump in "${BUMP_LABELS[@]}"; do
        if [[ "$trimmed" == "$bump" ]]; then
            found+=("$trimmed")
        fi
    done
done

if [[ ${#found[@]} -eq 0 ]]; then
    echo "::error::PR must have exactly one of: ${BUMP_LABELS[*]}" >&2
    echo "Found labels: ${raw_labels:-<none>}" >&2
    exit 1
fi

if [[ ${#found[@]} -gt 1 ]]; then
    echo "::error::PR has conflicting bump labels: ${found[*]}" >&2
    echo "Apply exactly one of: ${BUMP_LABELS[*]}" >&2
    exit 1
fi

echo "${found[0]}"
