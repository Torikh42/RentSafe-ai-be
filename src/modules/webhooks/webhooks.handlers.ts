import type { AppEnv } from "@/factory";
import { getDb } from "@/db";
import { escrows, payments, contracts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySignature } from "@/services/midtrans.service";
import { ulid } from "ulid";
import type { RouteHandler } from "@hono/zod-openapi";
import type { midtransWebhookRoute } from "./webhooks.routes";

export const midtransWebhookHandler: RouteHandler<
  typeof midtransWebhookRoute,
  AppEnv
> = async (c) => {
  try {
    const payload = await c.req.json();
    const db = getDb(c.env);

    const orderId = payload.order_id;
    const statusCode = payload.status_code;
    const grossAmount = payload.gross_amount;
    const signatureKey = payload.signature_key;

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return c.json(
        { status: "error", message: "Invalid payload fields" },
        400 as const,
      );
    }

    // Verify signature
    const isValid = await verifySignature(
      {
        serverKey: c.env.MIDTRANS_SERVER_KEY,
        isProduction: c.env.MIDTRANS_IS_PRODUCTION,
      },
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
    );

    if (!isValid) {
      console.warn(
        `[Midtrans Webhook] Invalid signature key for order: ${orderId}`,
      );
      return c.json(
        { status: "error", message: "Signature verification failed" },
        400 as const,
      );
    }

    // Find escrow by midtransOrderId
    const escrow = await db.query.escrows.findFirst({
      where: eq(escrows.midtransOrderId, orderId),
    });

    if (!escrow) {
      console.error(
        `[Midtrans Webhook] Escrow not found for order: ${orderId}`,
      );
      return c.json(
        { status: "error", message: "Escrow not found" },
        404 as const,
      );
    }

    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    let newStatus: typeof escrow.status = escrow.status;
    let paymentStatus: "pending" | "success" | "failed" = "pending";

    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        newStatus = "pending";
        paymentStatus = "pending";
      } else if (fraudStatus === "accept") {
        newStatus = "held";
        paymentStatus = "success";
      }
    } else if (transactionStatus === "settlement") {
      newStatus = "held";
      paymentStatus = "success";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      newStatus = "failed";
      paymentStatus = "failed";
    } else if (transactionStatus === "pending") {
      newStatus = "pending";
      paymentStatus = "pending";
    }

    // Update Escrow
    await db
      .update(escrows)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(escrows.id, escrow.id));

    // Upsert payment record — 1 payment per transaction_id (no duplicates)
    // Use select() instead of db.query to avoid relational query issues
    const transactionId = payload.transaction_id as string | undefined;
    const [existingPayment] = transactionId
      ? await db
          .select()
          .from(payments)
          .where(eq(payments.midtransTransactionId, transactionId))
          .limit(1)
      : await db
          .select()
          .from(payments)
          .where(eq(payments.escrowId, escrow.id))
          .orderBy(desc(payments.createdAt))
          .limit(1);

    if (existingPayment) {
      // Payment already exists — update status only
      await db
        .update(payments)
        .set({
          status: paymentStatus,
          midtransTransactionId:
            transactionId ?? existingPayment.midtransTransactionId,
          paymentMethod: payload.payment_type ?? existingPayment.paymentMethod,
          paidAt:
            paymentStatus === "success" ? new Date() : existingPayment.paidAt,
        })
        .where(eq(payments.id, existingPayment.id));
    } else {
      // First time seeing this payment — insert
      await db.insert(payments).values({
        id: ulid(),
        escrowId: escrow.id,
        type: "deposit",
        amount: escrow.amount,
        status: paymentStatus,
        midtransTransactionId: transactionId ?? null,
        paymentMethod: payload.payment_type ?? null,
        paidAt: paymentStatus === "success" ? new Date() : null,
      });
    }

    // If payment is successful, transition contract status to active
    if (paymentStatus === "success") {
      const contract = await db.query.contracts.findFirst({
        where: eq(contracts.id, escrow.contractId),
      });

      console.log(
        `[Midtrans Webhook] Contract status for ${escrow.contractId}: ${contract?.status}`,
      );

      // Contract must be in pending_payment to transition to active
      if (contract && contract.status === "pending_payment") {
        await db
          .update(contracts)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(contracts.id, contract.id));
        console.log(
          `[Midtrans Webhook] Contract ${contract.id} transitioned to active.`,
        );
      } else if (contract) {
        console.warn(
          `[Midtrans Webhook] Contract ${contract.id} has unexpected status: ${contract.status}. Expected pending_payment. No status change.`,
        );
      }
    }

    return c.json(
      {
        status: "success",
        message: "Webhook processed",
      },
      200 as const,
    );
  } catch (err) {
    console.error("[midtransWebhookHandler] ERROR:", err);
    return c.json(
      { status: "error", message: "Internal Server Error" },
      500 as const,
    );
  }
};
