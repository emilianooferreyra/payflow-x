import { createHmac, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const API_URL = process.env.API_URL || "http://localhost:3000/api/v1";
const JWT = process.env.PAYFLOW_JWT || process.env.JWT || "";
const RECEIVER_PORT = 9999;

if (!JWT) {
  console.error("❌ PAYFLOW_JWT env var required");
  process.exit(1);
}

const cookie = `access_token=${JWT}`;

const headers = {
  "Content-Type": "application/json",
  Cookie: cookie,
};

// Local webhook receiver 
interface ReceivedWebhook {
  payload: string;
  signature: string;
  timestamp: string;
}

function startReceiver(): Promise<{ url: string; waitForWebhook: () => Promise<ReceivedWebhook> }> {
  let resolveWebhook: (w: ReceivedWebhook) => void;
  const webhookPromise = new Promise<ReceivedWebhook>((resolve) => {
    resolveWebhook = resolve;
  });

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    let body = "";
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", () => {
      const signature = req.headers["x-webhook-signature"] as string;
      console.log(`   📩 Webhook received!`);
      console.log(`   🔐 HMAC-SHA256: ${signature}`);

      resolveWebhook({ payload: body, signature, timestamp: new Date().toISOString() });

      res.writeHead(200);
      res.end("OK");
    });
  });

  return new Promise((resolve) => {
    server.listen(RECEIVER_PORT, () => {
      console.log(`   🎧 Receiver listening on port ${RECEIVER_PORT}`);
      const url = `http://host.docker.internal:${RECEIVER_PORT}/webhook`;
      resolve({ url, waitForWebhook: () => webhookPromise.finally(() => server.close()) });
    });
  });
}

// Payflow API calls 
async function registerEndpoint(url: string): Promise<{ id: string; secret: string }> {
  console.log("\n📍 Registering webhook endpoint in payflow...");
  const res = await fetch(`${API_URL}/webhooks/endpoints`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Endpoint registration failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { id: string; url: string; secret: string };
  console.log(`   ✅ Endpoint registered: ${data.id}`);
  console.log(`   🔑 Secret: ${data.secret}`);
  return { id: data.id, secret: data.secret };
}

async function triggerDeposit(): Promise<void> {
  console.log("\n📍 Triggering deposit...");
  const res = await fetch(`${API_URL}/wallet/deposit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: 1000, currency: "USD" }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Deposit failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  console.log(`   ✅ Deposit completed: ${JSON.stringify(data)}`);
}

async function checkDelivery(endpointId: string): Promise<void> {
  console.log("\n📍 Checking delivery status...");
  const res = await fetch(`${API_URL}/webhooks/endpoints/${endpointId}/deliveries`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch deliveries: ${res.status}`);
  const deliveries = (await res.json()) as Array<{
    id: string;
    event: string;
    status: string;
    attempts: number;
    responseStatus: number | null;
    createdAt: string;
  }>;

  if (deliveries.length === 0) {
    console.log("   ⚠️ No deliveries found");
    return;
  }

  const d = deliveries[0];
  console.log(`   📦 Event: ${d.event}`);
  console.log(`   📋 Status: ${d.status}`);
  console.log(`   🔁 Attempts: ${d.attempts}`);
  console.log(`   🔢 HTTP status: ${d.responseStatus ?? "N/A"}`);

  if (d.status === "delivered") {
    console.log("\n   ✅ DELIVERY CONFIRMED!");
  } else if (d.status === "failed") {
    console.log("\n   ⚠️ First attempt failed — retry scheduled");
  }
}

function hmacSignature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Main 
async function main() {
  console.log("=".repeat(55));
  console.log("  WEBHOOK DEMO — End-to-End Test");
  console.log("=".repeat(55));

  try {
    console.log("\n📡 Starting local webhook receiver...");
    const { url: receiverUrl, waitForWebhook } = await startReceiver();

    const { id, secret } = await registerEndpoint(receiverUrl);

    await triggerDeposit();

    console.log("\n⏳ Waiting for webhook to arrive...");
    const webhook = await waitForWebhook();

    console.log("\n" + "─".repeat(55));
    const expectedSig = hmacSignature(secret, webhook.payload);
    const match = webhook.signature === expectedSig;
    console.log(`   🔐 HMAC match: ${match ? "✅ YES" : "❌ NO"}`);
    console.log(`   📄 Payload: ${webhook.payload}`);

    await checkDelivery(id);

    console.log("\n" + "=".repeat(55));
    console.log(match ? "  ✅ WEBHOOK DEMO PASSED" : "  ❌ WEBHOOK DEMO FAILED (signature mismatch)");
    console.log("=".repeat(55));
  } catch (err) {
    console.error(`\n❌ Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
