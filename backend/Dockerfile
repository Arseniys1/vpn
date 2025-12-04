FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make gcc musl-dev

# Copy go mod files
COPY go.mod ./
RUN go mod download && go mod tidy

# Copy source code
COPY . .

# Build API binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o api-binary ./cmd/api

# Build Worker binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o worker-binary ./cmd/worker

# Build WebSocket binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o websocket-binary ./cmd/websocket

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata wget
WORKDIR /root/

# Copy binaries from builder
COPY --from=builder /app/api-binary .
COPY --from=builder /app/worker-binary .
COPY --from=builder /app/websocket-binary .

# Copy configs directory if exists
COPY --from=builder /app/configs ./configs/

EXPOSE 8080

# Default command (can be overridden)
CMD ["./api-binary"]

