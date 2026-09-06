#!/usr/bin/env bash
# Takedown helper: scripts/remove.sh themes <id>   |   scripts/remove.sh modes <id>
set -euo pipefail
kind="${1:?themes|modes}"; id="${2:?id}"
[[ "$kind" == "themes" || "$kind" == "modes" ]] || { echo "kind must be themes or modes"; exit 1; }
[[ -d "$kind/$id" ]] || { echo "no $kind/$id"; exit 1; }
git rm -rq "$kind/$id"
node scripts/build-index.mjs
git add index.json
git commit -m "${kind%s}: remove $id"
echo "Removed $kind/$id — push to publish."
