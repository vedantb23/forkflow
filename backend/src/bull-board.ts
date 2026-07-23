// bull-board.ts — a live web dashboard for our queues at /admin/queues.
//
// CONCEPT: Bull Board is a ready-made UI that reads BullMQ's data straight from
// Redis and shows every job: waiting, active, completed, failed (our DLQ), plus
// buttons to retry or remove a job by hand. Invaluable for seeing the pipeline
// work and for demoing "here's a failed job, watch me retry it".
//
// We import the QUEUE objects (producers) and wrap each in a BullMQAdapter so
// Bull Board knows how to read them. Then we hand its router back to app.ts to mount.

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { orderQueue, emailQueue, notificationQueue } from "./queues";

// The Express adapter gives us a router we can mount under any path.
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues"); // must match the mount path in app.ts

// Register our three queues with the dashboard.
createBullBoard({
  queues: [
    new BullMQAdapter(orderQueue),
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(notificationQueue),
  ],
  serverAdapter,
});

// app.ts mounts this at /admin/queues.
export const bullBoardRouter = serverAdapter.getRouter();
