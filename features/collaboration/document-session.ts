import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function createDocumentSession(taskId: string, initialText: string) {
  const doc = new Y.Doc();
  const text = doc.getText("description");
  const listeners = new Set<() => void>();
  const initial = { text: initialText, saved: true, connected: false };
  let snapshot = initial;
  let channel: BroadcastChannel | null = null;
  let provider: WebsocketProvider | null = null;
  let disposal: ReturnType<typeof setTimeout> | null = null;
  const key = `orbit.document.v1.${taskId}`;
  const publish = () => listeners.forEach((listener) => listener());
  const encode = (update: Uint8Array) =>
    btoa(Array.from(update, (byte) => String.fromCharCode(byte)).join(""));
  const decode = (value: string) =>
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    replace(next: string) {
      const previous = text.toString();
      let prefix = 0;
      while (
        prefix < previous.length &&
        prefix < next.length &&
        previous[prefix] === next[prefix]
      )
        prefix++;
      let suffix = 0;
      while (
        suffix < previous.length - prefix &&
        suffix < next.length - prefix &&
        previous[previous.length - 1 - suffix] ===
          next[next.length - 1 - suffix]
      )
        suffix++;
      doc.transact(() => {
        text.delete(prefix, previous.length - prefix - suffix);
        text.insert(prefix, next.slice(prefix, next.length - suffix));
      }, "local-editor");
    },
    start() {
      if (disposal) {
        clearTimeout(disposal);
        disposal = null;
      }
      const endpoint = process.env.NEXT_PUBLIC_YJS_WEBSOCKET_URL;
      if (!endpoint) {
        // A deterministic, immutable seed avoids duplicate initial text in two tabs.
        const seed = new Y.Doc();
        seed.clientID = 0;
        seed.getText("description").insert(0, initialText);
        Y.applyUpdate(doc, Y.encodeStateAsUpdate(seed), "initial");
        seed.destroy();
      }
      try {
        const stored = localStorage.getItem(key);
        if (stored) Y.applyUpdate(doc, decode(stored), "initial");
      } catch {
        snapshot = { ...snapshot, saved: false };
      }
      const refresh = () => {
        snapshot = { ...snapshot, text: text.toString() };
        publish();
      };
      const update = (bytes: Uint8Array, origin: unknown) => {
        try {
          localStorage.setItem(key, encode(Y.encodeStateAsUpdate(doc)));
          snapshot = { ...snapshot, saved: true };
        } catch {
          snapshot = { ...snapshot, saved: false };
        }
        if (origin !== "remote-tab") channel?.postMessage(bytes);
        refresh();
      };
      doc.on("update", update);
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(key);
        channel.onmessage = (event: MessageEvent<unknown>) => {
          if (
            !(event.data instanceof Uint8Array) ||
            event.data.byteLength > 1_000_000
          )
            return;
          try {
            Y.applyUpdate(doc, event.data, "remote-tab");
          } catch {
            /* Invalid peers cannot break the editor. */
          }
        };
      }
      if (endpoint) {
        provider = new WebsocketProvider(endpoint, `orbit-${taskId}`, doc);
        provider.on("status", ({ status }: { status: string }) => {
          snapshot = { ...snapshot, connected: status === "connected" };
          publish();
        });
      }
      refresh();
      return () => {
        doc.off("update", update);
        channel?.close();
        provider?.awareness.setLocalState(null);
        provider?.destroy();
        disposal = setTimeout(() => doc.destroy(), 0);
      };
    },
  };
}
