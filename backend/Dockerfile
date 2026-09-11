FROM golang:1.26-alpine AS builder

WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/orbit-api ./cmd/api

FROM alpine:3.22

RUN addgroup -S orbit && adduser -S orbit -G orbit
COPY --from=builder /out/orbit-api /usr/local/bin/orbit-api

USER orbit
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/orbit-api"]
