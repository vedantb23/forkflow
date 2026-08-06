import { pool, query } from "../../config/db";
import { ApiError } from "../../utils/apiError";

export interface PaymentRow {
  id: string;
  order_id: string;
  status: string;
  amount: string;
  provider: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function processPayment(orderId: string): Promise<PaymentRow> {

  const existing = await query<PaymentRow>(
    "SELECT * FROM payments WHERE order_id = $1",
    [orderId]
  );
  if (existing.length > 0 && existing[0].status === "PAID") {
    return existing[0];
  }

  const orders = await query<{ total_amount: string }>(
    "SELECT total_amount FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) throw ApiError.notFound("Order not found for payment");
  const amount = orders[0].total_amount;

  const transactionId = `mock_txn_${orderId.slice(0, 8)}`;

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
