
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

  const playShutterSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
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
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
          audio: false
        });
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        setError("Allow camera access to explore nature.");
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isLoading) return;
    setIsFlashing(true);
    playShutterSound();
    setTimeout(() => setIsFlashing(false), 200);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onCapture(dataUrl.split(',')[1]);
    }
  }, [onCapture, isLoading, playShutterSound]);

  if (error) {
    return (
      <div className="bg-emerald-900/5 p-24 rounded-[4rem] text-center border-2 border-dashed border-emerald-950/10">
        <p className="handwritten text-4xl text-emerald-900 mb-6">Awaiting Access</p>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/10] bg-emerald-950 rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(6,78,59,0.2)] border-[16px] border-white">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-all duration-1000 ${isLoading ? 'blur-xl scale-110 opacity-40' : 'opacity-100'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isFlashing && <div className="absolute inset-0 bg-white z-50" />}
      
      {/* AI Vision Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {!isLoading && <div className="scan-line" />}
        <div className="absolute top-12 left-12 w-12 h-12 border-t-4 border-l-4 border-white/40 rounded-tl-3xl" />
        <div className="absolute top-12 right-12 w-12 h-12 border-t-4 border-r-4 border-white/40 rounded-tr-3xl" />
        <div className="absolute bottom-12 left-12 w-12 h-12 border-b-4 border-l-4 border-white/40 rounded-bl-3xl" />
        <div className="absolute bottom-12 right-12 w-12 h-12 border-b-4 border-r-4 border-white/40 rounded-br-3xl" />
        
        {/* Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/20 rounded-full flex items-center justify-center">
           <div className="w-1 h-1 bg-white/60 rounded-full" />
        </div>
      </div>

      {!isLoading && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={captureFrame}
            className="w-24 h-24 rounded-full bg-white border-[10px] border-emerald-950/5 active:scale-90 transition-transform shadow-2xl flex items-center justify-center group"
            aria-label="Capture"
          >
            <div className="w-16 h-16 rounded-full border-2 border-emerald-950/10 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
           <div className="w-20 h-20 border-[6px] border-emerald-400 border-t-transparent rounded-full animate-spin mb-6" />
           <p className="text-white text-[10px] font-black tracking-[0.5em] uppercase">Processing Biological Data</p>
        </div>
      )}
    </div>
  );
};

export default CameraView;
