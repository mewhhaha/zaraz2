type OfflineQueueEntry = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type LocalTask = {
  id: string;
  text: string;
  createdAt: number;
};

type TodoState = {
  queue: LocalTask[];
  completed: number;
  counter: number;
};

declare global {
  interface Window {
    __offline?: {
      queue: (entry: OfflineQueueEntry) => Promise<boolean>;
    };
    __todoState?: TodoState;
  }
}

export {};
