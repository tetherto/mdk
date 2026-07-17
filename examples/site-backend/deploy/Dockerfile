# Self-contained image for the site-backend example.
#
# Build from the REPO ROOT so the whole backend is available:
#   docker build -f examples/site-backend/deploy/Dockerfile -t mdk-site-backend .
# (the npm scripts and docker-compose.yml already pass the right context.)
#
# One image, many roles: docker-compose.yml overrides `command` per container.

FROM node:24-bookworm-slim

# Native modules (hypercore/sodium/rocksdb) need a toolchain to build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/repo
COPY . .

# develop has no root workspace install — use its per-package setup for the backend,
# then install this example's own deps.
RUN npm run setup:core \
  && npm run setup:workers \
  && npm --prefix examples/site-backend install --no-audit --no-fund

WORKDIR /app/repo/examples/site-backend

ENV MDK_DISCOVERY=local

# Default role; docker-compose.yml overrides this per service.
CMD ["node", "backend/proc/mocks.js"]
