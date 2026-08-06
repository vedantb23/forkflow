export const SERVER_EVENTS = {

  ORDER_STATUS_UPDATED: "order:status_updated",

  DELIVERY_LOCATION_UPDATED: "delivery:location_updated",

  ORDER_NEW: "order:new",
} as const;

export const CLIENT_EVENTS = {

  JOIN_ORDER: "order:join",

  JOIN_RESTAURANT: "restaurant:join",

  SEND_LOCATION: "delivery:send_location",

  JOIN_DELIVERY: "delivery:join",
} as const;
