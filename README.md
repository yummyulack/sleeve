Sleeve
Your crypto portfolio, alive.
Built for the Pyth Community Hackathon (March 4 – April 1, 2026)

What It Does
Sleeve transforms your on-chain holdings into a living underwater world. Connect your wallet and your assets render as glowing weighted orbs floating in a dark aquarium scene — larger positions become larger orbs, prices rising makes them glow green and inflate, prices falling makes them dim and shrink. Ambient fish, jellyfish, and bubbles populate the scene around your portfolio at all times.
On top of the visual layer sits a daily quest system. Players earn Pearls — Sleeve's reward currency — through two daily quests. The Bonus Quest triggers a real Pyth Entropy transaction on Base mainnet, resolving verifiable on-chain randomness into one of four reward tiers: no bonus, small, rare, or jackpot. The jackpot is a full stadium ovation — slot reels locking in one by one, confetti, and a fanfare sequence — all backed by a confirmed on-chain entropy result. A leaderboard tracks the top Pearl earners across all wallets.
The core loop: connect wallet → watch your aquarium react to live prices → complete daily quests → roll for a bonus → climb the leaderboard.

Pyth Features Used
Pyth Lazer Pro (real-time price feeds)
Sleeve polls Pyth Lazer Pro via a server-side API route (/api/prices) every 10 seconds, fetching a live price map for all tracked assets. Balances read from the wallet via wagmi are merged with Pyth prices to calculate each orb's USD value and relative size in real time. Price movements are reflected immediately in the aquarium — orbs grow, shrink, and change color as markets move. The PYTH_API_KEY is kept strictly server-side and never exposed to the client.
Pyth Entropy (on-chain verifiable randomness)
All bonus reward outcomes run through Pyth Entropy on Base mainnet. When a user triggers the Bonus Quest, they sign an Entropy transaction from their wallet. The /api/entropy route resolves the result and maps it to a bonus tier based on the returned value. Math.random() is never used anywhere in reward logic — every outcome is verifiable on-chain. The entropy transaction hash is stored in Supabase alongside each reward for full auditability.

Architecture
Wallet connect → wagmi reads balances → merge with Pyth Lazer prices → render orbs
Price poll     → every 10s → /api/prices → Pyth Lazer Pro → orbs grow/shrink live
Quest claim    → /api/quest → base Pearls written to Supabase → cooldown starts
Bonus Quest    → user signs Entropy tx → /api/entropy resolves → bonus tier calculated → animate reveal → leaderboard updates
Client (Next.js App Router)
    ├── AquariumScene       — full-screen canvas, floating orbs, ambient life, seabed
    ├── QuestPanel          — side panel, quest cards, countdown timers, Pearl balance
    ├── RollAnimation       — slot machine reels, phase-aware status messages
    ├── RewardReveal        — tiered animations (none / small / rare / jackpot)
    └── Leaderboard         — top-3 corner overlay, always visible

Server (Next.js API Routes)
    ├── /api/prices         — Pyth Lazer Pro fetch, returns price map
    ├── /api/quest          — validates cooldown, awards base Pearls to Supabase
    ├── /api/entropy        — resolves Entropy result, calculates bonus tier
    └── /api/leaderboard    — top 10 wallets by Pearls from Supabase

Core Modules
ModulePurposelib/pyth.tsPyth Lazer Pro API client — server-side onlylib/entropy.tsPyth Entropy contract helpers on Base mainnetlib/supabase.tsSupabase client + server client for API routeslib/rewards.tsBonus tier calculation from Entropy resulthooks/usePrices.tsPolls /api/prices every 10s, updates orb statehooks/usePortfolio.tsMerges wagmi balances with live Pyth priceshooks/useQuest.tsFull quest flow orchestration — claim, roll, revealhooks/useLeaderboard.tsLeaderboard fetch and refresh after quest completioncomponents/aquarium/AquariumScene, AssetOrb, AmbientLife, SeabedLayercomponents/quest/QuestButton, RollAnimation, RewardRevealcomponents/hud/PearlCounter, WalletBadge, Leaderboard overlay

Bonus Tier Logic
Entropy result is mapped to a reward tier server-side in /api/entropy:
Entropy ValueTierBonus0 – 60No bonus+0 Pearls61 – 90Small+5 Pearls91 – 99Rare+20 Pearls100Jackpot+50 Pearls
Base reward of +10 Pearls is always awarded regardless of tier.

Tech Stack
LayerTechnologyFrameworkNext.js 16 App Router, React 19, TypeScriptStylingTailwind CSS 4WalletRainbowKit 2, wagmi 2, viemDatabaseSupabase (PostgreSQL) — Pearls, cooldowns, rewards logPyth IntegrationPyth Lazer Pro (price feeds), Pyth Entropy (randomness)BlockchainBase mainnet (chain ID 8453)DeploymentVercel

Setup
Prerequisites

Node.js 20+
A Supabase project with the schema below
Pyth Lazer Pro API key
WalletConnect project ID
Pyth Entropy contract address on Base mainnet

Install
bashgit clone https://github.com/yummyulack/sleeve.git
cd sleeve
npm install --legacy-peer-deps
Configure
Copy .env.local.example to .env.local and fill in your values:
bashcp .env.local.example .env.local
Required variables:
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID   — RainbowKit / WalletConnect project ID
NEXT_PUBLIC_ENTROPY_CONTRACT_ADDRESS   — Pyth Entropy contract on Base mainnet
NEXT_PUBLIC_CHAIN_ID                   — 8453
NEXT_PUBLIC_SUPABASE_URL               — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY          — Supabase anon key (RLS protected)
PYTH_API_KEY                           — Pyth Lazer Pro key (server-side only)
PYTH_PRO_BASE_URL                      — https://pyth-lazer.dourolabs.app
Database Schema (Supabase)
sqlusers        — wallet_address (PK), pearls int default 0, level int default 1, created_at
quests       — id (PK), name, base_reward int, cooldown_hours int
user_quests  — wallet_address (FK), quest_id (FK), completed_at
rewards_log  — id (PK), wallet_address (FK), base_reward, bonus_tier, bonus_amount, entropy_tx_hash, created_at
Run
bashnpm run dev
App is available at http://localhost:3000.
Build
bashnpm run build
npm run start

API Routes
MethodPathDescriptionGET/api/pricesFetch live price map from Pyth Lazer ProPOST/api/questValidate cooldown, award base Pearls to SupabasePOST/api/entropyResolve Entropy result, calculate and return bonus tierGET/api/leaderboardTop 10 wallets by Pearl count

Deployment
Sleeve is deployed on Vercel. Every push to main triggers an automatic redeploy.
bashgit push origin main
Ensure all environment variables are set in your Vercel project settings before deploying. The PYTH_API_KEY must never be prefixed with NEXT_PUBLIC_ — it is server-side only.

License

Apache 2.0