#!/usr/bin/env python3
"""Build a Safari temporary-install ZIP with manifest.json at the archive root."""
import hashlib
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
extension = root / "extension"
manifest = json.loads((extension / "manifest.json").read_text())
files = sorted(path for path in extension.rglob("*") if path.is_file() and not path.name.startswith("."))
archive = root.parent / "MetaBlack-Safari.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
    for path in files:
        bundle.write(path, path.relative_to(extension))
with zipfile.ZipFile(archive) as bundle:
    assert "manifest.json" in bundle.namelist()
    assert json.loads(bundle.read("manifest.json"))["version"] == manifest["version"]
    assert bundle.testzip() is None
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(root.parent / "MetaBlack-Safari.sha256").write_text(f"{digest}  {archive.name}\n")
print(f"Built {archive} ({archive.stat().st_size:,} bytes, {len(files)} files)")
print(f"SHA-256: {digest}")
