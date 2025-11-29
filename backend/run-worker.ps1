# PowerShell script to run Worker
$env:APP_ENV = "development"
Write-Host "Starting worker..." -ForegroundColor Green
go run ./cmd/worker/main.go

