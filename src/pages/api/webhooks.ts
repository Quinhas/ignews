import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import Stripe from "stripe";
import { stripe } from "../../services/stripe";
import { saveSubscription } from "./_lib/manageSubscription";

async function buffer(readable: Readable) {
  const chunks = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const webhooks = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const buf = await buffer(req);
  const secret = req.headers["stripe-signature"];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      String(secret),
      String(process.env.STRIPE_WEBHOOK_SECRET)
    );
  } catch (err) {
    const error = err as Error;
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  const { type } = event;

  if (relevantEvents.has(type)) {
    try {
      switch (type) {
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          const subscription = event.data.object as Stripe.Subscription;

          await saveSubscription(
            String(subscription.id),
            String(subscription.customer)
          );

          break;
        case "checkout.session.completed":
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (!checkoutSession.subscription || !checkoutSession.customer) {
            throw new Error("");
          }
          await saveSubscription(
            String(checkoutSession.subscription),
            String(checkoutSession.customer),
            true
          );
          break;
        default:
          throw new Error("Unhandled event.");
      }
    } catch (error) {
      return res.json({ error: "Webhook handler failed." });
    }
  }

  res.json({ receveid: true });
};

export default webhooks;
