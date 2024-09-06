import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { DbModule } from '../db/db.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [DbModule, StripeModule],
  controllers: [],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
