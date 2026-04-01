'use client'

import { WalletBadge } from './WalletBadge'

export function TopBar() {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2500,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 28px', pointerEvents: 'none',
      }}
    >
      {/* Left: logo */}
      <span
        style={{
          fontFamily: "var(--font-mono-alt), 'Share Tech Mono', monospace",
          fontSize: 20, fontWeight: 600, letterSpacing: '4px',
          color: 'rgba(255,248,240,0.7)',
          textShadow: '0 0 20px rgba(29,158,117,0.2)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        SLEEVE
      </span>

      {/* Right: wallet badge */}
      <div style={{ pointerEvents: 'auto' }}>
        <WalletBadge />
      </div>
    </div>
  )
}
