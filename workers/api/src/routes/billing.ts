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
      success_url: `${new URL(req.url).origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(req.url).origin}/billing`,
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
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });

    // In production, you should set STRIPE_WEBHOOK_SECRET and verify the signature
    // For now, we'll parse the event without verification (stub mode)
    let event: Stripe.Event;
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      
      // First check metadata for explicit tier
      if (session.metadata?.tier && ['free', 'pro', 'agency'].includes(session.metadata.tier)) {
        tier = session.metadata.tier as 'free' | 'pro' | 'agency';
      } else if (session.mode === 'subscription' && session.subscription) {
        // Try to map price ID to tier
        // Note: In production, retrieve the subscription and check line items
        // For now, we'll use a simple price ID mapping
        const priceId = session.line_items?.data?.[0]?.price?.id;
        if (priceId?.includes('agency')) {
          tier = 'agency';
        } else if (priceId?.includes('pro')) {
          tier = 'pro';
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
