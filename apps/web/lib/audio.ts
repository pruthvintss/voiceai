'use client'

// ============================================================
// Web Audio API integration for voice calls
// ============================================================

export interface AudioCaptureOptions {
  sampleRate?: number
  channelCount?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

export interface AudioChunkCallback {
  (data: string, sequence: number): void
}

export interface VolumeCallback {
  (volume: number): void
}

export class AudioCapture {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private analyserNode: AnalyserNode | null = null
  private sequence = 0
  private isCapturing = false
  private onChunk: AudioChunkCallback | null = null
  private onVolume: VolumeCallback | null = null
  private volumeAnimFrame: number | null = null

  async start(options: AudioCaptureOptions = {}): Promise<void> {
    const {
      sampleRate = 16000,
      channelCount = 1,
      echoCancellation = true,
      noiseSuppression = true,
      autoGainControl = true,
    } = options

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate,
        channelCount,
        echoCancellation,
        noiseSuppression,
        autoGainControl,
      },
    })

    this.audioContext = new AudioContext({ sampleRate })
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

    // Analyser for volume visualization
    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.8
    this.sourceNode.connect(this.analyserNode)

    // ScriptProcessor for PCM capture (256 samples at 16kHz = 16ms latency)
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1)
    this.sourceNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)

    this.processorNode.onaudioprocess = (event) => {
      if (!this.isCapturing || !this.onChunk) return
      const inputBuffer = event.inputBuffer.getChannelData(0)
      const pcm16 = float32ToPcm16(inputBuffer)
      const base64 = arrayBufferToBase64(pcm16.buffer)
      this.onChunk(base64, this.sequence++)
    }

    this.isCapturing = true
    this.startVolumeMonitoring()
  }

  stop(): void {
    this.isCapturing = false

    if (this.volumeAnimFrame !== null) {
      cancelAnimationFrame(this.volumeAnimFrame)
      this.volumeAnimFrame = null
    }

    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.sequence = 0
    this.onChunk = null
    this.onVolume = null
  }

  mute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
    }
  }

  unmute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = true
      })
    }
  }

  setOnChunk(callback: AudioChunkCallback): void {
    this.onChunk = callback
  }

  setOnVolume(callback: VolumeCallback): void {
    this.onVolume = callback
  }

  private startVolumeMonitoring(): void {
    const tick = () => {
      if (!this.analyserNode || !this.onVolume) {
        this.volumeAnimFrame = requestAnimationFrame(tick)
        return
      }

      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
      this.analyserNode.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const volume = average / 255

      this.onVolume(volume)
      this.volumeAnimFrame = requestAnimationFrame(tick)
    }

    this.volumeAnimFrame = requestAnimationFrame(tick)
  }

  getVolume(): number {
    if (!this.analyserNode) return 0
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return sum / dataArray.length / 255
  }
}

// ============================================================
// Audio playback for incoming agent audio
// ============================================================

export class AudioPlayback {
  private audioContext: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private scheduledTime = 0
  private isPlaying = false
  private onVolume: VolumeCallback | null = null
  private volumeAnimFrame: number | null = null

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: 24000 })
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 1.0

    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.8

    this.gainNode.connect(this.analyserNode)
    this.analyserNode.connect(this.audioContext.destination)

    this.scheduledTime = this.audioContext.currentTime
    this.startVolumeMonitoring()
  }

  playChunk(base64Data: string, format: 'pcm16' | 'mp3' | 'opus' = 'pcm16'): void {
    if (!this.audioContext || !this.gainNode) return

    try {
      if (format === 'pcm16') {
        const buffer = base64ToArrayBuffer(base64Data)
        const int16 = new Int16Array(buffer)
        const float32 = pcm16ToFloat32(int16)

        const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000)
        audioBuffer.getChannelData(0).set(float32)

        const source = this.audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(this.gainNode)

        const startTime = Math.max(this.audioContext.currentTime, this.scheduledTime)
        source.start(startTime)
        this.scheduledTime = startTime + audioBuffer.duration

        this.isPlaying = true
        source.onended = () => {
          if (this.scheduledTime <= (this.audioContext?.currentTime || 0)) {
            this.isPlaying = false
          }
        }
      } else {
        // For compressed formats, decode async
        const buffer = base64ToArrayBuffer(base64Data)
        this.audioContext.decodeAudioData(buffer).then((audioBuffer) => {
          if (!this.audioContext || !this.gainNode) return
          const source = this.audioContext.createBufferSource()
          source.buffer = audioBuffer
          source.connect(this.gainNode)
          const startTime = Math.max(this.audioContext.currentTime, this.scheduledTime)
          source.start(startTime)
          this.scheduledTime = startTime + audioBuffer.duration
          this.isPlaying = true
        })
      }
    } catch (error) {
      console.error('Error playing audio chunk:', error)
    }
  }

  stop(): void {
    this.isPlaying = false
    if (this.volumeAnimFrame !== null) {
      cancelAnimationFrame(this.volumeAnimFrame)
      this.volumeAnimFrame = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.gainNode = null
    this.analyserNode = null
  }

  interrupt(): void {
    if (this.gainNode && this.audioContext) {
      // Quickly ramp down volume to avoid popping
      this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01)
      setTimeout(() => {
        if (this.gainNode && this.audioContext) {
          this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.01)
        }
        this.scheduledTime = this.audioContext?.currentTime || 0
        this.isPlaying = false
      }, 100)
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    }
  }

  setOnVolume(callback: VolumeCallback): void {
    this.onVolume = callback
  }

  get playing(): boolean {
    return this.isPlaying
  }

  private startVolumeMonitoring(): void {
    const tick = () => {
      if (!this.analyserNode || !this.onVolume) {
        this.volumeAnimFrame = requestAnimationFrame(tick)
        return
      }

      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
      this.analyserNode.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const volume = average / 255

      this.onVolume(volume)
      this.volumeAnimFrame = requestAnimationFrame(tick)
    }

    this.volumeAnimFrame = requestAnimationFrame(tick)
  }

  getVolume(): number {
    if (!this.analyserNode) return 0
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return sum / dataArray.length / 255
  }
}

// ============================================================
// Helper functions
// ============================================================

export function float32ToPcm16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = clamped < 0 ? clamped * 32768 : clamped * 32767
  }
  return int16Array
}

export function pcm16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length)
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 32768 : 32767)
  }
  return float32Array
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}

export async function getOutputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audiooutput')
}
