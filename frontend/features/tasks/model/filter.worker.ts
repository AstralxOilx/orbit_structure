import { filterTasks, type Task, type TaskFilters } from "../domain/task";

export interface FilterRequest {
  requestId: number;
  changed: Task[];
  removed: string[];
  filters: TaskFilters;
}
export interface FilterResult {
  requestId: number;
  ids: string[];
}

const records = new Map<string, Task>();
const worker = self as unknown as {
  onmessage: ((event: MessageEvent<FilterRequest>) => void) | null;
  postMessage: (result: FilterResult) => void;
};
worker.onmessage = ({ data }) => {
  data.removed.forEach((id) => records.delete(id));
  data.changed.forEach((task) => records.set(task.id, task));
  worker.postMessage({
    requestId: data.requestId,
    ids: filterTasks(Array.from(records.values()), data.filters).map(
      (task) => task.id,
    ),
  });
};
