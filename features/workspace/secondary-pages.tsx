"use client";

import { useState } from "react";
import { ArrowUpRight, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, EmptyState } from "@/shared/ui";
import { MEMBERS, PROJECTS } from "./data";
import type { Task } from "../tasks/domain/task";

export function TeamPage({
  tasks,
  onMember,
}: {
  tasks: readonly Task[];
  onMember: (id: string) => void;
}) {
  const [teamFilter, setTeamFilter] = useState("All teams");
  return (
    <div className="team-page">
      <div className="team-toolbar">
        <span>{MEMBERS.length} people. One shared direction.</span>
        <select
          aria-label="Filter team members"
          value={teamFilter}
          onChange={(event) => setTeamFilter(event.target.value)}
        >
          {["All teams", ...new Set(MEMBERS.map((member) => member.team))].map(
            (team) => (
              <option key={team}>{team}</option>
            ),
          )}
        </select>
      </div>
      <div className="member-grid">
        {MEMBERS.filter(
          (member) => teamFilter === "All teams" || member.team === teamFilter,
        ).map((member) => {
          const memberTasks = tasks.filter(
            (task) => task.assigneeId === member.id,
          );
          const finished = memberTasks.filter(
            (task) => task.status === "done",
          ).length;
          return (
            <button
              className="member-card"
              key={member.id}
              onClick={() => onMember(member.id)}
            >
              <span className="member-card-top">
                <span className={`team-chip tag-${member.color}`}>
                  {member.team}
                </span>
                <ArrowUpRight size={16} />
              </span>
              <Avatar id={member.id} size="lg" />
              <h3>
                {member.name}
                {member.id === "alex" && <span>You</span>}
              </h3>
              <p>{member.role}</p>
              <div className="member-card-stats">
                <span>
                  <strong>{memberTasks.length - finished}</strong>Active tasks
                </span>
                <span>
                  <strong>{finished}</strong>Completed
                </span>
              </div>
              <span className="member-email">{member.email}</span>
            </button>
          );
        })}
      </div>
      <div className="team-bottom-note">
        <Sparkles size={21} />
        <div>
          <strong>Different strengths. Shared possibilities.</strong>
          <p>
            Find the right person, share the context, and make something great.
          </p>
        </div>
      </div>
    </div>
  );
}

export function InboxPage({
  tasks,
  read,
  onOpen,
}: {
  tasks: readonly Task[];
  read: boolean;
  onOpen: (id: string) => void;
}) {
  const comments = tasks
    .flatMap((task) => task.comments.map((comment) => ({ ...comment, task })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="inbox-page">
      <div className="inbox-section-heading">
        <span>Recent activity</span>
        <span>
          {read ? "You’re all caught up" : `${comments.length} updates`}
        </span>
      </div>
      {comments.map((item) => (
        <button
          key={`${item.task.id}-${item.id}`}
          className={`inbox-item ${!read ? "unread" : ""}`}
          onClick={() => onOpen(item.task.id)}
        >
          <Avatar id={item.authorId} size="md" />
          <span className="inbox-item-copy">
            <strong>
              {MEMBERS.find((member) => member.id === item.authorId)?.name}{" "}
              <span>commented on</span> {item.task.title}
            </strong>
            <span>{item.body}</span>
            <small>
              <MessageSquare size={12} />
              {
                PROJECTS.find((value) => value.id === item.task.projectId)?.name
              }{" "}
              ·{" "}
              {new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
              }).format(new Date(item.createdAt))}
            </small>
          </span>
          {!read && <i />}
        </button>
      ))}
      {!comments.length && (
        <EmptyState
          title="A quiet moment"
          description="Comments and project conversations will appear here."
        />
      )}
    </div>
  );
}
