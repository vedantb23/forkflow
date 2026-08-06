import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { orderQueue, emailQueue, notificationQueue } from "./queues";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(orderQueue),
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(notificationQueue),
  ],
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();
