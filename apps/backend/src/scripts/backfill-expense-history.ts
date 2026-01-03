/**
 * Backfill script to add history entries for existing expenses
 * Run this once after adding the ExpenseHistory feature to populate history for existing expenses
 * 
 * Usage: npx ts-node src/scripts/backfill-expense-history.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function backfillExpenseHistory() {
  console.log('Starting expense history backfill...');

  try {
    // Get all expenses that don't have any history entries
    const expensesWithoutHistory = await prisma.expense.findMany({
      where: {
        ExpenseHistory: {
          none: {},
        },
      },
      select: {
        id: true,
        createdBy: true,
        description: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    });

    console.log(`Found ${expensesWithoutHistory.length} expenses without history`);

    if (expensesWithoutHistory.length === 0) {
      console.log('No expenses need history backfill. Exiting.');
      return;
    }

    // Create history entries for each expense
    let successCount = 0;
    let errorCount = 0;

    for (const expense of expensesWithoutHistory) {
      try {
        await prisma.expenseHistory.create({
          data: {
            id: randomUUID(),
            expenseId: expense.id,
            action: 'created',
            userId: expense.createdBy,
            notes: `Expense created: ${expense.description} (${expense.amount} ${expense.currency})`,
            createdAt: expense.createdAt, // Use original creation date
          },
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to create history for expense ${expense.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`✅ Successfully created history for ${successCount} expenses`);
    if (errorCount > 0) {
      console.log(`❌ Failed to create history for ${errorCount} expenses`);
    }
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillExpenseHistory()
  .then(() => {
    console.log('Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill script failed:', error);
    process.exit(1);
  });

