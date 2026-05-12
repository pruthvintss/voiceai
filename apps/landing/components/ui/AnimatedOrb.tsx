'use client'

import { cn } from '@/lib/utils'

interface AnimatedOrbProps {
  speaking?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: { outer: 'w-24 h-24', core: 'w-16 h-16', ring1: 'w-24 h-24', ring2: 'w-32 h-32', ring3: 'w-40 h-40' },
  md: { outer: 'w-40 h-40', core: 'w-28 h-28', ring1: 'w-40 h-40', ring2: 'w-52 h-52', ring3: 'w-64 h-64' },
  lg: { outer: 'w-56 h-56', core: 'w-40 h-40', ring1: 'w-56 h-56', ring2: 'w-72 h-72', ring3: 'w-96 h-96' },
  xl: { outer: 'w-72 h-72', core: 'w-52 h-52', ring1: 'w-72 h-72', ring2: 'w-96 h-96', ring3: 'w-[28rem] h-[28rem]' },
}

export function AnimatedOrb({ speaking = false, size = 'xl', className }: AnimatedOrbProps) {
  const s = sizeClasses[size]

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outermost ambient glow */}
      <div
        className={cn(
          'absolute rounded-full',
          s.ring3,
          'opacity-10',
          speaking ? 'bg-blue-500' : 'bg-blue-600'
        )}
        style={{
          filter: 'blur(60px)',
          animation: speaking ? 'pulse-glow-fast 1.4s ease-in-out infinite' : 'pulse-glow 3s ease-in-out infinite',
        }}
      />

      {/* Ripple rings */}
      <div
        className={cn('absolute rounded-full border border-blue-500/30', s.ring1)}
        style={{
          animation: speaking
            ? 'ring-pulse 1.2s ease-out infinite'
            : 'ring-pulse 2.5s ease-out infinite',
        }}
      />
      <div
        className={cn('absolute rounded-full border border-purple-500/20', s.ring1)}
        style={{
          animation: speaking
            ? 'ring-pulse 1.2s ease-out 0.4s infinite'
            : 'ring-pulse 2.5s ease-out 0.8s infinite',
        }}
      />
      <div
        className={cn('absolute rounded-full border border-blue-400/15', s.ring1)}
        style={{
          animation: speaking
            ? 'ring-pulse 1.2s ease-out 0.8s infinite'
            : 'ring-pulse 2.5s ease-out 1.6s infinite',
        }}
      />

      {/* Mid glow layer */}
      <div
        className={cn(
          'absolute rounded-full',
          s.ring2
        )}
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
          animation: speaking ? 'pulse-glow-fast 1.4s ease-in-out infinite' : 'pulse-glow 3s ease-in-out 0.5s infinite',
        }}
      />

      {/* Outer orb shell */}
      <div
        className={cn(
          'relative rounded-full',
          s.outer
        )}
        style={{
          background: 'radial-gradient(circle at 40% 35%, rgba(96, 165, 250, 0.25) 0%, rgba(59, 130, 246, 0.15) 30%, rgba(139, 92, 246, 0.1) 60%, transparent 80%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: speaking
            ? '0 0 60px rgba(59,130,246,0.5), 0 0 120px rgba(139,92,246,0.3), inset 0 0 40px rgba(59,130,246,0.1)'
            : '0 0 40px rgba(59,130,246,0.3), 0 0 80px rgba(139,92,246,0.15), inset 0 0 30px rgba(59,130,246,0.08)',
          animation: speaking ? 'pulse-glow-fast 1.4s ease-in-out infinite' : 'pulse-glow 3s ease-in-out infinite',
        }}
      >
        {/* Inner core */}
        <div
          className={cn(
            'absolute inset-0 m-auto rounded-full',
            s.core
          )}
          style={{
            background: 'radial-gradient(circle at 38% 35%, rgba(147, 197, 253, 0.6) 0%, rgba(96, 165, 250, 0.4) 20%, rgba(59, 130, 246, 0.3) 40%, rgba(139, 92, 246, 0.25) 65%, rgba(88, 28, 235, 0.1) 85%, transparent 100%)',
            boxShadow: 'inset 0 0 20px rgba(59,130,246,0.3)',
          }}
        />

        {/* Bright core center */}
        <div
          className="absolute inset-0 m-auto rounded-full"
          style={{
            width: '30%',
            height: '30%',
            background: 'radial-gradient(circle, rgba(219, 234, 254, 0.9) 0%, rgba(147, 197, 253, 0.6) 40%, transparent 70%)',
            filter: 'blur(4px)',
          }}
        />

        {/* Specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: '18%',
            left: '22%',
            width: '30%',
            height: '20%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, transparent 70%)',
            transform: 'rotate(-20deg)',
            filter: 'blur(3px)',
          }}
        />
      </div>
    </div>
  )
}
