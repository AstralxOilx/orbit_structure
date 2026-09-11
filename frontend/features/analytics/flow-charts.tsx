"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Clock3, GitPullRequest, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select } from "@/shared/ui";
import type { Task } from "@/features/tasks/domain/task";
import { buildFlowMetrics } from "./flow-metrics";

const number = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
const tooltipStyle = {
  background: "var(--surface)",
  color: "var(--ink)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
};
const tick = { fill: "var(--muted)", fontSize: 10 };

function FlowCard({
  title,
  subtitle,
  icon,
  value,
  unit,
  children,
  empty,
  description,
  headers,
  rows,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  value: string;
  unit: string;
  children: ReactNode;
  empty?: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  const { t } = useTranslation();
  return (
    <section className="chart-card flow-card" aria-label={title}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="flow-chart-icon">{icon}</span>
      </div>
      <div className="flow-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="chart-area">
        {empty ? (
          <div className="flow-empty">
            <Activity size={24} aria-hidden />
            <p>{empty}</p>
          </div>
        ) : (
          children
        )}
      </div>
      <p className="flow-definition">{description}</p>
      <details className="chart-data-table">
        <summary>{t("workspace.deliveryFlow.viewChartData")}</summary>
        <p className="flow-definition">{subtitle}</p>
        <div className="flow-table-scroll">
          <table>
            <caption className="sr-only">{title} chart data</caption>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th scope="col" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, column) =>
                    column === 0 ? (
                      <th scope="row" key={column}>
                        {cell}
                      </th>
                    ) : (
                      <td key={column}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function FlowCharts({ tasks }: { tasks: Task[] }) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const [weeks, setWeeks] = useState(8);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const metrics = useMemo(
    () => buildFlowMetrics(tasks, weeks, now ?? 0, locale),
    [tasks, weeks, now, locale],
  );
  const localizedStages = metrics.stages.map((stage) => ({
    ...stage,
    name: t(
      `workspace.status${stage.status === "backlog" ? "Todo" : stage.status === "progress" ? "Progress" : "Review"}`,
    ),
  }));
  const completions = metrics.velocity.reduce(
    (sum, week) => sum + (week.completed ?? 0),
    0,
  );
  const measuredStages = localizedStages.filter(
    (stage) => stage.median !== null,
  );
  const slowest = measuredStages.reduce<(typeof metrics.stages)[number] | null>(
    (result, stage) =>
      !result || stage.median! > result.median! ? stage : result,
    null,
  );
  const hasHistory = now !== null && metrics.tracked > 0;
  return (
    <section
      className="flow-section"
      aria-label={t("workspace.deliveryFlow.analyticsLabel")}
    >
      <div className="flow-section-heading">
        <div>
          <span className="eyebrow">{t("workspace.deliveryFlow.eyebrow")}</span>
          <h2>{t("workspace.deliveryFlow.title")}</h2>
          <p>{t("workspace.deliveryFlow.subtitle")}</p>
        </div>
        <label className="flow-period">
          {t("workspace.deliveryFlow.historyWindow")}
          <Select
            density="compact"
            value={weeks}
            onChange={(event) => setWeeks(Number(event.target.value))}
          >
            <option value={4}>
              {t("workspace.deliveryFlow.lastWeeks", { count: 4 })}
            </option>
            <option value={8}>
              {t("workspace.deliveryFlow.lastWeeks", { count: 8 })}
            </option>
            <option value={12}>
              {t("workspace.deliveryFlow.lastWeeks", { count: 12 })}
            </option>
          </Select>
        </label>
      </div>
      <p className="flow-coverage">
        {now === null
          ? t("workspace.deliveryFlow.loadingHistory")
          : t("workspace.deliveryFlow.coverage", {
              tracked: metrics.tracked,
              total: tasks.length,
            })}
      </p>
      <div className="flow-grid">
        <FlowCard
          title={t("workspace.deliveryFlow.velocity")}
          subtitle={t("workspace.deliveryFlow.velocitySubtitle")}
          icon={<TrendingUp size={18} />}
          value={hasHistory ? String(completions) : "—"}
          unit={t("workspace.deliveryFlow.weeklyCompletions")}
          empty={
            !hasHistory ? t("workspace.deliveryFlow.velocityEmpty") : undefined
          }
          description={t("workspace.deliveryFlow.velocityDescription")}
          headers={[
            t("workspace.deliveryFlow.weekOf"),
            t("workspace.deliveryFlow.completedTasks"),
          ]}
          rows={metrics.velocity.map((week) => [
            week.label,
            hasHistory ? (week.completed ?? "—") : "—",
          ])}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={metrics.velocity}
              margin={{ left: -25, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <XAxis
                dataKey="label"
                tick={tick}
                axisLine={false}
                tickLine={false}
                minTickGap={22}
              />
              <YAxis
                allowDecimals={false}
                tick={tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--surface-hover)" }}
              />
              <Bar
                dataKey="completed"
                name={t("workspace.deliveryFlow.completedTasks")}
                fill="var(--accent)"
                radius={[5, 5, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </FlowCard>
        <FlowCard
          title={t("workspace.deliveryFlow.cycleTime")}
          subtitle={t("workspace.deliveryFlow.cycleTimeSubtitle")}
          icon={<Clock3 size={18} />}
          value={number(metrics.cycleMedian)}
          unit={t("workspace.deliveryFlow.medianDays")}
          empty={
            !metrics.cycleSamples
              ? t("workspace.deliveryFlow.cycleEmpty")
              : undefined
          }
          description={t("workspace.deliveryFlow.cycleDescription", {
            samples: metrics.cycleSamples,
            excluded: metrics.completionsWithoutCycle,
          })}
          headers={[
            t("workspace.deliveryFlow.weekOf"),
            t("workspace.deliveryFlow.medianDaysLabel"),
            t("workspace.deliveryFlow.cycles"),
          ]}
          rows={metrics.velocity.map((week) => [
            week.label,
            number(week.cycle),
            week.samples,
          ])}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={metrics.velocity}
              margin={{ left: -20, right: 12, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <XAxis
                dataKey="label"
                tick={tick}
                axisLine={false}
                tickLine={false}
                minTickGap={22}
              />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  number(Number(value)),
                  t("workspace.deliveryFlow.medianDaysLabel"),
                ]}
              />
              <Line
                type="linear"
                dataKey="cycle"
                name={t("workspace.deliveryFlow.medianDaysLabel")}
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </FlowCard>
        <FlowCard
          title={t("workspace.deliveryFlow.bottlenecks")}
          subtitle={t("workspace.deliveryFlow.bottlenecksSubtitle")}
          icon={<GitPullRequest size={18} />}
          value={number(slowest?.median ?? null)}
          unit={
            slowest
              ? t("workspace.deliveryFlow.daysStage", { stage: slowest.name })
              : t("workspace.deliveryFlow.longestStage")
          }
          empty={
            !measuredStages.length
              ? t("workspace.deliveryFlow.bottlenecksEmpty")
              : undefined
          }
          description={t("workspace.deliveryFlow.bottlenecksDescription")}
          headers={[
            t("workspace.deliveryFlow.stage"),
            t("workspace.deliveryFlow.medianDaysLabel"),
            t("workspace.deliveryFlow.exitedVisits"),
            t("workspace.deliveryFlow.openTasks"),
            t("workspace.deliveryFlow.knownAges"),
            t("workspace.deliveryFlow.medianOpenAge"),
          ]}
          rows={localizedStages.map((stage) => [
            stage.name,
            number(stage.median),
            stage.samples,
            stage.open,
            stage.trackedOpen,
            number(stage.age),
          ])}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={localizedStages}
              margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <XAxis
                type="number"
                tick={tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={tick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--surface-hover)" }}
                formatter={(value) => [
                  number(Number(value)),
                  t("workspace.deliveryFlow.medianDaysLabel"),
                ]}
              />
              <Bar
                dataKey="median"
                name={t("workspace.deliveryFlow.medianDaysLabel")}
                fill="var(--accent)"
                radius={[0, 5, 5, 0]}
                maxBarSize={25}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </FlowCard>
      </div>
      <div
        className="flow-aging"
        aria-label={t("workspace.deliveryFlow.ongoingWorkAge")}
      >
        <div>
          <h3>{t("workspace.deliveryFlow.workInFlight")}</h3>
          <p>{t("workspace.deliveryFlow.currentSnapshot")}</p>
        </div>
        {localizedStages.map((stage) => (
          <div key={stage.name}>
            <span>{stage.name}</span>
            <strong>
              {stage.open}
              <small> {t("workspace.deliveryFlow.open")}</small>
            </strong>
            <p>
              {t("workspace.deliveryFlow.ageSummary", {
                age: number(stage.age),
                tracked: stage.trackedOpen,
                open: stage.open,
              })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
