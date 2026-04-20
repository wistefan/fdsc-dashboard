#!/usr/bin/env bash
# extract-release-notes.sh — produce release-notes/<version>.md for a merge.
#
# Resolution order (first match wins):
#   1. `release-notes/next.md` in the merged tree (dedicated-file override).
#   2. The `## Release Notes` section extracted from the PR body.
#
# The resulting file is written to `release-notes/<version>.md` and its path
# is printed on stdout so the caller can stage/commit it.
#
# Usage:
#   extract-release-notes.sh <version> <pr-body-file>
#
# Example:
#   extract-release-notes.sh 1.2.3 /tmp/pr-body.md

set -euo pipefail

# Marker used by the dedicated-file mechanism. Contributors add
# release-notes/next.md on their branch; on merge we promote it to
# release-notes/<version>.md.
readonly DEDICATED_FILE="release-notes/next.md"
readonly NOTES_DIR="release-notes"
readonly RELEASE_NOTES_HEADING="## Release Notes"

usage() {
    echo "Usage: $0 <version> <pr-body-file>" >&2
    exit 2
}

if [[ $# -ne 2 ]]; then
    usage
fi

version="$1"
body_file="$2"

if [[ -z "$version" ]]; then
    echo "::error::version argument is empty" >&2
    exit 1
fi

mkdir -p "$NOTES_DIR"
target="${NOTES_DIR}/${version}.md"

if [[ -f "$DEDICATED_FILE" ]]; then
    echo "Using dedicated release notes file: $DEDICATED_FILE" >&2
    git mv -f "$DEDICATED_FILE" "$target" 2>/dev/null || mv -f "$DEDICATED_FILE" "$target"
    echo "$target"
    exit 0
fi

if [[ ! -f "$body_file" ]]; then
    echo "::error::PR body file not found and no dedicated file present: $body_file" >&2
    exit 1
fi

body="$(cat "$body_file")"
# Normalize CRLF → LF so section extraction is portable across runners.
body="${body//$'\r'/}"

notes="$(
    awk -v h="$RELEASE_NOTES_HEADING" '
        $0 == h { capture = 1; next }
        capture && /^## / { exit }
        capture { print }
    ' <<< "$body"
)"

# Strip leading and trailing blank lines while preserving internal blank
# lines (so paragraphs and lists between them remain intact).
notes="$(
    echo "$notes" | awk '
        NF { have_content = 1 }
        have_content { lines[++n] = $0 }
        END {
            # Trim trailing blank lines.
            while (n > 0 && lines[n] ~ /^[[:space:]]*$/) { n-- }
            for (i = 1; i <= n; i++) print lines[i]
        }
    '
)"

if [[ -z "$(echo "$notes" | tr -d '[:space:]')" ]]; then
    echo "::error::Could not extract '$RELEASE_NOTES_HEADING' section from PR body." >&2
    echo "Either populate the section in the PR description or supply $DEDICATED_FILE." >&2
    exit 1
fi

{
    echo "# Release ${version}"
    echo
    echo "$notes"
} > "$target"

echo "$target"
