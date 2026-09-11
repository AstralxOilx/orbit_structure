"use client";

import { useEffect, useState } from "react";
import type { AssetProgress } from "./asset-manager";
import { OrbitLogo } from "@/shared/ui";

const errorCopy = {
  OFFLINE: {
    title: "You are offline",
    message: "Reconnect to the internet and try again.",
  },
  CDN_UNAVAILABLE: {
    title: "Asset server unavailable",
    message:
      "The download server is temporarily unavailable. Please try again.",
  },
  STORAGE_INSUFFICIENT: {
    title: "Not enough storage",
    message: "Free some space on this device, then try again.",
  },
  CHECKSUM_MISMATCH: {
    title: "Asset verification failed",
    message:
      "A file was corrupted during download. It will be downloaded again.",
  },
  INVALID_MANIFEST: {
    title: "Asset configuration error",
    message: "Orbit could not read the current asset list.",
  },
  DOWNLOAD_FAILED: {
    title: "Download failed",
    message: "One or more files could not be downloaded.",
  },
} as const;

function formatBytes(value: number): string {
  if (!value) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export function AssetLoadingScreen({
  progress,
  onPause,
  onResume,
  onRetry,
  onCancel,
}: {
  progress: AssetProgress;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [showStorageHelp, setShowStorageHelp] = useState(false);
  const busy =
    progress.state === "checking" || progress.state === "downloading";
  const paused = progress.state === "paused";
  const failed = progress.state === "error";
  const copy = errorCopy[progress.errorCode ?? "DOWNLOAD_FAILED"];
  const eta = progress.etaSeconds
    ? `${Math.ceil(progress.etaSeconds / 60)} min remaining`
    : "Calculating time…";

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <main className="asset-loading-screen">
      {!online && (
        <div className="asset-offline-banner" role="status">
          Offline — Orbit will resume when you reconnect.
        </div>
      )}
      <section
        className="asset-loading-card"
        aria-labelledby="asset-loading-title"
      >
        <OrbitLogo size={72} />
        <p className="asset-loading-eyebrow">ORBIT WORKSPACE</p>
        <h1 id="asset-loading-title">
          {failed
            ? copy.title
            : paused
              ? "Download paused"
              : "Preparing your workspace"}
        </h1>
        <p className="asset-loading-message">
          {failed
            ? copy.message
            : progress.currentFile
              ? `Downloading ${progress.currentFile}`
              : "Checking local assets…"}
        </p>

        <div
          className="asset-loading-progress"
          role="progressbar"
          aria-label="Asset download progress"
          aria-valuenow={Math.round(progress.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="asset-loading-sr-status" aria-live="polite">
          {progress.percent.toFixed(0)} percent downloaded.{" "}
          {formatBytes(progress.downloadedBytes)} of{" "}
          {formatBytes(progress.totalBytes)}.{" "}
          {formatBytes(progress.bytesPerSecond)} per second. {eta}.
        </p>
        <div className="asset-loading-stats" aria-hidden="true">
          <span>{progress.percent.toFixed(0)}%</span>
          <span>
            {formatBytes(progress.downloadedBytes)} /{" "}
            {formatBytes(progress.totalBytes)}
          </span>
          <span>{formatBytes(progress.bytesPerSecond)}/s</span>
          <span>{eta}</span>
        </div>
        {progress.currentFile && progress.currentFileTotalBytes ? (
          <p className="asset-loading-file-size">
            {formatBytes(progress.currentFileBytes ?? 0)} of{" "}
            {formatBytes(progress.currentFileTotalBytes)}
          </p>
        ) : null}

        <div className="asset-loading-actions">
          {failed ? (
            <button type="button" onClick={onRetry} disabled={!online}>
              Retry download
            </button>
          ) : paused ? (
            <button type="button" onClick={onResume}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={onPause} disabled={!busy}>
              Pause
            </button>
          )}
          <button
            type="button"
            className="asset-secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
        {progress.errorCode === "STORAGE_INSUFFICIENT" && (
          <button
            type="button"
            className="asset-link-button"
            onClick={() => setShowStorageHelp(true)}
          >
            Open storage settings
          </button>
        )}
      </section>

      {showStorageHelp && (
        <div
          className="asset-modal-backdrop"
          role="presentation"
          onClick={() => setShowStorageHelp(false)}
        >
          <section
            className="asset-storage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="storage-help-title">Free up storage</h2>
            <p>
              Remove unused downloads or apps, then return to Orbit and retry
              the asset download.
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.storage?.persist?.();
                setShowStorageHelp(false);
              }}
            >
              Request persistent storage
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
