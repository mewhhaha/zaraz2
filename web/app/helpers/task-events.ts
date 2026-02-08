export type TaskEvent =
  | {
      id: string;
      clientId: string;
      seq: number;
      ts: number;
      type: "task.add";
      taskId: string;
      text: string;
    }
  | {
      id: string;
      clientId: string;
      seq: number;
      ts: number;
      type: "task.done";
      taskId?: string;
    }
  | {
      id: string;
      clientId: string;
      seq: number;
      ts: number;
      type: "task.cycle";
    }
  | {
      id: string;
      clientId: string;
      seq: number;
      ts: number;
      type: "task.completed.set";
      count: number;
    };

export const parseTaskEvent = (formData: FormData): TaskEvent | undefined => {
  const id = formData.get("event_id")?.toString();
  const type = formData.get("event_type")?.toString();
  const clientId = formData.get("event_client_id")?.toString();
  const seqRaw = formData.get("event_seq")?.toString();
  const tsRaw = formData.get("event_ts")?.toString();
  const taskId = formData.get("event_task_id")?.toString();
  const text = formData.get("event_text")?.toString();

  if (!id || !type || !clientId || !seqRaw || !tsRaw) {
    return;
  }

  const seq = Number(seqRaw);
  const ts = Number(tsRaw);
  if (!Number.isFinite(seq) || !Number.isFinite(ts)) {
    return;
  }

  if (type === "task.add") {
    if (!taskId || !text) {
      return;
    }
    return {
      id,
      clientId,
      seq,
      ts,
      type,
      taskId,
      text,
    };
  }

  if (type === "task.done") {
    return {
      id,
      clientId,
      seq,
      ts,
      type,
      taskId: taskId || undefined,
    };
  }

  if (type === "task.cycle") {
    return { id, clientId, seq, ts, type };
  }

  if (type === "task.completed.set") {
    const countRaw = formData.get("event_count")?.toString();
    const count = Number(countRaw);
    if (!Number.isFinite(count)) {
      return;
    }
    return {
      id,
      clientId,
      seq,
      ts,
      type,
      count,
    };
  }
};

export const createFallbackTaskEvent = (
  intent: string | null,
  another: string | null,
  id: string | null,
): TaskEvent | undefined => {
  if (!intent) {
    return;
  }

  const clientId = "server-form";
  const seq = Date.now() * 1000;
  const eventId = `${clientId}:${seq}`;
  const ts = Date.now();

  if (intent === "another" && another) {
    return {
      id: eventId,
      clientId,
      seq,
      ts,
      type: "task.add",
      taskId: crypto.randomUUID(),
      text: another,
    };
  }

  if (intent === "done") {
    return {
      id: eventId,
      clientId,
      seq,
      ts,
      type: "task.done",
      taskId: id || undefined,
    };
  }

  if (intent === "cycle") {
    return {
      id: eventId,
      clientId,
      seq,
      ts,
      type: "task.cycle",
    };
  }
};
