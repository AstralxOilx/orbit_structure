"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "./dialog";
import { Input } from "./input";

export function DeleteConfirmation({
  kind,
  name,
  impact,
  onClose,
  onDelete,
}: {
  kind: "project" | "workspace" | "member";
  name: string;
  impact: ReactNode;
  onClose: () => void;
  onDelete: (confirmation: string) => void;
}) {
  const id = useId();
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const matches = confirmation === name;
  return (
    <Dialog
      title={`Delete ${kind}`}
      onClose={onClose}
      className="delete-confirmation"
    >
      <div className="delete-warning">
        <AlertTriangle size={22} aria-hidden />
        <div>
          <strong>This action cannot be undone in Orbit.</strong>
          <p>{impact}</p>
        </div>
      </div>
      <p className="delete-target">{name}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!matches || !acknowledged || submitting.current) return;
          submitting.current = true;
          try {
            onDelete(confirmation);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Could not delete. Please try again.",
            );
            submitting.current = false;
          }
        }}
      >
        <Input
          label={`To confirm, type ${name} exactly.`}
          id={id}
          className="delete-name-input"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError("");
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          required
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="catalog-note">
          Names are case-sensitive. Include all spaces and punctuation.
        </p>
        <label className="delete-acknowledgement">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          I understand that this {kind} and its tasks will be removed from Orbit
          on this browser.
        </label>
        {error && (
          <p className="catalog-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" autoFocus onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="button delete-danger-button"
            disabled={!matches || !acknowledged}
          >
            <Trash2 size={15} />
            Delete this {kind}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
