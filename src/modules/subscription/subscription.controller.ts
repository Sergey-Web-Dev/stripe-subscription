// import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
// import { StripeService } from '../stripe/stripe.service';

// @Controller('subscription')
// export class SubscriptionController {
//   constructor(private readonly stripeService: StripeService) {}

//   @Post('create')
//   async createSubscription(
//     @Body() createSubscriptionDto: { email: string; paymentMethodId: string },
//   ) {
//     const { email, paymentMethodId } = createSubscriptionDto;

//     if (!email || !paymentMethodId) {
//       throw new BadRequestException('Email and payment method ID are required');
//     }

//     try {
//       const subscription = await this.stripeService.handleSubscription(
//         email,
//         paymentMethodId,
//       );
//       return subscription;
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }
// }
