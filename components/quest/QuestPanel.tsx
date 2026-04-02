'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useDailyClaim, useBonusQuest, type QuestPhase } from '@/hooks/useQuest'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import type { QuestResult, BonusTier } from '@/types'

// ─────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────
const T = {
  bg: 'rgba(5, 20, 30, 0.72)',
  bgCard: 'rgba(8, 28, 40, 0.45)',
  bgCardHover: 'rgba(12, 35, 50, 0.55)',
  border: 'rgba(100, 200, 180, 0.15)',
  borderActive: 'rgba(29, 158, 117, 0.5)',
  text: 'rgba(255, 248, 240, 0.92)',
  textMuted: 'rgba(255, 248, 240, 0.45)',
  textDim: 'rgba(255, 248, 240, 0.28)',
  accent: '#1d9e75',
  accentGlow: 'rgba(29, 158, 117, 0.35)',
  accentSoft: 'rgba(29, 158, 117, 0.12)',
  purple: '#a855f7',
  purpleSoft: 'rgba(168, 85, 247, 0.12)',
  purpleGlow: 'rgba(168, 85, 247, 0.35)',
  gold: '#facc15',
  mono: 'var(--font-mono-alt), "Share Tech Mono", monospace',
  sans: 'var(--font-sans-alt), "IBM Plex Sans", sans-serif',
  blur: 'blur(14px)',
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

// ─────────────────────────────────────────────
//  WEB AUDIO — SOUND EFFECTS
// ─────────────────────────────────────────────
let audioCtx: AudioContext | null = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return audioCtx
}

function playChime() {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1)
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  osc.connect(gain).connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + 0.4)
}

function playThud() {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(120, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  osc.connect(gain).connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + 0.2)
}

function playMelody(notes: number[], duration = 0.15, vol = 0.25) {
  const ctx = getAudioCtx()
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, ctx.currentTime + i * duration)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * duration + duration * 2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + i * duration)
    osc.stop(ctx.currentTime + i * duration + duration * 2.5)
  })
}

function playJackpotFanfare() {
  const ctx = getAudioCtx();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.3)
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.5)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + i * 0.12)
    osc.stop(ctx.currentTime + 2.5)
  });
  [0.3, 0.8].forEach(delay => {
    const bufferSize = ctx.sampleRate * 0.6
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.5
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.7)
    src.connect(bp).connect(gain).connect(ctx.destination)
    src.start(ctx.currentTime + delay)
    src.stop(ctx.currentTime + delay + 0.8)
  })
}

// ─────────────────────────────────────────────
//  TIER DISPLAY MAP
// ─────────────────────────────────────────────
const TIER_MAP: Record<BonusTier, { name: string; color: string; label: string; sound: () => void }> = {
  none:    { name: 'No Bonus',      color: T.textMuted, label: 'Better luck next time', sound: playChime },
  small:   { name: 'Small Bonus',   color: T.accent,    label: '+5 Pearls bonus',       sound: () => playMelody([523, 659, 784]) },
  rare:    { name: 'Rare Drop!',    color: T.purple,    label: '+20 Pearls bonus',      sound: () => playMelody([523, 659, 784, 1047], 0.18, 0.3) },
  jackpot: { name: 'JACKPOT!',      color: T.gold,      label: '+50 Pearls bonus',      sound: playJackpotFanfare },
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function useLiveCountdown(remainingMs: number | null) {
  const [remaining, setRemaining] = useState(remainingMs ?? 0)
  useEffect(() => {
    if (!remainingMs) { setRemaining(0); return }
    setRemaining(remainingMs)
    const start = Date.now()
    const id = setInterval(() => {
      setRemaining(Math.max(0, remainingMs - (Date.now() - start)))
    }, 1000)
    return () => clearInterval(id)
  }, [remainingMs])
  return remaining
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// ─────────────────────────────────────────────
//  ACHIEVEMENT QUESTS (static for MVP)
// ─────────────────────────────────────────────
const ACHIEVEMENT_QUESTS = [
  { id: 'a1', title: 'First Dive',        desc: 'Visit the aquarium for the first time',  xp: 10, done: true,  progress: 1, total: 1 },
  { id: 'a2', title: 'Tap the Depths',    desc: 'Spawn 5 light halos',                    xp: 15, done: false, progress: 3, total: 5 },
  { id: 'a3', title: 'Whale Watcher',     desc: 'Click on every fish species',            xp: 25, done: false, progress: 1, total: 3 },
  { id: 'a4', title: 'Diamond Hands',     desc: 'Keep the tab open for 10 minutes',       xp: 20, done: false, progress: 0, total: 1 },
  { id: 'a5', title: 'Deep Sea Explorer', desc: 'Attract all fish to a single halo',      xp: 50, done: false, progress: 0, total: 1 },
]

// ─────────────────────────────────────────────
//  ANIMATED PEARL COUNTER
// ─────────────────────────────────────────────
function AnimatedPearlCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const animRef = useRef<number | null>(null)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    const dur = 600
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    prevRef.current = to
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [value])

  return <span>{display.toLocaleString()}</span>
}

