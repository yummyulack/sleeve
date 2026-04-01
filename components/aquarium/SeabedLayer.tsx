export function SeabedLayer() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none select-none">
      {/* Sand gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f02] via-[#0d1a1a] to-transparent" />

      {/* Seaweed */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-8">
        {['🌿', '🪸', '🌿', '🌿', '🪸', '🌿', '🪸', '🌿'].map((plant, i) => (
          <span
            key={i}
            className="animate-sway text-2xl opacity-70"
            style={{
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2.5 + (i * 0.3) % 1.5}s`,
              fontSize: `${18 + (i * 5) % 14}px`,
            }}
          >
            {plant}
          </span>
        ))}
      </div>

      {/* Rock/coral accents */}
      <div className="absolute bottom-0 left-8 text-3xl opacity-50 select-none">🪨</div>
      <div className="absolute bottom-0 left-1/4 text-2xl opacity-40 select-none">🪸</div>
      <div className="absolute bottom-0 right-1/4 text-2xl opacity-40 select-none">🪸</div>
      <div className="absolute bottom-0 right-8 text-3xl opacity-50 select-none">🪨</div>
    </div>
  )
}
