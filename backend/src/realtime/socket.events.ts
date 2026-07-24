// ─────────────────────────────────────────────────────────────
// socket.events.ts — the SINGLE source of truth for Socket.io event names.
// WHY: an event is just a string ("order:status"). The server emits it and the
// browser listens for it — if the two strings differ by even one character,
// nothing happens and there's no error to tell you why. Defining them once here
// (and importing everywhere) makes a typo impossible. Same idea as QUEUE_NAMES
// in constants.ts for BullMQ.
// ─────────────────────────────────────────────────────────────

// Step 1 — events the SERVER sends TO clients (browser listens for these).
export const SERVER_EVENTS = {
  // Order moved to a new status (CONFIRMED / PREPARING / OUT_FOR_DELIVERY / ...).
  // Payload: { orderId, status }. Sent to room `order:{orderId}`.
  ORDER_STATUS_UPDATED: "order:status_updated",

  // Delivery partner's live GPS position changed. Payload: { orderId, lat, lng }.
  // Sent to room `order:{orderId}` so the customer sees the bike move on a map.
  DELIVERY_LOCATION_UPDATED: "delivery:location_updated",

  // A brand-new order arrived for a restaurant. Payload: the order summary.
  // Sent to room `restaurant:{restaurantId}` so the owner's dashboard pings live.
  ORDER_NEW: "order:new",
} as const; // `as const` = these strings are read-only, never reassigned.

// Step 2 — events the CLIENT sends TO the server (server listens for these).
export const CLIENT_EVENTS = {
  // Customer opens an order page → asks to join that order's room to get updates.
  // Payload: { orderId }.
  JOIN_ORDER: "order:join",

  // Restaurant owner dashboard → join their restaurant's room for new orders.
  // Payload: { restaurantId }.
  JOIN_RESTAURANT: "restaurant:join",

  // Delivery partner app → push a new GPS position while driving.
  // Payload: { orderId, lat, lng }.
  SEND_LOCATION: "delivery:send_location",
} as const;
