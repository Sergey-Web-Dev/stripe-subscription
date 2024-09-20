import { Controller, Get, Param } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('subscriptions/status/:userId')
  async getSubscriptionStatus(@Param('userId') userId: number) {
    const isActive =
      await this.subscriptionService.isSubscriptionActive(+userId);
    return {
      active: isActive,
    };
  }
}
