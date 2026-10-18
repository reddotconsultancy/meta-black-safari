#!/bin/bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
for source in extension/*.js tests/fixture.js; do node --check "$source"; done
node --test tests/unit.cjs
python3 -m json.tool extension/manifest.json >/dev/null
python3 scripts/package.py
echo "Static checks complete. For Safari rendering checks, see TESTING.md."
