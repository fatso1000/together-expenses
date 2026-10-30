# Technology Stack: Daily Expenses (`together-expenses`)

## Core Frontend Architecture
- **Framework**: Vue 3.5 (`<script setup>`, Composition API)
- **Language**: TypeScript 5.9 with strict type checking
- **State Management**: Pinia 3.0 stores
- **Routing**: Vue Router 4.5
- **Icons**: Lucide Vue Next

## Styling & Design System
- **Framework**: Tailwind CSS utility framework
- **Typography**: `@fontsource-variable/dm-sans` & `@fontsource-variable/manrope`
- **Design Strategy**: Clean, native HTML/CSS/Vue/Tailwind rendering; performant transitions and layout without heavy 3D or shader overhead

## Build & Tooling
- **Bundler**: Vite 4.5
- **Package Manager**: pnpm 11.5
- **Type Checker**: `vue-tsc` (v3.0.0)
- **PWA Tooling**: `vite-plugin-pwa` with `workbox-window`

## Client-Side Libraries & Engines
- **OCR Engine**: Tesseract.js (v6.0.1) WebAssembly worker and trained models hosted locally
- **Cryptography**: Web Crypto API (AES-GCM 256-bit client-side encryption)
- **Local AI Advisor**: Ollama REST API client (`/api/generate`, `gemma4:e4b` or local models)

## Testing Strategy
- **Unit Testing**: Native Node test runner with `tsx` (`tsx --test tests/*.test.ts`)
- **E2E Testing**: Playwright (`@playwright/test`) covering navigation, drawer performance, offline persistence, and reporting

## Infrastructure & Hosting
- **Hosting**: Firebase Hosting (Static PWA)
- **Database Rules**: Firestore security rules for encrypted key-derived document storage
