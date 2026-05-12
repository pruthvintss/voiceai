'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeLine {
  text: string
  type?: 'comment' | 'keyword' | 'string' | 'type' | 'value' | 'operator' | 'plain' | 'dim'
}

interface CodeBlockProps {
  code: string | CodeLine[]
  language?: string
  filename?: string
  className?: string
  showLineNumbers?: boolean
  copyable?: boolean
}

function tokenize(line: string): React.ReactNode {
  // Simple syntax highlighting
  const tokens: React.ReactNode[] = []

  // Comment
  if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
    return <span className="text-zinc-500">{line}</span>
  }

  // Replace with simple color coding
  let result = line

  // Use a regex-based approach for display
  const parts: { text: string; color: string }[] = []
  let remaining = line
  let idx = 0

  // This is a simplified highlighter — for a real app use prism.js
  const commentMatch = remaining.match(/^(.*?)(\/\/.*)?$/)
  if (commentMatch && commentMatch[2]) {
    parts.push({ text: commentMatch[1], color: 'text-zinc-200' })
    parts.push({ text: commentMatch[2], color: 'text-zinc-500' })
    return (
      <>
        {parts.map((p, i) => (
          <span key={i} className={p.color}>{p.text}</span>
        ))}
      </>
    )
  }

  return <span className="text-zinc-200">{line}</span>
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  className,
  showLineNumbers = false,
  copyable = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const codeString = typeof code === 'string'
    ? code
    : code.map(l => l.text).join('\n')

  const lines = typeof code === 'string'
    ? code.split('\n')
    : code

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderLine = (line: string | CodeLine, idx: number): React.ReactNode => {
    if (typeof line === 'string') {
      const isComment = line.trim().startsWith('//')
      const isDim = line.trim().startsWith('#') || line.trim() === ''

      return (
        <div key={idx} className="flex">
          {showLineNumbers && (
            <span className="w-8 shrink-0 text-zinc-600 select-none text-right pr-4">
              {idx + 1}
            </span>
          )}
          <span className={cn(
            'flex-1',
            isComment ? 'text-zinc-500' : 'text-zinc-200'
          )}>
            {line || '\u00A0'}
          </span>
        </div>
      )
    } else {
      const colorMap: Record<string, string> = {
        comment: 'text-zinc-500 italic',
        keyword: 'text-blue-400',
        string: 'text-emerald-400',
        type: 'text-purple-400',
        value: 'text-orange-400',
        operator: 'text-zinc-400',
        plain: 'text-zinc-200',
        dim: 'text-zinc-600',
      }
      return (
        <div key={idx} className="flex">
          {showLineNumbers && (
            <span className="w-8 shrink-0 text-zinc-600 select-none text-right pr-4">
              {idx + 1}
            </span>
          )}
          <span className={cn('flex-1', colorMap[line.type || 'plain'])}>
            {line.text || '\u00A0'}
          </span>
        </div>
      )
    }
  }

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border border-zinc-800/80',
      'bg-[#0d0d0d]',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          {filename && (
            <span className="text-zinc-500 text-xs ml-2 font-mono">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 text-xs font-mono">{language}</span>
          {copyable && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed min-w-max">
          {lines.map((line, idx) => renderLine(line, idx))}
        </pre>
      </div>
    </div>
  )
}
