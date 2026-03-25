# CLAUDE.md — Sleeve

---

## Project Goals

Sleeve is a gamified crypto portfolio app built for a Pyth hackathon. Users connect their wallet, see their assets rendered as floating orbs in a dark aquarium scene, complete quests, and earn Pearls via a verifiable random bonus system powered by Pyth Entropy.

**One-line pitch:** Sleeve transforms crypto portfolios into interactive game worlds where users earn rewards through actions and experience unpredictable outcomes powered by verifiable randomness.

**Hackathon requirements (non-negotiable):**
- Must use Pyth Lazer (Pro) for real-time price feeds
- Must use Pyth Entropy for all randomness — no Math.random() in production reward logic
- Target chain: Base mainnet (chain ID 8453)

**Current milestone:** MVP — 60-second demo loop: wallet connect → aquarium renders real holdings → quest button → roll animation → reward reveal → leaderboard update

---

## Architecture Overview

Full-stack Next.js app. API routes handle all server-side logic (price feeds, quest validation, Entropy resolution). Client handles wallet interaction and all animations.

**Tech stack:** Next.js App Router, Tailwind CSS, RainbowKit + wagmi, Supabase (PostgreSQL), Pyth Lazer Pro API, Pyth Entropy (Base mainnet)

**Data flow:**
```
Wallet connect → read balances (wagmi) → merge with Pyth prices → render orbs
Quest click → base reward (Supabase) → user signs Entropy tx → bonus resolved → animate → leaderboard update
Price poll → every 10s → /api/prices → Pyth Lazer → orbs grow/shrink
```

**Project structure:**
```
sleeve/
├── app/
│   ├── layout.tsx                  — root layout, providers
│   ├── page.tsx                    — entry point, renders aquarium
│   ├── providers.tsx               — WagmiConfig, RainbowKitProvider, QueryClient
│   ├── api/
│   │   ├── prices/route.ts         — Pyth Lazer price fetch, returns price map
│   │   ├── quest/route.ts          — validates quest, awards base Pearls to Supabase
│   │   ├── entropy/route.ts        — resolves Entropy result, calculates bonus tier
│   │   └── leaderboard/route.ts    — top 10 wallets by Pearls
│   └── globals.css                 — Tailwind base + aquarium animations
├── components/
│   ├── aquarium/
│   │   ├── AquariumScene.tsx       — full-screen scene, renders orbs + ambient life
│   │   ├── AssetOrb.tsx            — coin orb (size, glow, level state)
│   │   ├── AmbientLife.tsx         — fish, jellyfish, bubbles (animation only, no data)
│   │   └── SeabedLayer.tsx         — static coral, seaweed, rocks
│   ├── quest/
│   │   ├── QuestButton.tsx         — "Complete Quest" CTA
│   │   ├── RollAnimation.tsx       — "Rolling..." slot/vortex animation
│   │   └── RewardReveal.tsx        — tiered result animation (none/small/rare/jackpot)
│   ├── hud/
│   │   ├── PearlCounter.tsx        — top bar Pearl count, tick-up animation
│   │   ├── WalletBadge.tsx         — wallet address + chain
│   │   └── Leaderboard.tsx         — top-3 corner overlay
│   └── ui/
│       ├── ConnectButton.tsx       — RainbowKit connect wrapper
│       └── ParticlesBurst.tsx      — reusable particle effect
├── hooks/
│   ├── usePrices.ts                — polls /api/prices every 10s
│   ├── usePortfolio.ts             — wallet balances via wagmi + prices merged
│   ├── useQuest.ts                 — full quest flow orchestration
│   └── useLeaderboard.ts           — leaderboard fetch + refresh
├── lib/
│   ├── pyth.ts                     — Pyth Lazer API client
│   ├── entropy.ts                  — Pyth Entropy contract helpers
│   ├── supabase.ts                 — Supabase client + query helpers
│   └── rewards.ts                  — bonus tier calculation
├── types/
│   └── index.ts                    — Asset, PriceMap, QuestResult, BonusTier
├── constants/
│   └── index.ts                    — token list, contract addresses, tier config
└── public/
    └── assets/
        ├── coins/                  — coin logo PNGs
        └── aquarium/               — fish SVGs, seabed sprites
```

