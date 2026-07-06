# AgroPay — Farmer Marketplace with Secure Payments

> A decentralized marketplace connecting farmers directly to buyers, with
> Stellar/Soroban smart contract escrow guaranteeing that payments are only
> released after confirmed delivery.

## Problem Statement

Small and medium-scale farmers frequently depend on intermediaries to sell
produce, resulting in delayed payments, reduced profits, and limited market
access. Buyers face uncertainty around product authenticity, order
fulfillment, and payment security when buying directly from farmers.

AgroPay solves this with a marketplace where farmers list produce, buyers
purchase directly, and funds are held in an on-chain escrow contract —
released to the farmer only once the buyer confirms delivery.

## Why Stellar

- **Sub-second finality, near-zero fees** — practical for small agricultural
  transactions where margins are thin.
- **Soroban smart contracts** provide programmable escrow without needing a
  custom Layer 1.
- **Freighter wallet** gives buyers and farmers a simple non-custodial way to
  sign transactions in the browser.

## Features

- Farmer produce listings (on-chain + indexed off-chain for search/filtering)
- Escrow-secured checkout: funds lock into the contract at purchase time
- Delivery proof upload (photo/receipt) + on-chain delivery confirmation
- Buyer-confirmed fund release, or automatic refund after a missed deadline
- Dispute flow with admin arbitration
- Admin dashboard: platform stats, farmer verification, dispute resolution
- Feedback collection from real users
- Analytics event tracking + Sentry error monitoring
- Mobile-responsive UI, loading states, and toast-based error handling

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express + MongoDB (Mongoose) |
| Wallet | Freighter |
| Blockchain | Stellar Testnet + Soroban |
| Monitoring | Sentry |
| Analytics | PostHog + custom event log |
| Deployment | Vercel (frontend) + Render (backend) |

## Architecture

```
Buyer/Farmer Browser
   │
   ├─▶ Freighter (signs transactions)
   │
   ├─▶ Soroban RPC ──▶ AgroPay Escrow Contract (Stellar Testnet)
   │                    - holds funds in custody
   │                    - enforces release/refund/dispute rules
   │
   └─▶ Express API ──▶ MongoDB
                        - indexes listings/orders for fast search & dashboards
                        - stores off-chain metadata (images, descriptions)
                        - the CONTRACT remains the source of truth for money
```

The backend never moves funds — it only mirrors on-chain state for UI
convenience (search, dashboards, history). All money-moving actions
(`place_order`, `confirm_delivery`, `claim_refund`, `resolve_dispute`) happen
via direct wallet-signed calls to the Soroban contract.

## Smart Contract

Located at `contracts/agropay_escrow/src/lib.rs`.

| Function | Caller | Effect |
|---|---|---|
| `initialize` | admin | One-time setup, sets payment token address |
| `create_listing` | farmer | Registers a produce listing on-chain |
| `place_order` | buyer | Transfers payment into contract custody |
| `mark_delivered` | farmer | Attaches delivery proof hash |
| `confirm_delivery` | buyer | Releases escrowed funds to farmer |
| `raise_dispute` | buyer | Freezes funds pending admin review |
| `resolve_dispute` | admin | Releases to farmer or refunds buyer |
| `claim_refund` | buyer | Refunds buyer if deadline passed unfulfilled |

### ⚠️ Before you deploy

This contract was written against the Soroban SDK 21 API but **has not been
compiled in this environment** (no Rust toolchain / network access was
available while generating this code). Before deploying to testnet, you must:

```bash
cd contracts/agropay_escrow
cargo test              # run the included test suite
cargo build --target wasm32-unknown-unknown --release
```

Fix any compiler errors that surface — minor API drift across SDK point
releases (e.g. `register_stellar_asset_contract_v2` naming) is the most
likely source of issues. This is a normal part of Soroban development, not a
sign the contract design is wrong.

## Setup Instructions

### 1. Smart Contract

```bash
cd contracts/agropay_escrow
cargo test
cargo build --target wasm32-unknown-unknown --release
```

Deploy with the provided script (requires `soroban-cli` and a funded testnet
identity):

```bash
./scripts/deploy_testnet.sh <your_identity> <payment_token_contract_id>
```

This prints the deployed contract ID — put it in both `backend/.env` and
`frontend/.env` as shown.

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in MongoDB URI, JWT secret, Cloudinary, Sentry
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # fill in API URL, contract ID, Sentry/PostHog keys
npm install
npm run dev
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list.
Key ones:

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — signing secret for auth tokens
- `ESCROW_CONTRACT_ID` / `VITE_ESCROW_CONTRACT_ID` — deployed contract address
- `CLOUDINARY_*` — for listing/proof image uploads
- `SENTRY_DSN` / `VITE_SENTRY_DSN` — error monitoring
- `VITE_POSTHOG_KEY` — analytics

## Folder Structure

```
agropay/
├── frontend/           React + Vite app
│   └── src/
│       ├── components/ Navbar, WalletButton, ProtectedRoute
│       ├── pages/       Landing, Marketplace, Dashboards, etc.
│       ├── services/    api.js, wallet.js, contract.js
│       └── context/     AuthContext, WalletContext
├── backend/            Express API
│   ├── controllers/
│   ├── models/          User, Listing, Order, Feedback, AnalyticsEvent
│   ├── routes/
│   └── middleware/       auth, error handling, uploads
├── contracts/
│   └── agropay_escrow/   Soroban Rust contract + tests
└── scripts/
    └── deploy_testnet.sh
```

## Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |
| Images | Cloudinary |
| Smart Contract | Stellar Testnet |

- Live demo: _add link after deploying_
- Contract address: _add after running deploy script_
- Demo video: _add link_

## User Onboarding & Feedback

This section should be filled in with **real** data before submission:

- Number of real users onboarded (target: 10+, mix of farmers and buyers)
- Wallet addresses and transaction hashes from real testnet interactions
- Screenshots of the feedback form responses
- Summary of feedback themes / average rating

## Monitoring & Analytics

- Sentry captures backend and frontend errors in production
- Custom `AnalyticsEvent` log tracks: `wallet_connected`, `listing_created`,
  `order_placed`, `order_delivered`, `order_confirmed`, `dispute_raised`,
  `feedback_submitted`, `signup`, `login`
- PostHog captures pageviews and can be extended for funnel analysis
- Take screenshots of both dashboards for submission

## Future Roadmap

- Multi-currency support (USDC alongside native XLM)
- Reputation scoring for farmers based on completed order history
- SMS-based order notifications for farmers without reliable data access
- Batch/wholesale order support with milestone-based partial releases
- Mobile app (React Native) reusing the same contract and API

## License

MIT
