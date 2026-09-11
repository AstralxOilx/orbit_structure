package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mattn/go-colorable"

	"orbit/backend/internal/config"
	"orbit/backend/internal/database"
	"orbit/backend/internal/httpapi"
)

const (
	terminalRed   = "\033[31m"
	terminalGreen = "\033[32m"
	terminalCyan  = "\033[36m"
	terminalReset = "\033[0m"
)

func main() {
	terminal := colorable.NewColorableStdout()
	cfg := config.Load()

	db, err := database.Open(context.Background(), cfg.DatabaseURL)
	if err != nil {
		_, _ = fmt.Fprintf(terminal, "%s[ERROR]%s database connection failed: %v\n", terminalRed, terminalReset, err)
		os.Exit(1)
	}
	defer db.Close()
	_, _ = fmt.Fprintf(terminal, "%s[OK]%s database connection established — status: %sconnected%s\n", terminalGreen, terminalReset, terminalGreen, terminalReset)

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpapi.NewRouter(db),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		_, _ = fmt.Fprintf(terminal, "%s[READY]%s orbit api listening — addr: %s, env: %s\n", terminalCyan, terminalReset, cfg.HTTPAddr, cfg.Environment)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			_, _ = fmt.Fprintf(terminal, "%s[ERROR]%s http server stopped: %v\n", terminalRed, terminalReset, err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		_, _ = fmt.Fprintf(terminal, "%s[ERROR]%s graceful shutdown failed: %v\n", terminalRed, terminalReset, err)
		os.Exit(1)
	}
}
