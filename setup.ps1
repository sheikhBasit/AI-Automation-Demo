#Requires -Version 5.1
# Single-shot setup for the Agentic Order demo on Windows.
# Run from an elevated or normal PowerShell prompt: .\setup.ps1
$ErrorActionPreference = "Stop"

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "$name not found on PATH. Install Docker Desktop (includes Docker Compose) and re-run."
        exit 1
    }
}
Require-Command docker

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}
if (-not (Test-Path "agent-server\.env")) {
    Copy-Item "agent-server\.env.example" "agent-server\.env"
    Write-Host "Created agent-server\.env from .env.example -- fill in GROQ_API_KEY, DEEPGRAM_API_KEY, LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET before continuing."
    Write-Host "Opening agent-server\.env for editing..."
    notepad "agent-server\.env"
    Read-Host "Press Enter once you've saved your API keys"
}

Write-Host "Building and starting web, agent-server, n8n..."
docker compose up -d --build

Write-Host "Waiting for the web service to come up..."
Start-Sleep -Seconds 10

Write-Host "Applying Prisma schema and seeding demo products..."
docker compose exec web npx prisma db seed

Write-Host "Importing the n8n order-confirmation workflow..."
docker compose cp agent-server/n8n-workflows/order-confirmation-flow.json n8n:/tmp/wf.json
docker compose exec n8n n8n import:workflow --input=/tmp/wf.json

$listOutput = docker compose exec n8n n8n list:workflow
Write-Host $listOutput
$id = ($listOutput | Select-String -Pattern '^([a-zA-Z0-9]+)\|').Matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -First 1

if ($id) {
    docker compose exec n8n n8n publish:workflow --id=$id
    docker compose restart n8n
    Write-Host "Activated workflow id $id and restarted n8n."
} else {
    Write-Warning "Could not auto-detect the workflow id. Activate it manually: docker compose exec n8n n8n list:workflow"
}

Write-Host ""
Write-Host "Done. Storefront: http://localhost:3000  Agent server: http://localhost:8000/docs  n8n: http://localhost:5678"
