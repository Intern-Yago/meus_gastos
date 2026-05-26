# Finora - Project Instructions

## Docker Management
- **Authorization:** The agent is authorized to autonomously execute `docker-compose up -d --build` whenever changes are made to `Dockerfile`, `docker-compose.yml`, `requirements.txt`, `package.json`, or `.env` files.
- **Service Ports:**
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8000`
  - Database: `localhost:5432` (PostgreSQL)

## Technology Stack
- **Frontend:** Next.js (TypeScript), Tailwind CSS.
- **Backend:** FastAPI (Python), SQLAlchemy, Pydantic.
- **Database:** PostgreSQL.
- **AI:** OpenAI (`gpt-5.4-mini`).
- **Email:** Google SMTP for password recovery.

## Development Workflow
1. **Research:** Analyze the impact of changes.
2. **Strategy:** Plan the implementation.
3. **Execution:** Apply changes and verify.
4. **Autonomous Update:** Run `docker-compose up -d --build` to synchronize the environment.
