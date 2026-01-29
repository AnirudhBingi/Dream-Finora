import { Injectable } from '@nestjs/common';

export interface CategoryMatch {
  category: string;
  confidence: number;
}

@Injectable()
export class CategorizationService {
  // Finance categories (income and expense)
  private readonly financeCategories = {
    income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'],
    expense: [
      // Food & Dining
      'Groceries',
      'Restaurants & Dining',
      'Coffee & Drinks',
      'Food Delivery',
      // Transportation
      'Gas & Fuel',
      'Public Transit',
      'Rideshare',
      'Parking & Tolls',
      'Car Maintenance',
      // Bills & Utilities
      'Gas & Electric',
      'Internet & Cable',
      'Phone & Mobile',
      'Water & Sewer',
      'Rent & Mortgage',
      'Insurance',
      // Shopping
      'Clothing & Accessories',
      'Electronics',
      'Home & Garden',
      'General Shopping',
      // Entertainment
      'Movies & Shows',
      'Streaming Services',
      'Sports & Recreation',
      'Bars & Nightlife',
      'Games & Hobbies',
      // Health & Fitness
      'Pharmacy & Medications',
      'Doctor & Medical',
      'Gym & Fitness',
      'Personal Care',
      // Education
      'Tuition',
      'Books & Supplies',
      'Courses & Training',
      'Software & Tools',
      // Travel
      'Flights',
      'Hotels',
      'Car Rentals',
      'Travel Insurance',
      // Personal
      'Gifts & Donations',
      'Pets',
      'Childcare',
      'Subscriptions',
      // Business
      'Office Supplies',
      'Professional Services',
      // Other
      'Bank Fees',
      'Cash Withdrawal',
      'Transfer',
      'Other',
    ],
  };

  // Item listing categories
  private readonly itemCategories = [
    'Electronics',
    'Furniture',
    'Clothing',
    'Books',
    'Sports & Outdoors',
    'Home & Garden',
    'Toys & Games',
    'Automotive',
    'Musical Instruments',
    'Other',
  ];

