#!/usr/bin/env bash
# setup.sh — One-command project setup for sudoku-generator.
#
# USAGE
#   ./setup.sh              Install deps + full CI pipeline (lint, test, build)
#   ./setup.sh --docker     Same, then build the Docker image
#   ./setup.sh --skip-ci    Install deps only — skip lint/test/build
#   ./setup.sh --help       Show this message
#
# REQUIREMENTS
#   Node.js >= 20   https://nodejs.org
#   npm >= 10       bundled with Node.js 20
#   Docker          https://docs.docker.com/get-docker/  (only with --docker)
#
# The script is idempotent — safe to run multiple times.
# Exit codes: 0 = success · 1 = prerequisite failure · 2 = step failure

set -euo pipefail

# ── Colours (disabled automatically when stdout is not a TTY) ──────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[1;34m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; RESET=''
fi

info()    { printf "${BLUE}[INFO]${RESET}  %s\n" "$*"; }
success() { printf "${GREEN}[  OK]${RESET}  %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
err()     { printf "${RED}[FAIL]${RESET}  %s\n" "$*" >&2; }
step()    { printf "\n${BOLD}▶  %s${RESET}\n" "$*"; }
die()     { err "$*"; exit 1; }

# ── Parse flags ────────────────────────────────────────────────────────────────
BUILD_DOCKER=false
SKIP_CI=false

for arg in "$@"; do
  case "$arg" in
    --docker)
      BUILD_DOCKER=true
      ;;
    --skip-ci)
      SKIP_CI=true
      ;;
    --help|-h)
      printf "%b" \
        "${BOLD}setup.sh${RESET} — Sudoku Generator project setup\n" \
        "\n${BOLD}USAGE${RESET}\n" \
        "  ./setup.sh [--docker] [--skip-ci] [--help]\n" \
        "\n${BOLD}OPTIONS${RESET}\n" \
        "  (none)       Install deps, lint, test, build (mirrors the CI pipeline)\n" \
        "  --docker     Same, then build Docker image 'sudoku-generator:latest'\n" \
        "  --skip-ci    Install deps only — skip lint/test/build\n" \
        "  --help, -h   Show this message\n" \
        "\n${BOLD}REQUIREMENTS${RESET}\n" \
        "  Node.js >= 20  (https://nodejs.org)\n" \
        "  npm >= 10      (ships with Node.js 20)\n" \
        "  Docker         (only required with --docker)\n"
      exit 0
      ;;
    *)
      die "Unknown option: '$arg'  —  run './setup.sh --help' for usage"
      ;;
  esac
done

# ── Banner ─────────────────────────────────────────────────────────────────────
printf "%b" "${BOLD}"
printf "\n  ╔══════════════════════════════════════════════╗\n"
printf   "  ║      Sudoku Generator — Project Setup       ║\n"
printf   "  ╚══════════════════════════════════════════════╝\n"
printf "%b\n" "${RESET}"

# ── Navigate to the project root (wherever this script lives) ──────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
info "Working directory: $SCRIPT_DIR"

# ── Check prerequisites ────────────────────────────────────────────────────────
step "Checking prerequisites"

# Node.js
if ! command -v node &>/dev/null; then
  die "Node.js not found — install >= 20 from https://nodejs.org"
fi
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1))")
NODE_MAJOR=$(printf '%s' "$NODE_VER" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  die "Node.js >= 20 required (found $NODE_VER) — upgrade at https://nodejs.org"
fi
success "Node.js $NODE_VER"

# npm
if ! command -v npm &>/dev/null; then
  die "npm not found — it ships with Node.js, check your installation"
fi
NPM_VER=$(npm --version)
NPM_MAJOR=$(printf '%s' "$NPM_VER" | cut -d. -f1)
if [ "$NPM_MAJOR" -lt 10 ]; then
  warn "npm >= 10 recommended (found $NPM_VER) — upgrade: npm install -g npm@latest"
else
  success "npm $NPM_VER"
fi

# Docker (only when requested)
if [ "$BUILD_DOCKER" = true ]; then
  if ! command -v docker &>/dev/null; then
    die "Docker not found — install from https://docs.docker.com/get-docker/"
  fi
  if ! docker info &>/dev/null 2>&1; then
    die "Docker daemon not running — start Docker Desktop or: sudo systemctl start docker"
  fi
  DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
  success "Docker $DOCKER_VER"
fi

# ── Install npm dependencies ───────────────────────────────────────────────────
step "Installing npm dependencies"
npm install
success "node_modules ready"

# ── CI pipeline (lint → test → build) ─────────────────────────────────────────
if [ "$SKIP_CI" = false ]; then

  step "Linting  (eslint app/ lib/)"
  if ! npm run lint; then
    die "Lint failed — fix the errors above, then re-run setup.sh"
  fi
  success "Lint passed"

  step "Unit tests  (node:test)"
  if ! npm test; then
    die "Tests failed — fix the failing tests, then re-run setup.sh"
  fi
  success "All tests passed"

  step "Production build  (next build)"
  if ! npm run build; then
    die "Build failed — check the errors above, then re-run setup.sh"
  fi
  success "Build complete"

else
  warn "--skip-ci: skipping lint, tests, and build"
fi

# ── Build Docker image (optional) ─────────────────────────────────────────────
if [ "$BUILD_DOCKER" = true ]; then
  IMAGE_TAG="sudoku-generator:latest"
  step "Building Docker image  ($IMAGE_TAG)"

  if ! docker build -t "$IMAGE_TAG" .; then
    die "Docker build failed — see output above"
  fi

  IMAGE_SIZE=$(docker image inspect "$IMAGE_TAG" --format='{{.Size}}' | awk '{printf "%.0f MB", $1/1024/1024}')
  success "Image built: $IMAGE_TAG  ($IMAGE_SIZE)"

  printf "\n"
  info  "Run the container:"
  info  "  docker run -p 3000:3000 $IMAGE_TAG"
  info  "  → open http://localhost:3000"
  printf "\n"
  info  "Or with docker compose:"
  info  "  docker compose up"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\n%b  ✓ Setup complete!%b\n" "${GREEN}${BOLD}" "${RESET}"
printf "\n  ${BOLD}Useful commands:${RESET}\n"
printf "  npm run dev          → dev server at http://localhost:3000  (hot reload)\n"
printf "  npm run lint         → ESLint\n"
printf "  npm test             → unit tests  (21 tests, ~200 ms)\n"
printf "  npm run build        → production build\n"
if [ "$BUILD_DOCKER" = false ]; then
  printf "  ./setup.sh --docker  → build Docker image\n"
fi
printf "  docker compose up    → run production container (after building)\n"
printf "\n"
