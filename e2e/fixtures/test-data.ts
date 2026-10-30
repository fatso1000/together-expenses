import type { AppData } from "@/lib/types";

export function createMockAppData(currentMonth = new Date().toISOString().slice(0, 7)): AppData {
  const now = Date.now();
  const todayDate = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
  const threeDaysAgo = new Date(now - 3 * 86400000).toISOString().slice(0, 10);

  return {
    version: 4,
    weeklyLimit: 35000, // $350.00 NZD
    categoryLimits: [
      { category: "Groceries", amount: 15000 },
      { category: "Eating out", amount: 8000 },
      { category: "Petrol", amount: 6000 },
    ],
    accounts: {
      globalInitialNZD: 500000, // $5,000.00 NZD baseline
      globalInitialUSD: 310000, // $3,100.00 USD
      globalManualNZD: true,
      nzInitialNZD: 250000, // $2,500.00 NZD savings
      updatedAt: 1700000000000,
    },
    salary: {
      weeklyAverageNZD: 120000, // $1,200.00 NZD/week
      updatedAt: 1700000000000,
    },
    shops: [
      {
        id: "shop-nw",
        name: "New World Metro",
        items: [
          { id: "saved-nw-1", title: "Anchor Blue Milk 2L", unitPrice: 560, currency: "NZD" },
        ],
      },
      {
        id: "shop-pns",
        name: "Pak'nSave Royal Oak",
        items: [
          { id: "saved-pns-1", title: "Anchor Blue Milk 2L", unitPrice: 520, currency: "NZD" },
        ],
      },
      {
        id: "shop-bp",
        name: "BP Connect",
        items: [],
      },
      {
        id: "shop-cd",
        name: "Woolworths Auckland",
        items: [],
      },
    ],
    products: [
      {
        id: "prod-milk",
        title: "Anchor Blue Milk 2L",
        aliases: ["milk", "anchor blue"],
        unit: "L",
      },
      {
        id: "prod-bread",
        title: "Vogel's Mixed Grain Bread",
        aliases: ["bread", "vogels"],
        unit: "each",
      },
      {
        id: "prod-apples",
        title: "Royal Gala Apples",
        aliases: ["apples", "gala"],
        unit: "kg",
      },
    ],
    expenses: [
      {
        id: "exp-1",
        date: todayDate,
        merchant: "New World Metro",
        category: "Groceries",
        amount: 1520, // $15.20 = (1 * 560) + (2 * 480)
        currency: "NZD",
        accountId: "global",
        note: "Weekly groceries staples",
        createdAt: now - 3600000,
        updatedAt: now - 3600000,
        items: [
          {
            id: "line-1",
            title: "Anchor Blue Milk 2L",
            unitPrice: 560,
            quantity: 1,
            size: 2,
            unit: "L",
            productId: "prod-milk",
          },
          {
            id: "line-2",
            title: "Vogel's Mixed Grain Bread",
            unitPrice: 480,
            quantity: 2,
            size: 1,
            unit: "each",
            productId: "prod-bread",
          },
        ],
      },
      {
        id: "exp-2",
        date: yesterday,
        merchant: "BP Connect",
        category: "Petrol",
        amount: 6500, // $65.00
        currency: "NZD",
        accountId: "global",
        note: "Fuel top up",
        createdAt: now - 86400000,
        updatedAt: now - 86400000,
      },
      {
        id: "exp-3",
        date: threeDaysAgo,
        merchant: "Best Cafe Ponsonby",
        category: "Eating out",
        amount: 2850, // $28.50
        currency: "NZD",
        accountId: "global",
        note: "Lunch meeting",
        createdAt: now - 3 * 86400000,
        updatedAt: now - 3 * 86400000,
      },
      {
        id: "exp-4",
        date: yesterday,
        merchant: "Dental Care NZ",
        category: "Health",
        amount: 14000, // $140.00
        currency: "NZD",
        accountId: "nz", // Paid from NZ Savings!
        note: "Dental checkup paid from savings",
        createdAt: now - 86400000,
        updatedAt: now - 86400000,
      },
    ],
    frequentPayments: [
      {
        id: "freq-rent",
        name: "Apartment Rent",
        amount: 45000, // $450.00
        category: "Rent",
        accountId: "global",
        frequency: "weekly",
        nextDueDate: todayDate,
        active: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      {
        id: "freq-gym",
        name: "CityFitness Membership",
        amount: 1699, // $16.99
        category: "Subscriptions",
        accountId: "global",
        frequency: "fortnightly",
        nextDueDate: todayDate,
        active: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      {
        id: "freq-savings",
        name: "Emergency Fund Transfer",
        amount: 20000, // $200.00
        category: "Savings",
        accountId: "nz",
        frequency: "monthly",
        nextDueDate: todayDate,
        active: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ],
    savingsRecords: [
      {
        id: "sav-1",
        date: threeDaysAgo,
        amount: 50000, // $500.00
        note: "Fortnightly salary transfer",
        createdAt: now - 3 * 86400000,
      },
    ],
    limits: [
      {
        month: currentMonth,
        currency: "NZD",
        amount: 180000, // $1,800.00 / month
      },
    ],
    customCategories: [
      {
        id: "cat-pets",
        name: "Pets",
        icon: "PawPrint",
        color: "#d97706",
        isDefault: false,
      },
      {
        id: "cat-gaming",
        name: "Gaming",
        icon: "Tv",
        color: "#7c3aed",
        isDefault: false,
      },
    ],
  };
}
