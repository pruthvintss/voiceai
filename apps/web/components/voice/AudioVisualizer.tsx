'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface AudioVisualizerProps {
  isUserSpeaking: boolean
  isAgentSpeaking: boolean
  userVolume?: number
  agentVolume?: number
  status: 'idle' | 'connecting' | 'ready' | 'active' | 'ended' | 'error'
  className?: string
}

export function AudioVisualizer({
  isUserSpeaking,
  isAgentSpeaking,
  userVolume = 0,
  agentVolume = 0,
  status,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const volumeRef = useRef(0)
  const targetVolumeRef = useRef(0)

  const getColor = useCallback(() => {
    if (status === 'connecting') return { r: 113, g: 113, b: 122 } // zinc
    if (status === 'error') return { r: 239, g: 68, b: 68 } // red
    if (isAgentSpeaking) return { r: 59, g: 130, b: 246 } // blue
    if (isUserSpeaking) return { r: 34, g: 197, b: 94 } // green
    if (status === 'active') return { r: 59, g: 130, b: 246 } // blue idle
    return { r: 63, g: 63, b: 70 } // zinc-700
  }, [isAgentSpeaking, isUserSpeaking, status])

  useEffect(() => {
    if (isAgentSpeaking) {
      targetVolumeRef.current = agentVolume
    } else if (isUserSpeaking) {
      targetVolumeRef.current = userVolume
    } else {
      targetVolumeRef.current = 0
    }
  }, [isAgentSpeaking, isUserSpeaking, agentVolume, userVolume])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = canvas.offsetWidth
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const baseRadius = size * 0.28

    const draw = (timestamp: number) => {
      timeRef.current = timestamp

      // Smooth volume interpolation
      volumeRef.current += (targetVolumeRef.current - volumeRef.current) * 0.15

      ctx.clearRect(0, 0, size, size)

      const color = getColor()
      const vol = volumeRef.current
      const t = timestamp / 1000

      // Outer ripple rings (when speaking)
      if (vol > 0.05 || status === 'connecting') {
        const numRings = 3
        for (let i = 0; i < numRings; i++) {
          const ringPhase = (t * 1.5 + i * 0.5) % 1
          const ringRadius = baseRadius + ringPhase * baseRadius * 1.2
          const ringAlpha = (1 - ringPhase) * 0.3 * Math.min(vol * 4, 1)
          ctx.beginPath()
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Connecting animation
      if (status === 'connecting') {
        const pulsePhase = (Math.sin(t * 3) + 1) / 2
        const pulseRadius = baseRadius * (0.95 + pulsePhase * 0.1)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius)
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`)
        gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, 0.08)`)
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
        ctx.beginPath()
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // Animated waveform circle
        const numPoints = 120
        const waveAmplitude = vol > 0.01 ? baseRadius * 0.18 * Math.min(vol * 3, 1) : baseRadius * 0.02
        const waveFrequency = isAgentSpeaking ? 5 : 7
        const waveSpeed = isAgentSpeaking ? 2 : 2.5

        ctx.beginPath()
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2
          const wave1 = Math.sin(angle * waveFrequency + t * waveSpeed) * waveAmplitude
          const wave2 = Math.sin(angle * (waveFrequency + 2) - t * (waveSpeed * 0.7)) * waveAmplitude * 0.5
          const wave3 = Math.sin(angle * 3 + t * 1.2) * waveAmplitude * 0.3
          const r = baseRadius + wave1 + wave2 + wave3

          const x = cx + r * Math.cos(angle)
          const y = cy + r * Math.sin(angle)

          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()

        // Glow fill
        const fillAlpha = status === 'active' ? 0.08 + vol * 0.12 : 0.04
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${fillAlpha})`
        ctx.fill()

        // Stroke
        const strokeAlpha = status === 'active' ? 0.6 + vol * 0.4 : 0.3
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${strokeAlpha})`
        ctx.lineWidth = 2
        ctx.stroke()

        // Inner glow
        const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.8)
        innerGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.06 + vol * 0.08})`)
        innerGlow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
        ctx.beginPath()
        ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = innerGlow
        ctx.fill()
      }

      // Center dot
      const dotRadius = status === 'connecting' ? 6 + Math.sin(t * 4) * 2 : 6 + vol * 6
      ctx.beginPath()
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`
      ctx.fill()

      // Center dot glow
      const dotGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotRadius * 3)
      dotGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`)
      dotGlow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
      ctx.beginPath()
      ctx.arc(cx, cy, dotRadius * 3, 0, Math.PI * 2)
      ctx.fillStyle = dotGlow
      ctx.fill()

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [getColor, isAgentSpeaking, isUserSpeaking, status])

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full', className)}
      style={{ width: '100%', height: '100%' }}
      aria-label={
        isAgentSpeaking
          ? 'AI is speaking'
          : isUserSpeaking
          ? 'You are speaking'
          : 'Audio visualizer'
      }
    />
  )
}
