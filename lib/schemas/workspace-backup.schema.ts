import { z } from "zod";

const backupEntity = z.record(z.string(), z.unknown());

export const workspaceBackupSchema = z.object({
  format: z.literal("orbit-workspace-backup"),
  version: z.literal(1),
  exportedAt: z.string(),
  workspace: backupEntity,
  projects: z.array(backupEntity),
  members: z.array(backupEntity),
  tasks: z.array(backupEntity),
  discussion: z.array(z.unknown()),
  activity: z.array(backupEntity),
});

export function parseWorkspaceBackup(value: unknown) {
  return workspaceBackupSchema.parse(value);
}
