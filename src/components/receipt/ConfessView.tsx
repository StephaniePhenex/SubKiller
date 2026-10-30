"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square } from "lucide-react";
import { CHART, INK, ROUTES, WHITE } from "./palette";
import { Card } from "./ui";

const MIC_STATUS = {
  READY: "ready",
  RECORDING: "recording",
  PROCESSING: "processing",
} as const;

type MicStatus = (typeof MIC_STATUS)[keyof typeof MIC_STATUS];

const RECORDING_MS = 2000;
const PROCESSING_MS = 2000;

const MIC_COPY: Record<MicStatus, { status: string; hint: string; aria: string }> = {
  [MIC_STATUS.READY]: {
    status: "Ready",
    hint: "Tap the mic. Say the name, the price, how often you actually use it, and how you feel about it.",
    aria: "Start voice input",
  },
  [MIC_STATUS.RECORDING]: {
    status: "Recording…",
    hint: "Keep talking. Be honest about the gym.",
    aria: "Recording",
  },
  [MIC_STATUS.PROCESSING]: {
    status: "Processing…",
    hint: "Turning your excuses into numbers.",
    aria: "Processing",
  },
};

export function ConfessView() {
  const router = useRouter();
  const [micStatus, setMicStatus] = useState<MicStatus>(MIC_STATUS.READY);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const startVoiceInput = () => {
    if (micStatus !== MIC_STATUS.READY) return;

    setMicStatus(MIC_STATUS.RECORDING);

    timers.current.push(
      window.setTimeout(() => {
        setMicStatus(MIC_STATUS.PROCESSING);

        timers.current.push(
          window.setTimeout(() => {
            router.push(ROUTES.review);
          }, PROCESSING_MS),
        );
      }, RECORDING_MS),
    );
  };

  const busy = micStatus !== MIC_STATUS.READY;
  const copy = MIC_COPY[micStatus];

  const micFill = {
    [MIC_STATUS.READY]: { background: CHART, color: INK },
    [MIC_STATUS.RECORDING]: { background: INK, color: WHITE },
    [MIC_STATUS.PROCESSING]: { background: WHITE, color: INK },
  }[micStatus];

  return (
    <Card className="flex flex-col items-center text-center py-10">
      <h2 className="text-3xl font-bold leading-tight mb-2">Say what you pay for.</h2>
      <p className="max-w-sm mb-10">{copy.hint}</p>

      <div className="relative pr-2 pb-2">
        {micStatus === MIC_STATUS.RECORDING && <span className="neo-pulse-ring" aria-hidden="true" />}
        <button
          type="button"
          onClick={startVoiceInput}
          disabled={busy}
          aria-label={copy.aria}
          className="neo-btn relative flex items-center justify-center w-48 h-48 border-4 border-black rounded-full"
          style={{ ...micFill, borderWidth: 6 }}
        >
          {micStatus === MIC_STATUS.READY && <Mic size={88} strokeWidth={2.25} />}
          {micStatus === MIC_STATUS.RECORDING && <Square size={64} strokeWidth={0} fill={WHITE} />}
          {micStatus === MIC_STATUS.PROCESSING && <Loader2 size={80} strokeWidth={2.5} className="neo-spin" />}
        </button>
      </div>

      <p
        className="mt-8 border-4 border-black rounded-full px-6 py-2 text-xl font-bold"
        style={{ background: busy ? INK : WHITE, color: busy ? WHITE : INK }}
        role="status"
        aria-live="polite"
      >
        {copy.status}
      </p>

      <button
        type="button"
        onClick={() => router.push(ROUTES.review)}
        disabled={busy}
        className="neo-link mt-8 text-sm"
        style={{ opacity: busy ? 0.4 : 1, cursor: busy ? "default" : "pointer" }}
        aria-label="Skip option to text"
      >
        (skip option to text)
      </button>
    </Card>
  );
}
