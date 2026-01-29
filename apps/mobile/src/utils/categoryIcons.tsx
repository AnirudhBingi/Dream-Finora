import React from "react";
import { Path, Circle, Rect, G } from "react-native-svg";

/**
 * Category icon component props
 */
interface IconComponentProps {
  color: string;
}

/**
 * Type for category icon names
 * This should match the category names used throughout the app
 */
export type CategoryIconName =
  // Food & Dining
  | "groceries"
  | "restaurants-dining"
  | "coffee-drinks"
  | "food-delivery"

  // Transportation
  | "gas-fuel"
  | "public-transit"
  | "rideshare"
  | "parking-tolls"
  | "car-maintenance"

  // Bills & Utilities
  | "gas-electric"
  | "internet-cable"
  | "phone-mobile"
  | "water-sewer"
  | "trash-recycling"
  | "home-security"

  // Shopping
  | "clothing-accessories"
  | "electronics"
  | "home-garden"
  | "books-media"
  | "sports-outdoors"
  | "pet-supplies"
  | "general-shopping"

  // Entertainment
  | "movies-shows"
  | "concerts-events"
  | "streaming-services"
  | "sports-recreation"
  | "games-hobbies"

  // Health & Fitness
  | "pharmacy-medications"
  | "doctor-medical"
  | "gym-fitness"
  | "health-insurance"
  | "personal-care"

  // Education
  | "tuition"
  | "books-supplies"
  | "courses-training"
  | "software-tools"

  // Travel
  | "flights"
  | "hotels"
  | "car-rentals"
  | "travel-insurance"

  // Personal
  | "gifts-donations"
  | "pets"
  | "childcare"
  | "subscriptions"

  // Business
  | "office-supplies"
  | "professional-services"
  | "marketing-advertising"

  // Other
  | "bank-fees"
  | "cash-withdrawal"
  | "transfer"
  | "other";

/**
 * Maps category display names to icon component names
 * Handles variations in naming (e.g., "Restaurants & Dining" -> "restaurants-dining")
 */
export function normalizeCategoryName(categoryName: string): CategoryIconName {
  const normalized = categoryName
    .toLowerCase()
    .replace(/\s*&\s*/g, "-")
    .replace(/\s+/g, "-")
    .trim();

  // Map common variations
  const mappings: Record<string, CategoryIconName> = {
    groceries: "groceries",
    "restaurants-dining": "restaurants-dining",
    restaurants: "restaurants-dining",
    dining: "restaurants-dining",
    "coffee-drinks": "coffee-drinks",
    coffee: "coffee-drinks",
    "food-delivery": "food-delivery",

    "gas-fuel": "gas-fuel",
    gas: "gas-fuel",
    "public-transit": "public-transit",
    rideshare: "rideshare",
    "parking-tolls": "parking-tolls",
    parking: "parking-tolls",
    "car-maintenance": "car-maintenance",

    "gas-electric": "gas-electric",
    utilities: "gas-electric",
    "internet-cable": "internet-cable",
    internet: "internet-cable",
    "phone-mobile": "phone-mobile",
    phone: "phone-mobile",
    "water-sewer": "water-sewer",
    "trash-recycling": "trash-recycling",
    "home-security": "home-security",

    "clothing-accessories": "clothing-accessories",
    clothing: "clothing-accessories",
    electronics: "electronics",
    "home-garden": "home-garden",
    home: "home-garden",
    "books-media": "books-media",
    books: "books-media",
    "sports-outdoors": "sports-outdoors",
    sports: "sports-outdoors",
    "pet-supplies": "pet-supplies",
    "general-shopping": "general-shopping",
    shopping: "general-shopping",

    "movies-shows": "movies-shows",
    movies: "movies-shows",
    "concerts-events": "concerts-events",
    "streaming-services": "streaming-services",
    streaming: "streaming-services",
    "sports-recreation": "sports-recreation",
    "games-hobbies": "games-hobbies",
    games: "games-hobbies",

    "pharmacy-medications": "pharmacy-medications",
    pharmacy: "pharmacy-medications",
    "doctor-medical": "doctor-medical",
    medical: "doctor-medical",
    "gym-fitness": "gym-fitness",
    gym: "gym-fitness",
    "health-insurance": "health-insurance",
    "personal-care": "personal-care",

    tuition: "tuition",
    "books-supplies": "books-supplies",
    "courses-training": "courses-training",
    "software-tools": "software-tools",
    software: "software-tools",

    flights: "flights",
    hotels: "hotels",
    "car-rentals": "car-rentals",
    "travel-insurance": "travel-insurance",

    "gifts-donations": "gifts-donations",
    gifts: "gifts-donations",
    pets: "pets",
    childcare: "childcare",
    subscriptions: "subscriptions",

    "office-supplies": "office-supplies",
    "professional-services": "professional-services",
    "marketing-advertising": "marketing-advertising",

    "bank-fees": "bank-fees",
    "cash-withdrawal": "cash-withdrawal",
    transfer: "transfer",
    other: "other",
  };

  return mappings[normalized] || "other";
}

// Icon Components - Simple, clean SVG icons using react-native-svg

export const GroceriesIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.15.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
      fill={color}
    />
  </G>
);

export const RestaurantsDiningIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M8.1 13.34l2.83-2.83L3.91 3c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.68zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"
      fill={color}
    />
  </G>
);

export const CoffeeDrinksIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.38 0 2.5-1.12 2.5-2.5S19.88 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.83 0 1.5.67 1.5 1.5S19.33 8 18.5 8zM5 19h14v2H5v-2z"
      fill={color}
    />
  </G>
);

