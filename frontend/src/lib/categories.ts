export const CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Housing",
  "Health",
  "Entertainment",
  "Subscriptions",
  "Shopping",
  "Savings",
  "Income",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries:     "#1D9E75",
  Dining:        "#F59E0B",
  Transport:     "#3B82F6",
  Utilities:     "#8B5CF6",
  Housing:       "#EC4899",
  Health:        "#06B6D4",
  Entertainment: "#F97316",
  Subscriptions: "#7C3AED",
  Shopping:      "#EF4444",
  Savings:       "#10B981",
  Income:        "#059669",
  Other:         "#9CA3AF",
};

export function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#9CA3AF";
}

// Keyword → category rules. First match wins.
const KEYWORD_RULES: Array<[RegExp, string]> = [
  [/woolworths|coles|aldi|safeway|iga|harris farm|fruit.?world|grocery/i,          "Groceries"],
  [/uber\s*eats|doordash|menulog|restaurant|cafe|coffee|mcdonald|kfc|hungry\s*jack|pizza|sushi|nandos|domino|guzman/i, "Dining"],
  [/uber|lyft|ola|didi|taxi|transit|train|metro|bus|petrol|shell|bp|caltex|fuel|motorpass/i, "Transport"],
  [/electricity|energy\s*aust|agl|origin|gas|water|internet|telstra|optus|vodafone|amaysim|phone|broadband|nbn/i, "Utilities"],
  [/rent|mortgage|strata|council\s*rate|real\s*estate/i,                            "Housing"],
  [/gym|anytime\s*fitness|f45|chemist|pharmacy|doctor|medicare|dental|medical|hospital|ahm|medibank|bupa/i, "Health"],
  [/netflix|spotify|disney|amazon\s*prime|apple\s*tv|binge|stan|hulu|youtube\s*premium|audible|kindle/i, "Subscriptions"],
  [/amazon|ebay|shopify|target|kmart|big\s*w|myer|david\s*jones|jb\s*hi-fi|officeworks|bunnings|ikea/i, "Shopping"],
  [/cinema|hoyts|event\s*cinema|village|movie|theatre|concert|ticketek|ticketmaster|museum|gallery|zoo/i, "Entertainment"],
  [/salary|payroll|direct\s*dep|wages|income|employer|pay\s*run/i,                  "Income"],
  [/savings|term\s*deposit|investment|vanguard|commsec|stake/i,                      "Savings"],
];

export function autoCategory(description: string): string {
  for (const [pattern, cat] of KEYWORD_RULES) {
    if (pattern.test(description)) return cat;
  }
  return "Other";
}

/** Return the transaction type inferred from category and amount */
export function inferType(category: string, amount: number): "income" | "expense" | "transfer" {
  if (category === "Income") return "income";
  if (category === "Savings") return amount < 0 ? "transfer" : "income";
  return "expense";
}
