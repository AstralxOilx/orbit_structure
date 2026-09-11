"use client";

import { useEffect, useRef } from "react";

type CursorPacket = {
  kind: "move" | "leave";
  session: string;
  anchor: string;
  x: number;
  y: number;
};

/** Ephemeral cursors between tabs on the same origin. Movement never enters React state. */
export function PresenceLayer({ scope }: { scope: string }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(`orbit.presence.${scope}`);
    const session = crypto.randomUUID();
    const peers = new Map<
      string,
      { packet: CursorPacket; node: HTMLDivElement; seen: number }
    >();
    let frame: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: CursorPacket | null = null;
    let lastSent = 0;
    const paint = () => {
      frame = null;
      const positions = [...peers.values()].map((peer) => ({
        peer,
        bounds: document
          .querySelector(
            `[data-task-anchor="${CSS.escape(peer.packet.anchor)}"]`,
          )
          ?.getBoundingClientRect(),
      }));
      positions.forEach(({ peer, bounds }) => {
        peer.node.style.display = bounds ? "block" : "none";
        if (bounds)
          peer.node.style.transform = `translate3d(${bounds.left + bounds.width * peer.packet.x}px,${bounds.top + bounds.height * peer.packet.y}px,0)`;
      });
    };
    const schedule = () => {
      if (frame === null && document.visibilityState === "visible")
        frame = requestAnimationFrame(paint);
    };
    const flush = () => {
      timer = null;
      if (pending) {
        channel.postMessage(pending);
        lastSent = performance.now();
        pending = null;
      }
    };
    const onMove = (event: PointerEvent) => {
      const anchor = (event.target as Element)?.closest<HTMLElement>(
        "[data-task-anchor]",
      );
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      pending = {
        kind: "move",
        session,
        anchor: anchor.dataset.taskAnchor!,
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
      if (performance.now() - lastSent >= 50) flush();
      else if (!timer) timer = setTimeout(flush, 50);
    };
    channel.onmessage = (event: MessageEvent<Partial<CursorPacket>>) => {
      const packet = event.data;
      if (
        !packet ||
        typeof packet.session !== "string" ||
        packet.session === session
      )
        return;
      if (packet.kind === "leave") {
        peers.get(packet.session)?.node.remove();
        peers.delete(packet.session);
        return;
      }
      if (
        packet.kind !== "move" ||
        typeof packet.anchor !== "string" ||
        typeof packet.x !== "number" ||
        typeof packet.y !== "number" ||
        !Number.isFinite(packet.x) ||
        !Number.isFinite(packet.y) ||
        Math.abs(packet.x) > 2 ||
        Math.abs(packet.y) > 2
      )
        return;
      let peer = peers.get(packet.session);
      if (!peer && peers.size < 20) {
        const node = document.createElement("div");
        node.className = "remote-cursor";
        const pointer = document.createElement("span");
        pointer.textContent = "➤";
        const label = document.createElement("b");
        label.textContent = "Alex · another tab";
        node.append(pointer, label);
        layer.current?.append(node);
        peer = {
          packet: packet as CursorPacket,
          node,
          seen: performance.now(),
        };
        peers.set(packet.session, peer);
      }
      if (peer) {
        peer.packet = packet as CursorPacket;
        peer.seen = performance.now();
        schedule();
      }
    };
    const expiry = setInterval(() => {
      peers.forEach((peer, id) => {
        if (performance.now() - peer.seen > 5000) {
          peer.node.remove();
          peers.delete(id);
        }
      });
    }, 1000);
    document.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      channel.postMessage({ kind: "leave", session });
      channel.close();
      document.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      clearInterval(expiry);
      if (timer) clearTimeout(timer);
      if (frame !== null) cancelAnimationFrame(frame);
      peers.forEach((peer) => peer.node.remove());
      peers.clear();
    };
  }, [scope]);
  return <div ref={layer} className="presence-layer" aria-hidden="true" />;
}
