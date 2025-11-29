@echo off
set APP_ENV=development
echo Starting worker...
go run ./cmd/worker/main.go

