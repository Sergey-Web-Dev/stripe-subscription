import { Controller, Post, Body, Param, Req, Res } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request, Response } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-PaymentIntent')
  async createPaymentIntent(@Body('amount') amount: number) {
    return await this.stripeService.createPaymentIntent(amount);
  }

  @Post('create-customer')
  async createCustomer(@Body('email') email: string) {
    const user = await this.stripeService.createCustomer(email);
    return {
      message: 'Customer created successfully',
      user,
    };
  }

  @Post('create-subscription/:userId')
  async createSubscription(
    @Param('userId') userId: number,
    @Body('priceId') priceId: string,
  ) {
    const subscription = await this.stripeService.createSubscription(
      userId,
      priceId,
    );
    return {
      message: 'Subscription created successfully',
      subscription,
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
