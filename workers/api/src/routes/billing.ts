import type { Env } from '../env';
import Stripe from 'stripe';

export interface AuthInfo {
  userId: string;
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
    const body = await req.json().catch(() => ({}));
    const { priceId } = body;

    if (!priceId || typeof priceId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'priceId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });

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
      success_url: `${new URL(req.url).origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(req.url).origin}/billing?checkout=cancel`,
      client_reference_id: auth.orgId,
      metadata: {
        orgId: auth.orgId,
        userId: auth.userId,
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

    const body = await req.text();

    // You must verify the webhook signature to ensure the request is from Stripe.
    // The webhook secret must be set as an environment variable.
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

      // Determine the subscription tier based on the price ID or metadata
      let tier: 'free' | 'pro' | 'agency' = 'pro'; // default
      
      // Explicit mapping from Stripe price IDs to tiers
      const PRICE_ID_TO_TIER: Record<string, 'free' | 'pro' | 'agency'> = {
        // Replace these with your actual Stripe price IDs
        'price_123_PRO': 'pro',
        'price_456_AGENCY': 'agency',
        'price_789_FREE': 'free',
      };

      // First check metadata for explicit tier
      if (session.metadata?.tier && ['free', 'pro', 'agency'].includes(session.metadata.tier)) {
        tier = session.metadata.tier as 'free' | 'pro' | 'agency';
      } else if (session.mode === 'subscription' && session.subscription) {
        // Try to map price ID to tier using explicit mapping
        const priceId = session.line_items?.data?.[0]?.price?.id;
        if (priceId && PRICE_ID_TO_TIER[priceId]) {
          tier = PRICE_ID_TO_TIER[priceId];
        } else {
          // Optionally log or handle unknown priceId
          console.warn(`Unknown priceId: ${priceId}, defaulting to 'pro'`);
        }
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
