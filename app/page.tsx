"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointMaterial } from "@react-three/drei";
import * as THREE from "three";

interface ParticleProps {
  mousePos: { x: number; y: number };
  distanceFromCenter: number;
}

function ParticleSystem({ mousePos, distanceFromCenter }: ParticleProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const { size } = useThree();
  const particleCount = 1500;
  
  
  const [positions, velocities, phases, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);
    const col = new Float32Array(particleCount * 3);
    const baseColor = new THREE.Color().setHSL(0.7, 0.5, 0.5);
    
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + Math.random() * 1.5;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = 0;
      
      ph[i] = Math.random() * Math.PI * 2;
      
      col[i * 3] = baseColor.r;
      col[i * 3 + 1] = baseColor.g;
      col[i * 3 + 2] = baseColor.b;
    }
    
    return [pos, vel, ph, col];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colorArray = pointsRef.current.geometry.attributes.color?.array as Float32Array | undefined;
    const baseColor = new THREE.Color().setHSL(0.7, 0.5, 0.5);
    const time = state.clock.elapsedTime;
    
    const aspect = size.width / size.height;
    const mouseX = (mousePos.x / size.width - 0.5) * 2 * aspect * 2.5;
    const mouseY = -(mousePos.y / size.height - 0.5) * 2 * 2.5;
    
    const pullStrength = distanceFromCenter * 0.15;
    const basePull = distanceFromCenter * 0.02;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      
      const baseAngle = time * 0.08 + phases[i] * 0.1;
      const origX = Math.sin(baseAngle + i * 0.002) * (1.8 + Math.sin(phases[i]) * 0.3);
      const origY = Math.cos(baseAngle * 0.7 + i * 0.003) * (1.8 + Math.cos(phases[i]) * 0.3);
      const origZ = Math.sin(baseAngle * 0.5 + i * 0.001) * (1.8 + Math.sin(phases[i] * 2) * 0.3);
      
      const noiseX = Math.sin(time * 0.3 + i * 0.01 + phases[i]) * 0.15;
      const noiseY = Math.cos(time * 0.25 + i * 0.015 + phases[i]) * 0.15;
      const noiseZ = Math.sin(time * 0.35 + i * 0.012 + phases[i]) * 0.15;
      
      posArray[idx] = origX + noiseX;
      posArray[idx + 1] = origY + noiseY;
      posArray[idx + 2] = origZ + noiseZ;
      
      const dx = -posArray[idx];
      const dy = -posArray[idx + 1];
      const dz = -posArray[idx + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist > 0.1) {
        const force = basePull + (dist < 1 ? pullStrength * (1 - dist) : 0);
        velocities[idx] += (dx / dist) * force;
        velocities[idx + 1] += (dy / dist) * force;
        velocities[idx + 2] += (dz / dist) * force;
      }
      
      velocities[idx] *= 0.98;
      velocities[idx + 1] *= 0.98;
      velocities[idx + 2] *= 0.98;
      
      posArray[idx] += velocities[idx];
      posArray[idx + 1] += velocities[idx + 1];
      posArray[idx + 2] += velocities[idx + 2];
      
      const maxDist = 2.5;
      const currentDist = Math.sqrt(posArray[idx] ** 2 + posArray[idx + 1] ** 2 + posArray[idx + 2] ** 2);
      if (currentDist > maxDist) {
        const scale = maxDist / currentDist;
        posArray[idx] *= scale;
        posArray[idx + 1] *= scale;
        posArray[idx + 2] *= scale;
      }

      if (colorArray) {
        let opacity = 0.5 - (currentDist - 0.9  ) * 0.7;
        opacity = Math.max(0.01, Math.min(0.5, opacity));
        
        colorArray[idx] = baseColor.r * opacity;
        colorArray[idx + 1] = baseColor.g * opacity;
        colorArray[idx + 2] = baseColor.b * opacity;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    if (pointsRef.current.geometry.attributes.color) {
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef as any} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <PointMaterial
        transparent
        vertexColors
        size={0.04}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Blackhole({ intensity }: { intensity: number }) {
  const accretionDiskRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (accretionDiskRef.current) {
      accretionDiskRef.current.rotation.z = time * 0.15;
    }
  });

  const accretionColor = useMemo(() => new THREE.Color().setHSL(0.7, 0.5, 0.5), []);

  return (
    <group>
      <group ref={accretionDiskRef}>
        {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((radius, i) => (
          <mesh key={i} rotation={[Math.PI / 2.5, 0, i * 0.8]}>
            <torusGeometry args={[radius, 0.015 + i * 0.003, 8, 32]} />
            <meshBasicMaterial 
              color={accretionColor} 
              transparent 
              opacity={0.5 - i * 0.07}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ParticlesCanvas({ mousePos, distanceFromCenter }: { mousePos: { x: number; y: number }; distanceFromCenter: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.3} />
      <ParticleSystem mousePos={mousePos} distanceFromCenter={distanceFromCenter} />
      {/* <Blackhole intensity={distanceFromCenter} />/ */}
    </Canvas>
  );
}

const DEFAULT_AUDIO = "/highs and lows.wav";

function hasOrientationSupport(): boolean {
  return typeof DeviceOrientationEvent !== "undefined" && 
    "ontouchstart" in window;
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function setDistortionCurve(node: WaveShaperNode, amount: number) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  node.curve = curve;
  node.oversample = "4x";
}

export default function HarmoniumApp() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({ bright: 0, volume: 0 });
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [distanceFromCenter, setDistanceFromCenter] = useState(0);
  const [brightEnabled, setBrightEnabled] = useState(true);
  const [volumeEnabled, setVolumeEnabled] = useState(true);
  const brightEnabledRef = useRef(true);
  const volumeEnabledRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const audioCtx = useRef<AudioContext | null>(null);
  const audioCtxClosed = useRef(false);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const distortionRef = useRef<WaveShaperNode | null>(null);
  const distortionGain = useRef<GainNode | null>(null);
  const sensorDistanceRef = useRef(0);
  const pointerDistanceRef = useRef(0);
  const isTouchingRef = useRef(false);

  useEffect(() => {
    const loadDefaultAudio = async () => {
      try {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(DEFAULT_AUDIO);
        const arrayBuffer = await response.arrayBuffer();
        bufferRef.current = await audioCtx.current.decodeAudioData(arrayBuffer);
        setAudioLoaded(true);
      } catch (err) {
        console.error("Failed to load default audio:", err);
      }
      setIsLoading(false);
    };
    
    loadDefaultAudio();
    
    if (hasOrientationSupport()) {
      setSensorEnabled(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | Touch) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleMouseMove]);

  const getDistanceFromCenter = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const distance = Math.sqrt(Math.pow(clientX - rect.left - centerX, 2) + Math.pow(clientY - rect.top - centerY, 2));
    
    return Math.min(1, distance / maxDistance);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    if (!audioCtx.current || audioCtxClosed.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxClosed.current = false;
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      bufferRef.current = await audioCtx.current.decodeAudioData(arrayBuffer);
      setAudioLoaded(true);
    } catch (err) {
      console.error("Failed to decode audio:", err);
    }
    
    setIsLoading(false);
  }, []);

  const startAudio = useCallback(async () => {
    if (!audioCtx.current || audioCtxClosed.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxClosed.current = false;
    }
    
    await audioCtx.current.resume();
    
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission !== "granted") return;
    }
    
    if (!bufferRef.current) return;
    
    masterGain.current = audioCtx.current.createGain();
    masterGain.current.gain.value = 0;
    
    filterRef.current = audioCtx.current.createBiquadFilter();
    filterRef.current.type = "lowpass";
    filterRef.current.frequency.value = 2000;
    filterRef.current.Q.value = 2;
    
    distortionRef.current = audioCtx.current.createWaveShaper();
    setDistortionCurve(distortionRef.current, 0);
    
    distortionGain.current = audioCtx.current.createGain();
    distortionGain.current.gain.value = 0;
    
    const source = audioCtx.current.createBufferSource();
    source.buffer = bufferRef.current;
    source.loop = true;
    source.connect(filterRef.current);
    filterRef.current.connect(distortionRef.current);
    distortionRef.current.connect(distortionGain.current);
    distortionGain.current.connect(masterGain.current);
    masterGain.current.connect(audioCtx.current.destination);
    source.start();
    sourceRef.current = source;
    
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handleTouchStart);
    window.addEventListener("pointerup", handleTouchEnd);
    
    if (sensorEnabled) {
      window.addEventListener("deviceorientation", handleMotion);
    }
    
    setData({ bright: 0, volume: 50 });
    setIsActive(true);
  }, [sensorEnabled]);

  const applyCombinedDistance = useCallback((distance: number) => {
    if (!audioCtx.current || !masterGain.current || !filterRef.current || !distortionRef.current || !distortionGain.current) return;

    const bright = distance * 100;
    let vol = 0.5;
    
    if (brightEnabledRef.current) {
      const filterFreq = 500 + bright * 20;
      filterRef.current.frequency.setTargetAtTime(filterFreq, audioCtx.current.currentTime, 0.05);
      filterRef.current.Q.setTargetAtTime(2 + distance * 8, audioCtx.current.currentTime, 0.05);
    } else {
      filterRef.current.frequency.setTargetAtTime(2000, audioCtx.current.currentTime, 0.05);
      filterRef.current.Q.setTargetAtTime(2, audioCtx.current.currentTime, 0.05);
    }
    
    if (volumeEnabledRef.current) {
      vol = 0.2 + distance * 0.8;
      masterGain.current.gain.setTargetAtTime(vol, audioCtx.current.currentTime, 0.05);
    } else {
      masterGain.current.gain.setTargetAtTime(0.5, audioCtx.current.currentTime, 0.05);
    }
    
    const distortionAmount = distance * 30;
    setDistortionCurve(distortionRef.current, distortionAmount);
    distortionGain.current.gain.setTargetAtTime(0.3 * distance, audioCtx.current.currentTime, 0.05);
    
    setData({ bright: Math.round(brightEnabledRef.current ? bright : 0), volume: Math.round(vol * 100) });
  }, []);

  const handleTouchStart = useCallback(() => {
    isTouchingRef.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isTouchingRef.current = false;
  }, []);

  const handleMotion = useCallback((event: DeviceOrientationEvent) => {
    if (isTouchingRef.current) return;
    if (!audioCtx.current || !masterGain.current || !filterRef.current || !distortionRef.current || !distortionGain.current) return;

    const beta = event.beta || 0;
    const gamma = Math.abs(event.gamma || 0);
    
    const bright = Math.min(100, Math.max(0, Math.abs(beta)));
    const vol = Math.min(100, Math.max(0, gamma));
    
    if (brightEnabledRef.current) {
      const filterFreq = 500 + bright * 20;
      filterRef.current.frequency.setTargetAtTime(filterFreq, audioCtx.current.currentTime, 0.05);
      filterRef.current.Q.setTargetAtTime(2 + (bright / 100) * 8, audioCtx.current.currentTime, 0.05);
    } else {
      filterRef.current.frequency.setTargetAtTime(2000, audioCtx.current.currentTime, 0.05);
      filterRef.current.Q.setTargetAtTime(2, audioCtx.current.currentTime, 0.05);
    }
    
    if (volumeEnabledRef.current) {
      masterGain.current.gain.setTargetAtTime(vol / 100, audioCtx.current.currentTime, 0.05);
    } else {
      masterGain.current.gain.setTargetAtTime(0.5, audioCtx.current.currentTime, 0.05);
    }
    
    const distortionAmount = bright * 0.3;
    setDistortionCurve(distortionRef.current, distortionAmount);
    distortionGain.current.gain.setTargetAtTime(0.3 * (bright / 100), audioCtx.current.currentTime, 0.05);
    
    setDistanceFromCenter(bright / 100);
    setData({ bright: Math.round(brightEnabledRef.current ? bright : 0), volume: Math.round(volumeEnabledRef.current ? vol : 50) });
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isTouchingRef.current) return;
    if (!audioCtx.current || !masterGain.current || !filterRef.current || !distortionRef.current || !distortionGain.current) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const distance = getDistanceFromCenter(event.clientX, event.clientY);
    setDistanceFromCenter(distance);
    
    applyCombinedDistance(distance);
  }, [getDistanceFromCenter, applyCombinedDistance]);

  const stopAudio = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerdown", handleTouchStart);
    window.removeEventListener("pointerup", handleTouchEnd);
    if (sensorEnabled) {
      window.removeEventListener("deviceorientation", handleMotion);
    }
    
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    
    if (audioCtx.current && !audioCtxClosed.current) {
      audioCtx.current.close();
      audioCtxClosed.current = true;
    }
    
    sensorDistanceRef.current = 0;
    pointerDistanceRef.current = 0;
    isTouchingRef.current = false;
    
    setIsActive(false);
    setDistanceFromCenter(0);
    setData({ bright: 0, volume: 0 });
  }, [sensorEnabled, handlePointerMove, handleMotion]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handleTouchStart);
      window.removeEventListener("pointerup", handleTouchEnd);
      if (sensorEnabled) {
        window.removeEventListener("deviceorientation", handleMotion);
      }
      if (sourceRef.current) sourceRef.current.stop();
      if (audioCtx.current && !audioCtxClosed.current) {
        audioCtx.current.close();
        audioCtxClosed.current = true;
      }
    };
  }, [sensorEnabled, handlePointerMove, handleMotion]);

  return (
    <main ref={containerRef} className="relative w-full h-screen min-h-[400px] overflow-hidden bg-[#0a0a0f]">
      <ParticlesCanvas mousePos={mousePos} distanceFromCenter={distanceFromCenter} />
      
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 sm:pt-20 pointer-events-none">
        {isActive && (
          <div className="flex gap-10 sm:gap-16">
            <div className="flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-light tracking-tight text-white/50 tabular-nums">
                {data.bright}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-light tracking-tight text-white/50 tabular-nums">
                {data.volume}
              </span>
            </div>
          </div>
        )}
      </div>

      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/80 px-4">
          <div className="text-center max-w-sm w-full">
            {!isLoading && audioLoaded && (
              <button
                onClick={startAudio}
                className="pointer-events-auto px-8 sm:px-10 py-3 sm:py-4 bg-[#6b21a8] text-white rounded-full text-base sm:text-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
              >
                Start
              </button>
            )}
            
            {isLoading && (
              <p className="text-[#a0a0a0] text-base sm:text-lg">Loading audio...</p>
            )}
            
            {audioLoaded && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="pointer-events-auto mt-4 px-5 py-2 bg-transparent text-[#666] text-sm hover:text-[#a0a0a0] transition-all"
                >
                  Load different file
                </button>
                <p className="text-[#444] text-xs sm:text-sm mt-2 px-4">
                  {sensorEnabled 
                    ? "Touch screen or tilt phone: center = clean • edges = warm" 
                    : "Touch screen: center = clean • edges = warm"}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {isActive && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 px-4">
          <div className="flex items-center gap-6 sm:gap-8">
            <button
              onClick={() => {
                const newValue = !brightEnabled;
                setBrightEnabled(newValue);
                brightEnabledRef.current = newValue;
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                brightEnabled 
                  ? "bg-white/20 text-white" 
                  : "bg-white/5 text-white/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-all ${brightEnabled ? "bg-white" : "bg-white/30"}`} />
              <span className="text-[10px] tracking-wider uppercase">Distortion</span>
            </button>
            <button
              onClick={() => {
                const newValue = !volumeEnabled;
                setVolumeEnabled(newValue);
                volumeEnabledRef.current = newValue;
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                volumeEnabled 
                  ? "bg-white/20 text-white" 
                  : "bg-white/5 text-white/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-all ${volumeEnabled ? "bg-white" : "bg-white/30"}`} />
              <span className="text-[10px] tracking-wider uppercase">Volume</span>
            </button>
          </div>
          <button
            onClick={stopAudio}
            className="pointer-events-auto px-5 py-1.5 bg-white/10 text-white/60 rounded-full text-xs font-medium hover:bg-white/20 transition-all"
          >
            Stop
          </button>
        </div>
      )}
    </main>
  );
}