  // Keyword mappings for auto-categorization
  private readonly financeKeywords: Record<string, string[]> = {
    // Income
    Salary: ['salary', 'paycheck', 'wage', 'income', 'pay'],
    Freelance: ['freelance', 'contract', 'gig', 'consulting'],
    Investment: ['dividend', 'interest', 'investment', 'return', 'profit'],
    Gift: ['gift', 'present', 'donation received'],
    'Other Income': [],

    // Expenses - Food & Dining
    Groceries: [
      'grocery',
      'groceries',
      'supermarket',
      'walmart',
      'target',
      'costco',
      'aldi',
      'whole foods',
      'trader joe',
      'kroger',
      'safeway',
      'food lion',
      'publix',
    ],
    'Restaurants & Dining': [
      'restaurant',
      'dining',
      'lunch',
      'dinner',
      'breakfast',
      'brunch',
      'pizza',
      'burger',
      'sushi',
      'mcdonalds',
      'burger king',
      'wendy',
      'taco bell',
      'chipotle',
      'olive garden',
      'applebees',
      'outback',
      'red lobster',
    ],
    'Coffee & Drinks': [
      'coffee',
      'starbucks',
      'dunkin',
      'tim hortons',
      'cafe',
      'coffee shop',
      'tea',
      'bubble tea',
      'smoothie',
      'juice',
      'boba',
    ],
    'Food Delivery': [
      'uber eats',
      'doordash',
      'grubhub',
      'postmates',
      'deliveroo',
      'food delivery',
      'foodpanda',
      'just eat',
      'seamless',
    ],
    // Transportation
    'Gas & Fuel': [
      'gas',
      'fuel',
      'petrol',
      'diesel',
      'exxon',
      'shell',
      'bp',
      'chevron',
      'mobil',
      'valero',
      'sunoco',
      'gas station',
      'fuel station',
    ],
    'Public Transit': [
      'bus',
      'train',
      'metro',
      'subway',
      'tram',
      'public transport',
      'public transit',
      'amtrak',
      'greyhound',
      'megabus',
      'commuter',
      'metro card',
    ],
    Rideshare: [
      'uber',
      'lyft',
      'taxi',
      'cab',
      'rideshare',
      'ride share',
      'grab',
      'bolt',
    ],
    'Parking & Tolls': [
      'parking',
      'toll',
      'parking meter',
      'parking garage',
      'parking lot',
      'ezpass',
      'fastrak',
      'toll road',
      'toll bridge',
    ],
    'Car Maintenance': [
      'car repair',
      'auto repair',
      'mechanic',
      'oil change',
      'tire',
      'brake',
      'car wash',
      'auto service',
      'vehicle maintenance',
      'jiffy lube',
    ],
    // Bills & Utilities
    'Gas & Electric': [
      'electric',
      'electricity',
      'power',
      'energy',
      'comed',
      'edison',
      'duke energy',
      'southern company',
      'aep',
      'exelon',
      'con ed',
      'pg&e',
      'gas bill',
      'natural gas',
      'nicor',
      'centerpoint',
      'constellation',
    ],
    'Internet & Cable': [
      'internet',
      'wifi',
      'cable',
      'comcast',
      'xfinity',
      'spectrum',
      'cox',
      'verizon fios',
      'at&t internet',
      'charter',
      'optimum',
      'cable tv',
    ],
    'Phone & Mobile': [
      'phone',
      'mobile',
      'cell phone',
      'cellular',
      'verizon',
      'at&t',
      'tmobile',
      'sprint',
      'cricket',
      'boost',
      'mobile plan',
      'phone bill',
    ],
    'Water & Sewer': [
      'water',
      'water bill',
      'sewer',
      'sewage',
      'water utility',
    ],
    'Rent & Mortgage': [
      'rent',
      'mortgage',
      'housing',
      'apartment',
      'lease',
      'landlord',
    ],
    Insurance: [
      'insurance',
      'car insurance',
      'auto insurance',
      'home insurance',
      'health insurance',
      'life insurance',
      'renters insurance',
      'geico',
      'state farm',
      'progressive',
      'allstate',
      'farmers',
    ],
    // Shopping
    'Clothing & Accessories': [
      'clothing',
      'apparel',
      'shirt',
      'pants',
      'jeans',
      'dress',
      'jacket',
      'coat',
      'shoes',
      'sneakers',
      'boots',
      'accessories',
      'nike',
      'adidas',
      'zara',
      'h&m',
      'forever 21',
      'old navy',
      'gap',
      'uniqlo',
    ],
    Electronics: [
      'electronics',
      'iphone',
      'ipad',
      'laptop',
      'computer',
      'phone',
      'tablet',
      'tv',
      'television',
      'headphones',
      'speaker',
      'camera',
      'apple',
      'samsung',
      'sony',
      'best buy',
      'electronics store',
    ],
    'Home & Garden': [
      'home',
      'garden',
      'furniture',
      'ikea',
      'home depot',
      'lowes',
      'bed bath',
      'kitchen',
      'appliance',
      'refrigerator',
      'microwave',
      'oven',
      'dishwasher',
      'plant',
      'tool',
      'household',
    ],
    'General Shopping': [
      'amazon',
      'store',
      'shop',
      'purchase',
      'buy',
      'mall',
      'retail',
      'shopping',
      'target',
      'walmart',
    ],
    // Entertainment
    'Movies & Shows': [
      'movie',
      'cinema',
      'theater',
      'movie theater',
      'amc',
      'regal',
      'cinemark',
      'concert',
      'show',
      'ticket',
      'broadway',
    ],
    'Streaming Services': [
      'netflix',
      'hulu',
      'disney',
      'disney plus',
      'disney+',
      'prime video',
      'hbo',
      'hbo max',
      'paramount',
      'peacock',
      'apple tv',
      'streaming',
      'spotify',
      'youtube premium',
      'youtube music',
      'pandora',
    ],
    'Sports & Recreation': [
      'sports',
      'gym membership',
      'fitness',
      'yoga',
      'pilates',
      'tennis',
      'golf',
      'baseball',
      'basketball',
      'football',
      'soccer',
      'recreation',
      'outdoor',
      'camping',
      'hiking',
    ],
    'Bars & Nightlife': [
      'bar',
      'club',
      'nightclub',
      'alcohol',
      'drinks',
      'beer',
      'wine',
      'liquor',
      'cocktail',
      'pub',
      'tavern',
    ],
    'Games & Hobbies': [
      'game',
      'gaming',
      'playstation',
      'xbox',
      'nintendo',
      'steam',
      'video game',
      'board game',
      'puzzle',
      'hobby',
      'craft',
      'art supplies',
    ],
    // Health & Fitness
    'Pharmacy & Medications': [
      'pharmacy',
      'medicine',
      'medication',
      'drug',
      'cvs',
      'walgreens',
      'rite aid',
      'prescription',
      'rx',
      'pharmaceutical',
    ],
    'Doctor & Medical': [
      'doctor',
      'hospital',
      'medical',
      'health',
      'clinic',
      'appointment',
      'dentist',
      'dental',
      'eye',
      'optometrist',
      'urgent care',
      'emergency room',
    ],
    'Gym & Fitness': [
      'gym',
      'fitness',
      'personal trainer',
      'crossfit',
      'planet fitness',
      '24 hour fitness',
      'equinox',
      'la fitness',
      'workout',
      'exercise',
    ],
    'Personal Care': [
      'haircut',
      'salon',
      'spa',
      'beauty',
      'cosmetic',
      'skincare',
      'personal care',
      'wellness',
      'massage',
      'nail',
      'manicure',
      'pedicure',
      'barber',
    ],
    // Education
    Tuition: ['tuition', 'school', 'university', 'college', 'education fee'],
    'Books & Supplies': [
      'book',
      'textbook',
      'amazon books',
      'barnes noble',
      'books',
    ],
    'Courses & Training': [
      'course',
      'training',
      'workshop',
      'seminar',
      'class',
      'learning',
      'udemy',
      'coursera',
      'skillshare',
      'masterclass',
    ],
    'Software & Tools': [
      'software',
      'app',
      'subscription',
      'adobe',
      'microsoft',
      'office',
      'creative cloud',
      'tool',
      'saas',
      'platform',
    ],
    // Travel
    Flights: [
      'flight',
      'airline',
      'airport',
      'delta',
      'united',
      'american airlines',
      'southwest',
      'jetblue',
      'alaska',
      'spirit',
      'frontier',
      'airfare',
    ],
    Hotels: [
      'hotel',
      'airbnb',
      'booking',
      'expedia',
      'marriott',
      'hilton',
      'hyatt',
      'holiday inn',
      'lodging',
      'accommodation',
    ],
    'Car Rentals': [
      'rental car',
      'car rental',
      'hertz',
      'avis',
      'enterprise',
      'budget',
      'national',
    ],
    'Travel Insurance': ['travel insurance', 'trip insurance'],
    // Personal
    'Gifts & Donations': [
      'gift',
      'present',
      'donation',
      'charity',
      'charitable',
      'contribution',
    ],
    Pets: [
      'pet',
      'dog',
      'cat',
      'petco',
      'petsmart',
      'veterinary',
      'vet',
      'pet food',
      'pet store',
      'pet care',
    ],
    Childcare: ['childcare', 'babysitter', 'daycare', 'nanny', 'child care'],
    Subscriptions: [
      'subscription',
      'membership',
      'monthly',
      'annual',
      'yearly',
    ],
    // Business
    'Office Supplies': [
      'office',
      'staples',
      'office depot',
      'supplies',
      'stationery',
      'paper',
      'pen',
      'printer',
      'ink',
    ],
    'Professional Services': [
      'legal',
      'lawyer',
      'accountant',
      'consulting',
      'professional service',
      'attorney',
      'cpa',
      'advisory',
    ],
    // Other
    'Bank Fees': [
      'bank fee',
      'atm fee',
      'service fee',
      'overdraft',
      'transaction fee',
    ],
    'Cash Withdrawal': ['atm', 'cash', 'withdrawal', 'cash withdrawal'],
    Transfer: [
      'transfer',
      'venmo',
      'paypal',
      'zelle',
      'cash app',
      'money transfer',
      'wire transfer',
    ],
    Other: [],
  };

