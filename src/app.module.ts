import { Module } from '@nestjs/common';
import { StripeModule } from './modules/stripe/stripe.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';

@Module({
  imports: [StripeModule, SubscriptionModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
