# Web Stack & Engineering Guidelines

## 0. Development & Deployment Environments
- **Local Development**: Runs natively on **Windows**.
  - Backend: `uv run uvicorn app.main:app --reload`
  - Frontend: `npm run dev` (Vite)
- **Production Deployment**: Containerized on a single Linux VPS using **Docker & Docker Compose**.
  - All services must support container build with Dockerfile and `docker-compose.yml`.
  - Database file and state must be persisted via named/host volumes.

## 1. Python Environment Management (UV Only)
- **Tool**: Always use `uv` exclusively.
- **Execution**: `uv run python ...`, `uv run pytest`, `uv run uvicorn ...`
- **Dependencies**: `uv add <package>`, `uv add --dev <package>`, `uv sync`
- **Prohibited**: Never use `pip`, `pip3`, raw `python`, `venv`, `conda`, or `poetry`.

## 2. Python Strict Typing
- **Type Annotations**: 100% of function arguments, class methods, and return values must be explicitly typed.
- **Modern Syntax (Python 3.10+)**: Use `X | None`, `list[T]`, `dict[K, V]`, `tuple[T, ...]`.
- **Validation**: Every request/response and entity model must use Pydantic v2 `BaseModel`.
- **Static Checking**: Zero tolerance for unchecked `Any`. Code must pass Pyright / Mypy strict checks.

## 3. Backend: FastAPI Architecture
- **Layering**:
  - Routers (`app/api/`) handle HTTP request/response validation.
  - Services (`app/services/`) encapsulate pure business logic.
  - Schemas (`app/schemas/`) define Pydantic validation contracts.
- **Handlers**: Use `async def` for I/O operations and declare `response_model`.
- **Dependency Injection**: Use FastAPI `Depends` for authentication, database sessions, and services.

## 4. Frontend: React + TypeScript + Tailwind CSS
- **TypeScript**:
  - Strict mode enabled (`strict: true`).
  - No `any` types. All component props, states, and hook return values must have explicit interfaces or types.
  - API client types must align with backend Pydantic schemas.
- **Tailwind CSS**:
  - Utility-first approach for responsive design and states.
  - Avoid ad-hoc inline styles (`style={{...}}`).
  - Maintain consistent color palette, typography, and spacing.
- **Component Design**: Modular, reusable components with clear separation between stateful logic (hooks) and UI view.
