from urllib.parse import urlparse

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.graph import graph

app = FastAPI(title="Deep Research Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──────────────────────────────────────────────────


class ResearchRequest(BaseModel):
    query: str
    max_research_loops: int = 3
    initial_search_query_count: int = 3


class Source(BaseModel):
    label: str
    original_url: str  # vertex grounding-api-redirect URL
    resolved_url: str  # real article URL after following the redirect
    favicon: str  # Google Favicon Service URL


class ResearchResponse(BaseModel):
    message: str
    sources: list[Source]


# ── Helpers ────────────────────────────────────────────────────────────────────


def resolve_redirect(client: httpx.Client, vertex_url: str) -> str:
    """Follow the vertex grounding redirect to get the real article URL.
    Tries HEAD first, falls back to GET if the server rejects HEAD (405).
    """
    for method in ("HEAD", "GET"):
        try:
            resp = client.request(method, vertex_url, follow_redirects=True, timeout=15)
            final = str(resp.url)
            if final and "vertexaisearch" not in final:
                return final
        except Exception:
            continue
    return vertex_url


def favicon_url_for(real_url: str) -> str:
    """Google Favicon Service URL — browser fetches it directly."""
    if not real_url:
        return ""
    host = urlparse(real_url).netloc
    return f"https://www.google.com/s2/favicons?domain={host}&sz=32"


def enrich_sources(raw_sources: list[dict]) -> list[Source]:
    """Deduplicate sources, follow vertex redirects to real URLs, build favicon URLs."""
    seen: set[str] = set()
    unique: list[dict] = []
    for s in raw_sources:
        url = s.get("value", "").strip()
        if url and url not in seen:
            seen.add(url)
            unique.append(s)

    with httpx.Client(
        headers={"User-Agent": "Mozilla/5.0 (compatible; deep-research-bot/1.0)"},
        verify=False,
    ) as client:
        resolved = [resolve_redirect(client, s["value"]) for s in unique]

    results: list[Source] = []
    for s, real_url in zip(unique, resolved):
        host = urlparse(real_url).netloc or real_url
        results.append(
            Source(
                label=host,
                original_url=s["value"],
                resolved_url=real_url,
                favicon=favicon_url_for(real_url),
            )
        )
    return results


# ── Endpoints ──────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/research", response_model=ResearchResponse)
def research(req: ResearchRequest):
    state = {
        "messages": [{"role": "user", "content": req.query}],
        "max_research_loops": req.max_research_loops,
        "initial_search_query_count": req.initial_search_query_count,
    }

    final_state: dict = {}
    for step in graph.stream(state):
        for _node, output in step.items():
            if isinstance(output, dict):
                final_state.update(output)

    answer = ""
    for msg in reversed(final_state.get("messages", [])):
        if hasattr(msg, "content"):
            answer = msg.content
            break
        if isinstance(msg, dict) and msg.get("role") == "assistant":
            answer = msg.get("content", "")
            break

    sources = enrich_sources(final_state.get("sources_gathered", []))

    # Replace vertex grounding URLs in the answer with real article URLs
    # so the frontend can match them to favicon badges by hostname.
    for src in sources:
        if src.original_url and src.resolved_url and src.original_url in answer:
            answer = answer.replace(src.original_url, src.resolved_url)

    return ResearchResponse(message=answer, sources=sources)
