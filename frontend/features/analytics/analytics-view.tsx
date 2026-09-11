"use client";

import { Select } from "@/shared/ui/select";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Layers3,
  UsersRound,
} from "lucide-react";

import { useMembers } from "@/features/workspace/catalog";
import { useProjects } from "@/features/workspace/catalog";
import { ProjectIcon } from "@/features/workspace/ui/project-icon";
import { STATUSES, STATUS_META, type Task } from "@/features/tasks/domain/task";
import { FlowCharts } from "./flow-charts";
import { taskStatusLabel } from "@/shared/i18n/task-copy";

type ChartTooltipEntry = {
  name?: string;
  value?: string | number;
  color?: string;
  payload?: { fill?: string };
};

function ThemeChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && <strong>{label}</strong>}
      {payload.map((entry) => {
        const color = entry.color ?? entry.payload?.fill ?? "var(--accent)";
        return (
          <div className="chart-tooltip-row" key={entry.name}>
            <span style={{ color }}>{entry.name}</span>
            <b style={{ color }}>{entry.value}</b>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsView({
  tasks,
  onProject,
  onOpen,
}: {
  tasks: Task[];
  onProject: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const MEMBERS = useMembers();
  const [range, setRange] = useState("all");
  const PROJECTS = useProjects();
  const scoped = useMemo(
    () =>
      range === "all"
        ? tasks
        : tasks.filter((task) => task.projectId === range),
    [range, tasks],
  );
  const completed = scoped.filter((task) => task.status === "done").length;
  const chartData = useMemo(() => {
    const dates = [
      ...new Set(scoped.map((task) => task.dueOn).filter(Boolean)),
    ].sort();
    return dates.map((date) => ({
      date: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T00:00:00Z`)),
      planned: scoped.filter((task) => task.dueOn === date).length,
      completed: scoped.filter(
        (task) => task.dueOn === date && task.status === "done",
      ).length,
    }));
  }, [scoped, locale]);
  const workload = MEMBERS.map((member) => ({
    name: member.name.split(" ")[0],
    tasks: scoped.filter(
      (task) => task.assigneeId === member.id && task.status !== "done",
    ).length,
    fill: member.id === "alex" ? "var(--accent)" : "var(--accent-border)",
  }));
  const metrics = [
    {
      label: t("workspace.totalTasks"),
      value: scoped.length,
      detail: t("workspace.everythingInOnePlace"),
      icon: Layers3,
      color: "purple",
    },
    {
      label: t("workspace.completed"),
      value: completed,
      detail: t("workspace.percentOfAllTasks", {
        percent: scoped.length
          ? Math.round((completed / scoped.length) * 100)
          : 0,
      }),
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: t("workspace.inProgress"),
      value: scoped.filter((task) => task.status === "progress").length,
      detail: t("workspace.movingThingsForward"),
      icon: CircleDot,
      color: "blue",
    },
    {
      label: t("workspace.teamMembers"),
      value: MEMBERS.length,
      detail: t("workspace.betterTogether"),
      icon: UsersRound,
      color: "orange",
    },
  ];
  return (
    <div className="analytics-view">
      <div className="analytics-intro">
        <div>
          <span className="eyebrow">{t("workspace.perspectiveEyebrow")}</span>
          <h2>{t("workspace.clearView")}</h2>
          <p>{t("workspace.seeNext")}</p>
        </div>
        <Select
          aria-label={t("workspace.allProjects")}
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="all">{t("workspace.allProjects")}</option>
          {PROJECTS.map((project) => (
            <option value={project.id} key={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <span className={`metric-icon metric-${metric.color}`}>
                <metric.icon size={18} />
              </span>
            </div>
            <strong>
              {metric.value}
              <small>
                {metric.label === t("workspace.completed")
                  ? ` / ${scoped.length}`
                  : ""}
              </small>
            </strong>
            <p>{metric.detail}</p>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <h3>{t("workspace.deliveryOutlook")}</h3>
              <p>{t("workspace.tasksByDueDate")}</p>
            </div>
            <span className="chart-legend">
              <i />
              {t("workspace.scheduled")} <i className="green" />
              {t("workspace.completedLower")}
            </span>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 12, right: 15, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="orbitChartFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#8771e5" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8771e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92919c", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92919c", fontSize: 11 }}
                />
                <Tooltip content={<ThemeChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="planned"
                  name={t("workspace.scheduled")}
                  stroke="#8066dd"
                  strokeWidth={2.5}
                  fill="url(#orbitChartFill)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name={t("workspace.completedLower")}
                  stroke="#70b696"
                  strokeWidth={2}
                  fill="transparent"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data-table">
            <summary>{t("workspace.viewChartData")}</summary>
            <table>
              <thead>
                <tr>
                  <th>{t("workspace.dueDate")}</th>
                  <th>{t("workspace.scheduled")}</th>
                  <th>{t("workspace.completedLower")}</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.planned}</td>
                    <td>{row.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <h3>{t("workspace.teamWorkload")}</h3>
              <p>{t("workspace.openTasksPerTeammate")}</p>
            </div>
            <UsersRound size={17} className="muted" />
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workload}
                margin={{ top: 12, right: 5, left: -25, bottom: 0 }}
                barSize={29}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  content={<ThemeChartTooltip />}
                />
                <Bar
                  dataKey="tasks"
                  name={t("workspace.openTasks")}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-footnote">{t("workspace.taskCountsNote")}</p>
        </section>
      </div>
      <FlowCharts tasks={scoped} />
      <div className="dashboard-bottom">
        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <h3>{t("workspace.yourProjects")}</h3>
              <p>{t("workspace.sharedSpace")}</p>
            </div>
            <span className="small-count">{PROJECTS.length}</span>
          </div>
          <div className="project-overview-list">
            {PROJECTS.map((project) => {
              const list = tasks.filter(
                (task) => task.projectId === project.id,
              );
              const done = list.filter((task) => task.status === "done").length;
              return (
                <button
                  className="project-overview-row"
                  key={project.id}
                  onClick={() => onProject(project.id)}
                >
                  <span
                    className={`project-mini-icon project-icon-${project.color}`}
                  >
                    <ProjectIcon project={project} size={17} />
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>
                      {list.length} tasks · {project.team}
                    </small>
                  </span>
                  <span className="project-progress">
                    <span>
                      {list.length ? Math.round((done / list.length) * 100) : 0}
                      %
                    </span>
                    <i>
                      <b
                        style={{
                          width: `${list.length ? (done / list.length) * 100 : 0}%`,
                        }}
                      />
                    </i>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              );
            })}
          </div>
        </section>
        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <h3>{t("workspace.keepFlowing")}</h3>
              <p>{t("workspace.workflowGlance")}</p>
            </div>
            <CircleDot size={17} className="muted" />
          </div>
          <div className="workflow-breakdown">
            {STATUSES.map((status) => {
              const count = scoped.filter(
                (task) => task.status === status,
              ).length;
              return (
                <div key={status}>
                  <span>
                    <StatusIcon status={status} />
                    {taskStatusLabel(t, status)}
                  </span>
                  <div>
                    <i
                      className={`status-bg-${STATUS_META[status].color}`}
                      style={{
                        width: `${scoped.length ? (count / scoped.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
          <div className="review-nudge">
            <span className="nudge-icon">✦</span>
            <p>
              <strong>
                {scoped.filter((task) => task.status === "review").length} tasks
                ready for a fresh pair of eyes.
              </strong>
              <span>{t("workspace.quickReview")}</span>
            </p>
          </div>
        </section>
      </div>
      <section className="chart-card upcoming-section">
        <div className="chart-heading">
          <div>
            <h3>{t("workspace.comingNext")}</h3>
            <p>{t("workspace.radar")}</p>
          </div>
          <CalendarDays size={17} className="muted" />
        </div>
        {scoped
          .filter((task) => task.status !== "done")
          .sort((a, b) => (a.dueOn || "9999").localeCompare(b.dueOn || "9999"))
          .slice(0, 4)
          .map((task) => (
            <button
              className="upcoming-row"
              key={task.id}
              onClick={() => onOpen(task.id)}
            >
              <StatusIcon status={task.status} />
              <strong>{task.title}</strong>
              <span>
                {
                  PROJECTS.find((project) => project.id === task.projectId)
                    ?.name
                }
              </span>
              <Avatar id={task.assigneeId} size="xs" />
              <ArrowUpRight size={15} />
            </button>
          ))}
      </section>
    </div>
  );
}
