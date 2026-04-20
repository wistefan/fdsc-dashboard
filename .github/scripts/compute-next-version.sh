#!/usr/bin/env bash
# compute-next-version.sh — compute the next semantic version from a bump label.
#
# Reads the most recent `vMAJOR.MINOR.PATCH` tag that is reachable from HEAD
# (falls back to `v0.0.0` when no tag exists) and prints the bumped version
# according to the supplied bump label.
#
# Usage:
#   compute-next-version.sh <major|minor|patch>
#
# Output:
#   The bumped version without a leading `v`, on stdout, e.g. `1.2.3`.

set -euo pipefail

# Default tag when no releases have been cut yet.
readonly INITIAL_VERSION="0.0.0"

usage() {
    echo "Usage: $0 <major|minor|patch>" >&2
    exit 2
}

if [[ $# -ne 1 ]]; then
    usage
fi

bump="$1"

case "$bump" in
    major|minor|patch) ;;
    *)
        echo "::error::Unknown bump label: $bump (expected major|minor|patch)" >&2
        exit 1
        ;;
esac

# Latest tag matching vN.N.N, or the initial sentinel if none exists.
latest_tag="$(git tag --list 'v*' --sort=-v:refname | head -n1 || true)"
if [[ -z "$latest_tag" ]]; then
    latest_tag="v${INITIAL_VERSION}"
fi

# Strip leading `v` and split into components.
version="${latest_tag#v}"
IFS='.' read -r major minor patch <<< "$version"

# Defensive defaults in case a malformed tag slipped in.
major="${major:-0}"
minor="${minor:-0}"
patch="${patch:-0}"

case "$bump" in
    major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
    minor)
        minor=$((minor + 1))
        patch=0
        ;;
    patch)
        patch=$((patch + 1))
        ;;
esac

echo "${major}.${minor}.${patch}"
