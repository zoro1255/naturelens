
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraViewProps {
  onCapture: (base64: string) => void;
  isLoading: boolean;
}

interface CameraCapabilities {
  zoom?: { min: number; max: number; step: number };
  focusDistance?: { min: number; max: number; step: number };
  focusMode?: string[];
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isLoading }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({});
  const [zoom, setZoom] = useState<number>(1);
  const [focusDistance, setFocusDistance] = useState<number>(0);
  const [isManualFocus, setIsManualFocus] = useState<boolean>(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }, 
          audio: false
        });
        
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        
        const videoTrack = mediaStream.getVideoTracks()[0];
        setStream(mediaStream);
        setTrack(videoTrack);

        // Capabilities detection usually needs a small delay after stream starts
        setTimeout(() => {
          const caps = videoTrack.getCapabilities() as any;
          const newCaps: CameraCapabilities = {
            zoom: caps.zoom,
            focusDistance: caps.focusDistance,
            focusMode: caps.focusMode
          };
          setCapabilities(newCaps);
          if (caps.zoom) setZoom(caps.zoom.min || 1);
          if (caps.focusDistance) setFocusDistance(caps.focusDistance.min || 0);
        }, 1000);

      } catch (err) {
        setError("Optical sensor access restricted. Please check your privacy settings.");
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    if (track) {
      const constraints: any = { advanced: [] };
      if (capabilities.zoom) {
        constraints.advanced.push({ zoom });
      }
      
      if (isManualFocus && capabilities.focusDistance) {
        constraints.advanced.push({ 
          focusMode: 'manual', 
          focusDistance: focusDistance 
        });
      } else if (!isManualFocus && capabilities.focusMode?.includes('continuous')) {
        constraints.advanced.push({ focusMode: 'continuous' });
      }

      track.applyConstraints(constraints).catch(e => console.error("Constraint error:", e));
    }
  }, [zoom, focusDistance, isManualFocus, track, capabilities]);

  useEffect(() => { if (!isLoading) setCapturedImage(null); }, [isLoading]);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 250);

      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        onCapture(dataUrl.split(',')[1]);
      }
    }
  }, [onCapture]);

  if (error) {
    return (
      <div role="alert" className="bg-emerald-900/5 text-emerald-900 p-16 rounded-[3.5rem] text-center border-2 border-dashed border-emerald-950/10">
        <p className="handwritten text-3xl mb-4">Wait, something's missing...</p>
        <p className="text-sm font-medium opacity-60 max-w-xs mx-auto">{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full aspect-[16/10] bg-emerald-950 rounded-[3.5rem] overflow-hidden shadow-[0_60px_120px_-30px_rgba(6,78,59,0.5)] border-[16px] border-emerald-950/10 group transition-all duration-1000"
      aria-label="High precision lens"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-all duration-1000 ${isLoading ? 'scale-110 blur-2xl brightness-50' : 'scale-100'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isFlashing && <div className="absolute inset-0 bg-white/95 z-50 animate-out fade-out duration-300" />}

      {capturedImage && (
        <img 
          src={capturedImage} 
          className="absolute inset-0 w-full h-full object-cover animate-in zoom-in-110 fade-in duration-500 z-20 brightness-75" 
          alt="Frozen capture"
        />
      )}

      {/* Tactile Camera Controls */}
      {!isLoading && (
        <div className="absolute inset-0 pointer-events-none p-12 z-30 flex justify-between items-center">
          {/* Zoom Control (Left) */}
          {capabilities.zoom && (
            <div className="flex flex-col items-center gap-4 pointer-events-auto group/ctrl">
              <span className="text-white/30 text-[9px] font-bold uppercase tracking-[0.3em] vertical-text rotate-180 mb-2 group-hover/ctrl:text-white/60 transition-colors">Zoom Range</span>
              <input
                type="range"
                min={capabilities.zoom.min}
                max={capabilities.zoom.max}
                step={capabilities.zoom.step}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="h-48 w-1 accent-emerald-400 appearance-none cursor-pointer rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                style={{ WebkitAppearance: 'slider-vertical' } as any}
              />
              <span className="text-white text-[11px] font-mono mt-4 bg-emerald-950/40 px-2 py-1 rounded-md backdrop-blur-md border border-white/10">{zoom.toFixed(1)}x</span>
            </div>
          )}

          {/* Focus Control (Right) */}
          {capabilities.focusDistance && (
            <div className="flex flex-col items-center gap-4 pointer-events-auto group/ctrl">
              <button 
                onClick={() => setIsManualFocus(!isManualFocus)}
                className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all ${isManualFocus ? 'bg-emerald-400 text-emerald-950 border-emerald-400' : 'bg-black/20 text-white/50 border-white/10'}`}
              >
                {isManualFocus ? 'MF' : 'AF'}
              </button>
              
              <div className={`flex flex-col items-center transition-all duration-500 ${isManualFocus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <input
                  type="range"
                  min={capabilities.focusDistance.min}
                  max={capabilities.focusDistance.max}
                  step={capabilities.focusDistance.step}
                  value={focusDistance}
                  onChange={(e) => setFocusDistance(parseFloat(e.target.value))}
                  className="h-48 w-1 accent-emerald-400 appearance-none cursor-pointer rounded-full bg-white/5"
                  style={{ WebkitAppearance: 'slider-vertical' } as any}
                />
                <span className="text-white text-[9px] font-bold uppercase tracking-[0.3em] vertical-text mt-4 opacity-30">Focus Depth</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanning Engine HUD */}
      {isLoading && (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-36 h-36 border border-emerald-400/20 rounded-full animate-[ping_3s_linear_infinite]" />
            <div className="absolute inset-0 border border-emerald-400/5 rounded-full animate-[ping_2s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-6 h-6 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
            </div>
          </div>
          <div className="bg-emerald-950/60 backdrop-blur-3xl px-10 py-3 rounded-full border border-white/10 shadow-2xl">
             <span className="text-white text-[10px] font-bold tracking-[0.6em] uppercase animate-pulse">Optical Analysis</span>
          </div>
        </div>
      )}
      
      {/* Precision Frame */}
      <div className="absolute inset-0 z-10 pointer-events-none m-20 rounded-[2.5rem] opacity-30 group-hover:opacity-100 transition-opacity duration-1000">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-emerald-400/40 rounded-tl-3xl -translate-x-4 -translate-y-4" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-emerald-400/40 rounded-tr-3xl translate-x-4 -translate-y-4" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-3xl -translate-x-4 translate-y-4" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-emerald-400/40 rounded-br-3xl translate-x-4 translate-y-4" />
        
        {/* Rule of Thirds Grid (Subtle) */}
        <div className="absolute inset-0 flex">
           <div className="w-1/3 h-full border-r border-white/5" />
           <div className="w-1/3 h-full border-r border-white/5" />
        </div>
        <div className="absolute inset-0 flex flex-col">
           <div className="h-1/3 w-full border-b border-white/5" />
           <div className="h-1/3 w-full border-b border-white/5" />
        </div>
      </div>

      {/* Shutter Mechanism */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={captureFrame}
          disabled={isLoading}
          className={`relative group p-2 rounded-full border border-white/10 transition-all duration-700 hover:border-white/30 ${isLoading ? 'opacity-0 scale-50 rotate-180' : 'opacity-100 scale-100 rotate-0'}`}
        >
          <div className="absolute inset-0 bg-emerald-400/10 rounded-full blur-2xl group-hover:blur-3xl group-hover:scale-150 transition-all duration-700" />
          <div className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center active:scale-95 transition-all shadow-2xl">
             <div className="w-16 h-16 rounded-full border-2 border-emerald-950/5 flex items-center justify-center group-hover:border-emerald-400/20 transition-colors">
                <div className="w-1.5 h-1.5 bg-emerald-950/20 rounded-full group-hover:bg-emerald-400/40 transition-colors" />
             </div>
             {/* Gloss overlay */}
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/40 to-white/10 rounded-full" />
          </div>
        </button>
      </div>

      {/* Info Overlay */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50">
         <div className="bg-emerald-950/40 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 flex items-center gap-4 shadow-xl">
            <div className="flex gap-1.5">
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
               <div className="w-1.5 h-1.5 bg-emerald-400/20 rounded-full" />
               <div className="w-1.5 h-1.5 bg-emerald-400/20 rounded-full" />
            </div>
            <span className="text-[10px] text-white font-bold tracking-[0.4em] uppercase select-none">Nature Lens v2.5</span>
         </div>
      </div>

      <style>{`
        .vertical-text { writing-mode: vertical-rl; }
        input[type=range][style*="WebkitAppearance: slider-vertical"] {
          width: 4px;
          height: 192px;
          -webkit-appearance: slider-vertical;
          background: rgba(255,255,255,0.05);
          outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,0,0,0.4);
          border: 4px solid #34d399;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.3);
          border-width: 2px;
        }
        input[type=range]::-webkit-slider-thumb:active {
          transform: scale(0.9);
          background: #34d399;
        }
      `}</style>
    </div>
  );
};

export default CameraView;
