package config

import "os"

type Config struct {
	HTTPAddr    string
	Environment string
	DatabaseURL string
}

func Load() Config {
	environment := valueOr("ORBIT_ENV", "development")
	databaseURL := os.Getenv("ORBIT_DATABASE_URL")
	// Local development uses the PostgreSQL port published by Docker Compose.
	// Production and Docker deployments must provide the URL explicitly.
	if databaseURL == "" && environment == "development" {
		databaseURL = "postgres://orbit:orbit@localhost:5432/orbit?sslmode=disable"
	}

	return Config{
		HTTPAddr:    valueOr("ORBIT_HTTP_ADDR", ":8080"),
		Environment: environment,
		DatabaseURL: databaseURL,
	}
}

func valueOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
