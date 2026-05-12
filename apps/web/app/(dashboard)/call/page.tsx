'use client'

import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic2, Brain, Wrench, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { VoiceCallInterface } from '@/components/voice/VoiceCallInterface'
import { ProviderSelector } from '@/components/voice/ProviderSelector'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/useToast'
import type { CallConfig } from '@/types'

export default function CallPage() {
  const { settings } = useSettingsStore()
  const [provider, setProvider] = useState<'openai' | 'gemini'>(settings.preferredProvider)
  const [model, setModel] = useState(settings.preferredModel)
  const [injectMemory, setInjectMemory] = useState(true)
  const [callActive, setCallActive] = useState(false)
  const { toast } = useToast()

  const {
    status,
    transcript,
    isMuted,
    isAgentSpeaking,
    isUserSpeaking,
    latency,
    activeTool,
    toolHistory,
    injectedContext,
    error,
    startCall,
    endCall,
    toggleMute,
    interrupt,
  } = useVoiceSession()

  const handleStartCall = async () => {
    const config: CallConfig = {
      provider,
      model,
      injectMemory,
      tools: [], // Will be loaded from integrations
    }

    try {
      setCallActive(true)
      await startCall(config)
    } catch (err) {
      setCallActive(false)
      toast({
        title: 'Failed to start call',
        description: err instanceof Error ? err.message : 'Please check your API keys and try again',
        variant: 'destructive',
      })
    }
  }

  const handleEndCall = () => {
    endCall()
    setTimeout(() => setCallActive(false), 1500)
  }

  const isConnecting = status === 'connecting'

  return (
    <>
      {/* Call setup UI */}
      <AnimatePresence>
        {!callActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 max-w-2xl mx-auto space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold">Voice Call</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a realtime voice conversation with your AI assistant
              </p>
            </div>

            {/* Provider & Model Selection */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic2 className="h-4 w-4 text-primary" />
                  Provider & Model
                </CardTitle>
                <CardDescription>
                  Choose which AI backend to use for this call
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProviderSelector
                  provider={provider}
                  model={model}
                  onProviderChange={setProvider}
                  onModelChange={setModel}
                />
              </CardContent>
            </Card>

            {/* Call options */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  Context Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Inject Memory Context</Label>
                    <p className="text-xs text-muted-foreground">
                      Relevant memories will be included in the AI's context
                    </p>
                  </div>
                  <Switch
                    checked={injectMemory}
                    onCheckedChange={setInjectMemory}
                    aria-label="Toggle memory injection"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Info banner */}
            <div className="flex items-start gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-300/80 leading-relaxed">
                <strong className="text-blue-300">Microphone access required.</strong> Your browser
                will ask for permission when you start the call. Audio is processed in real-time and
                not stored permanently.
              </div>
            </div>

            {/* Start button */}
            <Button
              size="xl"
              className="w-full gap-3 text-base"
              onClick={handleStartCall}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic2 className="h-5 w-5" />
                  Start Call
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call overlay */}
      <AnimatePresence>
        {callActive && (
          <VoiceCallInterface
            status={status}
            transcript={transcript}
            isMuted={isMuted}
            isAgentSpeaking={isAgentSpeaking}
            isUserSpeaking={isUserSpeaking}
            latency={latency}
            activeTool={activeTool}
            toolHistory={toolHistory}
            injectedContext={injectedContext}
            provider={provider}
            model={model}
            onToggleMute={toggleMute}
            onEndCall={handleEndCall}
            onInterrupt={interrupt}
            onClose={() => setCallActive(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
