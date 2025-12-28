
import React, { useState, useCallback, useRef } from 'react';
import { identifySpecies } from './services/geminiService';
import { NatureInfo, AppMode } from './types';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessImage = useCallback(async (base64: string) => {
    setIsLoading(true);
    setResult(null);
    setCapturedImage(base64);
    
    try {
      const data = await identifySpecies(base64);
      if (data) {
        setResult(data);
        setTimeout(() => {
          document.getElementById('result-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    } catch (err) {
      console.error("Discovery error:", err);
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
      <header className="flex flex-col items-center mb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-950/5 rounded-full mb-8 border border-emerald-900/5">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/60 italic">System Status: Optimal • Vision by Atharva</span>
        </div>
        
        <h1 className="text-7xl md:text-9xl font-bold text-emerald-950 tracking-tighter mb-4 italic leading-tight">NatureLens</h1>
        <p className="handwritten text-emerald-800/50 text-3xl md:text-4xl">Exploring the Living World</p>
      </header>

      <main className="space-y-24">
        <div className="max-w-4xl mx-auto w-full">
          <CameraView onCapture={handleProcessImage} isLoading={isLoading} />
        </div>
        
        <div className="flex flex-col items-center gap-8">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="btn-premium px-16 py-6 rounded-[2rem] font-black text-sm tracking-[0.3em] uppercase"
          >
            Upload Specimen
          </button>
        </div>

        {isLoading && !result && (
          <div className="text-center py-20 animate-pulse">
             <div className="w-20 h-20 border-[3px] border-emerald-900/5 border-t-emerald-800 rounded-full animate-spin mb-8 mx-auto" />
             <p className="handwritten text-4xl text-emerald-900/40 italic">Cross-referencing biological database...</p>
          </div>
        )}

        {result && capturedImage && (
          <div id="result-card" className="glass rounded-[4rem] p-8 md:p-16 shadow-2xl animate-in fade-in slide-in-from-bottom-20 duration-1000">
            <div className="flex flex-col lg:flex-row gap-16">
              <div className="w-full lg:w-2/5">
                <div className="sticky top-12">
                  <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white group">
                    <img src={`data:image/jpeg;base64,${capturedImage}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  </div>
                  <div className="mt-8 flex justify-center bg-emerald-950/5 p-2 rounded-2xl border border-emerald-900/5">
                    <button onClick={() => setMode(AppMode.EASY)} className={`flex-1 py-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${mode === AppMode.EASY ? 'bg-emerald-800 text-white' : 'text-emerald-900/40'}`}>DISCOVERY</button>
                    <button onClick={() => setMode(AppMode.ADVANCED)} className={`flex-1 py-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${mode === AppMode.ADVANCED ? 'bg-emerald-800 text-white' : 'text-emerald-900/40'}`}>TAXONOMY</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-12">
                <header>
                  <p className="handwritten text-emerald-600 text-3xl mb-2">Specimen Identification</p>
                  <h2 className="text-6xl md:text-7xl font-bold text-emerald-950 mb-4">{result.friendlyName}</h2>
                  <p className="text-2xl text-emerald-700/60 italic serif">{result.scientificName}</p>
                </header>

                <div className="h-px bg-emerald-950/10 w-full" />

                {mode === AppMode.EASY ? (
                  <div className="space-y-12">
                    <p className="text-3xl text-emerald-900/80 leading-relaxed font-light italic">"{result.easyDescription}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.funFacts.map((fact, i) => (
                        <div key={i} className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100/50">
                          <p className="text-emerald-900/70 text-sm leading-relaxed font-medium">{fact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                       <div className="bg-white/50 p-6 rounded-3xl border border-emerald-900/5">
                          <p className="text-[10px] font-black uppercase text-emerald-900/30 mb-2">Kingdom</p>
                          <p className="text-xl font-bold text-emerald-950">{result.taxonomy.kingdom}</p>
                       </div>
                       <div className="bg-white/50 p-6 rounded-3xl border border-emerald-900/5">
                          <p className="text-[10px] font-black uppercase text-emerald-900/30 mb-2">Family</p>
                          <p className="text-xl font-bold text-emerald-950">{result.taxonomy.family}</p>
                       </div>
                       <div className="bg-white/50 p-6 rounded-3xl border border-emerald-900/5">
                          <p className="text-[10px] font-black uppercase text-emerald-900/30 mb-2">Conservation</p>
                          <p className="text-xl font-bold text-emerald-950">{result.advancedInfo.conservationStatus}</p>
                       </div>
                    </div>
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900/40 mb-3">Habitat & Distribution</h4>
                        <p className="text-lg text-emerald-950/80 leading-relaxed">{result.advancedInfo.habitat}. Found in: {result.advancedInfo.distribution}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900/40 mb-3">Behavior & Diet</h4>
                        <p className="text-lg text-emerald-950/80 leading-relaxed">{result.advancedInfo.behavior}. Primarily eats: {result.advancedInfo.diet}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-40 pt-16 border-t border-emerald-950/10 flex flex-col md:flex-row items-center justify-between gap-12 opacity-80">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-emerald-950 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl">A</div>
           <div>
              <p className="text-sm font-black text-emerald-950 uppercase tracking-[0.2em]">NatureLens</p>
              <p className="text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest mt-1 italic">Engineered by Atharva</p>
           </div>
        </div>
        <div className="flex items-center gap-12">
           <div className="text-right">
              <p className="text-[10px] font-black text-emerald-900/30 uppercase tracking-[0.3em] mb-1">Architecture</p>
              <p className="text-sm font-bold text-emerald-950 italic serif">Atharva Vision v4.0</p>
           </div>
           <p className="text-[10px] font-black text-emerald-950/20 uppercase tracking-[0.5em] hidden md:block">Discovery • Biology • Technology</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
