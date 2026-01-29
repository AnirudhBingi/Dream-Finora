import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly cache = new Map<string, { rate: number; timestamp: Date }>();
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
  private readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'demo';
  private readonly API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

  constructor(private prisma: PrismaService) {}

  /**
   * Get exchange rate from one currency to another
   * Uses caching to avoid excessive API calls
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.cache.get(cacheKey);

    // Check if cached rate is still valid (less than 1 hour old)
    if (
      cached &&
      Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION_MS
    ) {
      this.logger.debug(`Using cached rate for ${cacheKey}: ${cached.rate}`);
      return cached.rate;
    }

    try {
      // Fetch latest rates from API
      const response = await fetch(`${this.API_BASE_URL}/${fromCurrency}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch exchange rates: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ExchangeRateResponse;

      if (!data.rates || !data.rates[toCurrency]) {
        throw new Error(`Exchange rate not found for ${toCurrency}`);
      }

      const rate = data.rates[toCurrency];

      // Cache the rate
      this.cache.set(cacheKey, {
        rate,
        timestamp: new Date(),
      });

      // Also cache reverse rate
      this.cache.set(`${toCurrency}_${fromCurrency}`, {
        rate: 1 / rate,
        timestamp: new Date(),
      });

      this.logger.debug(`Fetched new rate for ${cacheKey}: ${rate}`);
      return rate;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching exchange rate: ${errorMessage}`);

      // If we have a cached rate (even if expired), use it as fallback
      if (cached) {
        this.logger.warn(
          `Using expired cached rate for ${cacheKey}: ${cached.rate}`,
        );
        return cached.rate;
      }

      // Last resort: return 1 (no conversion) if API fails and no cache
      this.logger.warn(`No exchange rate available for ${cacheKey}, using 1.0`);
      return 1;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Convert multiple amounts to a target currency
   */
  async convertAmounts(
    amounts: Array<{ amount: number; currency: string }>,
    targetCurrency: string,
  ): Promise<number> {
    const conversions = await Promise.all(
      amounts.map(async ({ amount, currency }) => {
        return this.convertAmount(amount, currency, targetCurrency);
      }),
    );

    return conversions.reduce((sum, converted) => sum + converted, 0);
  }

  /**
   * Get exchange rate for a specific date (for historical transactions)
   * This would require a different API endpoint or storing historical rates
   */
  async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date,
  ): Promise<number> {
    // For now, use current rate (can be enhanced with historical API later)
    // In production, you'd want to store historical rates in the database
    this.logger.warn(
      `Historical rate requested for ${date.toISOString()}, using current rate`,
    );
    return this.getExchangeRate(fromCurrency, toCurrency);
  }

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies(): string[] {
    return [
      'USD', // US Dollar
      'EUR', // Euro
      'GBP', // British Pound
      'JPY', // Japanese Yen
      'AUD', // Australian Dollar
      'CAD', // Canadian Dollar
      'CHF', // Swiss Franc
      'CNY', // Chinese Yuan
      'INR', // Indian Rupee
      'SGD', // Singapore Dollar
      'HKD', // Hong Kong Dollar
      'NZD', // New Zealand Dollar
      'MXN', // Mexican Peso
      'BRL', // Brazilian Real
      'ZAR', // South African Rand
      'KRW', // South Korean Won
      'SEK', // Swedish Krona
      'NOK', // Norwegian Krone
      'DKK', // Danish Krone
      'PLN', // Polish Zloty
    ];
  }

  /**
   * Format currency amount with symbol
   */
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Currency cache cleared');
  }
}
