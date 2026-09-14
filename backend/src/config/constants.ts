export const SLOT_MINUTES = 15;

export const CACHE_TTL = {
  RESTAURANT_LIST: 300, // 5 minutes (was 60s)
  MENU: 600,            // 10 minutes (was 2m)
} as const;

export const QUEUE_NAMES = {
  ORDER: "order-queue",
  EMAIL: "email-queue",
  NOTIFICATION: "notification-queue",
} as const;
