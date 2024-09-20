import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { DbModule } from '../db/db.module';
import { StripeModule } from '../stripe/stripe.module';
import { SubscriptionController } from './subscription.controller';

@Module({
  imports: [DbModule, StripeModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
