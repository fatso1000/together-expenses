import type { Expense } from "@/lib/types";

export interface RegularPurchaseItem {
  normalizedTitle: string;
  displayTitle: string;
  purchaseCount: number;
  totalSpentCents: number;
  averageUnitPriceCents: number;
  latestPriceCents: number;
  latestShop: string;
  latestDate: string;
  unit?: string;
  shopPrices: Record<string, number>;
}

export interface CompactFinancialSummary {
  currency: string;
  weekTotalNZD: number;
  weeklyLimitNZD: number;
  daysRemainingInWeek: number;
  dailyAllowanceNZD: number;
  pacingStatus: "under_budget" | "near_limit" | "exceeded";
  monthTotalNZD: number;
  salaryWeeklyNZD: number;
  activeRecurringWeeklyCommitmentNZD: number;
  topCategories: Array<{ category: string; amountNZD: number }>;
  accounts: {
    globalCapitalNZD: number;
    nzSavingsNZD: number;
  };
}

export interface ScopeCheckResult {
  isAllowed: boolean;
  reason?: string;
}

const REJECT_PATTERNS: RegExp[] = [
  /\b(?:div|center a div|css|html|javascript|typescript|python|react|vue|json\b.*number|code\b.*function|algorithm|sql query)\b/i,
  /\b(?:king|queen|monarch|throne|emperor|conquer|magic|spell)\b/i,
  /\b(?:poem|song|story|fantasy|dragon|joke|riddle|trivia|capital of|who won|translate this text)\b/i,
];

const FINANCIAL_KEYWORDS: RegExp[] = [
  /\b(?:spend|spending|spent|expense|expenses|cost|costs|budget|budgets|money|saving|savings|save|cut|shopping|cart|buy|bought|purchase|purchases|price|prices|cheap|cheaper|expensive|afford|bill|bills|subscription|subscriptions|salary|income|earn|earning|milk|groceries|petrol|fuel|coffee|food|rent|debt|cash|dollar|nzd|usd|account)\b/i,
];

export function isSpendingRelatedQuery(rawQuery: string): ScopeCheckResult {
  const query = rawQuery.trim();
  if (query.length === 0) {
    return { isAllowed: false, reason: "Query is empty" };
  }

  for (const pattern of REJECT_PATTERNS) {
    if (pattern.test(query)) {
      return {
        isAllowed: false,
        reason: "Query touches off-topic programming, fantasy, or non-financial domain.",
      };
    }
  }

  const hasFinancialIntent = FINANCIAL_KEYWORDS.some((kw) => kw.test(query));
  if (!hasFinancialIntent && query.length > 35) {
    return {
      isAllowed: false,
      reason: "Query does not appear related to spending, budgeting, or shopping.",
    };
  }

  return { isAllowed: true };
}

