type TaskEventBase = {
  id: string;
  clientId: string;
  seq: number;
  ts: number;
};

export type TaskEvent = TaskEventBase &
  (
    | { type: "task.add"; taskId: string; text: string }
    | { type: "task.done"; taskId?: string | undefined }
    | { type: "task.cycle" }
    | { type: "task.completed.set"; count: number }
  );

export const parseTaskEvent = (formData: FormData): TaskEvent | undefined => {
  const field = (name: string) => formData.get(name)?.toString();
  const numberField = (name: string) => {
    const raw = field(name);
    return raw ? Number(raw) : Number.NaN;
  };

  const id = field("event_id");
  const type = field("event_type");
  const clientId = field("event_client_id");
  const seq = numberField("event_seq");
  const ts = numberField("event_ts");

  if (
    !id ||
    !type ||
    !clientId ||
    !Number.isFinite(seq) ||
    !Number.isFinite(ts)
  ) {
    return;
  }

  const base = { id, clientId, seq, ts };

  switch (type) {
    case "task.add": {
      const taskId = field("event_task_id");
      const text = field("event_text");
      if (!taskId || !text) {
        return;
      }
      return { ...base, type, taskId, text };
    }
    case "task.done": {
      return { ...base, type, taskId: field("event_task_id") || undefined };
    }
    case "task.cycle": {
      return { ...base, type };
    }
    case "task.completed.set": {
      const count = numberField("event_count");
      if (!Number.isFinite(count)) {
        return;
      }
      return { ...base, type, count };
    }
  }
};

export const createFallbackTaskEvent = (
  intent: string | null,
  another: string | null,
  id: string | null,
): TaskEvent | undefined => {
  const clientId = "server-form";
  const seq = Date.now() * 1000;
  const base = { id: `${clientId}:${seq}`, clientId, seq, ts: Date.now() };

  if (intent === "another" && another) {
    return {
      ...base,
      type: "task.add",
      taskId: crypto.randomUUID(),
      text: another,
    };
  }

  if (intent === "done") {
    return { ...base, type: "task.done", taskId: id || undefined };
  }

  if (intent === "cycle") {
    return { ...base, type: "task.cycle" };
  }
};
