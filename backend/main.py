from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import Base, engine
from backend.routers import examinations, reports

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EMG/ENG AI",
    description="AI-powered EMG/ENG examination description system",
    version="1.0.0",
)

# Frontend and API are served from the same FastAPI app (see static mount and
# `/` handler below), so requests are same-origin and no CORS middleware is
# needed. If a split deployment is ever introduced, add CORSMiddleware here
# with an explicit allowlist rather than a wildcard.

# API routes
app.include_router(examinations.router)
app.include_router(reports.router)

# Serve frontend
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


@app.get("/")
async def root():
    return FileResponse(str(frontend_dir / "index.html"))
