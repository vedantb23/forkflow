// scripts/raceTest.ts — PROVE THE RACE: 20 concurrent placeOrder calls for stock=1 item.
//
// What this proves: without the Redis lock + atomic DB UPDATE, multiple requests
// would all read stock=1 and all succeed, overselling the item. With our protection,
// exactly 1 wins and 19 get a 409 "out of stock".
//
// HOW TO RUN:
//   1. Make sure the backend is running: npm run dev
//   2. In a separate terminal: npx tsx scripts/raceTest.ts
//
// The script:
//   a. Logs in as the seeded customer (or registers one).
//   b. Resets a chosen menu item's stock to 1.
//   c. Fires 20 concurrent POST /api/orders requests.
//   d. Prints a result table and asserts exactly 1 winner.

import "dotenv/config";
import { pool, query } from "../src/config/db";

const BASE_URL = process.env.API_URL ?? "http://localhost:4000";

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiPost(path: string, body: unknown, token?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // unique idempotency key per concurrent call so they don't collapse into one
      "Idempotency-Key": `race-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as any;
  return { status: res.status, json };
}

// ── Step 1: get a JWT for the seeded customer ─────────────────────────────────

async function getToken(): Promise<string> {
  // Try the seeded customer; if not present, register a fresh one.
  let res = await apiPost("/api/auth/login", {
    email: "customer@forkflow.dev",
    password: "password123",
  });
  if (res.status !== 200) {
    res = await apiPost("/api/auth/register", {
      name: "Race Tester",
      email: "customer@forkflow.dev",
      password: "password123",
    });
    if (res.status !== 201) {
      throw new Error(`Could not get a customer token: ${JSON.stringify(res.json)}`);
    }
    res = await apiPost("/api/auth/login", {
      email: "customer@forkflow.dev",
      password: "password123",
    });
  }
  const token: string = res.json?.data?.token ?? res.json?.data?.accessToken;
  if (!token) throw new Error(`No token in login response: ${JSON.stringify(res.json)}`);
  return token;
}

// ── Step 2: pick a menu item and reset its stock to 1 ────────────────────────

async function resetStock(): Promise<{ menuItemId: string; restaurantId: string }> {
  // Grab the first available menu item from the DB.
  const rows = await query<{ id: string; restaurant_id: string; name: string }>(
    "SELECT id, restaurant_id, name FROM menu_items WHERE is_available = true LIMIT 1"
  );
  if (rows.length === 0) throw new Error("No available menu items found. Run db:seed first.");
  const item = rows[0];

  // Reset stock to exactly 1 so only one order can win.
  await query("UPDATE menu_items SET stock = 1 WHERE id = $1", [item.id]);
  console.log(`\n🎯 Target item: "${item.name}" (${item.id})`);
  console.log(`   Restaurant:   ${item.restaurant_id}`);
  console.log(`   Stock reset → 1\n`);

  return { menuItemId: item.id, restaurantId: item.restaurant_id };
}

// ── Step 3: fire 20 concurrent orders ────────────────────────────────────────

async function runRace(
  token: string,
  menuItemId: string,
  restaurantId: string
): Promise<void> {
  const CONCURRENT = 20;

  const calls = Array.from({ length: CONCURRENT }, (_, i) =>
    apiPost(
      "/api/orders",
      { restaurant_id: restaurantId, items: [{ menu_item_id: menuItemId, quantity: 1 }] },
      token
    ).then((r) => ({ i: i + 1, status: r.status, msg: r.json?.message ?? "" }))
  );

  console.log(`🚀 Firing ${CONCURRENT} concurrent placeOrder requests...\n`);
  const results = await Promise.all(calls);

  // ── Step 4: print results table ──────────────────────────────────────────
  const winners = results.filter((r) => r.status === 201);
  const losers  = results.filter((r) => r.status !== 201);

  console.log("┌──────┬────────┬──────────────────────────────────────────────┐");
  console.log("│  #   │ Status │ Message                                      │");
  console.log("├──────┼────────┼──────────────────────────────────────────────┤");
  for (const r of results.sort((a, b) => a.i - b.i)) {
    const icon   = r.status === 201 ? "✅" : "❌";
    const num    = String(r.i).padStart(3);
    const status = String(r.status).padEnd(6);
    const msg    = r.msg.slice(0, 44).padEnd(44);
    console.log(`│ ${icon} ${num} │ ${status} │ ${msg} │`);
  }
  console.log("└──────┴────────┴──────────────────────────────────────────────┘");

  console.log(`\n📊 Winners (201): ${winners.length}`);
  console.log(`   Losers  (4xx): ${losers.length}`);

  // ── Step 5: assert exactly 1 winner ──────────────────────────────────────
  if (winners.length === 1 && losers.length === CONCURRENT - 1) {
    console.log("\n✅ RACE TEST PASSED — exactly 1 winner, lock + atomic UPDATE works.\n");
  } else {
    console.error(
      `\n❌ RACE TEST FAILED — expected 1 winner, got ${winners.length}. ` +
      `Check order.lock.ts and the atomic UPDATE in order.service.ts.\n`
    );
    process.exit(1);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const token = await getToken();
    const { menuItemId, restaurantId } = await resetStock();
    await runRace(token, menuItemId, restaurantId);
  } catch (err) {
    console.error("Race test error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
