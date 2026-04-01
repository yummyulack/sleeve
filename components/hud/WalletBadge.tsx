'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton as RainbowConnect } from '@rainbow-me/rainbowkit'

export function WalletBadge() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (!isConnected || !address) {
    return <RainbowConnect />
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setMenuOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          border: menuOpen ? '1px solid rgba(29,158,117,0.5)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 9999, padding: '6px 14px',
          cursor: 'pointer', transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => {
          if (!menuOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)'
        }}
        onMouseLeave={e => {
          if (!menuOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#34d399',
          boxShadow: '0 0 6px 2px rgba(52,211,153,0.5)',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(113,113,122,1)' }}>Base</span>
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,0.35)',
          transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▼</span>
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'rgba(5, 20, 30, 0.92)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(100,200,180,0.15)',
          borderRadius: 10, overflow: 'hidden',
          minWidth: 160, zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            padding: '8px 14px 6px',
            fontFamily: 'var(--font-geist-mono), monospace', fontSize: 10,
            color: 'rgba(255,248,240,0.3)', letterSpacing: '1px',
          }}>
            CONNECTED
          </div>
          <div style={{
            padding: '4px 14px 6px',
            fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12,
            color: 'rgba(255,248,240,0.7)',
          }}>
            {address.slice(0, 10)}…{address.slice(-6)}
          </div>
          <div style={{ height: 1, background: 'rgba(100,200,180,0.1)', margin: '4px 0' }} />
          <button
            onClick={() => { disconnect(); setMenuOpen(false) }}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'transparent', border: 'none',
              color: '#f87171', fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 12, letterSpacing: '0.5px', cursor: 'pointer',
              textAlign: 'left', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