  private readonly itemCategoryKeywords: Record<string, string[]> = {
    Electronics: [
      'iphone',
      'ipad',
      'laptop',
      'computer',
      'phone',
      'tablet',
      'tv',
      'television',
      'headphones',
      'speaker',
      'camera',
      'gaming',
      'console',
      'nintendo',
      'playstation',
      'xbox',
      'apple',
      'samsung',
      'electronics',
      'electronic',
      'device',
    ],
    Furniture: [
      'sofa',
      'couch',
      'chair',
      'table',
      'desk',
      'bed',
      'mattress',
      'dresser',
      'cabinet',
      'shelf',
      'furniture',
      'ikea',
      'furnishing',
    ],
    Clothing: [
      'shirt',
      'pants',
      'jeans',
      'dress',
      'jacket',
      'coat',
      'shoes',
      'sneakers',
      'boots',
      'clothing',
      'apparel',
      'fashion',
      'wardrobe',
    ],
    Books: [
      'book',
      'novel',
      'textbook',
      'magazine',
      'comic',
      'literature',
      'reading',
    ],
    'Sports & Outdoors': [
      'bike',
      'bicycle',
      'bike',
      'skateboard',
      'skis',
      'snowboard',
      'gym equipment',
      'weights',
      'dumbbell',
      'barbell',
      'sports',
      'outdoor',
      'camping',
      'hiking',
    ],
    'Home & Garden': [
      'kitchen',
      'appliance',
      'refrigerator',
      'microwave',
      'oven',
      'dishwasher',
      'garden',
      'plant',
      'tool',
      'home',
      'household',
    ],
    'Toys & Games': [
      'toy',
      'game',
      'puzzle',
      'board game',
      'lego',
      'doll',
      'action figure',
    ],
    Automotive: [
      'car',
      'vehicle',
      'auto',
      'automotive',
      'tire',
      'part',
      'accessory',
    ],
    'Musical Instruments': [
      'guitar',
      'piano',
      'violin',
      'drum',
      'instrument',
      'music',
      'musical',
    ],
    Other: [],
  };

