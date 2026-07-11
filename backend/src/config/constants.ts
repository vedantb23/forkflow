// ─────────────────────────────────────────────────────────────
// constants.ts — fixed values used across the app in ONE place.
// WHY: magic numbers scattered in code are bugs waiting to happen. If the slot
// window is "15 minutes" in five files and we change it, we miss one. Here it's
// defined once and imported everywhere.
// ─────────────────────────────────────────────────────────────

// ---- Kitchen capacity slots (the project's unique angle — used Day 4) ----
// A kitchen can only cook so many orders per time-window. We bucket time into
// 15-minute windows; each window has a max number of orders.
export const SLOT_MINUTES = 15; // length of one capacity window, in minutes

// ---- Redis cache TTLs (time-to-live, in seconds — used Day 3) ----
// How long cached data stays "fresh" before Redis auto-deletes it.
export const CACHE_TTL = {
  RESTAURANT_LIST: 60, // restaurant listing: cache for 60s
  MENU: 120, // a restaurant's menu: cache for 120s
} as const; // `as const` = these values are read-only, never reassigned

// ---- BullMQ queue names (used Day 5) ----
// Producers and workers must agree on the EXACT same queue name string, so we
// centralize them here to avoid typos that silently break the queue.
export const QUEUE_NAMES = {
  ORDER: "order-queue", // order processing pipeline
  EMAIL: "email-queue", // outgoing emails
  NOTIFICATION: "notification-queue", // real-time notifications (Socket.io, Day 6)
} as const;
