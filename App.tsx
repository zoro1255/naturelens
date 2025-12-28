
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { identifySpecies, getRelatedSpeciesDetail } from './services/geminiService';
import { NatureInfo, AppMode, SpeciesDetail } from './types';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  const [hasKey, setHasKey] = useState<boolean>(!!process.env.API_KEY && process.env.API_KEY !== "undefined");
  
  const [relatedDetails, setRelatedDetails] = useState<Record<string, SpeciesDetail>>({});
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check key status on mount
  useEffect(() => {
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(selected => {
        setHasKey(selected || (!!process.env.API_KEY && process.env.API_KEY !== "undefined"));
      });
    }
  }, []);

  const handleOpenKeyPicker = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setErrorMsg(null);
    }
  };

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
        setErrorMsg("Identification failed. Please ensure the subject is clear and try again.");
      }
    } catch (err: any) {
      playErrorSound();
      if (err.message === "API_KEY_NOT_CONFIGURED") {
        setErrorMsg("API Key required. Please click 'Connect API Key' above to enable identification features.");
        setHasKey(false);
      } else {
        setErrorMsg("NatureLens couldn't reach the AI service. Please try again in a moment.");
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

  const ResultCard = () => {
    if (!result || !capturedImage) return null;

    return (
      <section id="result" className="mt-12 glass rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/60 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="mb-12 relative">
          <div className="handwritten text-emerald-600 text-2xl mb-4 text-center">Observed Specimen</div>
          <div className="relative w-full aspect-video rounded-[2.5rem] bg-emerald-900/5 overflow-hidden shadow-inner border border-emerald-950/10 group">
            <img 
              src={`data:image/jpeg;base64,${capturedImage}`} 
              alt="Nature specimen"
              className="w-full h-full object-contain select-none"
              style={{ transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)` }}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
          <div>
            <p className="handwritten text-emerald-600 text-2xl mb-1">Identification</p>
            <h2 id="result-heading" className="text-5xl font-bold text-emerald-950 mb-3">{result.friendlyName}</h2>
            <p className="text-xl text-emerald-700/70 italic font-medium serif">{result.scientificName}</p>
          </div>
          
          <div className="flex bg-emerald-950/5 p-1.5 rounded-2xl border border-emerald-950/10">
            <button onClick={() => setMode(AppMode.EASY)} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === AppMode.EASY ? 'bg-emerald-800 text-white shadow-lg' : 'text-emerald-900/50'}`}>Discovery</button>
            <button onClick={() => setMode(AppMode.ADVANCED)} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === AppMode.ADVANCED ? 'bg-emerald-800 text-white shadow-lg' : 'text-emerald-900/50'}`}>Expert</button>
          </div>
        </div>

        <div className="h-px w-full bg-emerald-900/10 mb-12" />

        {mode === AppMode.EASY ? (
          <div className="grid gap-10">
            <p className="text-2xl text-emerald-900/90 leading-relaxed font-light">{result.easyDescription}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {result.funFacts.map((fact, i) => (
                <div key={i} className="bg-white/50 p-6 rounded-[2rem] border border-emerald-100/50">
                  <div className="handwritten text-emerald-500 text-xl mb-2">Did You Know?</div>
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
            <p className="text-sm text-emerald-900/80 leading-relaxed italic">{result.advancedInfo.distribution}</p>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <header className="flex flex-col items-center mb-12">
        <div className="bg-emerald-950 p-6 rounded-[2.5rem] shadow-2xl mb-8">
           <svg className="w-14 h-14 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </div>
        <h1 className="text-7xl font-bold text-emerald-950 tracking-tighter mb-3 italic">NatureLens</h1>
        <p className="handwritten text-emerald-800/60 text-2xl">Explore through AI Vision</p>

        {!hasKey && (
          <button 
            onClick={handleOpenKeyPicker}
            className="mt-8 flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-900 text-sm font-bold rounded-2xl hover:bg-emerald-200 transition-colors border border-emerald-950/10 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Connect API Key
          </button>
        )}
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
            Upload Observation
          </button>
        </div>

        {errorMsg && (
          <div className="bg-emerald-50/80 border border-emerald-200 p-8 rounded-[2rem] text-center max-w-lg mx-auto animate-in fade-in zoom-in duration-300">
            <p className="handwritten text-emerald-700 text-3xl mb-2">Action Required</p>
            <p className="text-emerald-950/70 text-sm font-medium mb-4">{errorMsg}</p>
            {!hasKey && (
              <button 
                onClick={handleOpenKeyPicker}
                className="px-6 py-2 bg-emerald-900 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors"
              >
                Connect Now
              </button>
            )}
          </div>
        )}

        {isLoading && !result && (
          <div className="mt-16 text-center py-24">
             <div className="w-20 h-20 border-[3px] border-emerald-950/5 border-t-emerald-800 rounded-full animate-spin mb-10 mx-auto" />
             <p className="handwritten text-4xl text-emerald-900/70">Consulting Global Nature Archives...</p>
          </div>
        )}

        <ResultCard />
      </main>

      <footer className="mt-40 pt-16 border-t border-emerald-900/10 flex flex-col md:flex-row items-center justify-between gap-10 opacity-70">
        <p className="text-sm font-bold text-emerald-950 uppercase tracking-[0.25em]">© 2025 NatureLens • Atharva</p>
        <div className="text-center md:text-right">
          <p className="text-sm font-bold text-emerald-950">Gemini Pro Vision Engine</p>
          <p className="text-[10px] text-emerald-900/40 font-medium">Built for Discovery</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
