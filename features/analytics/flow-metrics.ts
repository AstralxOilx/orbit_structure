import { STATUSES, STATUS_META, type Task } from "@/features/tasks/domain/task";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
export const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Observed history only; planned dates never stand in for actual transitions. */
export function buildFlowMetrics(
  tasks: readonly Task[],
  weeks: number,
  now: number,
  locale = "en-US",
) {
  const today = new Date(now);
  const monday =
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
    ((today.getUTCDay() + 6) % 7) * DAY;
  const since = monday - (weeks - 1) * WEEK;
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    at: since + index * WEEK,
    label: new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(since + index * WEEK),
    completedIds: new Set<string>(),
    cycles: [] as number[],
  }));
  const stages = STATUSES.filter((status) => status !== "done").map(
    (status) => ({
      status,
      name: STATUS_META[status].label,
      durations: [] as number[],
      ages: [] as number[],
      open: 0,
    }),
  );
  let tracked = 0;
  let observedSince = Infinity;
  let completionsWithoutCycle = 0;
  for (const task of tasks) {
    if (task.deleted) continue;
    const history = [...(task.statusHistory ?? [])]
      .filter((event) => event.at <= now)
      .sort((a, b) => a.at - b.at);
    if (history.length) {
      tracked++;
      observedSince = Math.min(observedSince, history[0].at);
    }
    let cycleStart: number | null = null;
    for (let index = 0; index < history.length; index++) {
      const event = history[index];
      const previous = history[index - 1];
      if (previous && previous.to !== event.from) cycleStart = null;
      if (event.to === "progress" && cycleStart === null) cycleStart = event.at;
      const bucket = buckets[Math.floor((event.at - since) / WEEK)];
      if (event.to === "done" && event.from !== null && event.from !== "done") {
        if (bucket) {
          bucket.completedIds.add(task.id);
          if (cycleStart !== null)
            bucket.cycles.push((event.at - cycleStart) / DAY);
          else completionsWithoutCycle++;
        }
        cycleStart = null;
      }
      if (
        previous &&
        previous.to === event.from &&
        event.to !== event.from &&
        event.at >= since
      ) {
        stages
          .find((stage) => stage.status === event.from)
          ?.durations.push((event.at - previous.at) / DAY);
      }
    }
    const stage = stages.find((item) => item.status === task.status);
    if (stage) {
      stage.open++;
      const latest = history.at(-1);
      if (latest?.to === task.status) stage.ages.push((now - latest.at) / DAY);
    }
  }
  const cycles = buckets.flatMap((bucket) => bucket.cycles);
  return {
    tracked,
    completionsWithoutCycle,
    cycleMedian: median(cycles),
    cycleSamples: cycles.length,
    velocity: buckets.map((bucket) => ({
      label: bucket.label,
      completed:
        bucket.at + WEEK <= observedSince ? null : bucket.completedIds.size,
      cycle: median(bucket.cycles),
      samples: bucket.cycles.length,
    })),
    stages: stages.map((stage) => ({
      status: stage.status,
      name: stage.name,
      median: median(stage.durations),
      samples: stage.durations.length,
      open: stage.open,
      age: median(stage.ages),
      trackedOpen: stage.ages.length,
    })),
  };
}