// ─────────────────────────────────────────────
//  SLOT REEL
// ─────────────────────────────────────────────
const SYMBOLS = ['🐟', '🦈', '🐠', '🐙', '🦑', '🐡', '🎱', '⭐']

function SlotReel({ spinning, result, locked, delay = 0 }: {
  spinning: boolean; result: number; locked: boolean; delay?: number
}) {
  const [current, setCurrent] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (spinning && !locked) {
      let speed = 60
      function spin() {
        setCurrent(c => (c + 1) % SYMBOLS.length)
        speed = 60 + Math.sin(Date.now() * 0.003) * 40
        intervalRef.current = setTimeout(spin, speed)
      }
      const t = setTimeout(() => { spin() }, delay)
      return () => {
        clearTimeout(t)
        if (intervalRef.current) clearTimeout(intervalRef.current)
      }
    }
    if (locked) {
      setCurrent(result)
      playThud()
    }
  }, [spinning, locked, result, delay])

  return (
    <div style={{
      width: 64, height: 72,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 20, 30, 0.6)',
      border: `1px solid ${locked ? T.accent : T.border}`,
      borderRadius: 10, fontSize: 32,
      boxShadow: locked ? `0 0 12px ${T.accentGlow}` : 'none',
      transition: 'all 0.3s ease',
    }}>
      {SYMBOLS[current]}
    </div>
  )
}

// ─────────────────────────────────────────────
//  STATUS MESSAGES
// ─────────────────────────────────────────────
const PHASE_STATUS: Record<string, { line1: string; line2: string }> = {
  signing:   { line1: 'Waiting for wallet signature…', line2: 'Sign to commit randomness' },
  resolving: { line1: 'Submitted to Base mainnet…',    line2: 'Pyth Entropy resolving…' },
}

