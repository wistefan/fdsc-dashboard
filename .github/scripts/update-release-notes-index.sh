#!/usr/bin/env bash
# update-release-notes-index.sh — regenerate `RELEASE-NOTES.md` at the repo root.
#
# Scans `release-notes/` for `<version>.md` files (excluding `next.md`) and
# produces a Markdown table with columns Version, Date, Notes. Versions are
# listed newest-first by semver order.
#
# Usage:
#   update-release-notes-index.sh
#
# The script is idempotent — run it any number of times, it always produces
# the same file for the same directory contents.

set -euo pipefail

readonly INDEX_FILE="RELEASE-NOTES.md"
readonly NOTES_DIR="release-notes"
# Files in the notes dir that are NOT releases. Extend as needed.
readonly NON_RELEASE_FILES=("next.md" "README.md")

if [[ ! -d "$NOTES_DIR" ]]; then
    echo "::error::Release notes directory '$NOTES_DIR' not found." >&2
    exit 1
fi

# Build find's -not-name filter so every non-release file is excluded.
exclude_args=()
for f in "${NON_RELEASE_FILES[@]}"; do
    exclude_args+=( ! -name "$f" )
done

# Collect version files (skip the dedicated-file placeholder and docs).
mapfile -t files < <(find "$NOTES_DIR" -maxdepth 1 -type f -name '*.md' "${exclude_args[@]}" -printf '%f\n' | sort -V -r)

{
    echo "# Release Notes"
    echo
    echo "This file indexes all releases of **fdsc-dashboard**. It is regenerated"
    echo "automatically by the release workflow — do not edit by hand."
    echo
    echo "| Version | Date | Notes |"
    echo "|---------|------|-------|"
    if [[ ${#files[@]} -eq 0 ]]; then
        echo "| _none yet_ | — | — |"
    else
        for f in "${files[@]}"; do
            # Strip trailing .md to get the version identifier.
            version="${f%.md}"
            # Prefer the commit date of the notes file for accurate history; fall
            # back to the file's mtime when git metadata is unavailable.
            date="$(git log -1 --format=%cs -- "$NOTES_DIR/$f" 2>/dev/null || true)"
            if [[ -z "$date" ]]; then
                date="$(date -r "$NOTES_DIR/$f" +%Y-%m-%d 2>/dev/null || echo "—")"
            fi
            echo "| ${version} | ${date} | [release-notes/${f}](${NOTES_DIR}/${f}) |"
        done
    fi
} > "$INDEX_FILE"

echo "Wrote $INDEX_FILE with ${#files[@]} entries."
