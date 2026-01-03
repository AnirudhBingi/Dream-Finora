import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CategorizationService } from '../shared/categorization.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categorizationService: CategorizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExpense(
    @CurrentUser() user: { userId: string },
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expenseService.createExpense(user.userId, createExpenseDto);
  }

  @Get()
  async getExpenses(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.expenseService.getExpenses(user.userId, limitNum, offsetNum);
  }

  @Get('balances')
  async getBalances(
    @CurrentUser() user: { userId: string },
    @Query('primaryCurrency') primaryCurrency?: string,
  ) {
    return this.expenseService.getBalances(user.userId, primaryCurrency || 'USD');
  }

  @Get(':id')
  async getExpenseById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.expenseService.getExpenseById(user.userId, id);
  }

  @Put(':expenseId/splits/:splitId/pay')
  @HttpCode(HttpStatus.OK)
  async markSplitAsPaid(
    @CurrentUser() user: { userId: string },
    @Param('expenseId') expenseId: string,
    @Param('splitId') splitId: string,
  ) {
    return this.expenseService.markSplitAsPaid(user.userId, expenseId, splitId);
  }

  @Post(':id/receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'receipts');
          // Create directory if it doesn't exist
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {
          return cb(new Error('Only image and PDF files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadReceipt(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // For local development, return relative path
    // In production, this would be uploaded to S3/Supabase Storage and return full URL
    const receiptUrl = `/uploads/receipts/${file.filename}`;

    return this.expenseService.updateReceipt(user.userId, id, receiptUrl);
  }

  @Get('suggest-category')
  async suggestCategory(@Query('description') description: string) {
    if (!description) {
      return { category: null };
    }
    const match = this.categorizationService.categorizeFinance(description, 'expense');
    return { category: match?.category || null };
  }

  @Post('settlements')
  @HttpCode(HttpStatus.CREATED)
  async createSettlement(
    @CurrentUser() user: { userId: string },
    @Body() createSettlementDto: CreateSettlementDto,
  ) {
    return this.expenseService.createSettlement(user.userId, createSettlementDto);
  }

  @Get('settlements')
  async getSettlements(@CurrentUser() user: { userId: string }) {
    return this.expenseService.getSettlements(user.userId);
  }

  @Get('simplify-debts')
  async simplifyDebts(@CurrentUser() user: { userId: string }) {
    return this.expenseService.simplifyDebts(user.userId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateExpense(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expenseService.updateExpense(user.userId, id, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteExpense(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.expenseService.deleteExpense(user.userId, id);
  }

  @Get(':id/history')
  async getExpenseHistory(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.expenseService.getExpenseHistory(user.userId, id);
  }
}

