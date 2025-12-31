import type { Env } from '../env';
import Stripe from 'stripe';
import { getTierFromPriceId, PRICE_ID_TO_TIER, STRIPE_API_VERSION } from '../lib/stripe-constants';

export interface AuthInfo {
  tokenId: string;
  orgId: string;
}

/**
 * Create a Stripe Checkout Session for upgrading to a paid plan
 * POST /api/create-checkout-session
 * Body: { priceId: string }
 */
export async function createCheckoutSession(
  req: Request,
  env: Env,
  auth: AuthInfo
): Promise<Response> {
  try {
    // Check if Stripe is configured
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Stripe not configured',
          message: 'Payment processing is not available. Contact administrator.' 
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const { priceId } = body as { priceId?: string };

    if (!priceId || typeof priceId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'priceId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION as any, // Cast to any to fix version mismatch
    });

    // Determine tier from price ID for metadata
    const tier = getTierFromPriceId(priceId);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.APP_BASE_URL || new URL(req.url).origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_BASE_URL || new URL(req.url).origin}/billing?checkout=cancel`,
      client_reference_id: auth.orgId,
      metadata: {
        orgId: auth.orgId,
        tokenId: auth.tokenId,
        tier: tier,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Stripe checkout session creation failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle Stripe webhook events
 * POST /api/webhooks/stripe
 */
export async function handleStripeWebhook(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
         return new Response("Stripe configuration missing", { status: 500 });
    }

    const body = await req.text();
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION as any,
    });

    // You must verify the webhook signature to ensure the request is from Stripe.
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId || session.client_reference_id;

      if (!orgId) {
        console.error('No orgId found in session metadata');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Determine the subscription tier based on metadata or price ID
      let tier: 'free' | 'pro' | 'agency' = 'pro'; // default
      
      // Primary method: Check metadata for explicit tier (always present in new sessions)
      if (session.metadata?.tier && ['free', 'pro', 'agency'].includes(session.metadata.tier)) {
        tier = session.metadata.tier as 'free' | 'pro' | 'agency';
      } else {
        console.warn(
          `Missing tier in session metadata for orgId: ${orgId}. ` +
          `Defaulting to 'pro'. Session ID: ${session.id}`
        );
      }

      // Update the organization's subscription tier in the database
      try {
        await env.DB.prepare(
          'UPDATE organizations SET subscription_tier = ? WHERE id = ?'
        )
          .bind(tier, orgId)
          .run();

        console.log(`Updated org ${orgId} to ${tier} tier`);
      } catch (dbError) {
        console.error('Failed to update organization tier:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to update organization tier', message: dbError instanceof Error ? dbError.message : String(dbError) }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Stripe webhook handling failed:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handling failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}