FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app


# Enable bytecode compilation and copy management
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Cache dependencies and install
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev


COPY . .

RUN uv sync

RUN mkdir -p /var/log/deep-research

CMD ["uv", "run", "uvicorn", "agent.server:app","--host", "0.0.0.0", "--port", "8000"]