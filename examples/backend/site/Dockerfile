# Build from repo root:
#   docker build -f examples/core/site/Dockerfile -t site-mdk .
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git ca-certificates build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/repo
