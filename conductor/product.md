# Product Definition: Daily Expenses (`together-expenses`)

## Vision
A free, private, offline-first personal expense tracking and household budget Progressive Web Application (PWA) designed for desktop, mobile (iOS and Android), and tablets without mandatory account login or data monetization.

## Core Value Proposition
- **Privacy & Security**: Zero mandatory account creation; data stays in local browser storage by default. Optional cross-device synchronization uses zero-knowledge AES-GCM encryption with private keys encoded in URL hash fragments.
- **Fast Daily Entry**: Quick totals, itemized product purchases, repeat payment automation, and streamlined bulk expense review.
- **Local Receipt & Price Scanning**: Embedded Tesseract.js WebAssembly OCR reads receipts and shelf price tags entirely in a client worker thread without external AI subscriptions or cloud photo transmission.
- **Price History & Comparison**: Unit-price normalization (kg/g/lb/oz, L/ml, m/cm, each) tracking price shifts across stores, warning about price increases or cheaper alternatives.
- **Private Financial Intelligence**: Client-side financial pacing and optional local LLM spending advisor (via local Ollama) providing contextual budget guidance and actionable savings tips without sending financial data to third-party APIs.
- **Multi-Currency Clarity**: NZD-first base currency with cached daily Frankfurter reference rates for live USD conversions.

## Target Audience
- Households and individuals wanting rapid, private daily expense tracking.
- Budget-conscious shoppers tracking supermarket unit prices and historical trends.
- Users prioritizing data ownership, offline reliability, and fast mobile PWA performance.
