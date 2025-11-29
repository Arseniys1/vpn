# PowerShell script to run API server
$env:APP_ENV = "development"
Write-Host "Starting API server..." -ForegroundColor Green
go run ./cmd/api/main.go

