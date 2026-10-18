#!/bin/bash
# Optional persistent-app project. Temporary installation does not need Xcode.
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
selected_tool=""
for candidate in safari-web-extension-packager safari-web-extension-converter; do
  if xcrun --find "$candidate" >/dev/null 2>&1; then selected_tool="$candidate"; break; fi
done
if [[ -z "$selected_tool" ]]; then
  echo "Full Xcode is required for a containing-app project. Command Line Tools alone are insufficient." >&2
  echo "Install Xcode from the Mac App Store, open it to finish setup, then run:" >&2
  echo "DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer bash scripts/package-safari.sh" >&2
  echo "Or use Safari's Add Temporary Extension option with MetaBlack-Safari.zip now." >&2
  exit 1
fi
destination="$project_root/build/Safari"
mkdir -p "$destination"
cd "$destination"
echo "Using $selected_tool. In the prompts choose macOS, Swift, and app name Meta Black."
echo "Choose a unique bundle identifier, e.g. com.yourname.MetaBlack, for your signing team."
# The basic path-only command is shared by both Apple tools. Keep prompts visible
# rather than relying on flags that differ between Xcode releases.
exec xcrun "$selected_tool" "$project_root/extension"
