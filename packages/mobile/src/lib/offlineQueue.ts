export type QueueItem = {
  id: string;
  type: "attendance" | "borrow" | "return";
  payload: Record<string, string>;
};

const queue: QueueItem[] = [];

export function enqueue(item: QueueItem): void {
  queue.push(item);
}

export function flushQueue(): QueueItem[] {
  const snapshot = [...queue];
  queue.length = 0;
  return snapshot;
}

export function getQueueSize(): number {
  return queue.length;
}