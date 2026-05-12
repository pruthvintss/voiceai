from __future__ import annotations

import base64
import struct
from typing import Iterator


def decode_base64_audio(b64_data: str) -> bytes:
    """Decode base64-encoded audio data to raw bytes."""
    try:
        return base64.b64decode(b64_data)
    except Exception as exc:
        raise ValueError(f"Invalid base64 audio data: {exc}") from exc


def encode_audio_base64(audio_bytes: bytes) -> str:
    """Encode raw audio bytes to base64 string."""
    return base64.b64encode(audio_bytes).decode()


def chunk_audio(audio_bytes: bytes, chunk_size: int = 4096) -> Iterator[bytes]:
    """Split raw audio bytes into fixed-size chunks."""
    for i in range(0, len(audio_bytes), chunk_size):
        yield audio_bytes[i : i + chunk_size]


def convert_pcm16_to_float32(pcm16_data: bytes) -> list[float]:
    """Convert 16-bit PCM samples to float32 in [-1.0, 1.0]."""
    num_samples = len(pcm16_data) // 2
    samples = struct.unpack(f"<{num_samples}h", pcm16_data)
    return [s / 32768.0 for s in samples]


def convert_float32_to_pcm16(float_samples: list[float]) -> bytes:
    """Convert float32 samples in [-1.0, 1.0] to 16-bit PCM."""
    clamped = [max(-1.0, min(1.0, s)) for s in float_samples]
    ints = [int(s * 32767) for s in clamped]
    return struct.pack(f"<{len(ints)}h", *ints)


def resample_pcm16(
    audio_bytes: bytes,
    source_rate: int,
    target_rate: int,
) -> bytes:
    """
    Simple linear resampling of PCM16 audio.
    For production, use a proper DSP library (e.g., scipy, resampy).
    """
    if source_rate == target_rate:
        return audio_bytes

    samples = convert_pcm16_to_float32(audio_bytes)
    ratio = target_rate / source_rate
    new_length = int(len(samples) * ratio)

    if new_length == 0:
        return b""

    resampled = []
    for i in range(new_length):
        src_idx = i / ratio
        lo = int(src_idx)
        hi = min(lo + 1, len(samples) - 1)
        frac = src_idx - lo
        sample = samples[lo] * (1 - frac) + samples[hi] * frac
        resampled.append(sample)

    return convert_float32_to_pcm16(resampled)


class SimpleVAD:
    """
    Simple energy-based Voice Activity Detection.
    For production, use WebRTC VAD or silero-vad.
    """

    def __init__(self, threshold: float = 0.01, min_silence_ms: int = 500, sample_rate: int = 24000):
        self.threshold = threshold
        self.min_silence_samples = int(min_silence_ms * sample_rate / 1000)
        self._silence_count: int = 0
        self._speaking: bool = False

    def process(self, audio_bytes: bytes) -> dict:
        """Process a chunk and return VAD state."""
        samples = convert_pcm16_to_float32(audio_bytes)
        if not samples:
            return {"speech": False, "end_of_speech": False}

        energy = sum(s * s for s in samples) / len(samples)
        is_speech = energy > self.threshold

        was_speaking = self._speaking

        if is_speech:
            self._speaking = True
            self._silence_count = 0
        else:
            self._silence_count += len(samples)
            if self._silence_count >= self.min_silence_samples:
                self._speaking = False

        end_of_speech = was_speaking and not self._speaking

        return {
            "speech": is_speech,
            "end_of_speech": end_of_speech,
            "energy": energy,
        }

    def reset(self) -> None:
        self._silence_count = 0
        self._speaking = False
