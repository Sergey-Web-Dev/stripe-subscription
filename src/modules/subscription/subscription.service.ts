import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { isBefore } from 'date-fns';

@Injectable()
export class SubscriptionService {
  constructor(private db: DbService) {}

  async isSubscriptionActive(userId: number) {
    const subscription = await this.db.subscription.findFirst({
      where: { userId, status: 'active' },
    });

    if (!subscription || isBefore(new Date(), subscription.currentPeriodEnd)) {
      return false;
    }

    return true;
  }
}
