"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AlignLeft, Check, Radio } from "lucide-react";
import { createDocumentSession } from "./document-session";

export default function DescriptionEditor({
  taskId,
  initialText,
}: {
  taskId: string;
  initialText: string;
}) {
  const [session] = useState(() => createDocumentSession(taskId, initialText));
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );
  useEffect(() => session.start(), [session]);
  return (
    <section className="description-section">
      <div className="section-label">
        <h3>
          <AlignLeft size={15} />
          Description
        </h3>
        <span className={snapshot.saved ? "editor-saved" : "editor-error"}>
          {snapshot.connected ? (
            <>
              <Radio size={12} />
              Connected
            </>
          ) : snapshot.saved ? (
            <>
              <Check size={12} />
              Saved locally
            </>
          ) : (
            "Not saved"
          )}
        </span>
      </div>
      <textarea
        aria-label="Task description"
        className="description-editor"
        value={snapshot.text}
        onChange={(event) => session.replace(event.target.value)}
        placeholder="What needs to happen? Add a little context…"
      />
    </section>
  );
}
