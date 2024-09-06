import { Module } from '@nestjs/common';
import { StripeModule } from './modules/stripe/stripe.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [StripeModule, SubscriptionModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
