export function getCurrencySymbol(currencyCode: string): string {
  switch (currencyCode.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    case 'JPY':
      return '¥';
    case 'CAD':
      return 'C$';
    case 'AUD':
      return 'A$';
    case 'CNY':
      return '¥';
    case 'CHF':
      return 'CHF';
    case 'SGD':
      return 'S$';
    case 'HKD':
      return 'HK$';
    case 'NZD':
      return 'NZ$';
    case 'MXN':
      return 'MX$';
    case 'BRL':
      return 'R$';
    case 'ZAR':
      return 'R';
    case 'KRW':
      return '₩';
    case 'TRY':
      return '₺';
    case 'RUB':
      return '₽';
    case 'SEK':
      return 'kr';
    case 'NOK':
      return 'kr';
    case 'DKK':
      return 'kr';
    case 'PLN':
      return 'zł';
    case 'THB':
      return '฿';
    case 'IDR':
      return 'Rp';
    case 'MYR':
      return 'RM';
    case 'PHP':
      return '₱';
    case 'AED':
      return 'د.إ';
    case 'SAR':
      return '﷼';
    // Add more currency codes as needed
    default:
      return '$'; // Default to dollar sign
  }
}

