"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function ParticleSystem({ pitch, volume, active }: { pitch: number; volume: number; active: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 800;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1 + Math.random() * 0.5;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    
    return [pos, vel];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current || !active) return;
    
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const normalizedPitch = (pitch - 110) / 770;
    const normalizedVolume = volume / 100;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      
      velocities[idx] += (Math.random() - 0.5) * 0.01 * normalizedVolume;
      velocities[idx + 1] += (Math.random() - 0.5) * 0.01 * normalizedVolume;
      velocities[idx + 2] += (Math.random() - 0.5) * 0.01 * normalizedVolume;
      
      const noise = 0.01 + normalizedPitch * 0.02;
      
      velocities[idx] *= 0.98;
      velocities[idx + 1] *= 0.98;
      velocities[idx + 2] *= 0.98;
      
      posArray[idx] += velocities[idx] + Math.sin(state.clock.elapsedTime * (1 + normalizedPitch * 3) + i) * noise;
      posArray[idx + 1] += velocities[idx + 1] + Math.cos(state.clock.elapsedTime * (1 + normalizedPitch * 3) + i) * noise;
      posArray[idx + 2] += velocities[idx + 2] + Math.sin(state.clock.elapsedTime * 0.5 + i) * noise;
      
      const dist = Math.sqrt(
        posArray[idx] ** 2 + 
        posArray[idx + 1] ** 2 + 
        posArray[idx + 2] ** 2
      );
      
      if (dist > 2.5) {
        const scale = 2 / dist;
        posArray[idx] *= scale;
        posArray[idx + 1] *= scale;
        posArray[idx + 2] *= scale;
        velocities[idx] *= -0.5;
        velocities[idx + 1] *= -0.5;
        velocities[idx + 2] *= -0.5;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y += delta * (0.1 + normalizedPitch * 0.5);
    pointsRef.current.rotation.x += delta * 0.1;
  });

  if (!active) return null;

  const color = new THREE.Color().setHSL(0.6 + (pitch - 110) / 770 * 0.2, 0.8, 0.6);

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.08 + (volume / 100) * 0.06}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.6 + (volume / 100) * 0.4}
      />
    </Points>
  );
}

function ParticlesCanvas({ pitch, volume, active }: { pitch: number; volume: number; active: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <color attach="background" args={['#0d0d0d']} />
      <ambientLight intensity={0.5} />
      <ParticleSystem pitch={pitch} volume={volume} active={active} />
    </Canvas>
  );
}

interface HarmoniumVoice {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  fm: OscillatorNode;
  fmGain: GainNode;
  masterGain: GainNode;
}

function createHarmoniumVoice(ctx: AudioContext, baseFreq: number): HarmoniumVoice {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 500;
  filter.Q.value = 1.5;

  const harmonics = [1, 2, 3, 4, 5, 6];
  const harmonicGains = [0.5, 0.15, 0.35, 0.2, 0.25, 0.1];
  
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  
  harmonics.forEach((harmonic, i) => {
    for (let j = 0; j < 3; j++) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      const detune = (j - 1) * 5;
      osc.type = "sawtooth";
      osc.frequency.value = baseFreq * harmonic;
      osc.detune.value = detune;
      
      const volume = harmonicGains[i] / 3;
      oscGain.gain.value = volume;
      
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      
      oscillators.push(osc);
      gains.push(oscGain);
    }
  });

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 6;
  lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();

  const fm = ctx.createOscillator();
  const fmGain = ctx.createGain();
  fm.type = "sine";
  fm.frequency.value = baseFreq * 2;
  fmGain.gain.value = 8;
  
  const fmGain2 = ctx.createGain();
  fmGain2.gain.value = 0;
  fm.connect(fmGain);
  fmGain.connect(fmGain2);
  fmGain2.connect(filter.frequency);
  fm.start();

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  return {
    oscillators,
    gains,
    filter,
    lfo,
    lfoGain,
    fm,
    fmGain,
    masterGain
  };
}

export default function HarmoniumApp() {
  const [isActive, setIsActive] = useState(false);
  const [data, setData] = useState({ pitch: 0, volume: 0 });
  
  const audioCtx = useRef<AudioContext | null>(null);
  const voice = useRef<HarmoniumVoice | null>(null);

  const startAudio = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission !== "granted") return;
    }

    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    voice.current = createHarmoniumVoice(audioCtx.current, 220);
    
    window.addEventListener("deviceorientation", handleMotion);
    setIsActive(true);
  }, []);

  const handleMotion = useCallback((event: DeviceOrientationEvent) => {
    if (!voice.current || !audioCtx.current) return;

    const beta = event.beta || 0;
    const freq = Math.max(110, Math.min(880, 440 + (beta * 4)));
    
    const harmonics = [1, 2, 3, 4, 5, 6];
    const detuneOffsets = [-5, 0, 5];
    
    voice.current.oscillators.forEach((osc, idx) => {
      const harmonicIdx = Math.floor(idx / 3);
      const detuneIdx = idx % 3;
      const harmonic = harmonics[harmonicIdx];
      osc.frequency.setTargetAtTime(freq * harmonic, audioCtx.current!.currentTime, 0.02);
      osc.detune.setTargetAtTime(detuneOffsets[detuneIdx], audioCtx.current!.currentTime, 0.02);
    });
    
    voice.current.fm.frequency.setTargetAtTime(freq * 2, audioCtx.current.currentTime, 0.02);
    
    const filterFreq = 300 + (freq / 880) * 600;
    voice.current.filter.frequency.setTargetAtTime(filterFreq, audioCtx.current.currentTime, 0.05);

    const gamma = Math.abs(event.gamma || 0);
    const vol = Math.min(1, gamma / 60);
    
    voice.current.masterGain.gain.setTargetAtTime(vol * 0.3, audioCtx.current.currentTime, 0.05);
    voice.current.lfo.frequency.setTargetAtTime(4 + vol * 8, audioCtx.current.currentTime, 0.1);
    
    setData({ pitch: Math.round(freq), volume: Math.round(vol * 100) });
  }, []);

  const stopAudio = useCallback(() => {
    window.removeEventListener("deviceorientation", handleMotion);
    
    if (voice.current) {
      voice.current.oscillators.forEach(osc => osc.stop());
      voice.current.lfo.stop();
      voice.current.fm.stop();
    }
    
    audioCtx.current?.close();
    setIsActive(false);
    setData({ pitch: 0, volume: 0 });
  }, [handleMotion]);

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", handleMotion);
      audioCtx.current?.close();
    };
  }, [handleMotion]);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <ParticlesCanvas pitch={data.pitch} volume={data.volume} active={isActive} />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {isActive && (
          <div className="flex gap-16">
            <div className="flex flex-col items-center">
              <span className="text-6xl font-light tracking-tight text-[#e8e8e8] tabular-nums">
                {data.pitch}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-6xl font-light tracking-tight text-[#e8e8e8] tabular-nums">
                {data.volume}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        {!isActive ? (
          <button
            onClick={startAudio}
            className="pointer-events-auto px-10 py-4 bg-[#a8c8ff] text-[#0d0d0d] rounded-full text-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            Start
          </button>
        ) : (
          <button
            onClick={stopAudio}
            className="pointer-events-auto px-8 py-3 bg-[#1a1a1a] text-[#a0a0a0] rounded-full text-sm font-medium border border-[#242424] hover:border-[#444444] transition-all"
          >
            Stop
          </button>
        )}
      </div>
    </main>
  );
}