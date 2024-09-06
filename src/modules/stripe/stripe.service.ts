import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { DbService } from '../db/db.service';

@Injectable()
export class StripeService {
  public stripe: Stripe;

  constructor(private readonly db: DbService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    });
  }

  async createCustomer(email: string) {
    try {
      let user = await this.db.user.findUnique({
        where: { email },
      });

      if (user) {
        console.log(`User with email ${email} already exists.`);
        return user;
      }

      const customer = await this.stripe.customers.create({ email });

      user = await this.db.user.create({
        data: {
          email,
          stripeCustomerId: customer.id,
        },
      });

      return user;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error('Could not create customer');
    }
  }

  async createSubscription(userId: number, priceId: string) {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.stripeCustomerId) {
        throw new Error('User or Stripe customer ID not found');
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });

      let clientSecret: string | undefined;

      if (
        subscription.latest_invoice &&
        typeof subscription.latest_invoice !== 'string'
      ) {
        const invoice = subscription.latest_invoice as Stripe.Invoice;

        if (
          invoice.payment_intent &&
          typeof invoice.payment_intent !== 'string'
        ) {
          const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          clientSecret = paymentIntent.client_secret;
        }
      }

      if (!clientSecret) {
        throw new Error('Failed to retrieve client secret from Stripe');
      }

      return {
        subscriptionId: subscription.id,
        clientSecret,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Could not create subscription');
    }
  }

  async createPaymentIntent(amount: number): Promise<{ clientSecret: string }> {
    console.log('Amount received:', amount, typeof amount); // Should log: 1099 'number'

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
      });
      return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
      throw new HttpException(
        { message: `Internal Server Error: ${error.message}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handlePaymentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const subscription = await this.db.subscription.findUnique({
      //@ts-ignore
      where: { stripeId: paymentIntent.subscription as string },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await this.db.charge.create({
      data: {
        stripeChargeId: paymentIntent.id,
        subscriptionId: subscription.id,
      },
    });

    if (paymentIntent.status === 'succeeded') {
      await this.db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'active' },
      });
    }
  }

  async handleWebhook(event: Stripe.Event) {
    // switch (event.type) {
    //   case 'invoice.payment_succeeded':
    //     await this.handlePaymentSucceeded(event);
    //     break;
    //   default:
    //     console.log(`Unhandled event type ${event.type}`);
    // }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent was successful:', paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('PaymentIntent failed:', failedPaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
