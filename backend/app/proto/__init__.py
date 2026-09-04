import sys
from pathlib import Path

_proto_dir = str(Path(__file__).parent)
if _proto_dir not in sys.path:
    sys.path.insert(0, _proto_dir)

# Create __init__.py files if missing so typing works properly
for p in Path(__file__).parent.rglob("*"):
    if p.is_dir() and not (p / "__init__.py").exists():
        (p / "__init__.py").write_text("", encoding="utf-8")
