"""
ACOS FastAPI Application
LangGraph-powered backend for Financial Spreading Agentic Credit OS.
"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from graph.graph import build_graph
from api.router import router, set_graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Build and inject graph on startup
    graph = build_graph()
    set_graph(graph)
    print("✓ ACOS LangGraph compiled — 10 agent nodes, 5 human gates")
    yield
    print("ACOS shutting down")


app = FastAPI(
    title="Financial Spreading ACOS",
    description=(
        "Agentic Credit Operating System — LangGraph backend. "
        "10 named agents, 5 human gates, immutable audit trail."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server and Netlify preview
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ACOS", "agents": 10, "gates": 5}


@app.get("/")
async def root():
    return {
        "name": "Financial Spreading ACOS",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
