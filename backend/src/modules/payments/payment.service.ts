// payment.service.ts — a MOCK payment gateway that is idempotent on order id.
//
// CONCEPT (why idempotency matters here): the order worker can retry. If a job
// fails AFTER charging but BEFORE marking the order done, BullMQ runs it again.
// Without protection we'd charge the customer twice. So payment is keyed on
// order_id (the payments table has UNIQUE(order_id)): if a PAID payment already
// exists for this order, we return it instead of charging again.
//
// This is a MOCK — there's no real Stripe/Razorpay call. We just create a
// payments row with a fake transaction id. Real-world would swap the
// "pretend it succeeded" block for an actual gateway SDK call.

import { pool, query } from "../../config/db";
import { ApiError } from "../../utils/apiError";

export interface PaymentRow {
  id: string;
  order_id: string;
  status: string;
  amount: string; // NUMERIC → string
  provider: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

// processPayment — charge for an order, idempotently.
// Returns the payment row (existing if already paid, or the freshly-created one).
export async function processPayment(orderId: string): Promise<PaymentRow> {
  // Step 1 — is there already a PAID payment for this order? If so, we're done.
  // This is the idempotency guard: a retried job returns the same result, no double charge.
  const existing = await query<PaymentRow>(
    "SELECT * FROM payments WHERE order_id = $1",
    [orderId]
  );
  if (existing.length > 0 && existing[0].status === "PAID") {
    return existing[0];
  }

  // Step 2 — look up the order to get the amount to charge.
  const orders = await query<{ total_amount: string }>(
    "SELECT total_amount FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) throw ApiError.notFound("Order not found for payment");
  const amount = orders[0].total_amount;

  // Step 3 — "charge" the mock gateway. In reality this is where the SDK call goes;
  // here we just mint a fake transaction id. We treat it as always succeeding.
  const transactionId = `mock_txn_${orderId.slice(0, 8)}`;

  // Step 4 — persist the result. UPSERT on order_id so a retry that got past the
  // PAID check (e.g. a prior PENDING row) is updated, not duplicated. The
  // UNIQUE(order_id) constraint powers ON CONFLICT.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rows = await client.query<PaymentRow>(
      `INSERT INTO payments (order_id, status, amount, provider, transaction_id)
       VALUES ($1, 'PAID', $2, 'mock', $3)
       ON CONFLICT (order_id)
       DO UPDATE SET status = 'PAID',
                     provider = 'mock',
                     transaction_id = EXCLUDED.transaction_id
       RETURNING *`,
      [orderId, amount, transactionId]
    );
    await client.query("COMMIT");
    return rows.rows[0];
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
