
import React, { useState, useCallback, useRef } from 'react';
import { identifySpecies, getRelatedSpeciesDetail } from './services/geminiService';
import { NatureInfo, AppMode, SpeciesDetail } from './types';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  const [isLocalMode, setIsLocalMode] = useState(false);
  
  const [zoom, setZoom] = useState(1);
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

  const handleProcessImage = useCallback(async (base64: string) => {
    setIsLoading(true);
    setResult(null);
    setCapturedImage(base64);
    setIsLocalMode(!process.env.API_KEY || process.env.API_KEY === "undefined");
    
    try {
      const data = await identifySpecies(base64);
      if (data) {
        setResult(data);
        playSuccessSound();
        setTimeout(() => {
          document.getElementById('result-heading')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } catch (err) {
      console.error("Identification issue:", err);
    } finally {
      setIsLoading(false);
    }
  }, [playSuccessSound]);

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
      <section id="result" className="mt-12 glass rounded-[3.5rem] p-8 md:p-14 nature-card border border-white/60 animate-in fade-in slide-in-from-bottom-12 duration-1000 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/20 rounded-full blur-[100px] -mr-32 -mt-32" />
        
        {isLocalMode && (
          <div className="mb-6 flex justify-center">
            <span className="px-4 py-1 bg-emerald-950/10 text-emerald-800 text-[10px] font-bold tracking-widest uppercase rounded-full border border-emerald-900/10">
              Local Discovery Active
            </span>
          </div>
        )}

        <div className="mb-14 relative group">
          <div className="handwritten text-emerald-600/60 text-2xl mb-4 text-center">Observation Journal</div>
          <div className="relative w-full aspect-[16/9] rounded-[3rem] bg-emerald-900/5 overflow-hidden shadow-2xl border-4 border-white">
            <img 
              src={`data:image/jpeg;base64,${capturedImage}`} 
              alt="Nature specimen"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 to-transparent" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14 relative z-10">
          <div>
            <p className="handwritten text-emerald-600 text-3xl mb-2">Specimen ID</p>
            <h2 id="result-heading" className="text-6xl font-bold text-emerald-950 mb-4 tracking-tight leading-none">{result.friendlyName}</h2>
            <div className="flex items-center gap-3">
              <span className="w-8 h-[1px] bg-emerald-800/20" />
              <p className="text-2xl text-emerald-700/60 italic font-medium serif">{result.scientificName}</p>
            </div>
          </div>
          
          <div className="flex bg-emerald-950/5 p-2 rounded-[2rem] border border-emerald-950/10">
            <button onClick={() => setMode(AppMode.EASY)} className={`px-10 py-4 rounded-[1.5rem] text-sm font-black transition-all ${mode === AppMode.EASY ? 'bg-emerald-800 text-white shadow-xl scale-105' : 'text-emerald-900/40 hover:text-emerald-900/60'}`}>FIELD GUIDE</button>
            <button onClick={() => setMode(AppMode.ADVANCED)} className={`px-10 py-4 rounded-[1.5rem] text-sm font-black transition-all ${mode === AppMode.ADVANCED ? 'bg-emerald-800 text-white shadow-xl scale-105' : 'text-emerald-900/40 hover:text-emerald-900/60'}`}>BIOLOGY LAB</button>
          </div>
        </div>

        {mode === AppMode.EASY ? (
          <div className="grid gap-12">
            <p className="text-3xl text-emerald-900/80 leading-snug font-light tracking-tight italic">"{result.easyDescription}"</p>
            <div className="grid md:grid-cols-3 gap-8">
              {result.funFacts.map((fact, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-50 transition-all hover:shadow-md">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-bold mb-4">{i+1}</div>
                  <p className="text-emerald-900/70 text-sm leading-relaxed font-medium">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-14">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white/40 p-10 rounded-[3rem] border border-emerald-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900/30 mb-8">Classification</h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700/30 uppercase mb-1">Kingdom</p>
                    <p className="text-2xl font-bold text-emerald-950">{result.taxonomy.kingdom}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700/30 uppercase mb-1">Family</p>
                    <p className="text-2xl font-bold text-emerald-950">{result.taxonomy.family}</p>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-950 text-emerald-50 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400/60 mb-2">Habitat</h4>
                  <p className="text-xl font-medium leading-relaxed">{result.advancedInfo.habitat}</p>
                </div>
                <div className="mt-8">
                   <p className="text-sm font-bold text-emerald-400">Status: {result.advancedInfo.conservationStatus}</p>
                </div>
              </div>
              <div className="bg-white/40 p-10 rounded-[3rem] border border-emerald-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900/30 mb-8">Behavioral Profile</h4>
                <p className="text-sm text-emerald-900/70 leading-relaxed font-medium">{result.advancedInfo.behavior}</p>
              </div>
            </div>
            <div className="p-10 bg-emerald-50/50 rounded-[3rem] border border-emerald-100">
               <p className="text-xs font-bold text-emerald-900/30 uppercase tracking-[0.2em] mb-4">Global Distribution</p>
               <p className="text-lg text-emerald-950/80 italic">{result.advancedInfo.distribution}</p>
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <header className="flex flex-col items-center mb-24 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-200/20 blur-[60px] rounded-full" />
        <div className="bg-emerald-950 p-8 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.5)] mb-10 relative group">
           <svg className="w-16 h-16 text-emerald-400 transition-transform duration-500 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </div>
        <div className="text-center">
          <h1 className="text-8xl md:text-9xl font-bold text-emerald-950 tracking-tighter mb-4 italic leading-none">NatureLens</h1>
          <div className="flex items-center justify-center gap-4">
             <span className="h-px w-10 bg-emerald-950/10" />
             <p className="handwritten text-emerald-800/60 text-3xl">Visionary Explorer by <span className="text-emerald-800 font-bold underline decoration-emerald-300 decoration-4 underline-offset-8">Atharva</span></p>
             <span className="h-px w-10 bg-emerald-950/10" />
          </div>
        </div>
      </header>

      <main className="space-y-20">
        <CameraView onCapture={handleProcessImage} isLoading={isLoading} />
        
        <div className="flex flex-col items-center gap-8">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="group relative px-14 py-6 bg-emerald-950 text-white font-black text-sm tracking-widest uppercase rounded-[2.5rem] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-2xl overflow-hidden"
          >
            <span className="relative z-10">Upload Specimen</span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 to-emerald-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {isLoading && !result && (
          <div className="mt-20 text-center py-32 animate-pulse">
             <div className="w-24 h-24 border-[3px] border-emerald-950/5 border-t-emerald-800 rounded-full animate-spin mb-10 mx-auto" />
             <p className="handwritten text-5xl text-emerald-900/50">Consulting Universal Archives...</p>
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-900/20 mt-6">Analyzing Biological Geometry</p>
          </div>
        )}

        <ResultCard />
      </main>

      <footer className="mt-52 pb-20 border-t border-emerald-900/10 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex items-center gap-6">
           <div className="w-12 h-12 rounded-2xl bg-emerald-950 flex items-center justify-center text-emerald-400 font-black text-xl">A</div>
           <div>
              <p className="text-sm font-black text-emerald-950 uppercase tracking-[0.2em]">© 2025 NatureLens • Atharva</p>
              <p className="text-[10px] text-emerald-800/40 font-bold uppercase tracking-wider mt-1">Chief Architect & Engineer</p>
           </div>
        </div>
        
        <div className="flex gap-10">
           <div className="text-right">
              <p className="text-xs font-black text-emerald-950 uppercase tracking-widest mb-1">Engine</p>
              <p className="text-[10px] text-emerald-800/50 font-medium">Gemini Pro Vision 3.0</p>
           </div>
           <div className="text-right">
              <p className="text-xs font-black text-emerald-950 uppercase tracking-widest mb-1">Status</p>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active System</p>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
