export type AssetState =
  "checking" | "downloading" | "paused" | "completed" | "cancelled" | "error";

export type AssetErrorCode =
  | "OFFLINE"
  | "CDN_UNAVAILABLE"
  | "STORAGE_INSUFFICIENT"
  | "CHECKSUM_MISMATCH"
  | "INVALID_MANIFEST"
  | "DOWNLOAD_FAILED";

export type AssetProgress = {
  state: AssetState;
  currentFile?: string;
  currentFileBytes?: number;
  currentFileTotalBytes?: number;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  bytesPerSecond: number;
  etaSeconds?: number;
  error?: string;
  errorCode?: AssetErrorCode;
  retrying?: boolean;
};

type AssetEntry = { path: string; url: string; bytes: number; sha256: string };
type AssetManifest = {
  version: string;
  manifestHash: string;
  assets: AssetEntry[];
};
type InstalledMetadata = {
  version: string;
  manifestHash: string;
  files: Record<string, string>;
};
type DownloadSession = {
  version: string;
  manifestHash: string;
  completed: Record<string, string>;
};

const CACHE_NAME = "orbit-assets-v1";
const METADATA_KEY = "orbit.assets.metadata";
const SESSION_KEY = "orbit.assets.download-session";
const MANIFEST_URL = "/assets/manifest.json";

export class AssetManagerError extends Error {
  constructor(
    public readonly code: AssetErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class AssetManager {
  private paused = false;
  private abortController = new AbortController();

  constructor(
    private readonly onProgress: (progress: AssetProgress) => void,
    private readonly concurrency = 4,
  ) {}

  get isPaused(): boolean {
    return this.paused;
  }

  async prepare(): Promise<void> {
    this.emit({ state: "checking" });
    const manifest = await this.fetchManifest();
    const metadata = this.readMetadata();

    if (
      metadata?.version === manifest.version &&
      metadata.manifestHash === manifest.manifestHash
    ) {
      const cache = await caches.open(CACHE_NAME);
      const valid = await Promise.all(
        manifest.assets.map(async (asset) => {
          const response = await cache.match(asset.path);
          if (!response || metadata.files[asset.path] !== asset.sha256)
            return false;
          return (
            (await sha256(await response.arrayBuffer())) ===
            asset.sha256.toLowerCase()
          );
        }),
      );
      if (valid.every(Boolean)) {
        this.emitCompleted(manifest);
        return;
      }
    }

    await this.ensureStorage(manifest);
    await this.downloadAssets(manifest);
    if (this.paused) return;

    localStorage.setItem(
      METADATA_KEY,
      JSON.stringify({
        version: manifest.version,
        manifestHash: manifest.manifestHash,
        files: Object.fromEntries(
          manifest.assets.map((asset) => [asset.path, asset.sha256]),
        ),
      } satisfies InstalledMetadata),
    );
    localStorage.removeItem(SESSION_KEY);
    this.emitCompleted(manifest);
  }

  pause(): void {
    this.paused = true;
    this.abortController.abort();
    this.emit({ state: "paused" });
  }

  resume(): void {
    this.paused = false;
    this.abortController = new AbortController();
    void this.prepare();
  }

  cancel(): void {
    this.paused = true;
    this.abortController.abort();
    this.emit({ state: "cancelled" });
  }

  private async fetchManifest(): Promise<AssetManifest> {
    let response: Response;
    try {
      response = await fetch(MANIFEST_URL, { cache: "no-store" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      throw new AssetManagerError(
        navigator.onLine ? "CDN_UNAVAILABLE" : "OFFLINE",
        navigator.onLine
          ? "The asset server is unavailable."
          : "You are offline.",
      );
    }
    if (!response.ok)
      throw new AssetManagerError(
        "CDN_UNAVAILABLE",
        `The asset server returned HTTP ${response.status}.`,
      );
    const manifest = (await response.json()) as AssetManifest;
    if (
      !manifest.version ||
      !manifest.manifestHash ||
      !Array.isArray(manifest.assets)
    ) {
      throw new AssetManagerError(
        "INVALID_MANIFEST",
        "The asset manifest is invalid.",
      );
    }
    return manifest;
  }

  private async ensureStorage(manifest: AssetManifest): Promise<void> {
    const requiredBytes = manifest.assets.reduce(
      (sum, asset) => sum + asset.bytes,
      0,
    );
    const estimate = await navigator.storage?.estimate();
    const availableBytes =
      (estimate?.quota ?? Number.MAX_SAFE_INTEGER) - (estimate?.usage ?? 0);
    if (availableBytes < requiredBytes + 50 * 1024 * 1024) {
      throw new AssetManagerError(
        "STORAGE_INSUFFICIENT",
        "There is not enough storage space to download Orbit assets.",
      );
    }
    await navigator.storage?.persist?.();
  }

  private async downloadAssets(manifest: AssetManifest): Promise<void> {
    const cache = await caches.open(CACHE_NAME);
    const session = this.readSession();
    const fileProgress = new Map<string, number>();
    const completed = new Set<string>();

    for (const asset of manifest.assets) {
      const response = await cache.match(asset.path);
      if (
        response &&
        session?.version === manifest.version &&
        session.manifestHash === manifest.manifestHash &&
        session.completed[asset.path] === asset.sha256
      ) {
        const valid =
          (await sha256(await response.arrayBuffer())) ===
          asset.sha256.toLowerCase();
        if (valid) {
          completed.add(asset.path);
          fileProgress.set(asset.path, asset.bytes);
        } else {
          await cache.delete(asset.path);
        }
      }
    }

    const pending = manifest.assets.filter(
      (asset) => !completed.has(asset.path),
    );
    const totalBytes = manifest.assets.reduce(
      (sum, asset) => sum + asset.bytes,
      0,
    );
    let downloadedBytes = Array.from(fileProgress.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    let cursor = 0;
    const startedAt = performance.now();

    const update = (currentFile?: string, retrying = false) => {
      const seconds = Math.max((performance.now() - startedAt) / 1000, 0.1);
      const bytesPerSecond = downloadedBytes / seconds;
      this.emit({
        state: "downloading",
        currentFile,
        currentFileBytes: currentFile
          ? (fileProgress.get(currentFile) ?? 0)
          : undefined,
        currentFileTotalBytes: currentFile
          ? manifest.assets.find((asset) => asset.path === currentFile)?.bytes
          : undefined,
        downloadedBytes,
        totalBytes,
        percent: totalBytes ? (downloadedBytes / totalBytes) * 100 : 100,
        bytesPerSecond,
        etaSeconds: bytesPerSecond
          ? (totalBytes - downloadedBytes) / bytesPerSecond
          : undefined,
        retrying,
      });
    };

    const worker = async () => {
      while (!this.paused) {
        const asset = pending[cursor++];
        if (!asset) return;
        let lastError: unknown;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            fileProgress.set(asset.path, 0);
            update(asset.path, attempt > 1);
            await this.downloadOne(asset, cache, (bytes) => {
              fileProgress.set(
                asset.path,
                (fileProgress.get(asset.path) ?? 0) + bytes,
              );
              downloadedBytes += bytes;
              update(asset.path, attempt > 1);
            });
            completed.add(asset.path);
            this.writeSession(manifest, completed);
            break;
          } catch (error) {
            lastError = error;
            downloadedBytes -= fileProgress.get(asset.path) ?? 0;
            fileProgress.set(asset.path, 0);
            if (this.paused) return;
            if (attempt < 3)
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * attempt),
              );
          }
        }
        if (lastError && !completed.has(asset.path)) throw lastError;
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(this.concurrency, pending.length) },
        worker,
      ),
    );
  }

