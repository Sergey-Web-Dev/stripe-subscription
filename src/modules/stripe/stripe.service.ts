import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { DbService } from '../db/db.service';
import { addMonths } from 'date-fns';

@Injectable()
export class StripeService {
  public stripe: Stripe;

  constructor(private readonly db: DbService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    });
  }

  async createCustomer(email: string, paymentMethodId: string) {
    try {
      if (!paymentMethodId) {
        throw new Error('paymentMethodId is required but was not provided');
      }

      let user = await this.db.user.findUnique({
        where: { email },
      });

      let customer;

      if (user) {
        customer = await this.stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await this.stripe.customers.create({
          email,
        });

        user = await this.db.user.create({
          data: {
            email,
            stripeCustomerId: customer.id,
          },
        });
      }

      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return user;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error('Could not create customer');
    }
  }

  async createSubscription(
    email: string,
    priceId: string,
    paymentMethodId: string,
  ) {
    try {
      const user = await this.createCustomer(email, paymentMethodId);

      const existingSubscription = await this.db.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'active',
        },
      });

      if (existingSubscription) {
        throw new Error('You already have an active subscription.');
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

      const currentDate = new Date();
      const currentPeriodEnd = addMonths(currentDate, 1);

      const savedSubscription = await this.db.subscription.create({
        data: {
          user: {
            connect: { id: user.id },
          },
          stripeId: subscription.id,
          status: 'active',
          currentPeriodEnd,
        },
      });

      return {
        subscriptionId: savedSubscription.id,
        clientSecret,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Could not create subscription');
    }
  }

  async createPaymentIntent(amount: number): Promise<{ clientSecret: string }> {
    console.log('Amount received:', amount, typeof amount);

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
    const stripeChargeId = paymentIntent.id;

    const existingCharge = await this.db.charge.findUnique({
      where: { stripeChargeId },
    });

    if (existingCharge) {
      console.log(
        `Charge with stripeChargeId ${stripeChargeId} already exists`,
      );
      return;
    }

    const subscription = await this.db.subscription.findUnique({
      //@ts-ignore
      where: { stripeId: paymentIntent.subscription as string },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await this.db.charge.create({
      data: {
        stripeChargeId,
        subscriptionId: subscription.id,
      },
    });

    if (paymentIntent.status === 'succeeded') {
      const newPeriodEnd = addMonths(subscription.currentPeriodEnd, 1);
      await this.db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'active', currentPeriodEnd: newPeriodEnd },
      });
    }
  }

  async handleWebhook(event: Stripe.Event) {
    try {
      const existingEvent = await this.db.charge.findUnique({
        where: { stripeChargeId: event.id },
      });

      if (existingEvent) {
        console.log(`Event ${event.id} already handled`);
        return;
      }
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;

          const subscription = await this.db.subscription.findUnique({
            where: { stripeId: subscriptionId },
          });

          if (!subscription) {
            throw new Error('Subscription not found');
          }

          await this.db.charge.create({
            data: {
              stripeChargeId: invoice.payment_intent as string,
              subscriptionId: subscription.id,
            },
          });

          const newPeriodEnd = addMonths(subscription.currentPeriodEnd, 1);
          await this.db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              currentPeriodEnd: newPeriodEnd,
            },
          });

          console.log(`Subscription ${subscription.id} successfully renewed.`);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;

          await this.db.subscription.update({
            where: { stripeId: subscriptionId },
            data: { status: 'inactive' },
          });

          console.error(`Payment failed for subscription: ${subscriptionId}`);
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;

          await this.db.subscription.update({
            where: { stripeId: subscription.id },
            data: {
              status: subscription.status,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
            },
          });

          console.log(`Subscription ${subscription.id} updated.`);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event: ${error.message}`);
    }
  }
}
