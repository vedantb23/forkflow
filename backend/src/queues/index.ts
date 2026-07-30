// queues/index.ts — one place to import every queue + its job-data type.
// Producers do: import { orderQueue } from "../queues";

export { orderQueue } from "./order.queue";
export type { OrderJobData } from "./order.queue";

export { emailQueue } from "./email.queue";
export type { EmailJobData } from "./email.queue";

export { notificationQueue } from "./notification.queue";
export type { NotificationJobData } from "./notification.queue";

export { ingestQueue } from "./ingest.queue";
export type { IngestJobData } from "./ingest.queue";
