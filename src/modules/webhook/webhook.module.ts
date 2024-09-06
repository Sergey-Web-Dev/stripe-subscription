import { Module } from '@nestjs/common';
import { WebhooksController } from './webhook.controller';

@Module({
  controllers: [WebhooksController],
})
export class WebhookModule {}