// ─────────────────────────────────────────────
//  ENTROPY ROLL
// ─────────────────────────────────────────────
function EntropyRoll({ questPhase, questResult, onDone }: {
  questPhase: QuestPhase
  questResult: QuestResult | null
  onDone: () => void
}) {
  const [reelsLocked, setReelsLocked] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [reelResults] = useState<[number, number, number]>([
    Math.floor(Math.random() * SYMBOLS.length),
    Math.floor(Math.random() * SYMBOLS.length),
    Math.floor(Math.random() * SYMBOLS.length),
  ])
  const [localDone, setLocalDone] = useState(false)
  const soundFiredRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 300)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (questPhase === 'done' && questResult && !localDone) {
      setTimeout(() => setReelsLocked([true, false, false]), 200)
      setTimeout(() => setReelsLocked([true, true, false]), 700)
      setTimeout(() => {
        setReelsLocked([true, true, true])
        if (!soundFiredRef.current) {
          TIER_MAP[questResult.bonusTier].sound()
          soundFiredRef.current = true
        }
        setTimeout(() => setLocalDone(true), 400)
      }, 1200)
    }
  }, [questPhase, questResult, localDone])

  const spinning = !localDone
  const status = PHASE_STATUS[questPhase] ?? PHASE_STATUS.resolving
  const progress = questPhase === 'done' ? 1 : Math.min(elapsed / 40, 0.85)
  const tier = questResult ? TIER_MAP[questResult.bonusTier] : null
  const earned = questResult ? questResult.bonusAmount : 0

  return (
    <div style={{ padding: '16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
        <SlotReel spinning={spinning} locked={reelsLocked[0]} result={reelResults[0]} delay={0} />
        <SlotReel spinning={spinning} locked={reelsLocked[1]} result={reelResults[1]} delay={80} />
        <SlotReel spinning={spinning} locked={reelsLocked[2]} result={reelResults[2]} delay={160} />
      </div>

      {!localDone && (
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2,
          marginBottom: 12, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg, ${T.purple}, #c084fc)`,
            transition: 'width 0.3s linear',
          }} />
        </div>
      )}

      {!localDone && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.text, marginBottom: 4 }}>
            {status.line1}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: T.purple,
              animation: 'cq-pulse 1.5s ease infinite',
            }} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted }}>
              {status.line2}
            </span>
          </div>
        </div>
      )}

      {localDone && tier && questResult && (
        <div style={{
          textAlign: 'center', padding: 14,
          background: 'rgba(5, 20, 30, 0.5)', borderRadius: 10,
          border: `1px solid ${tier.color}40`,
        }}>
          <div style={{
            fontFamily: T.mono, fontSize: 11, color: tier.color,
            letterSpacing: '2px', marginBottom: 6,
          }}>
            {tier.name.toUpperCase()}
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 700, color: tier.color, marginBottom: 2 }}>
            +{earned}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted }}>
            Pearls earned
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: tier.color, marginTop: 4, opacity: 0.8 }}>
            {tier.label}
          </div>
          <button
            onClick={onDone}
            style={{
              marginTop: 14, padding: '8px 28px',
              background: T.purpleSoft, border: `1px solid ${T.purple}50`,
              borderRadius: 8, color: T.purple, fontFamily: T.mono,
              fontSize: 11, letterSpacing: '1px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.purpleGlow }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.purpleSoft }}
          >
            DONE
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  QUEST CARD
// ─────────────────────────────────────────────
function QuestCard({ title, desc, reward, claimable, countdown, onClaim, buttonLabel, accentColor, busy }: {
  title: string; desc: string; reward: string | number
  claimable: boolean; countdown: number; onClaim: () => void
  buttonLabel?: string; accentColor?: string; busy?: boolean
}) {
  const color = accentColor ?? T.accent
  return (
    <div style={{
      background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, padding: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text }}>{title}</div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color, whiteSpace: 'nowrap' }}>+{reward} 🪙</div>
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted, lineHeight: '1.4', marginBottom: 12 }}>
        {desc}
      </div>
      {claimable ? (
        <button
          onClick={onClaim}
          disabled={busy}
          style={{
            width: '100%', padding: '9px 0',
            background: busy ? 'rgba(255,255,255,0.04)' : `${color}18`,
            border: `1px solid ${busy ? T.border : `${color}50`}`,
            borderRadius: 8, color: busy ? T.textDim : color, fontFamily: T.mono,
            fontSize: 11, letterSpacing: '1px',
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : `0 0 16px ${color}20`, transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (busy) return
            const t = e.currentTarget as HTMLButtonElement
            t.style.background = `${color}30`
            t.style.boxShadow = `0 0 24px ${color}35`
          }}
          onMouseLeave={e => {
            if (busy) return
            const t = e.currentTarget as HTMLButtonElement
            t.style.background = `${color}18`
            t.style.boxShadow = `0 0 16px ${color}20`
          }}
        >
          {busy ? 'IN PROGRESS…' : (buttonLabel ?? 'CLAIM PEARLS')}
        </button>
      ) : (
        <div style={{
          textAlign: 'center', padding: '9px 0',
          fontFamily: T.mono, fontSize: 13, color: T.textDim, letterSpacing: '2px',
        }}>
          {formatCountdown(countdown)}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  ACHIEVEMENT ROW
// ─────────────────────────────────────────────
function AchievementRow({ quest }: { quest: typeof ACHIEVEMENT_QUESTS[number] }) {
  const pct = quest.total ? Math.round((quest.progress / quest.total) * 100) : 0
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}`, opacity: quest.done ? 0.45 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{
          fontFamily: T.mono, fontSize: 11, color: quest.done ? T.textDim : T.text,
          textDecoration: quest.done ? 'line-through' : 'none', letterSpacing: '0.5px',
        }}>{quest.title}</span>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.accent }}>+{quest.xp} XP</span>
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 10, color: T.textMuted, marginBottom: 5, lineHeight: '1.3' }}>
        {quest.desc}
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: quest.done ? `${T.accent}40` : `linear-gradient(90deg, ${T.accent}, #2dd4a0)`,
          transition: 'width 0.4s ease',
        }} />
      </div>
      {quest.total > 1 && !quest.done && (
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textDim, textAlign: 'right', marginTop: 2 }}>
          {quest.progress}/{quest.total}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  LEADERBOARD TAB
// ─────────────────────────────────────────────
function LeaderboardTab({ currentAddress }: { currentAddress?: string }) {
  const { entries, loading } = useLeaderboard()
  const medals = ['🥇', '🥈', '🥉']

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: T.mono, fontSize: 11, color: T.textDim }}>
        Loading…
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: T.mono, fontSize: 11, color: T.textDim }}>
        No entries yet. Complete a quest to appear here!
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map((entry, i) => {
        const isMe = currentAddress?.toLowerCase() === entry.wallet_address.toLowerCase()
        return (
          <div
            key={entry.wallet_address}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              background: isMe ? `${T.accent}12` : T.bgCard,
              border: `1px solid ${isMe ? T.borderActive : T.border}`,
            }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>
              {i < 3 ? medals[i] : <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim }}>{i + 1}</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.mono, fontSize: 11,
                color: isMe ? T.accent : T.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {isMe ? 'You' : shortenAddress(entry.wallet_address)}
              </div>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 13, color: T.accent, fontWeight: 700 }}>
              {entry.pearls.toLocaleString()}
              <span style={{ fontSize: 9, color: T.textDim, marginLeft: 3 }}>🪙</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
