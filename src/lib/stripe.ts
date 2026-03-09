import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

if (!stripeKey && process.env.NODE_ENV === "production") {
    logger.warn("STRIPE_SECRET_KEY is not defined in environment variables. Payments will fail.");
}

export const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-02-24-preview" as any,
});
