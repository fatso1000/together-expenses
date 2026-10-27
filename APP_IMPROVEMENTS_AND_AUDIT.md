# App Comprehensive Audit & Improvement Roadmap
**Project:** Together Expenses (`together-expenses`)  
**Date of Audit:** October 2026  
**Auditor:** Senior Software Engineer & System Architect  

---

## Executive Summary

The **Together Expenses** application is a well-crafted Vue 3 PWA with client-side end-to-end encryption (AES-GCM), local-first architecture, dual-account budgeting (Everyday Global Account vs. NZ Salary Savings), product price tracking, and receipt OCR. 

However, deep static and runtime analysis reveals several architectural gaps, usability oversights, data sync risks, and untapped opportunities for AI-driven financial intelligence. This document details everything that is missing, wrong, or in need of improvement, categorized by severity and domain.

---

## 1. High-Priority Issues & Functional Flaws

### 1.1 "Shops" Route Exists but is Missing from Navigation
- **Location:** `src/App.vue` (lines 40-75) vs `src/main.ts` (line 35)
- **Problem:** The route `/shops` exists in `main.ts` and `views/Shops.vue` is fully implemented, but it is **completely omitted** from both the desktop sidebar navigation and the mobile bottom navigation bar in `App.vue`. Users cannot discover or access the Shops manager unless they manually edit the browser URL hash or tap a specific link in an expense card.
- **Fix:** Add a dedicated navigation link for "Shops" with the `Store` or `ShoppingBag` icon, or integrate shop management cleanly into Settings/Data.

### 1.2 Frequent Payments Do Not Automatically Roll Over Due Dates
- **Location:** `src/stores/expenses.ts` (`logFrequentPaymentAsExpense`), `src/components/FrequentPayments.vue`
- **Problem:** When a user logs a recurring payment (e.g., monthly rent or weekly power), the action creates an expense with `date: today()`. It does **not** update `nextDueDate`. As a result, the payment immediately displays as "Overdue" or remains stuck on the past date, forcing the user to manually edit the due date every single cycle.
- **Fix:** Automatically calculate and advance `nextDueDate` according to the payment's frequency (`weekly` +7 days, `fortnightly` +14 days, `monthly` +1 month, `yearly` +1 year) upon logging.

### 1.3 Disconnect Between Frequent Payments and Weekly Limit Budgeting
- **Location:** `src/components/WeeklyLimit.vue`, `src/stores/expenses.ts`
- **Problem:** `WeeklyLimit.vue` only displays a static `frequentWeeklyCommitment` badge (calculated mathematically as an abstract average). It does **not** identify which bills actually fall due in the active week (`weekStart` to `weekEnd`), nor does it allow adding those scheduled bills to the week's expenses based on payment dates.
- **Fix:** Provide dynamic detection of bills due in the currently viewed week, display them in the weekly budget breakdown, and provide a single-click action to log them on their exact scheduled payment date.

### 1.4 Hard Rejection of Non-NZD Expense Entry
- **Location:** `src/stores/expenses.ts` (line 360)
  ```ts
  if (draft.currency !== "NZD")
    throw new Error("Enter expenses in NZD. USD is a display conversion.");
  ```
- **Problem:** If a receipt or user selects USD or another currency during entry, the app crashes with an error rather than auto-converting to NZD using the cached live exchange rate from `rates.ts`.
- **Fix:** Automatically convert foreign currency amounts to NZD using `rates.rate`, recording the original currency, exchange rate, and original amount in `originalUSD` metadata (which the `Expense` type already supports).

### 1.5 Cloud Sync Mutation Batch Size Limit (450 Records)
- **Location:** `src/lib/cloud.ts` (lines 173-177)
  ```ts
  if (mutations.length > 450)
    throw new Error("This operation changes too many records at once. Use smaller batches.");
  ```
- **Problem:** Firestore transactions support up to 500 writes. If a user restores a backup file with more than 450 combined expenses, products, and shops, cloud sync fails catastrophically with an unhandled exception, leaving the device out of sync.
- **Fix:** Chunk large mutations into sequential Firestore batches when restoring or bulk-importing data.

---

## 2. Usability & User Experience (UX) Gaps

### 2.1 Week Navigation Lacks Previous / Next Arrows
- **Location:** `src/components/WeeklyLimit.vue` (lines 366-369)
- **Problem:** Navigating between weeks requires opening a native date picker (`<input type="date">`). There are no `← Previous Week` or `Next Week →` buttons or a "Current Week" reset button. On desktop and mobile, skipping backward or forward by one week is cumbersome.
- **Fix:** Add chevron buttons (`<ChevronLeft>`, `<ChevronRight>`) to step 7 days back or forward, plus a "Today" quick button.

