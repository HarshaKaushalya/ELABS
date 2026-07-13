# ELABS AI Server Startup Script
# Sets OLLAMA_MODELS to D:\OllamaModels so models are stored/loaded from D drive

Write-Host "🤖 Starting ELABS AI Server..." -ForegroundColor Cyan

# Set Ollama model path to D drive
$env:OLLAMA_MODELS = "D:\OllamaModels"
Write-Host "✅ OLLAMA_MODELS set to D:\OllamaModels" -ForegroundColor Green

# Check if Ollama is running
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green
    $models = $ollamaCheck.models | ForEach-Object { $_.name }
    if ($models -contains "llama3.2:1b" -or ($models | Where-Object { $_ -like "llama3.2:1b*" })) {
        Write-Host "✅ llama3.2:1b model is ready" -ForegroundColor Green
    } else {
        Write-Host "⚠️  llama3.2:1b not found. Run: ollama pull llama3.2:1b" -ForegroundColor Yellow
        Write-Host "   Available models: $($models -join ', ')" -ForegroundColor Yellow
        Write-Host "   Starting in database-only fallback mode..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Ollama is not running. Starting in database-only fallback mode." -ForegroundColor Yellow
    Write-Host "   To enable AI: start Ollama, then run: ollama pull llama3.2:1b" -ForegroundColor Yellow
}

# Activate venv and start server
Write-Host ""
Write-Host "🚀 Starting FastAPI server on port 8001..." -ForegroundColor Cyan
& ".\venv\Scripts\uvicorn" src.main:app --host 0.0.0.0 --port 8001