export const GasFuelIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M18.58 1H5.43L3 11v9c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-1h6v1c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-9l-2.42-10zM6.5 15c-.83 0-1.5-.67-1.5-1.5S5.67 12 6.5 12s1.5.67 1.5 1.5S7.33 15 6.5 15zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-6h11L19 11H5z"
      fill={color}
    />
  </G>
);

export const InternetCableIcon = ({ color }: IconComponentProps) => (
  <G>
    <Circle cx="4.5" cy="4.5" r="2" fill={color} />
    <Circle cx="19.5" cy="19.5" r="2" fill={color} />
    <Path
      d="M2 2l4.5 4.5M19.5 19.5L22 22M22 2l-4.5 4.5M2 22l4.5-4.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Path
      d="M12 8v8M8 12h8"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </G>
);

export const PhoneMobileIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"
      fill={color}
    />
  </G>
);

export const ElectronicsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Rect x="4" y="6" width="16" height="12" rx="2" fill={color} />
    <Path
      d="M9 10h6M9 14h4"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </G>
);

export const HomeGardenIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill={color} />
  </G>
);

export const BooksMediaIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
      fill={color}
    />
  </G>
);

export const MoviesShowsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"
      fill={color}
    />
  </G>
);

export const StreamingServicesIcon = ({ color }: IconComponentProps) => (
  <G>
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path
      d="M8 12l4 4 4-4"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </G>
);

export const GymFitnessIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"
      fill={color}
    />
  </G>
);

export const PharmacyMedicationsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M19.36 2.72L20.78 4.14l-1.42 1.42-1.41-1.42zM11 10v2H9v-2H7V8h2V6h2v2h2v2zM21 11v2h-2v-2h2zm-4.24 5.66l1.42 1.42-1.41 1.42-1.42-1.42zM4.22 4.14l1.42-1.42 1.41 1.42-1.42 1.42zM3 11h2v2H3v-2zm8 8h2v-2h-2v2zm-5.66 1.66L5.64 20.78 4.22 19.36l1.42-1.42z"
      fill={color}
    />
    <Circle cx="12" cy="12" r="3" fill={color} />
  </G>
);

export const FlightsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
      fill={color}
    />
  </G>
);

export const OtherIcon = ({ color }: IconComponentProps) => (
  <G>
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="6" cy="12" r="2" fill={color} />
    <Circle cx="18" cy="12" r="2" fill={color} />
  </G>
);

/**
 * Map of category names to icon components
 * Add new icons here as they are created
 */
export const categoryIconMap: Record<
  CategoryIconName,
  React.FC<IconComponentProps>
> = {
  // Food & Dining
  groceries: GroceriesIcon,
  "restaurants-dining": RestaurantsDiningIcon,
  "coffee-drinks": CoffeeDrinksIcon,
  "food-delivery": CoffeeDrinksIcon, // Reuse for now

  // Transportation
  "gas-fuel": GasFuelIcon,
  "public-transit": GasFuelIcon, // Reuse for now
  rideshare: GasFuelIcon, // Reuse for now
  "parking-tolls": GasFuelIcon, // Reuse for now
  "car-maintenance": GasFuelIcon, // Reuse for now

  // Bills & Utilities
  "gas-electric": GasFuelIcon, // Reuse for now
  "internet-cable": InternetCableIcon,
  "phone-mobile": PhoneMobileIcon,
  "water-sewer": HomeGardenIcon, // Reuse for now
  "trash-recycling": HomeGardenIcon, // Reuse for now
  "home-security": HomeGardenIcon, // Reuse for now

  // Shopping
  "clothing-accessories": RestaurantsDiningIcon, // Reuse for now
  electronics: ElectronicsIcon,
  "home-garden": HomeGardenIcon,
  "books-media": BooksMediaIcon,
  "sports-outdoors": GymFitnessIcon, // Reuse for now
  "pet-supplies": OtherIcon, // Reuse for now
  "general-shopping": GroceriesIcon, // Reuse for now

  // Entertainment
  "movies-shows": MoviesShowsIcon,
  "concerts-events": MoviesShowsIcon, // Reuse for now
  "streaming-services": StreamingServicesIcon,
  "sports-recreation": GymFitnessIcon, // Reuse for now
  "games-hobbies": ElectronicsIcon, // Reuse for now

  // Health & Fitness
  "pharmacy-medications": PharmacyMedicationsIcon,
  "doctor-medical": PharmacyMedicationsIcon, // Reuse for now
  "gym-fitness": GymFitnessIcon,
  "health-insurance": PharmacyMedicationsIcon, // Reuse for now
  "personal-care": PharmacyMedicationsIcon, // Reuse for now

  // Education
  tuition: BooksMediaIcon, // Reuse for now
  "books-supplies": BooksMediaIcon, // Reuse for now
  "courses-training": BooksMediaIcon, // Reuse for now
  "software-tools": ElectronicsIcon, // Reuse for now

  // Travel
  flights: FlightsIcon,
  hotels: HomeGardenIcon, // Reuse for now
  "car-rentals": GasFuelIcon, // Reuse for now
  "travel-insurance": OtherIcon, // Reuse for now

  // Personal
  "gifts-donations": OtherIcon, // Reuse for now
  pets: OtherIcon, // Reuse for now
  childcare: OtherIcon, // Reuse for now
  subscriptions: StreamingServicesIcon, // Reuse for now

  // Business
  "office-supplies": BooksMediaIcon, // Reuse for now
  "professional-services": OtherIcon, // Reuse for now
  "marketing-advertising": OtherIcon, // Reuse for now

  // Other
  "bank-fees": OtherIcon,
  "cash-withdrawal": OtherIcon,
  transfer: OtherIcon,
  other: OtherIcon,
};
