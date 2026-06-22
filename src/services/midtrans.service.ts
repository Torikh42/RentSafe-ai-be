export interface CreateTransactionParams {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    firstName: string;
    email: string;
  };
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface MidtransServiceConfig {
  serverKey: string;
  isProduction: boolean;
}

export class MidtransError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MidtransError";
  }
}

/**
 * Generates a Midtrans Snap transaction token
 */
export async function createSnapTransaction(
  config: MidtransServiceConfig,
  params: CreateTransactionParams,
): Promise<{ token: string; redirectUrl: string }> {
  const isProd =
    typeof config.isProduction === "string"
      ? config.isProduction === "true"
      : Boolean(config.isProduction);

  const baseUrl = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const authString = btoa(`${config.serverKey}:`);

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: {
        first_name: params.customerDetails.firstName,
        email: params.customerDetails.email,
      },
      item_details: params.itemDetails,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Midtrans API Error:", errorData);
    throw new MidtransError(
      `Gagal membuat transaksi Midtrans: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    token: string;
    redirect_url: string;
  };
  return {
    token: data.token,
    redirectUrl: data.redirect_url,
  };
}

/**
 * Validates the signature from Midtrans webhook
 * Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export async function verifySignature(
  config: MidtransServiceConfig,
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${orderId}${statusCode}${grossAmount}${config.serverKey}`,
  );
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedSignature = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signatureKey;
}
