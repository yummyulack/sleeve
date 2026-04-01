'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a14 100%)',
          color: 'rgba(255,248,240,0.5)',
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌊</div>
          <div style={{ fontSize: 14, letterSpacing: '2px', marginBottom: 8 }}>AQUARIUM UNAVAILABLE</div>
          <div style={{ fontSize: 11, color: 'rgba(255,248,240,0.25)' }}>{this.state.message}</div>
        </div>
      )
    }
    return this.props.children
  }
}
