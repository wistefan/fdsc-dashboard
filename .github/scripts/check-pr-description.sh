#!/usr/bin/env bash
# check-pr-description.sh — validate a PR description matches the required format.
#
# The enforced format mirrors `.github/pull_request_template.md`. At minimum the
# description must contain non-empty `## Summary` and `## Release Notes` sections.
#
# Usage:
#   check-pr-description.sh <file-with-body>
#
# Returns 0 when the description is valid, non-zero otherwise with an error
# message on stderr suitable for GitHub Actions annotations.

set -euo pipefail

# Required section headings in the PR body (order independent).
readonly REQUIRED_SECTIONS=("## Summary" "## Release Notes")

# Minimum non-whitespace characters required in each section body.
readonly MIN_SECTION_CONTENT_CHARS=3

usage() {
    echo "Usage: $0 <pr-body-file>" >&2
    exit 2
}

if [[ $# -ne 1 ]]; then
    usage
fi

body_file="$1"
if [[ ! -f "$body_file" ]]; then
    echo "::error::PR body file not found: $body_file" >&2
    exit 2
fi

body="$(cat "$body_file")"

# Normalize CRLF → LF so line-based section extraction is portable.
body="${body//$'\r'/}"

missing=()
empty=()

for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -q -F "$section" <<< "$body"; then
        missing+=("$section")
        continue
    fi
    # Extract content between this heading and the next ## heading (or EOF).
    content="$(
        awk -v h="$section" '
            $0 == h { capture = 1; next }
            capture && /^## / { exit }
            capture { print }
        ' <<< "$body" | tr -d '[:space:]'
    )"
    if [[ ${#content} -lt $MIN_SECTION_CONTENT_CHARS ]]; then
        empty+=("$section")
    fi
done

if [[ ${#missing[@]} -gt 0 || ${#empty[@]} -gt 0 ]]; then
    echo "::error::PR description does not match the required template." >&2
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "Missing sections: ${missing[*]}" >&2
    fi
    if [[ ${#empty[@]} -gt 0 ]]; then
        echo "Empty sections (need at least $MIN_SECTION_CONTENT_CHARS non-whitespace chars): ${empty[*]}" >&2
    fi
    echo "See .github/pull_request_template.md for the required layout." >&2
    exit 1
fi

echo "PR description passes format checks."
