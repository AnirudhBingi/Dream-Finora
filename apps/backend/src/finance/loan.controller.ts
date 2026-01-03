import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoanService } from './loan.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('finance/loans')
@UseGuards(JwtAuthGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLoan(
    @CurrentUser() user: { userId: string },
    @Body() createLoanDto: CreateLoanDto,
  ) {
    return this.loanService.createLoan(user.userId, createLoanDto);
  }

  @Get()
  async getLoans(
    @CurrentUser() user: { userId: string },
    @Query('context') context?: 'local' | 'home',
    @Query('status') status?: string,
  ) {
    return this.loanService.getLoans(user.userId, context, status);
  }

  @Get(':id')
  async getLoanById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.loanService.getLoanById(user.userId, id);
  }

  @Patch(':id')
  async updateLoan(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateLoanDto: UpdateLoanDto,
  ) {
    return this.loanService.updateLoan(user.userId, id, updateLoanDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteLoan(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.loanService.deleteLoan(user.userId, id);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  async addPayment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() addPaymentDto: AddPaymentDto,
  ) {
    return this.loanService.addPayment(user.userId, id, addPaymentDto);
  }

  @Delete(':id/payments/:paymentId')
  @HttpCode(HttpStatus.OK)
  async deletePayment(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.loanService.deletePayment(user.userId, id, paymentId);
  }
}

