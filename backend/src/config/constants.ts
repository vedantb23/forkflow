export const SLOT_MINUTES = 15;

export const CACHE_TTL = {
  RESTAURANT_LIST: 60,
  MENU: 120,
} as const;

export const QUEUE_NAMES = {
  ORDER: "order-queue",
  EMAIL: "email-queue",
  NOTIFICATION: "notification-queue",
} as const;
