import { Controller, Post, Body, Param, Req, Res } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request, Response } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-subscription')
  async createSubscription(
    @Body('email') email: string,
    @Body('paymentMethodId') paymentMethodId: string,
    @Body('priceId') priceId: string,
  ) {
    if (!paymentMethodId) {
      throw new Error('paymentMethodId is required but was not provided');
    }

    const subscription = await this.stripeService.createSubscription(
      email,
      priceId,
      paymentMethodId,
    );

    return {
      message: 'Subscription created successfully',
      subscriptionId: subscription.subscriptionId,
      clientSecret: subscription.clientSecret,
    };
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = this.stripeService.stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await this.stripeService.handleWebhook(event);

    res.status(200).send('Success');
  }
}
