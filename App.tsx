
import React, { useState, useCallback, useRef } from 'react';
import { identifySpecies } from './services/geminiService';
import { NatureInfo, AppMode } from './types';
import { LOCAL_DATABASE } from './services/localDatabase';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessImage = useCallback(async (base64: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCapturedImage(base64);
    
    try {
      const data = await identifySpecies(base64);
      setResult(data);
      setTimeout(() => {
        document.getElementById('result-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err: any) {
      console.error("Identification failed:", err);
      setError(err.message || "An unexpected error occurred during biological analysis.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const triggerDemo = () => {
    setIsDemoMode(true);
    setCapturedImage(null); 
    const randomSpecimen = LOCAL_DATABASE[Math.floor(Math.random() * LOCAL_DATABASE.length)];
    setResult(randomSpecimen);
    setError(null);
    setTimeout(() => {
      document.getElementById('result-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const getRelationColor = (type: string) => {
    switch (type) {
      case 'visually similar': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ecologically related': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'same family': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
      <header className="flex flex-col items-center mb-20 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900/5 rounded-full mb-10 border border-slate-900/5 shadow-sm">
           <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
           <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-800 italic">Vision Pro • Engineered by Atharva</span>
        </div>
        
        <h1 className="text-8xl md:text-[9rem] font-bold text-slate-900 tracking-tighter mb-4 italic leading-none select-none">NatureLens</h1>
        <p className="handwritten text-slate-500 text-4xl md:text-5xl">Identify the living world in real-time.</p>
      </header>

      <main className="space-y-24">
        <div className="max-w-5xl mx-auto w-full group">
          <CameraView onCapture={handleProcessImage} isLoading={isLoading} />
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="btn-action px-12 py-6 rounded-full font-black text-xs tracking-[0.3em] uppercase shadow-xl disabled:opacity-50"
          >
            Upload Specimen
          </button>
          
          <button
            onClick={triggerDemo}
            className="px-12 py-6 rounded-full font-black text-xs tracking-[0.3em] uppercase border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Demo Mode (Local DB)
          </button>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto bg-red-50 border-2 border-red-100 p-10 rounded-[3rem] text-center animate-in fade-in zoom-in duration-500">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">!</div>
             <h3 className="text-2xl font-bold text-red-900 mb-2 serif">Analysis Interrupted</h3>
             <p className="text-red-700/80 mb-6 leading-relaxed">{error}</p>
             <button onClick={() => setError(null)} className="text-xs font-black uppercase tracking-widest text-red-900 underline">Dismiss</button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-20">
             <div className="w-20 h-20 border-[4px] border-slate-900/5 border-t-emerald-600 rounded-full animate-spin mb-8 mx-auto" />
             <p className="handwritten text-4xl text-slate-400 italic">Consulting biological archives...</p>
          </div>
        )}

        {result && (
          <div id="result-focus" className="glass rounded-[5rem] p-10 md:p-20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-24 duration-700">
            <div className="flex flex-col xl:flex-row gap-20">
              <div className="w-full xl:w-2/5">
                <div className="sticky top-12">
                  <div className="aspect-[3/4] rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-white group relative bg-slate-100">
                    {capturedImage ? (
                      <img src={`data:image/jpeg;base64,${capturedImage}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Captured nature specimen" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                         <div className="text-8xl mb-4 italic serif">?</div>
                         <p className="text-[10px] font-black uppercase tracking-[0.3em]">Demo Specimen</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-10 flex bg-slate-100/50 p-2 rounded-3xl border border-slate-200">
                    <button onClick={() => setMode(AppMode.EASY)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all ${mode === AppMode.EASY ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Discovery</button>
                    <button onClick={() => setMode(AppMode.ADVANCED)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all ${mode === AppMode.ADVANCED ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Scientific</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-12">
                <header>
                  <p className="handwritten text-emerald-600 text-3xl mb-2">Species Identified</p>
                  <h2 className="text-6xl md:text-8xl font-bold text-slate-900 mb-4 tracking-tight leading-none">{result.friendlyName}</h2>
                  <p className="text-2xl text-slate-400 italic serif">{result.scientificName}</p>
                </header>

                <div className="h-px bg-slate-200 w-full" />

                {mode === AppMode.EASY ? (
                  <div className="space-y-12">
                    <p className="text-3xl text-slate-800 leading-snug font-light italic tracking-tight">"{result.easyDescription}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.funFacts.slice(0, 4).map((fact, i) => (
                        <div key={i} className="bg-emerald-50/40 p-8 rounded-[2.5rem] border border-emerald-100">
                          <p className="text-slate-700 text-sm leading-relaxed font-medium">{fact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-16">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-300 mb-2 tracking-widest">Kingdom</p>
                          <p className="text-xl font-bold text-slate-900">{result.taxonomy.kingdom}</p>
                       </div>
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-300 mb-2 tracking-widest">Family</p>
                          <p className="text-xl font-bold text-slate-900">{result.taxonomy.family}</p>
                       </div>
                       <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-black uppercase text-slate-300 mb-2 tracking-widest">Status</p>
                          <p className="text-xl font-bold text-emerald-700">{result.advancedInfo.conservationStatus}</p>
                       </div>
                    </div>

                    <div className="space-y-8">
                      <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Habitat & Range</h4>
                        <p className="text-lg text-slate-700 leading-relaxed">{result.advancedInfo.habitat}. Distribution: {result.advancedInfo.distribution}</p>
                      </div>
                      <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Ecology & Conservation</h4>
                        <p className="text-lg text-slate-700 leading-relaxed">{result.advancedInfo.behavior}. {result.advancedInfo.conservationEfforts}</p>
                      </div>
                    </div>

                    {/* Enhanced Related Species Section */}
                    <div className="pt-10">
                      <h3 className="serif text-4xl text-slate-900 mb-8 italic">Phylogenetic Connections</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {result.relatedSpecies && result.relatedSpecies.length > 0 ? (
                          result.relatedSpecies.map((species, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-6 p-8 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${getRelationColor(species.relationType)}`}>
                                    {species.relationType}
                                  </span>
                                </div>
                                <h4 className="text-2xl font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">{species.name}</h4>
                                <p className="serif italic text-slate-400 mb-4 text-lg">{species.scientificName}</p>
                                <p className="text-slate-600 text-sm leading-relaxed">{species.briefReason}</p>
                              </div>
                              <div className="flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic text-sm">No related species currently cataloged.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-40 pb-20 border-t border-slate-200 pt-20 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-6">
           <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">A</div>
           <div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-widest">NatureLens Vision</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Atharva AI Systems</p>
           </div>
        </div>
        <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em]">Global Biological Database Integration</p>
      </footer>
    </div>
  );
};

export default App;