function normalizeTitle(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function indexRegularPurchases(expenses: Expense[]): RegularPurchaseItem[] {
  const map = new Map<string, RegularPurchaseItem>();

  for (const expense of expenses) {
    const items = expense.items || [];
    const shop = expense.merchant || "Unknown";
    const date = expense.date;

    for (const item of items) {
      const title = (item.title || "").trim();
      if (!title) continue;

      const norm = normalizeTitle(title);
      if (!norm) continue;

      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity || 1;
      const lineCost = Math.max(0, Math.round(unitPrice * quantity) - (item.discount || 0));

      let existing = map.get(norm);
      if (!existing) {
        existing = {
          normalizedTitle: norm,
          displayTitle: title,
          purchaseCount: 0,
          totalSpentCents: 0,
          averageUnitPriceCents: 0,
          latestPriceCents: unitPrice,
          latestShop: shop,
          latestDate: date,
          unit: item.unit,
          shopPrices: {},
        };
        map.set(norm, existing);
      }

      existing.purchaseCount += 1;
      existing.totalSpentCents += lineCost;
      existing.shopPrices[shop] = unitPrice;

      if (!existing.latestDate || date >= existing.latestDate) {
        existing.latestDate = date;
        existing.latestPriceCents = unitPrice;
        existing.latestShop = shop;
      }
    }
  }

  for (const item of map.values()) {
    if (item.purchaseCount > 0) {
      item.averageUnitPriceCents = Math.round(item.totalSpentCents / item.purchaseCount);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.purchaseCount - a.purchaseCount);
}

export function findRelevantPurchases(
  index: RegularPurchaseItem[],
  query: string,
  limit: number = 5,
): RegularPurchaseItem[] {
  const normQuery = normalizeTitle(query);
  const words = normQuery.split(" ").filter((w) => w.length > 2);

  if (words.length === 0) {
    return index.slice(0, limit);
  }

  const scored = index.map((item) => {
    let score = 0;
    if (item.normalizedTitle.includes(normQuery) || normQuery.includes(item.normalizedTitle)) {
      score += 100;
    }
    for (const word of words) {
      if (item.normalizedTitle.includes(word)) {
        score += 25;
      }
    }
    return { item, score };
  });

  const matching = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.item.purchaseCount - a.item.purchaseCount)
    .map((s) => s.item);

  return matching.length > 0 ? matching.slice(0, limit) : index.slice(0, limit);
}

export function buildCompactFinancialSummary(params: {
  weekTotalCents: number;
  weeklyLimitCents: number;
  daysRemaining: number;
  monthTotalCents: number;
  salaryWeeklyCents: number;
  frequentWeeklyCommitmentCents: number;
  topCategories: Array<{ category: string; amountCents: number }>;
  globalCapitalCents: number;
  nzSavingsCents: number;
}): CompactFinancialSummary {
  const safeDays = Math.max(1, Math.min(7, params.daysRemaining));
  const remainingAllowanceCents = Math.max(0, params.weeklyLimitCents - params.weekTotalCents);
  const dailyAllowanceNZD =
    params.weeklyLimitCents > 0 ? Math.round((remainingAllowanceCents / safeDays) / 100 * 10) / 10 : 0;

  let pacingStatus: "under_budget" | "near_limit" | "exceeded" = "under_budget";
  if (params.weeklyLimitCents > 0) {
    if (params.weekTotalCents >= params.weeklyLimitCents) {
      pacingStatus = "exceeded";
    } else if (params.weekTotalCents >= params.weeklyLimitCents * 0.85) {
      pacingStatus = "near_limit";
    }
  }

  return {
    currency: "NZD",
    weekTotalNZD: Math.round(params.weekTotalCents / 100),
    weeklyLimitNZD: Math.round(params.weeklyLimitCents / 100),
    daysRemainingInWeek: safeDays,
    dailyAllowanceNZD,
    pacingStatus,
    monthTotalNZD: Math.round(params.monthTotalCents / 100),
    salaryWeeklyNZD: Math.round(params.salaryWeeklyCents / 100),
    activeRecurringWeeklyCommitmentNZD: Math.round(params.frequentWeeklyCommitmentCents / 100),
    topCategories: params.topCategories.map((c) => ({
      category: c.category,
      amountNZD: Math.round(c.amountCents / 100),
    })),
    accounts: {
      globalCapitalNZD: Math.round(params.globalCapitalCents / 100),
      nzSavingsNZD: Math.round(params.nzSavingsCents / 100),
    },
  };
}

export function formatKnowledgeForPrompt(
  summary: CompactFinancialSummary,
  relevantPurchases: RegularPurchaseItem[],
): string {
  const purchasesLines = relevantPurchases
    .map((p) => {
      const avgDollars = (p.averageUnitPriceCents / 100).toFixed(2);
      const shops = Object.entries(p.shopPrices)
        .map(([s, c]) => `${s}: $${(c / 100).toFixed(2)}`)
        .join(", ");
      return `- ${p.displayTitle} (${p.purchaseCount}x bought, avg $${avgDollars}, last at ${p.latestShop || "store"}${shops ? " | " + shops : ""})`;
    })
    .join("\n");

  const categories = summary.topCategories
    .map((c) => `${c.category}: $${c.amountNZD}`)
    .join(", ");

  return `[FINANCIAL_CONTEXT]
Pacing: spent $${summary.weekTotalNZD}/$${summary.weeklyLimitNZD} NZD (${summary.daysRemainingInWeek} days left, daily allowance $${summary.dailyAllowanceNZD}, status: ${summary.pacingStatus})
Month: $${summary.monthTotalNZD} NZD | Income avg: $${summary.salaryWeeklyNZD}/wk | Fixed commitments: $${summary.activeRecurringWeeklyCommitmentNZD}/wk
Capital: Global $${summary.accounts.globalCapitalNZD} NZD | Local Savings $${summary.accounts.nzSavingsNZD} NZD
Top Categories: ${categories || "None"}
[RELEVANT_PURCHASES]
${purchasesLines || "No regular purchase items logged yet."}`;
}