//  TANK TAB (placeholder)
// ─────────────────────────────────────────────
function TankTab() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🐠</div>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, letterSpacing: '1px' }}>
        COMING SOON
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted, marginTop: 6 }}>
        Customise your tank with rare drops
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  MAIN QUEST PANEL
// ─────────────────────────────────────────────
type Tab = 'quests' | 'tank' | 'leaderboard'

interface Props {
  pearls: number
  isConnected: boolean
  onPearlsUpdate: (total: number) => void
}

export function QuestPanel({ pearls, isConnected, onPearlsUpdate }: Props) {
  const { address } = useAccount()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('quests')

  // ── Daily Claim ──
  const dailyClaim = useDailyClaim((baseReward, totalPearls) => {
    onPearlsUpdate(totalPearls)
    playChime()
  })
  const claimCountdown = useLiveCountdown(dailyClaim.cooldownMs)
  const claimOnCooldown = claimCountdown > 0
  const claimAvailable = !claimOnCooldown && (dailyClaim.phase === 'idle' || dailyClaim.phase === 'error')
  const claimBusy = dailyClaim.phase === 'claiming'

  // ── Bonus Quest ──
  const bonusQuest = useBonusQuest((result) => {
    onPearlsUpdate(result.totalPearls)
  })
  const bonusCountdown = useLiveCountdown(bonusQuest.cooldownMs)
  const bonusOnCooldown = bonusCountdown > 0
  const bonusAvailable = !bonusOnCooldown && (bonusQuest.phase === 'idle' || bonusQuest.phase === 'error')
  const bonusActive = bonusQuest.phase !== 'idle' && bonusQuest.phase !== 'error'

  const handleBonus = useCallback(() => {
    if (!isConnected) return
    bonusQuest.roll()
  }, [isConnected, bonusQuest])

  const handleBonusDone = useCallback(() => {
    bonusQuest.reset()
  }, [bonusQuest])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'quests', label: 'QUESTS' },
    { id: 'tank', label: 'TANK' },
    { id: 'leaderboard', label: 'LEADERBOARD' },
  ]

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 2000,
        width: collapsed ? 220 : 340,
        transition: `width 0.35s ${T.ease}`,
        fontFamily: T.sans,
      }}
    >
      <div style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(29,158,117,0.06)`,
        animation: 'cq-glow 4s ease-in-out infinite',
      } as React.CSSProperties}>

        {/* ── Header ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: collapsed ? 'none' : `1px solid ${T.border}`,
            cursor: 'pointer', userSelect: 'none',
          }}
          onClick={() => setCollapsed(c => !c)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '1px', opacity: 0.7 }}>
              &lt;&gt;
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, letterSpacing: '3px', fontWeight: 600 }}>
              SLEEVE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13 }}>🪙</span>
            <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.accent }}>
              <AnimatedPearlCount value={pearls} />
            </span>
            <span style={{
              fontFamily: T.mono, fontSize: 10, color: T.textMuted,
              transition: `transform 0.3s ${T.ease}`,
              display: 'inline-block',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
              ▲
            </span>
          </div>
        </div>

        {/* ── Expandable body ── */}
        <div style={{
          maxHeight: collapsed ? 0 : 460,
          overflow: 'hidden',
          transition: `max-height 0.4s ${T.ease}`,
        }}>
          <div style={{
            height: 380, overflowY: 'auto', padding: '14px 14px 10px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>

            {activeTab === 'quests' && (
              <>
                {!isConnected && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMuted, fontFamily: T.mono, fontSize: 11, letterSpacing: '1px' }}>
                    Connect wallet to play
                  </div>
                )}

                {isConnected && (
                  <>
                    {/* Daily Claim */}
                    {dailyClaim.phase === 'done' ? (
                      <div style={{
                        background: T.bgCard, borderRadius: 10, border: `1px solid ${T.borderActive}`,
                        padding: 14, textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '1px' }}>
                          +10 PEARLS CLAIMED
                        </div>
                        <button
                          onClick={dailyClaim.reset}
                          style={{
                            marginTop: 10, padding: '6px 20px',
                            background: T.accentSoft, border: `1px solid ${T.borderActive}`,
                            borderRadius: 6, color: T.accent, fontFamily: T.mono,
                            fontSize: 10, letterSpacing: '1px', cursor: 'pointer',
                          }}
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <QuestCard
                        title="Daily Claim"
                        desc="Come back every day to collect your Pearls."
                        reward={50}
                        claimable={claimAvailable}
                        countdown={claimCountdown}
                        onClaim={dailyClaim.claim}
                        buttonLabel="CLAIM PEARLS"
                        accentColor={T.accent}
                        busy={claimBusy}
                      />
                    )}

                    {dailyClaim.error && (
                      <div style={{ fontFamily: T.mono, fontSize: 10, color: '#f87171', textAlign: 'center', padding: '4px 0' }}>
                        {dailyClaim.error}
                      </div>
                    )}

                    {/* Bonus Quest */}
                    {bonusActive ? (
                      <EntropyRoll
                        questPhase={bonusQuest.phase}
                        questResult={bonusQuest.result}
                        onDone={handleBonusDone}
                      />
                    ) : (
                      <QuestCard
                        title="Bonus Quest"
                        desc="Roll daily for a chance at a bigger reward. Powered by Pyth Entropy."
                        reward="50–200"
                        claimable={bonusAvailable}
                        countdown={bonusCountdown}
                        onClaim={handleBonus}
                        buttonLabel="ROLL NOW"
                        accentColor={T.purple}
                      />
                    )}

                    {bonusQuest.error && !bonusActive && (
                      <div style={{ fontFamily: T.mono, fontSize: 10, color: '#f87171', textAlign: 'center', padding: '4px 0' }}>
                        {bonusQuest.error}
                      </div>
                    )}

                    <div style={{ height: 1, background: T.border }} />

                    <div>
                      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textDim, letterSpacing: '2px', marginBottom: 8 }}>
                        ACHIEVEMENTS
                      </div>
                      {ACHIEVEMENT_QUESTS.map(q => (
                        <AchievementRow key={q.id} quest={q} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'tank' && <TankTab />}
            {activeTab === 'leaderboard' && <LeaderboardTab currentAddress={address} />}
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: activeTab === tab.id ? `${T.accent}15` : 'transparent',
                  border: 'none',
                  borderTop: activeTab === tab.id ? `2px solid ${T.accent}` : '2px solid transparent',
                  color: activeTab === tab.id ? T.accent : T.textDim,
                  fontFamily: T.mono, fontSize: 9, letterSpacing: '1px',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (activeTab !== tab.id)
                    (e.currentTarget as HTMLButtonElement).style.color = T.textMuted
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab.id)
                    (e.currentTarget as HTMLButtonElement).style.color = T.textDim
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
