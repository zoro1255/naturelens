
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraViewProps {
  onCapture: (base64: string) => void;
  isLoading: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isLoading }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Procedural Shutter Sound
  const playShutterSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // White noise burst for the shutter "click"
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start();
      noise.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false
        });
        
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        setError("Camera access restricted. Please allow camera permissions.");
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isLoading) return;

    setIsFlashing(true);
    playShutterSound();
    setTimeout(() => setIsFlashing(false), 150);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64Data = dataUrl.split(',')[1];
      if (base64Data) {
        onCapture(base64Data);
      }
    }
  }, [onCapture, isLoading, playShutterSound]);

  if (error) {
    return (
      <div className="bg-emerald-900/5 p-16 rounded-[3.5rem] text-center border-2 border-dashed border-emerald-950/10">
        <p className="handwritten text-3xl text-emerald-900 mb-4">Hardware Alert</p>
        <p className="text-sm opacity-60">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/10] bg-emerald-950 rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-emerald-950/5">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-30' : 'opacity-100'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isFlashing && <div className="absolute inset-0 bg-white z-50 transition-opacity" />}

      {!isLoading && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={captureFrame}
            className="w-20 h-20 rounded-full bg-white border-8 border-white/20 active:scale-90 transition-transform shadow-2xl flex items-center justify-center"
            aria-label="Capture Image"
          >
            <div className="w-14 h-14 rounded-full border-2 border-emerald-900/10" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
           <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="text-white text-[10px] font-bold tracking-[0.4em] uppercase">Scanning Environment</p>
        </div>
      )}

      {/* Frame Details */}
      <div className="absolute inset-0 pointer-events-none p-10">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/20 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-xl" />
      </div>
    </div>
  );
};

export default CameraView;