  /**
   * Auto-categorize a finance transaction based on description/title
   */
  categorizeFinance(
    description: string,
    type: 'income' | 'expense',
  ): CategoryMatch | null {
    const text = description.toLowerCase().trim();
    if (!text) return null;

    const availableCategories = this.financeCategories[type];
    let bestMatch: CategoryMatch | null = null;
    let highestConfidence = 0;

    for (const category of availableCategories) {
      const keywords = this.financeKeywords[category] || [];
      let matches = 0;

      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }

      if (matches > 0) {
        // Confidence based on number of keyword matches
        const confidence = Math.min(matches / Math.max(keywords.length, 1), 1);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = { category, confidence };
        }
      }
    }

    // If no match found, return default category
    if (!bestMatch) {
      return {
        category: type === 'income' ? 'Other Income' : 'Other',
        confidence: 0.1,
      };
    }

    return bestMatch;
  }

  /**
   * Auto-categorize an item listing based on title
   */
  categorizeItem(title: string): CategoryMatch | null {
    const text = title.toLowerCase().trim();
    if (!text) return null;

    let bestMatch: CategoryMatch | null = null;
    let highestConfidence = 0;

    for (const category of this.itemCategories) {
      const keywords = this.itemCategoryKeywords[category] || [];
      let matches = 0;

      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }

      if (matches > 0) {
        const confidence = Math.min(matches / Math.max(keywords.length, 1), 1);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = { category, confidence };
        }
      }
    }

    if (!bestMatch) {
      return {
        category: 'Other',
        confidence: 0.1,
      };
    }

    return bestMatch;
  }

  /**
   * Get all available categories for a given type
   */
  getFinanceCategories(type: 'income' | 'expense'): string[] {
    return [...this.financeCategories[type]];
  }

  getItemCategories(): string[] {
    return [...this.itemCategories];
  }
}
