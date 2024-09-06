import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class SubscriptionService {
  constructor(private db: DbService) {}

  async createSubscription(userId: number, stripeId: string) {
    return this.db.subscription.create({
      data: {
        userId,
        stripeId,
        status: 'active',
      },
    });
  }

  async updateSubscriptionStatus(stripeId: string, status: string) {
    return this.db.subscription.update({
      where: { stripeId },
      data: { status },
    });
  }
}