  private async downloadOne(
    asset: AssetEntry,
    cache: Cache,
    onChunk: (bytes: number) => void,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(asset.url, {
        signal: this.abortController.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      throw new AssetManagerError(
        navigator.onLine ? "CDN_UNAVAILABLE" : "OFFLINE",
        navigator.onLine
          ? `Connection to the asset server failed for ${asset.path}.`
          : "You are offline.",
      );
    }
    if (!response.ok || !response.body)
      throw new AssetManagerError(
        response.status >= 500 ? "CDN_UNAVAILABLE" : "DOWNLOAD_FAILED",
        `Could not download ${asset.path}.`,
      );

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      onChunk(value.byteLength);
    }
    const buffer = concatChunks(chunks);
    if ((await sha256(buffer)) !== asset.sha256.toLowerCase()) {
      await cache.delete(asset.path);
      throw new AssetManagerError(
        "CHECKSUM_MISMATCH",
        `The downloaded file is corrupted: ${asset.path}.`,
      );
    }
    await cache.put(
      asset.path,
      new Response(buffer, {
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ?? "application/octet-stream",
        },
      }),
    );
  }

  private readMetadata(): InstalledMetadata | null {
    try {
      const raw = localStorage.getItem(METADATA_KEY);
      return raw ? (JSON.parse(raw) as InstalledMetadata) : null;
    } catch {
      return null;
    }
  }

  private readSession(): DownloadSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as DownloadSession) : null;
    } catch {
      return null;
    }
  }

  private writeSession(manifest: AssetManifest, completed: Set<string>): void {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        version: manifest.version,
        manifestHash: manifest.manifestHash,
        completed: Object.fromEntries(
          manifest.assets
            .filter((asset) => completed.has(asset.path))
            .map((asset) => [asset.path, asset.sha256]),
        ),
      } satisfies DownloadSession),
    );
  }

  private emit(progress: Partial<AssetProgress>): void {
    this.onProgress({
      state: "checking",
      downloadedBytes: 0,
      totalBytes: 0,
      percent: 0,
      bytesPerSecond: 0,
      ...progress,
    });
  }

  private emitCompleted(manifest: AssetManifest): void {
    const totalBytes = manifest.assets.reduce(
      (sum, asset) => sum + asset.bytes,
      0,
    );
    this.emit({
      state: "completed",
      downloadedBytes: totalBytes,
      totalBytes,
      percent: 100,
    });
  }
}

function concatChunks(chunks: Uint8Array[]): ArrayBuffer {
  const buffer = new Uint8Array(
    chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer.buffer;
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
