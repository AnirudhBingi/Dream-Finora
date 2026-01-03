import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { AddPaymentDto } from './dto/add-payment.dto';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new loan
   */
  async createLoan(userId: string, createLoanDto: CreateLoanDto) {
    // Validate account if provided
    if (createLoanDto.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: {
          id: createLoanDto.accountId,
          userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      // Validate context matches if provided
      if (createLoanDto.context && account.context !== createLoanDto.context) {
        throw new BadRequestException('Account context does not match loan context');
      }
    }

    const loan = await this.prisma.loan.create({
      data: {
        userId,
        name: createLoanDto.name,
        lender: createLoanDto.lender,
        principalAmount: createLoanDto.principalAmount,
        remainingAmount: createLoanDto.remainingAmount ?? createLoanDto.principalAmount,
        interestRate: createLoanDto.interestRate,
        emi: createLoanDto.emi,
        loanTerm: createLoanDto.loanTerm,
        remainingMonths: createLoanDto.remainingMonths ?? createLoanDto.loanTerm,
        startDate: new Date(createLoanDto.startDate),
        nextPaymentDate: new Date(createLoanDto.nextPaymentDate),
        paymentFrequency: createLoanDto.paymentFrequency || 'monthly',
        accountId: createLoanDto.accountId,
        context: createLoanDto.context || 'local',
      },
    });

    return this.getLoanById(userId, loan.id);
  }

  /**
   * Get loans for a user, optionally filtered by context and status
   */
  async getLoans(userId: string, context?: 'local' | 'home', status?: string) {
    const where: any = { userId };
    if (context) {
      where.context = context;
    }
    if (status) {
      where.status = status;
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10, // Recent payments
        },
      },
      orderBy: [
        { status: 'asc' }, // Active loans first
        { nextPaymentDate: 'asc' }, // Next payment date
        { createdAt: 'desc' },
      ],
    });

    return loans;
  }

  /**
   * Get a loan by ID with full details
   */
  async getLoanById(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return loan;
  }

  /**
   * Update a loan
   */
  async updateLoan(userId: string, loanId: string, updateLoanDto: UpdateLoanDto) {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Validate account if provided
    if (updateLoanDto.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: {
          id: updateLoanDto.accountId,
          userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      // Validate context matches
      if (account.context !== loan.context) {
        throw new BadRequestException('Account context does not match loan context');
      }
    }

    const updateData: any = {};
    if (updateLoanDto.name !== undefined) updateData.name = updateLoanDto.name;
    if (updateLoanDto.lender !== undefined) updateData.lender = updateLoanDto.lender;
    if (updateLoanDto.principalAmount !== undefined) updateData.principalAmount = updateLoanDto.principalAmount;
    if (updateLoanDto.remainingAmount !== undefined) updateData.remainingAmount = updateLoanDto.remainingAmount;
    if (updateLoanDto.interestRate !== undefined) updateData.interestRate = updateLoanDto.interestRate;
    if (updateLoanDto.emi !== undefined) updateData.emi = updateLoanDto.emi;
    if (updateLoanDto.loanTerm !== undefined) updateData.loanTerm = updateLoanDto.loanTerm;
    if (updateLoanDto.remainingMonths !== undefined) updateData.remainingMonths = updateLoanDto.remainingMonths;
    if (updateLoanDto.startDate !== undefined) updateData.startDate = new Date(updateLoanDto.startDate);
    if (updateLoanDto.nextPaymentDate !== undefined) updateData.nextPaymentDate = new Date(updateLoanDto.nextPaymentDate);
    if (updateLoanDto.paymentFrequency !== undefined) updateData.paymentFrequency = updateLoanDto.paymentFrequency;
    if (updateLoanDto.accountId !== undefined) updateData.accountId = updateLoanDto.accountId;
    if (updateLoanDto.status !== undefined) {
      updateData.status = updateLoanDto.status;
      if (updateLoanDto.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    await this.prisma.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    return this.getLoanById(userId, loanId);
  }

  /**
   * Delete a loan
   */
  async deleteLoan(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    await this.prisma.loan.delete({
      where: { id: loanId },
    });

    return { message: 'Loan deleted successfully' };
  }

  /**
   * Add a payment to a loan
   */
  async addPayment(userId: string, loanId: string, addPaymentDto: AddPaymentDto) {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Validate transaction if provided
    if (addPaymentDto.transactionId) {
      const transaction = await this.prisma.financeTransaction.findFirst({
        where: {
          id: addPaymentDto.transactionId,
          userId,
        },
      });

      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }
    }

    // Create payment
    const payment = await this.prisma.loanPayment.create({
      data: {
        loanId,
        amount: addPaymentDto.amount,
        principalPaid: addPaymentDto.principalPaid,
        interestPaid: addPaymentDto.interestPaid,
        paymentDate: new Date(addPaymentDto.paymentDate),
        transactionId: addPaymentDto.transactionId,
        notes: addPaymentDto.notes,
      },
    });

    // Update loan remaining amount and remaining months
    const newRemainingAmount = Math.max(0, loan.remainingAmount - addPaymentDto.principalPaid);
    const newRemainingMonths = newRemainingAmount > 0 ? Math.max(0, loan.remainingMonths - 1) : 0;

    const updateData: any = {
      remainingAmount: newRemainingAmount,
      remainingMonths: newRemainingMonths,
    };

    // Update next payment date based on payment frequency
    if (newRemainingMonths > 0) {
      const paymentDate = new Date(addPaymentDto.paymentDate);
      const nextPayment = new Date(paymentDate);
      
      if (loan.paymentFrequency === 'monthly') {
        nextPayment.setMonth(nextPayment.getMonth() + 1);
      } else if (loan.paymentFrequency === 'quarterly') {
        nextPayment.setMonth(nextPayment.getMonth() + 3);
      } else if (loan.paymentFrequency === 'yearly') {
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
      }

      updateData.nextPaymentDate = nextPayment;
    } else {
      // Loan completed
      updateData.status = 'completed';
      updateData.completedAt = new Date();
      updateData.nextPaymentDate = loan.nextPaymentDate; // Keep existing
    }

    await this.prisma.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    // Link transaction to loan if provided
    if (addPaymentDto.transactionId) {
      await this.prisma.financeTransaction.update({
        where: { id: addPaymentDto.transactionId },
        data: { loanId },
      });
    }

    return this.getLoanById(userId, loanId);
  }

  /**
   * Delete a payment from a loan
   */
  async deletePayment(userId: string, loanId: string, paymentId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const payment = await this.prisma.loanPayment.findFirst({
      where: {
        id: paymentId,
        loanId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Delete payment
    await this.prisma.loanPayment.delete({
      where: { id: paymentId },
    });

    // Recalculate loan remaining amount (add back the principal paid)
    const newRemainingAmount = loan.remainingAmount + payment.principalPaid;
    const newRemainingMonths = Math.min(loan.loanTerm, loan.remainingMonths + 1);

    await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        remainingAmount: newRemainingAmount,
        remainingMonths: newRemainingMonths,
        status: loan.status === 'completed' ? 'active' : loan.status, // Reactivate if completed
        completedAt: loan.status === 'completed' ? null : loan.completedAt,
      },
    });

    // Unlink transaction from loan if exists
    if (payment.transactionId) {
      await this.prisma.financeTransaction.update({
        where: { id: payment.transactionId },
        data: { loanId: null },
      });
    }

    return this.getLoanById(userId, loanId);
  }
}

