"use client";

import { Check, FolderKanban, ListTodo, Rocket, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, NewUserTooltip } from "@/shared/ui";

const steps = [
  {
    title: "workspaceOnboarding.createWorkspaceTitle",
    description: "workspaceOnboarding.createWorkspaceDescription",
    icon: Rocket,
  },
  {
    title: "workspaceOnboarding.createProjectTitle",
    description: "workspaceOnboarding.createProjectDescription",
    icon: FolderKanban,
  },
  {
    title: "workspaceOnboarding.addTaskTitle",
    description: "workspaceOnboarding.addTaskDescription",
    icon: ListTodo,
  },
];

export function OnboardingDialog({
  step,
  onClose,
  onAction,
}: {
  step: number;
  onClose: () => void;
  onAction: (step: number) => void;
}) {
  const { t } = useTranslation();
  const current = steps[Math.min(step, steps.length - 1)];
  const Icon = current.icon;
  return (
    <Dialog title={t("workspace.workspaceOnboarding.title")} onClose={onClose}>
      <div className="onboarding-dialog">
        <div
          className="onboarding-progress"
          aria-label={t("workspace.workspaceOnboarding.stepOf", {
            step: step + 1,
            total: steps.length,
          })}
        >
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={index <= step ? "is-active" : ""}
            />
          ))}
        </div>
        <div className="onboarding-icon">
          <Icon size={25} />
        </div>
        <p className="eyebrow">
          {t("workspace.workspaceOnboarding.stepOf", {
            step: step + 1,
            total: steps.length,
          })}
        </p>
        <h2>{t(`workspace.${current.title}`)}</h2>
        <p className="dialog-description">
          {t(`workspace.${current.description}`)}
        </p>
        <div className="onboarding-tip">
          <Sparkles size={16} />
          <span>{t("workspace.tipChangeLater")}</span>
        </div>
        <div className="dialog-actions">
          <button className="button" onClick={onClose}>
            {t("workspace.workspaceOnboarding.maybeLater")}
          </button>
          <NewUserTooltip
            id={`onboarding-step-${step}`}
            content={t("workspace.workspaceOnboarding.startStep", {
              title: t(`workspace.${current.title}`),
            })}
            side="top"
          >
            <button
              className="button button-primary"
              onClick={() => onAction(step)}
            >
              {step === 2
                ? t("workspace.createTask")
                : t("workspace.workspaceOnboarding.continue")}
            </button>
          </NewUserTooltip>
        </div>
      </div>
    </Dialog>
  );
}

export function OnboardingComplete({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog
      title={t("workspace.workspaceOnboarding.completeTitle")}
      onClose={onClose}
    >
      <div className="onboarding-dialog onboarding-complete">
        <div className="onboarding-icon">
          <Check size={25} />
        </div>
        <h2>{t("workspace.workspaceReady")}</h2>
        <p className="dialog-description">
          {t("workspace.workspaceOnboarding.completeDescription")}
        </p>
        <button className="button button-primary" onClick={onClose}>
          {t("workspace.workspaceOnboarding.startWorking")}
        </button>
      </div>
    </Dialog>
  );
}
