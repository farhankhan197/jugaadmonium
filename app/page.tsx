"use client";

import { useState, useEffect, useRef } from "react";

export default function HarmoniumApp() {
  const [isActive, setIsActive] = useState(false);
  const [data, setData] = useState({ pitch: 0, volume: 0 });
  
  // Audio Refs to persist across renders
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const filter = useRef<BiquadFilterNode | null>(null);

  const startAudio = async () => {
    // 1. iOS/Safari Permission Handshake
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission !== "granted") return;
    }

    // 2. Initialize Web Audio
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create Nodes
    oscillator.current = audioCtx.current.createOscillator();
    gainNode.current = audioCtx.current.createGain();
    filter.current = audioCtx.current.createBiquadFilter();

    // Harmonium Settings
    oscillator.current.type = "sawtooth"; // Rich in harmonics like a reed
    filter.current.type = "lowpass";
    filter.current.frequency.value = 800; // Mellows out the sharp sawtooth
    gainNode.current.gain.value = 0;

    // Connect: Osc -> Filter -> Gain -> Output
    oscillator.current.connect(filter.current);
    filter.current.connect(gainNode.current);
    gainNode.current.connect(audioCtx.current.destination);

    oscillator.current.start();
    window.addEventListener("deviceorientation", handleMotion);
    setIsActive(true);
  };

  const handleMotion = (event: DeviceOrientationEvent) => {
    if (!oscillator.current || !gainNode.current) return;

    // Map Beta (-90 to 90) to Frequency (110Hz to 880Hz - approx 3 octaves)
    const beta = event.beta || 0;
    const freq = Math.max(110, Math.min(880, 440 + (beta * 4)));
    oscillator.current.frequency.setTargetAtTime(freq, audioCtx.current!.currentTime, 0.05);

    // Map Gamma (-90 to 90) to Volume (0 to 1)
    const gamma = Math.abs(event.gamma || 0);
    const vol = Math.min(1, gamma / 60); // Full volume at 60 degree tilt
    gainNode.current.gain.setTargetAtTime(vol, audioCtx.current!.currentTime, 0.05);

    setData({ pitch: Math.round(freq), volume: Math.round(vol * 100) });
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", handleMotion);
      audioCtx.current?.close();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-amber-50 text-amber-900 p-6">
      <div className="w-full max-w-sm bg-white border-2 border-amber-200 rounded-xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-serif font-bold mb-2">Tilt Harmonium</h1>
        <p className="text-sm text-amber-700 mb-8 italic">Tilt for Pitch • Roll for Volume</p>

        {!isActive ? (
          <button
            onClick={startAudio}
            className="w-full py-4 bg-amber-800 text-white rounded-lg font-bold shadow-lg active:translate-y-1 transition-all"
          >
            Start Playing
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-100 rounded-lg">
              <span className="block text-xs uppercase font-bold text-amber-600">Frequency</span>
              <span className="text-3xl font-mono">{data.pitch} Hz</span>
            </div>
            <div className="p-4 bg-amber-100 rounded-lg">
              <span className="block text-xs uppercase font-bold text-amber-600">Volume</span>
              <span className="text-3xl font-mono">{data.volume}%</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs text-amber-500 underline mt-4"
            >
              Stop Audio
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
