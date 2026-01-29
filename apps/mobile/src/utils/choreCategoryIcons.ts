/**
 * Maps chore category names to icon names for the Icon component
 * Enhanced with specific chore-focused icons
 */
export function getChoreCategoryIcon(
  category: string | null | undefined,
): string {
  if (!category) return "task";

  const normalized = category.toLowerCase().trim();

  // Enhanced chore-specific icon mapping
  const categoryIconMap: Record<string, string> = {
    // Cleaning Categories
    cleaning: "cleaning-services",
    clean: "cleaning-services",
    "bathroom cleaning": "bathroom",
    bathroom: "bathroom",
    "kitchen cleaning": "kitchen",
    kitchen: "kitchen",
    vacuum: "vacuum",
    sweep: "sweep",
    mop: "mop",
    dust: "dust",
    wipe: "wipe",
    floor: "floor",
    dishes: "dishes",
    dishwasher: "dishwasher",
    windows: "windows",
    "deep clean": "cleaning-services",

    // Cooking Categories
    cooking: "restaurant-menu",
    cook: "restaurant-menu",
    "meal prep": "restaurant-menu",
    meal: "restaurant-menu",
    dinner: "dinner-dining",
    lunch: "lunch-dining",
    breakfast: "breakfast-dining",
    recipe: "restaurant-menu",
    prepare: "restaurant-menu",
    food: "restaurant-menu",
    baking: "bakery-dining",
    grill: "outdoor-grill",

    // Shopping Categories
    shopping: "shopping-cart",
    shop: "shopping-cart",
    grocery: "shopping-bag",
    "grocery shopping": "shopping-bag",
    store: "store",
    buy: "shopping-cart",
    purchase: "shopping-cart",
    market: "store",
    mall: "store",
    errand: "shopping-cart",

    // Maintenance Categories
    maintenance: "build",
    "home maintenance": "home-repair-service",
    fix: "build",
    repair: "build",
    broken: "build",
    install: "build",
    replace: "build",
    tool: "construction",
    hardware: "hardware",
    plumbing: "plumbing",
    electrical: "electrical-services",
    carpentry: "carpentry",
    painting: "format-paint",

    // Laundry Categories
    laundry: "local-laundry-service",
    wash: "local-laundry-service",
    dry: "dry-cleaning",
    clothes: "checkroom",
    clothing: "checkroom",
    fold: "local-laundry-service",
    iron: "iron",

    // Trash & Recycling
    "trash & recycling": "delete-sweep",
    trash: "delete-sweep",
    garbage: "delete-sweep",
    recycle: "recycling",
    waste: "delete-sweep",
    bin: "delete-sweep",
    disposal: "delete-sweep",
    compost: "compost",

    // Pet Care
    "pet care": "pets",
    pet: "pets",
    dog: "pets",
    cat: "pets",
    walk: "directions-walk",
    feed: "pets",
    animal: "pets",
    vet: "medical-services",
    grooming: "content-cut",

    // Yard Work & Garden
    "yard work": "yard",
    yard: "yard",
    garden: "local-florist",
    "garden work": "local-florist",
    mow: "grass",
    lawn: "grass",
    "lawn care": "grass",
    plant: "local-florist",
    weed: "yard",
    outdoor: "yard",
    landscaping: "yard",
    "snow removal": "ac-unit",
    raking: "yard",

    // Errands & Delivery
    errands: "running-with-errors",
    pickup: "local-shipping",
    drop: "local-shipping",
    delivery: "delivery-dining",
    "post office": "mail",
    bank: "account-balance",
    pharmacy: "local-pharmacy",
    "dry cleaning": "dry-cleaning",

    // Organization
    organization: "inventory-2",
    organize: "inventory-2",
    sort: "sort",
    arrange: "inventory-2",
    tidy: "cleaning-services",
    declutter: "inventory-2",
    storage: "storage",
    packing: "inventory-2",
    unpacking: "unarchive",

    // Childcare
    childcare: "child-care",
    babysitting: "child-care",
    kids: "child-care",
    school: "school",
    homework: "menu-book",

    // Car & Vehicle
    "car wash": "car-wash",
    "car maintenance": "car-repair",
    vehicle: "directions-car",
    gas: "local-gas-station",

    // Health & Fitness
    exercise: "fitness-center",
    workout: "fitness-center",
    gym: "fitness-center",
    medication: "medication",
    appointment: "event",

    // Other
    other: "more-horiz",
    misc: "more-horiz",
    miscellaneous: "more-horiz",
  };

  // Try exact match first
  if (categoryIconMap[normalized]) {
    return categoryIconMap[normalized];
  }

  // Try partial match (check if category contains any of the keywords)
  for (const [keyword, iconName] of Object.entries(categoryIconMap)) {
    if (normalized.includes(keyword) || keyword.includes(normalized)) {
      return iconName;
    }
  }

  // Default fallback
  return "task";
}

/**
 * Get MaterialIcons name for a category (fallback)
 * Maps to actual MaterialIcons names that exist
 */
export function getChoreCategoryMaterialIcon(
  category: string | null | undefined,
): string {
  if (!category) return "task";

  const normalized = category.toLowerCase().trim();

  // Direct mapping to MaterialIcons names (using valid MaterialIcons names)
  const materialIconMap: Record<string, string> = {
    // Cleaning
    "bathroom cleaning": "bathroom",
    bathroom: "bathroom",
    "kitchen cleaning": "kitchen",
    kitchen: "kitchen",
    vacuum: "cleaning-services",
    dusting: "cleaning-services",
    mopping: "cleaning-services",
    windows: "window",
    "deep clean": "cleaning-services",
    cleaning: "cleaning-services",
    clean: "cleaning-services",

    // Cooking
    cooking: "restaurant-menu",
    "meal prep": "restaurant-menu",
    baking: "bakery-dining",
    grilling: "outdoor-grill",

    // Shopping
    "grocery shopping": "shopping-bag",
    shopping: "shopping-cart",
    "pickup/delivery": "local-shipping",
    "post office": "mail",
    bank: "account-balance",
    pharmacy: "local-pharmacy",

    // Maintenance
    "home maintenance": "home-repair-service",
    plumbing: "plumbing",
    electrical: "electrical-services",
    painting: "format-paint",
    carpentry: "construction",
    maintenance: "build",

    // Laundry
    laundry: "local-laundry-service",
    folding: "local-laundry-service",
    ironing: "dry-cleaning",

    // Trash
    "trash & recycling": "delete-sweep",
    compost: "eco",

    // Pet Care
    "pet care": "pets",
    "dog walk": "directions-walk",
    "pet grooming": "content-cut",

    // Yard
    "yard work": "yard",
    mowing: "grass",
    gardening: "local-florist",
    "snow removal": "ac-unit",
    raking: "yard",

    // Organization
    organization: "inventory-2",
    packing: "inventory-2",
    unpacking: "unarchive",

    // Childcare
    childcare: "child-care",
    school: "school",

    // Car
    "car wash": "local-car-wash",
    "car maintenance": "build",

    // Health
    exercise: "fitness-center",
    appointment: "event",

    // Other
    other: "more-horiz",
  };

  // Try exact match
  if (materialIconMap[normalized]) {
    return materialIconMap[normalized];
  }

  // Try partial match
  for (const [key, icon] of Object.entries(materialIconMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return icon;
    }
  }

  return "task";
}
