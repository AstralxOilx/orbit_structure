"use client";

import { useEffect, useState } from "react";
import {
  markWorkspaceNotificationsRead,
  listWorkspaceNotifications,
  type WorkspaceActivityApiRecord,
} from "@/lib/auth-api";
import {
  isRealtimeWorkspaceId,
  subscribeWorkspaceRealtime,
} from "@/lib/workspace-realtime";
import {
  ACTIVITY_PREFIX,
  readActivities,
  type ActivityAction,
  type ActivityEntity,
  type ActivityRecord,
} from "./activity";

const READ_PREFIX = "orbit.notifications.read.v1.";

function apiActivityToRecord(item: WorkspaceActivityApiRecord): ActivityRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    actorId: item.actorId,
    action: item.action as ActivityAction,
    entity: item.entityType as ActivityEntity,
    entityId: item.entityId,
    entityName: item.entityName,
    detail: item.detail,
    status: "success",
    read: item.read ?? false,
    createdAt: Date.parse(item.createdAt),
  };
}

export function notificationReadKey(workspaceId: string) {
  return READ_PREFIX + workspaceId;
}

export function readNotificationIds(workspaceId: string) {
  try {
    const value = JSON.parse(
      localStorage.getItem(notificationReadKey(workspaceId)) ?? "[]",
    );
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : [];
  } catch {
    return [];
  }
}

export function markNotificationsRead(workspaceId: string, ids: string[]) {
  localStorage.setItem(
    notificationReadKey(workspaceId),
    JSON.stringify([...new Set([...readNotificationIds(workspaceId), ...ids])]),
  );
  window.dispatchEvent(new Event("orbit:notifications-changed"));
  if (isRealtimeWorkspaceId(workspaceId)) {
    const activityIds = ids
      .filter((id) => id.startsWith("activity-"))
      .map((id) => id.slice("activity-".length));
    void markWorkspaceNotificationsRead(workspaceId, activityIds).catch(() => undefined);
  }
}

function applyLocalReadState(workspaceId: string, items: ActivityRecord[]) {
  const readIds = new Set(readNotificationIds(workspaceId));
  return items.map((item) => ({
    ...item,
    read: item.read || readIds.has(`activity-${item.id}`),
  }));
}

export function useWorkspaceActivityFeed(workspaceId: string) {
  const [activities, setActivities] = useState<ActivityRecord[]>(() =>
    typeof window === "undefined" ? [] : readActivities(workspaceId),
  );
  useEffect(() => {
    let current = true;
    const load = () => {
      if (!isRealtimeWorkspaceId(workspaceId)) {
        setActivities(applyLocalReadState(workspaceId, readActivities(workspaceId)));
        return;
      }
      void listWorkspaceNotifications(workspaceId)
        .then((items) => {
          if (current) setActivities(applyLocalReadState(workspaceId, items.map(apiActivityToRecord)));
        })
        .catch(() => {
          if (current) setActivities(readActivities(workspaceId));
        });
    };
    load();
    const unsubscribeRealtime = subscribeWorkspaceRealtime(workspaceId, load);
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(ACTIVITY_PREFIX)) load();
    };
    const onActivity = () => load();
    const onNotifications = () => {
      if (current) setActivities((value) => applyLocalReadState(workspaceId, value));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("orbit:activity-changed", onActivity);
    window.addEventListener("orbit:notifications-changed", onNotifications);
    return () => {
      current = false;
      unsubscribeRealtime();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("orbit:activity-changed", onActivity);
      window.removeEventListener("orbit:notifications-changed", onNotifications);
    };
  }, [workspaceId]);
  return activities;
}
