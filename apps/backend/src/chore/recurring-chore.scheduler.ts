import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringChoreService } from './recurring-chore.service';

@Injectable()
export class RecurringChoreScheduler {
  private readonly logger = new Logger(RecurringChoreScheduler.name);

  constructor(private recurringChoreService: RecurringChoreService) {}

  /**
   * Process recurring chores every hour
   * This ensures new occurrences are generated in a timely manner
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleRecurringChores() {
    this.logger.log('Running scheduled recurring chores processing');
    await this.recurringChoreService.processRecurringChores();
  }
}
