"use client";
import { useState } from "react";
import { Dialog } from "@/shared/ui";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "react-i18next";

export type AuthInfo = "reset" | "terms" | "privacy";
export function AuthInfoDialog({
  kind,
  onClose,
}: {
  kind: AuthInfo;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState("");
  const { t } = useTranslation();
  return (
    <div className="auth-shell auth-modal-scope">
      <Dialog
        title={
          kind === "reset"
            ? t("auth.resetPassword")
            : kind === "terms"
              ? t("auth.terms")
              : t("auth.yourPrivacy")
        }
        onClose={onClose}
        className="auth-info-dialog"
      >
        {kind === "reset" ? (
          <form
            className="mt-5 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice(t("auth.resetPreviewNotice"));
            }}
          >
            <p className="text-sm leading-6 text-muted">
              {t("auth.resetDescription")}
            </p>
            <Input
              label={t("auth.email")}
              type="email"
              autoComplete="email"
              required
              placeholder={t("auth.emailPlaceholder")}
            />
            {notice && (
              <p role="status" className="auth-notice">
                {notice}
              </p>
            )}
            <Button className="auth-submit" type="submit">
              {t("auth.sendResetLink")}
            </Button>
          </form>
        ) : (
          <div className="mt-5 space-y-4 text-sm leading-6 text-foreground">
            <p>
              {kind === "terms"
                ? t("auth.termsDescription")
                : t("auth.privacyDescription")}
            </p>
            <Button variant="outline" onClick={onClose}>
              {t("auth.gotIt")}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