### 2.2 ExpenseForm Monolith (~1,500 lines)
- **Location:** `src/components/ExpenseForm.vue`
- **Problem:** `ExpenseForm.vue` handles quick amount, itemized entry, receipt scanning, mobile receipt docking, camera preview, category selection, account switching, discount math, and inline category creation all in one massive file. This increases maintenance difficulty and regression risks.
- **Fix:** Modularize into sub-components: `ReceiptDock.vue`, `AccountSelector.vue`, and `ExpenseTotalsSummary.vue`.

### 2.3 No Budget Rollover / Surplus Tracking
- **Problem:** The weekly budget resets completely every Monday. If a user was \$60 under budget in Week 1, that surplus disappears in Week 2. Conversely, if they overspent by \$100, Week 2 doesn't reflect the deficit.
- **Fix:** Add an optional "Rollover Budget" toggle in Settings to carry positive or negative balances into subsequent weeks.

### 2.4 Lack of Date Range Selector in Expenses View
- **Location:** `src/views/Expenses.vue`
- **Problem:** The view only has "This Week", "This Month", and "All Expenses". Users cannot view "Last Month", "Last Week", or a custom date range in the main expenses list (even though Reports has custom dates).
- **Fix:** Add "Last Month" and custom date range filters to the Expenses filter toolbar.

---

## 3. Receipt OCR & AI Opportunities

### 3.1 Tesseract.js Bottlenecks
- **Location:** `src/lib/ocr.ts`
- **Observations:**
  - Tesseract.js loads large WebAssembly and language files (~30MB) that must be downloaded on first use.
  - OCR often fails on distorted thermal receipts, faded ink, skewed text, and multi-column formats.
  - The regex-based receipt parser (`src/lib/receipt.ts`) relies on fragile regex heuristics that break on unusual store formats or international receipts.
- **Opportunity:** Local LLM integration (Ollama + Gemma) provides semantic understanding of receipt text, effortlessly extracting merchant, date, tax, items, and totals even from messy OCR output.

### 3.2 Ollama Gemma Integration Strategy
- **Capabilities to Add:**
  1. **Receipt Intelligence:** Feed raw OCR text to local Gemma 4 / Gemma 2 via Ollama (`http://localhost:11434`) to get structured JSON extraction with 99%+ accuracy.
  2. **Automated Categorization:** Gemma maps obscure merchant names (e.g. "BP 2GO EPSOM") to the exact matching category ("Petrol").
  3. **Financial Coach & Spending Insights:**
     - Pattern detection (e.g. identify spending acceleration early in the week).
     - Subscriptions & Recurring Bills audit (flag unused or duplicate recurring charges).
     - Actionable saving recommendations ("You could save ~$85/week by reducing food delivery to once weekly").
  4. **100% Privacy:** All processing remains on the user's local machine via Ollama with zero cloud API keys, data leakage, or subscription fees.

---

## 4. Code Quality, Types & Test Coverage

### 4.1 Missing Unit Tests for Edge Cases
- Current tests cover `finance.ts`, `products.ts`, `purchases.ts`, `receipt-layouts.ts`, `storage.ts`.
- **Gaps in test coverage:**
  - `FrequentPayments`: No tests verifying frequency conversions, due date calculations, or expense logging.
  - `BulkEntry` parser: Missing tests for malformed tab/pipe strings.
  - Multi-currency rate caching and fallback states in `rates.ts`.

### 4.2 Accessibility (a11y) Improvements
- Several icon buttons in `FrequentPayments.vue` and `WeeklyLimit.vue` lack explicit `aria-label` tags (e.g., pause, play, edit, remove).
- Color contrast on warning badges (`#fbf0d8` background with `#9c7b28` text) should be checked against WCAG AA standards (4.5:1 ratio).

---

## 5. Prioritized Implementation Roadmap

| Priority | Feature / Improvement | Benefit | Estimated Complexity |
|---|---|---|---|
| **P0** | **Add Frequent Payments to Week Expenses by Payment Date** | Accurate weekly budgeting, no duplicate bill tracking, auto due date advancement | Medium |
| **P0** | **Local Ollama (Gemma) Receipt Parser & Financial Insights** | High-accuracy receipt parsing, zero cloud cost, deep financial coaching & anomaly detection | Medium |
| **P1** | **Add "Shops" to Navigation** | Restores access to an entire hidden view | Low |
| **P1** | **Weekly Chevron Navigation (`←` / `→` / `Today`)** | Dramatically improves weekly budget UX | Low |
| **P2** | **Multi-Currency Auto-Conversion on Expense Entry** | Prevents crashes when adding non-NZD receipts | Low |
| **P2** | **Batch Chunking for Cloud Sync (>450 records)** | Prevents sync failure during large backup restore | Medium |
| **P3** | **Budget Rollover & Recurring Bill Calendar** | Long-term financial planning & forecasting | High |
