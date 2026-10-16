# Daily expenses

Free personal expense tracker for web, iPhone and Android. Installable PWA, no login.

- Quick totals, itemized purchases, receipt photos, repeat purchases and reviewed bulk entry.
- Independent product catalog with aliases and matching suggestions; shops are separate. New receipt/manual items are remembered when the expense is saved.
- Pack sizes, fractional quantities, kg/g/lb/oz, L/ml, m/cm and each. Optional line discounts and signed receipt adjustments.
- All new expenses are NZD. USD is display-only using the latest available daily Frankfurter reference rate, with its date and cached status shown.
- Recurring Monday–Sunday spending limit, dashboard, reports, CSV export and JSON backup/restore.
- Price history normalized to compatible units, with cheaper/higher warnings relative to previous purchases. Receipt-wide adjustments are excluded from product unit-price comparisons.
- Live camera, shelf-label photo or typed price comparison. No comparison is saved as a purchase automatically.
- Optional encrypted Firebase synchronization through a private device connection link. No Firebase Authentication or paid AI API.

## Start

Open https://expenses-tracker-fec08.web.app. See SETUP.md for connecting devices and using measurements.

Use pnpm 11.5.0: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`.
`pnpm deploy` builds and publishes hosting and Firestore rules to expenses-tracker-fec08. Firebase CLI sign-in is required for deployment, not app usage. Public Firebase configuration is included; no environment variables are required.

## Receipt and camera reading

Tesseract.js runs locally in a browser worker. English model and WebAssembly assets download from the app's hosting on first use and may be cached by the browser. Images and camera frames are not uploaded or retained. Live scanning processes successive frames after the previous scan finishes; speed depends on the device. Stopping, closing or backgrounding the camera releases it.

This is OCR plus parsing, not a language model. Check product matches, prices, quantities, dates, discounts and totals. Ambiguous shelf prices require selection. Recognition works best with a sharp, well-lit label or receipt. HEIC decoding depends on the browser; use JPG/PNG if needed. Physical iPhone camera behavior remains unverified.

## Data and synchronization

Local data remains under `daily-expenses-v1`; validated v1/v2 backups migrate to v3 without resetting expenses. Old monthly limits remain in backups but are not reinterpreted as weekly limits. Existing USD expenses convert once at the available reference rate, retaining original amount and conversion metadata; review actual NZD paid if it differs.

On the device holding your records, choose Data → Sync this database. Connect other devices with the resulting private link. Joining replaces that device's current records with the shared database after confirmation and keeps a local recovery backup. It does not merge independent device histories.

Records are AES-GCM encrypted before transmission. The private link contains the encryption key in its URL fragment; Firebase stores encrypted records under an unguessable key-derived database identifier. Anyone holding the link can access and change the database. Keep it private and keep a backup; there is no account recovery. The rules deny other collections and public database directory listing.

Connected saves require internet. Live snapshots update connected devices; revision checks reject conflicting concurrent writes to the same record. Different records can update independently. Local-only use remains available before connecting. Browser caches can be evicted, so export backups regularly. Restoring or deleting shared records affects connected devices.

The existing Firebase Spark plan and free reference-rate service require no paid subscription. Free service quotas still apply.

## Pak'n'Save catalog

No full catalog has been imported. Product range and prices are store-specific; a supported free bulk feed was not found during investigation. A store selection and reliable data source are needed before implementing a complete catalog import. Current comparisons use your saved purchases, not purported supermarket-wide prices.
