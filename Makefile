.PHONY: help up down build logs dev-web dev-agent setup migrate seed clean sync-n8n

help:
	@echo "Available commands:"
	@echo "  make setup       - Install dependencies for web and agent"
	@echo "  make up          - Start all services with Docker Compose (web, agent, n8n)"
	@echo "  make down        - Stop all services"
	@echo "  make build       - Build all Docker images"
	@echo "  make logs        - View logs for all services"
	@echo "  make dev-web     - Start Next.js development server locally"
	@echo "  make dev-agent   - Start Python agent server locally"
	@echo "  make migrate     - Run Prisma database migrations"
	@echo "  make seed        - Run Prisma database seed"
	@echo "  make sync-n8n    - Sync n8n workflows (runs agent-server/sync_n8n_workflow.py)"
	@echo "  make clean       - Remove node_modules, .venv, and clear Docker volumes"

setup:
	npm install
	npx prisma generate
	cd agent-server && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

dev-web:
	npm run dev

dev-agent:
	cd agent-server && .venv/bin/uvicorn agent:app --reload --port 8000

migrate:
	npx prisma migrate dev

seed:
	npx prisma db seed

sync-n8n:
	cd agent-server && .venv/bin/python sync_n8n_workflow.py n8n-workflows/order-confirmation-flow.json

clean:
	docker-compose down -v
	rm -rf node_modules
	rm -rf .next
	rm -rf agent-server/.venv
