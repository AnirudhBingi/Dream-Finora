import { Controller, Get, Res, UseGuards, Query } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('expenses/csv')
  async exportExpensesCSV(
    @CurrentUser() user: { userId: string },
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportExpensesCSV(user.userId);
    const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('transactions/csv')
  async exportTransactionsCSV(
    @CurrentUser() user: { userId: string },
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportTransactionsCSV(user.userId);
    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('all/json')
  async exportAllDataJSON(
    @CurrentUser() user: { userId: string },
    @Res() res: Response,
  ) {
    const data = await this.exportService.exportAllDataJSON(user.userId);
    const filename = `dreamfinora_export_${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  }
}

