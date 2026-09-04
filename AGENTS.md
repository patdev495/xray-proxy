# xray-proxy

Project instructions and guidelines for AI agents working in this repository.

## Environment & Tooling Rules

- **Development OS**: Local development on Windows.
  - Backend runs directly via `uv run uvicorn app.main:app --reload`.
  - Frontend runs directly via `npm run dev` (Vite dev server).
- **Production Deployment**: Single VPS deployment using **Docker & Docker Compose**.
  - All services (Backend, Frontend/Nginx, Volumes) must be containerized and runnable via `docker compose up -d`.
  - Persistent data (SQLite database, certs) must be mounted to host volumes.
- **Python Environment**: Always use `uv` exclusively for all Python operations.
  - Run commands: `uv run python ...`, `uv run pytest`, `uv run uvicorn ...`
  - Manage dependencies: `uv add <pkg>`, `uv add --dev <pkg>`, `uv sync`
  - **STRICTLY FORBIDDEN**: Raw `pip`, `pip3`, `python`, `venv`, `conda`, or `poetry`.
- **Package Management**: All Python dependencies must be tracked in `pyproject.toml` managed by `uv`.

---

## Python Coding & Typing Standards

- **Strict Type Annotations**:
  - 100% type hinted. Every function, method parameter, and return value must have explicit type annotations.
  - Use modern Python 3.10+ syntax: `str | None` (not `Optional[str]`), `list[str]` (not `List[str]`), `dict[str, Any]` (not `Dict[str, Any]`).
  - Never leave unannotated parameters or return types.
  - Zero tolerance for unchecked `Any` without a documented, unavoidable reason.
  - Code must pass static type checkers (Pyright / Mypy) without errors or warnings.
- **Data Validation & Schemas**:
  - Always use Pydantic v2 (`BaseModel`) for all data transfer objects (DTOs), request bodies, and response models.
  - Use `pydantic-settings` for application settings and environment variables.

---

## Architecture & Technology Stack

### Backend: FastAPI
- **Structure**:
  - `app/api/`: Routers and endpoints organized by domain/version.
  - `app/schemas/`: Pydantic request and response models.
  - `app/services/`: Core business logic (isolated from HTTP layer).
  - `app/core/`: Configuration, security, database connections, and shared utilities.
- **FastAPI Best Practices**:
  - Explicit `response_model` on all endpoints.
  - Leverage FastAPI dependency injection (`Depends`) for services, auth, and database sessions.
  - Use `async def` for I/O-bound handlers (DB queries, external HTTP requests).
  - Standardized error handling with structured JSON responses.

### Frontend: React + TypeScript + Tailwind CSS
- **TypeScript**:
  - Strict mode enabled (`"strict": true` in `tsconfig.json`).
  - No `any`. Explicit typing for all component props, hooks, state, and API responses.
  - Frontend type definitions must mirror backend Pydantic schemas.
- **Tailwind CSS & Design Standards (ProMax Pristine Light)**:
  - **No AI Slop / No Neon Dark Tropes**: Strictly forbid dark neon glow gimmicks (`glow-*`, heavy purple/cyan radial blurs, dark frosted glass `glass-panel` with low readability).
  - **Color Palette & Contrast**: Pristine enterprise light theme inspired by Linear & Stripe:
    - Base canvas: `bg-slate-50` / `bg-zinc-50`. Surfaces & cards: `bg-white`.
    - Hairline crisp borders: `border-slate-200/80` or `border-zinc-200`.
    - Text hierarchy: High-contrast headings in `text-slate-900`, secondary details in `text-slate-500`, muted labels in `text-slate-400`.
    - Primary actions: High-contrast solid dark slate (`bg-slate-900 hover:bg-slate-800 text-white shadow-xs`) or crisp brand navy.
    - Status badges: Soft pastel backgrounds with solid crisp text (e.g. `bg-emerald-50 text-emerald-700 border-emerald-200` for online, `bg-rose-50 text-rose-700 border-rose-200` for offline).
  - **Elevation & Shadows**: Clean, natural, subtle elevation (`shadow-xs`, `shadow-sm`).
  - **Typography**: Modern clean sans-serif (Inter/Geist font stack), tabular numbers (`font-mono` or `tabular-nums`) for IP addresses, ports, and bandwidth quotas.
  - Utility-first classes for styling, layout, responsive design (`sm:`, `md:`, `lg:`), and states (`hover:`, `focus:`).
  - Avoid inline CSS (`style={{...}}`) and redundant custom CSS classes.
- **Component Design**:
  - Modular, reusable, and single-responsibility components (`components/ui/` for buttons, inputs, tables, badges, modals).
  - Clear separation between UI presentation, custom hooks, and API integration.

### Separation of Concerns
- Strict boundary between UI, API routing, business logic, and infrastructure/data layers.
- Avoid duplicated logic, quick hacks, and premature monolithic abstractions.

---

## Documentation

- Check `AGENTS.md`, `CONTEXT.md`, and `docs/adr/` before introducing major architectural changes.

---

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles plus `done` for completed issues. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.
