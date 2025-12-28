
import React, { useState, useCallback, useRef } from 'react';
import { identifySpecies, getRelatedSpeciesDetail } from './services/geminiService';
import { NatureInfo, AppMode, SpeciesDetail } from './types';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  
  const [relatedDetails, setRelatedDetails] = useState<Record<string, SpeciesDetail>>({});
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playSuccessSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, []);

  const playErrorSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }, []);

  const handleProcessImage = useCallback(async (base64: string) => {
    setIsLoading(true);
    setResult(null);
    setCapturedImage(base64);
    setErrorMsg(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRelatedDetails({});
    
    try {
      const data = await identifySpecies(base64);
      if (data) {
        setResult(data);
        playSuccessSound();
        
        setIsFetchingRelated(true);
        const detailPromises = data.relatedSpecies.map(async (species) => {
          try {
            const details = await getRelatedSpeciesDetail(species.name);
            return { name: species.name, details };
          } catch (e) {
            return null;
          }
        });

        const detailedResults = await Promise.all(detailPromises);
        const detailsMap: Record<string, SpeciesDetail> = {};
        detailedResults.forEach(res => {
          if (res) detailsMap[res.name] = res.details;
        });
        setRelatedDetails(detailsMap);
        setIsFetchingRelated(false);

        setTimeout(() => {
          document.getElementById('result-heading')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        playErrorSound();
        setErrorMsg("Subject identification failed. Please try a clearer photo.");
      }
    } catch (err: any) {
      playErrorSound();
      if (err.message === "API_KEY_NOT_CONFIGURED") {
        setErrorMsg("Configuration Error: The API_KEY environment variable is missing. Please set it in your deployment settings.");
      } else {
        setErrorMsg("Service temporarily unavailable. Please check your internet connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [playSuccessSound, playErrorSound]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      if (res) handleProcessImage(res.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const ResultCard = () => {
    if (!result || !capturedImage) return null;

    return (
      <section id="result" className="mt-12 glass rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/60 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="mb-12 relative">
          <div className="handwritten text-emerald-600 text-2xl mb-4 text-center">Observed Specimen</div>
          <div 
            className="relative w-full aspect-video rounded-[2.5rem] bg-emerald-900/5 overflow-hidden cursor-move shadow-inner border border-emerald-950/10 group"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <img 
              src={`data:image/jpeg;base64,${capturedImage}`} 
              alt="Nature specimen"
              className="w-full h-full object-contain transition-transform duration-200 select-none pointer-events-none"
              style={{ transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)` }}
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-emerald-950/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
              </button>
              <span className="text-white/50 text-xs w-8 text-center">{zoom}x</span>
              <button onClick={() => setZoom(prev => Math.min(prev + 0.5, 5))} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
          <div>
            <p className="handwritten text-emerald-600 text-2xl mb-1">Specimen Identification</p>
            <h2 id="result-heading" className="text-5xl font-bold text-emerald-950 mb-3">{result.friendlyName}</h2>
            <p className="text-xl text-emerald-700/70 italic font-medium serif">{result.scientificName}</p>
          </div>
          
          <div className="flex bg-emerald-950/5 p-1.5 rounded-2xl border border-emerald-950/10">
            <button onClick={() => setMode(AppMode.EASY)} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === AppMode.EASY ? 'bg-emerald-800 text-white shadow-lg' : 'text-emerald-900/50'}`}>Discovery Mode</button>
            <button onClick={() => setMode(AppMode.ADVANCED)} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === AppMode.ADVANCED ? 'bg-emerald-800 text-white shadow-lg' : 'text-emerald-900/50'}`}>Expert Mode</button>
          </div>
        </div>

        <div className="h-px w-full bg-emerald-900/10 mb-12" />

        {mode === AppMode.EASY ? (
          <div className="grid gap-10">
            <p className="text-2xl text-emerald-900/90 leading-relaxed font-light">{result.easyDescription}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {result.funFacts.map((fact, i) => (
                <div key={i} className="bg-white/50 p-6 rounded-[2rem] border border-emerald-100/50">
                  <div className="handwritten text-emerald-500 text-xl mb-2">Cool Fact</div>
                  <p className="text-emerald-900/80 text-sm leading-relaxed">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-12">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="bg-white/50 p-8 rounded-[2rem] border border-emerald-100">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/30 mb-6">Taxonomy</h4>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700/40 uppercase mb-1">Kingdom</p>
                    <p className="text-xl font-bold text-emerald-950">{result.taxonomy.kingdom}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700/40 uppercase mb-1">Family</p>
                    <p className="text-xl font-bold text-emerald-950">{result.taxonomy.family}</p>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-950 text-emerald-50 p-8 rounded-[2rem] shadow-2xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-2">Status</h4>
                <p className="text-2xl font-bold">{result.advancedInfo.conservationStatus}</p>
              </div>
            </div>
            <p className="text-sm text-emerald-900/80 leading-relaxed">{result.advancedInfo.distribution}</p>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <header className="flex flex-col items-center mb-20">
        <div className="bg-emerald-950 p-6 rounded-[2.5rem] shadow-2xl mb-8">
           <svg className="w-14 h-14 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </div>
        <h1 className="text-7xl font-bold text-emerald-950 tracking-tighter mb-3 italic">NatureLens</h1>
        <p className="handwritten text-emerald-800/60 text-2xl">Discover the world through AI</p>
      </header>

      <main className="space-y-16">
        <CameraView onCapture={handleProcessImage} isLoading={isLoading} />
        
        <div className="flex flex-col items-center gap-6">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-10 py-5 bg-emerald-950 text-white font-bold rounded-[2rem] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-xl"
          >
            Upload Specimen Image
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-8 rounded-[2rem] text-center max-w-lg mx-auto animate-in fade-in zoom-in duration-300">
            <p className="handwritten text-red-600 text-3xl mb-2">Configuration Required</p>
            <p className="text-red-900/70 text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {isLoading && !result && (
          <div className="mt-16 text-center py-24">
             <div className="w-24 h-24 border-[3px] border-emerald-950/5 border-t-emerald-800 rounded-full animate-spin mb-10 mx-auto" />
             <p className="handwritten text-4xl text-emerald-900/70">Consulting Biology Database...</p>
          </div>
        )}

        <ResultCard />
      </main>

      <footer className="mt-40 pt-16 border-t border-emerald-900/10 flex flex-col md:flex-row items-center justify-between gap-10 opacity-70">
        <p className="text-sm font-bold text-emerald-950 uppercase tracking-[0.25em]">© 2025 NatureLens</p>
        <div className="text-center bg-white/40 p-4 rounded-[1.5rem] border border-white/60">
           <p className="text-xs font-bold text-emerald-900 uppercase mb-1">Developer Signature</p>
           <p className="text-[11px] text-emerald-800/70 italic">Atharva • Connecting Curiosity with Intelligence</p>
        </div>
        <p className="text-sm font-bold text-emerald-950">Gemini 3 Flash Powered</p>
      </footer>
    </div>
  );
};

export default App;