**Environment variables:**
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID   — RainbowKit project ID
NEXT_PUBLIC_ENTROPY_CONTRACT_ADDRESS   — Pyth Entropy contract on Base
NEXT_PUBLIC_CHAIN_ID                   — 8453 (Base mainnet)
NEXT_PUBLIC_SUPABASE_URL               — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY          — Supabase anon key (safe to expose, RLS protected)
PYTH_API_KEY                           — Pyth Lazer Pro key (server-side only, no NEXT_PUBLIC_)
PYTH_PRO_BASE_URL                      — https://pyth-lazer.dourolabs.app
```

**Database schema (Supabase):**
```sql
users        — wallet_address (PK), pearls int default 0, level int default 1, created_at
quests       — id (PK), name, base_reward int, cooldown_hours int
user_quests  — wallet_address (FK), quest_id (FK), completed_at  [cooldown enforcement]
rewards_log  — id (PK), wallet_address (FK), base_reward, bonus_tier, bonus_amount, entropy_tx_hash, created_at
```

**Bonus tier logic:**
```
Entropy 0–60   → none     +0 Pearls
Entropy 61–90  → small    +5 Pearls
Entropy 91–99  → rare     +20 Pearls
Entropy 100    → jackpot  +50 Pearls
Base reward (always): +10 Pearls
```

---

## Design Style Guide

**Tech stack:** Next.js App Router, Tailwind CSS

**Visual style:**
- Dark underwater aesthetic — deep navy/black backgrounds, high contrast
- Coins as weighted floating orbs — size proportional to portfolio value
- Minimal text on orbs — ticker, price, % change only
- Ambient life at all times — fish, jellyfish, bubbles always moving
- Bottom seabed layer — static coral, seaweed, rocks
- Particle effects on reward moments — not decorative, purposeful

**Animation principles:**
- Price up → orb inflates + glows green, fish swim toward it
- Price down → orb deflates + dims, fish drift away
- Quest moment: screen dims → base reward floats up → roll animation → result slams in
- Reward tiers have distinct visual weight: none (subtle) → small (sparkle) → rare (flash) → jackpot (full eruption)
- Pearl counter ticks up with number animation, never jumps

**Component patterns:**
- Tailwind for all layout and spacing
- Keep components focused — aquarium/, quest/, hud/, ui/ are separate concerns
- Animation state lives in the component, data state lives in hooks
- No inline styles — use Tailwind classes or globals.css keyframes

---

## Product & UX Guidelines

**Core UX principles:**
- UI/UX is the moat — judges must be wowed in the first 10 seconds
- Every action must produce visible, satisfying feedback
- The quest moment is the showstopper — protect its quality above all else
- One perfect loop beats many half-built features
- Randomness is spice, not base — guaranteed reward + unpredictable bonus keeps it fair

**UI zones (top to bottom):**
1. HUD bar — Pearl counter, wallet badge, chain indicator
2. Aquarium scene — full screen, floating orbs, ambient life, seabed
3. Quest panel — quest button, roll animation, reward reveal (overlays scene)
4. Leaderboard — corner overlay, always visible, top 3

**Copy tone:**
- Short and punchy — "Complete Quest", "Rolling...", "Jackpot!"
- No jargon in UI text — users should understand instantly
- Reward reveals should feel like a game moment, not a transaction

**V1 scope — strictly enforced:**
- Single quest type (daily, 24h cooldown)
- Aquarium theme only — no theme switcher
- Pearls off-chain in Supabase
- Base mainnet only
- Simple leaderboard (top 10 by Pearls)
- Do not build: multiple themes, dashboard/analytics, on-chain Pearls, sybil protection, inventory/skins

---

## Constraints & Policies

**Security — MUST follow:**
- NEVER expose `PYTH_API_KEY` to the client — server-side API routes only
- NEVER use `NEXT_PUBLIC_` prefix on `PYTH_API_KEY` or `PYTH_PRO_BASE_URL`
- ALWAYS use environment variables for all secrets and config
- NEVER commit `.env.local` or any file containing API keys
- Validate all wallet addresses before writing to Supabase
- Sanitize all user-supplied input at API route boundaries

**Code quality:**
- TypeScript strict mode — no `any` types without explicit justification
- Run `npm run lint` before committing
- Run `npm run build` to catch type errors before pushing

**Dependencies:**
- Do not add new libraries without a clear reason — the stack is locked for v1
- No Math.random() in reward or bonus logic — always use Entropy result
- Keep Pyth Lazer calls server-side only — never call from the client directly

---

## Repository Etiquette

**Branching:**
- ALWAYS create a feature branch before starting any new feature or fix
- NEVER commit directly to `main`
- Branch naming: `feature/description` or `fix/description`

**Git workflow:**
1. Create branch: `git checkout -b feature/your-feature-name`
2. Develop and commit on the feature branch
3. Before pushing: run lint and build (see Commands)
4. Push branch: `git push -u origin feature/your-feature-name`
5. Create a PR to merge into `main`

**Commits:**
- Write clear commit messages describing what changed and why
- Keep commits focused on a single change
- Never commit `.env.local`, `node_modules/`, or `.next/`

**Pull requests:**
- Create PRs for all changes to `main`
- NEVER force push to `main`
- Include a brief description of what changed and why

---

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build — also catches type errors
npm run start        # Run production build locally
npm run lint         # ESLint check

# Git workflow
git checkout -b feature/name     # Create feature branch
git push -u origin feature/name  # Push branch to remote
```

---

## Testing Instructions

There are no automated tests for v1 (hackathon scope). Manual test checklist before any push:

**Wallet & portfolio:**
- [ ] Wallet connects successfully on Base mainnet
- [ ] Real token balances load and render as orbs
- [ ] Orb sizes are proportional to portfolio value
- [ ] Disconnecting wallet clears the scene

**Price feeds:**
- [ ] Prices update every ~10s without page refresh
- [ ] Orbs visibly grow/shrink when price changes
- [ ] `/api/prices` returns correctly shaped price map

**Quest flow:**
- [ ] "Complete Quest" button triggers base reward
- [ ] Pearls update in Supabase after quest
- [ ] Entropy tx is sent and signed by wallet
- [ ] Bonus tier is calculated correctly from Entropy result
- [ ] Roll animation plays before result is revealed
- [ ] Each bonus tier (none/small/rare/jackpot) shows distinct animation
- [ ] 24h cooldown prevents re-running quest immediately

**HUD:**
- [ ] Pearl counter ticks up with animation on reward
- [ ] Leaderboard updates after quest completion
- [ ] Wallet badge shows correct address and chain

---

## Documentation

- `CLAUDE.md` — this file, AI context and project guide
- `project-spec.md` — full product spec (located in `demo1/` parent folder)
- `brainchild.md` — original concept doc (located in `demo1/` parent folder)
- `.env.local` — local environment variables, never committed
- Supabase dashboard — live DB, table editor, SQL editor
- Pyth Lazer docs — https://docs.pyth.network/lazer
- Pyth Entropy docs — https://docs.pyth.network/entropy
- RainbowKit docs — https://www.rainbowkit.com/docs
- wagmi docs — https://wagmi.sh
