from __future__ import annotations

import logging
import asyncio
import threading
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .services.model_service import model_service
from .services.traffic_service import traffic_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("intrusion_profiler")
routes_ready = threading.Event()
health_route_ready = threading.Event()
optional_route_events = {
    "reports": threading.Event(),
    "lab": threading.Event(),
    "explainability": threading.Event(),
    "studio": threading.Event(),
    "research": threading.Event(),
}


def _register_api_routes(app: FastAPI) -> None:
    """Load optional API modules after the HTTP app has started accepting requests."""
    try:
        from .api.routes import health
        app.include_router(health.router, prefix=settings.API_V1_PREFIX)
        health_route_ready.set()

        from .api.routes import dashboard, traffic, predictions, threats, analytics, model
        for route_module in (dashboard, traffic, predictions, threats, analytics, model):
            app.include_router(route_module.router, prefix=settings.API_V1_PREFIX)

        # The core application (including model performance and predictions)
        # is usable as soon as these routers are registered. Some optional
        # sections import heavier analysis modules, so don't hold every API
        # request behind those imports or make the UI appear unavailable.
        routes_ready.set()
        model_service.start_loading()
        logger.info("Core API routes are ready")

        from .api.routes import reports
        app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
        optional_route_events["reports"].set()
        logger.info("Reports API routes are ready")

        from .api.routes import lab
        app.include_router(lab.router, prefix=settings.API_V1_PREFIX)
        optional_route_events["lab"].set()
        logger.info("Lab API routes are ready")

        from .api.routes import explainability
        app.include_router(explainability.router, prefix=settings.API_V1_PREFIX)
        optional_route_events["explainability"].set()
        logger.info("Explainability API routes are ready")

        from .api.routes import studio
        app.include_router(studio.router, prefix=settings.API_V1_PREFIX)
        optional_route_events["studio"].set()
        logger.info("Studio API routes are ready")

        from .api.routes import research
        app.include_router(research.router, prefix=settings.API_V1_PREFIX)
        optional_route_events["research"].set()
        logger.info("All API routes are ready")
    except Exception:
        logger.exception("API route initialization failed")
        for route_ready in optional_route_events.values():
            route_ready.set()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing Cyber-Attack Network Intrusion Profiler Backend v%s...", settings.VERSION)
    threading.Thread(target=_register_api_routes, args=(app,), name="api-route-loader", daemon=True).start()
    logger.info("Traffic buffer initialized: %d flows", len(traffic_service.cached_flows))
    yield
    logger.info("Shutting down Cyber-Attack Network Intrusion Profiler Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Network Intrusion Profiler using Ensemble Learning (CIC-IDS-2017).",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def wait_for_route_initialization(request: Request, call_next: Any) -> Any:
    path = request.url.path.rstrip("/")
    health_path = f"{settings.API_V1_PREFIX.rstrip('/')}/health"
    if path == health_path:
        readiness = health_route_ready
    elif path.startswith(f"{settings.API_V1_PREFIX}/reports"):
        readiness = optional_route_events["reports"]
    elif path.startswith((
        f"{settings.API_V1_PREFIX}/datasets",
        f"{settings.API_V1_PREFIX}/preprocessing",
        f"{settings.API_V1_PREFIX}/ensemble",
        f"{settings.API_V1_PREFIX}/experiments",
    )):
        readiness = optional_route_events["lab"]
    elif path.startswith(f"{settings.API_V1_PREFIX}/explainability"):
        readiness = optional_route_events["explainability"]
    elif path.startswith(f"{settings.API_V1_PREFIX}/studio"):
        readiness = optional_route_events["studio"]
    elif path.startswith(f"{settings.API_V1_PREFIX}/research"):
        readiness = optional_route_events["research"]
    else:
        readiness = routes_ready
    if path.startswith(settings.API_V1_PREFIX) and not readiness.is_set():
        ready = await asyncio.to_thread(readiness.wait, 300)
        if not ready:
            return JSONResponse(
                status_code=503,
                content={"detail": "API is still initializing. Retry the request shortly."},
            )
    return await call_next(request)

@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "api_docs": "/docs",
        "health_check": f"{settings.API_V1_PREFIX}/health",
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception for %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
