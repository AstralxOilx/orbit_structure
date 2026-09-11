package config

import "os"

type Config struct {
	HTTPAddr    string
	Environment string
	DatabaseURL string
}

func Load() Config {
	return Config{
		HTTPAddr:    valueOr("ORBIT_HTTP_ADDR", ":8080"),
		Environment: valueOr("ORBIT_ENV", "development"),
		DatabaseURL: os.Getenv("ORBIT_DATABASE_URL"),
	}
}

func valueOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
