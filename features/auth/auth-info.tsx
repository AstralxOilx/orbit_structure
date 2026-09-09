"use client";
import { useState } from "react";
import { Dialog } from "@/shared/ui";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export type AuthInfo = "reset" | "terms" | "privacy";
export function AuthInfoDialog({
  kind,
  onClose,
}: {
  kind: AuthInfo;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState("");
  return (
    <div className="auth-shell auth-modal-scope">
      <Dialog
        title={
          kind === "reset"
            ? "Reset your password"
            : kind === "terms"
              ? "Terms & Conditions"
              : "Your privacy"
        }
        onClose={onClose}
        className="auth-info-dialog"
      >
        {kind === "reset" ? (
          <form
            className="mt-5 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice(
                "Password reset is not connected in this preview. No email has been sent.",
              );
            }}
          >
            <p className="text-sm leading-6 text-muted">
              Enter the email address associated with your account.
            </p>
            <Input
              label="Account email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
            />
            {notice && (
              <p role="status" className="auth-notice">
                {notice}
              </p>
            )}
            <Button className="auth-submit" type="submit">
              Send reset link
            </Button>
          </form>
        ) : (
          <div className="mt-5 space-y-4 text-sm leading-6 text-foreground">
            <p>
              {kind === "terms"
                ? "This is an interactive interface preview. Registration and sign-in do not create an account or grant access to a service. Published service terms will be provided when account registration is available."
                : "This preview validates account fields in your browser. It does not submit or store your password, and social buttons do not connect to Google or GitHub. The separate workspace demo stores its task data locally in your browser."}
            </p>
            <Button variant="outline" onClick={onClose}>
              Got it
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
