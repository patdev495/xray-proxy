from pathlib import Path
import pytest


def test_no_source_file_exceeds_500_lines():
    """Verify that no code file in backend/app or frontend/src exceeds 500 lines.

    Enforces clean module decomposition and prevents monolithic files.
    Excludes:
    - Auto-generated protobuf files (backend/app/proto)
    - Virtual environments, node_modules, build artifacts
    """
    repo_root = Path(__file__).resolve().parent.parent.parent
    backend_app = repo_root / "backend" / "app"
    frontend_src = repo_root / "frontend" / "src"

    violating_files: list[tuple[str, int]] = []

    # Check backend/app (.py)
    for py_file in backend_app.rglob("*.py"):
        if "proto" in py_file.parts or "__pycache__" in py_file.parts:
            continue
        line_count = len(py_file.read_text(encoding="utf-8", errors="ignore").splitlines())
        if line_count > 500:
            rel_path = py_file.relative_to(repo_root).as_posix()
            violating_files.append((rel_path, line_count))

    # Check frontend/src (.ts, .tsx, .css)
    for fe_file in frontend_src.rglob("*"):
        if fe_file.suffix not in (".ts", ".tsx", ".css"):
            continue
        line_count = len(fe_file.read_text(encoding="utf-8", errors="ignore").splitlines())
        if line_count > 500:
            rel_path = fe_file.relative_to(repo_root).as_posix()
            violating_files.append((rel_path, line_count))

    if violating_files:
        msg = "\n".join(f"- {path}: {count} lines (> 500 limit)" for path, count in violating_files)
        pytest.fail(f"Files exceeding 500 line limit found:\n{msg}")
