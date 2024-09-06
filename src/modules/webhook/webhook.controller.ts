// import { Controller, Post, Req, Res, Headers } from '@nestjs/common';
// import { Request, Response } from 'express';
// import { SubscriptionService } from '../subscription/subscription.service';
// import { StripeService } from '../stripe/stripe.service';

// @Controller('webhooks')
// export class WebhookController {
//   constructor(
//     private readonly stripeService: StripeService,
//     private readonly subscriptionService: SubscriptionService,
//   ) {}

//   @Post('stripe')
//   async handleStripeWebhook(
//     @Req() req: Request,
//     @Res() res: Response,
//     @Headers('stripe-signature') signature: string,
//   ) {
//     let event;
//     try {
//       event = await this.stripeService.constructEvent(req.body, signature);
//     } catch (err) {
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     const data = event.data.object;

//     if (event.type === 'invoice.payment_succeeded') {
//       const subscriptionId = data.subscription;
//       await this.subscriptionService.updateSubscriptionStatus(
//         subscriptionId,
//         'active',
//       );
//     } else if (event.type === 'invoice.payment_failed') {
//       const subscriptionId = data.subscription;
//       await this.subscriptionService.updateSubscriptionStatus(
//         subscriptionId,
//         'failed',
//       );
//     }

//     res.json({ received: true });
//   }
// }

import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from '../stripe/stripe.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('stripe')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
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
