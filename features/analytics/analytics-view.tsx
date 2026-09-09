"use client";

import { useMemo, useState } from "react";
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
import { Avatar, StatusIcon } from "@/shared/ui";
import { MEMBERS, PROJECTS } from "@/features/workspace/data";
import { STATUSES, STATUS_META, type Task } from "@/features/tasks/domain/task";

export default function AnalyticsView({
  tasks,
  onProject,
  onOpen,
}: {
  tasks: Task[];
  onProject: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [range, setRange] = useState("all");
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
      date: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T00:00:00Z`)),
      planned: scoped.filter((task) => task.dueOn === date).length,
      completed: scoped.filter(
        (task) => task.dueOn === date && task.status === "done",
      ).length,
    }));
  }, [scoped]);
  const workload = MEMBERS.map((member) => ({
    name: member.name.split(" ")[0],
    tasks: scoped.filter(
      (task) => task.assigneeId === member.id && task.status !== "done",
    ).length,
    fill: member.id === "alex" ? "#7560db" : "#d2c9f4",
  }));
  const metrics = [
    {
      label: "Total tasks",
      value: scoped.length,
      detail: "Everything, in one place",
      icon: Layers3,
      color: "purple",
    },
    {
      label: "Completed",
      value: completed,
      detail: `${scoped.length ? Math.round((completed / scoped.length) * 100) : 0}% of all tasks`,
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: "In progress",
      value: scoped.filter((task) => task.status === "progress").length,
      detail: "Moving things forward",
      icon: CircleDot,
      color: "blue",
    },
    {
      label: "Team members",
      value: MEMBERS.length,
      detail: "Better, together",
      icon: UsersRound,
      color: "orange",
    },
  ];
  return (
    <div className="analytics-view">
      <div className="analytics-intro">
        <div>
          <span className="eyebrow">A LITTLE PERSPECTIVE</span>
          <h2>Good work starts with a clear view.</h2>
          <p>See where things stand, and what’s coming next.</p>
        </div>
        <select
          aria-label="Analytics project filter"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="all">All projects</option>
          {PROJECTS.map((project) => (
            <option value={project.id} key={project.id}>
              {project.name}
            </option>
          ))}
        </select>
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
                {metric.label === "Completed" ? ` / ${scoped.length}` : ""}
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
              <h3>Delivery outlook</h3>
              <p>Tasks by due date · current project snapshot</p>
            </div>
            <span className="chart-legend">
              <i />
              Scheduled <i className="green" />
              Completed
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
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="planned"
                  name="Scheduled"
                  stroke="#8066dd"
                  strokeWidth={2.5}
                  fill="url(#orbitChartFill)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#70b696"
                  strokeWidth={2}
                  fill="transparent"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data-table">
            <summary>View chart data</summary>
            <table>
              <thead>
                <tr>
                  <th>Due date</th>
                  <th>Scheduled</th>
                  <th>Completed</th>
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
              <h3>Team workload</h3>
              <p>Open tasks per teammate</p>
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
                  tick={{ fill: "#92919c", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#92919c", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  contentStyle={{
                    borderRadius: 10,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="tasks"
                  name="Open tasks"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-footnote">
            Task counts show distribution, not effort or capacity.
          </p>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="chart-card">
          <div className="chart-heading">
            <div>
              <h3>Your projects</h3>
              <p>A shared space for every big idea</p>
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
                    <Layers3 size={17} />
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
              <h3>Keep things flowing</h3>
              <p>Your workflow at a glance</p>
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
                    {STATUS_META[status].label}
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
              <span>A quick review keeps the momentum going.</span>
            </p>
          </div>
        </section>
      </div>
      <section className="chart-card upcoming-section">
        <div className="chart-heading">
          <div>
            <h3>Coming up next</h3>
            <p>A few things to keep on your radar</p>
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
