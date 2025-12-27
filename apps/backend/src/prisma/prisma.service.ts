// Load environment variables BEFORE importing PrismaClient
import 'dotenv/config';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma 6 reads DATABASE_URL from process.env automatically
    // dotenv/config at top ensures .env is loaded before PrismaClient is imported
    // ConfigModule in AppModule also loads .env for other services
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}


