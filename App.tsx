
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
          document.getElementById('result-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    } catch (err) {
      console.error("System Error during identification:", err);
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
      <header className="flex flex-col items-center mb-24 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900/5 rounded-full mb-10 border border-slate-900/5 shadow-sm">
           <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
           <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-800 italic">Vision v5.0 • Engineered by Atharva</span>
        </div>
        
        <h1 className="text-8xl md:text-[10rem] font-bold text-slate-900 tracking-tighter mb-6 italic leading-none select-none">NatureLens</h1>
        <p className="handwritten text-slate-500 text-4xl md:text-5xl">The Living World, Identified.</p>
      </header>

      <main className="space-y-32">
        <div className="max-w-5xl mx-auto w-full group">
          <CameraView onCapture={handleProcessImage} isLoading={isLoading} />
        </div>
        
        <div className="flex flex-col items-center gap-10">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="btn-action px-20 py-7 rounded-[2.5rem] font-black text-sm tracking-[0.4em] uppercase shadow-2xl"
          >
            Upload Specimen
          </button>
        </div>

        {isLoading && !result && (
          <div className="text-center py-24">
             <div className="w-24 h-24 border-[4px] border-slate-900/5 border-t-emerald-600 rounded-full animate-spin mb-10 mx-auto" />
             <p className="handwritten text-5xl text-slate-400 italic">Scanning global biological archives...</p>
             <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-300 mt-4">Analyzing Cellular Geometry</p>
          </div>
        )}

        {result && capturedImage && (
          <div id="result-focus" className="glass rounded-[5rem] p-10 md:p-20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-24 duration-1000">
            <div className="flex flex-col xl:flex-row gap-20">
              <div className="w-full xl:w-2/5">
                <div className="sticky top-12">
                  <div className="aspect-[3/4] rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-white group relative">
                    <img src={`data:image/jpeg;base64,${capturedImage}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Captured nature specimen" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-10 flex bg-slate-100/50 p-2.5 rounded-3xl border border-slate-200">
                    <button onClick={() => setMode(AppMode.EASY)} className={`flex-1 py-5 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase transition-all ${mode === AppMode.EASY ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>DISCOVERY</button>
                    <button onClick={() => setMode(AppMode.ADVANCED)} className={`flex-1 py-5 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase transition-all ${mode === AppMode.ADVANCED ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>SCIENTIFIC</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-16">
                <header>
                  <p className="handwritten text-emerald-600 text-4xl mb-4">Observation Record</p>
                  <h2 className="text-7xl md:text-8xl font-bold text-slate-900 mb-6 tracking-tight leading-none">{result.friendlyName}</h2>
                  <div className="flex items-center gap-4">
                    <div className="h-0.5 w-10 bg-emerald-500/30"></div>
                    <p className="text-3xl text-slate-400 italic serif">{result.scientificName}</p>
                  </div>
                </header>

                <div className="h-px bg-slate-200 w-full" />

                {mode === AppMode.EASY ? (
                  <div className="space-y-16">
                    <p className="text-4xl text-slate-800 leading-snug font-light italic tracking-tight">"{result.easyDescription}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {result.funFacts.map((fact, i) => (
                        <div key={i} className="bg-emerald-50/40 p-10 rounded-[3rem] border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-slate-700 text-base leading-relaxed font-medium">{fact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-16">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                       <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                          <p className="text-[11px] font-black uppercase text-slate-300 mb-3 tracking-widest">Kingdom</p>
                          <p className="text-2xl font-bold text-slate-900">{result.taxonomy.kingdom}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                          <p className="text-[11px] font-black uppercase text-slate-300 mb-3 tracking-widest">Family</p>
                          <p className="text-2xl font-bold text-slate-900">{result.taxonomy.family}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                          <p className="text-[11px] font-black uppercase text-slate-300 mb-3 tracking-widest">Conservation</p>
                          <p className="text-2xl font-bold text-emerald-700">{result.advancedInfo.conservationStatus}</p>
                       </div>
                    </div>
                    <div className="space-y-12">
                      <div className="p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100">
                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-5">Environmental Habitat</h4>
                        <p className="text-xl text-slate-700 leading-relaxed font-light">{result.advancedInfo.habitat}. Native distribution: {result.advancedInfo.distribution}</p>
                      </div>
                      <div className="p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100">
                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-5">Behavioral Ecology</h4>
                        <p className="text-xl text-slate-700 leading-relaxed font-light">{result.advancedInfo.behavior}. Diet consists of: {result.advancedInfo.diet}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-60 pb-20 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-2xl">A</div>
           <div>
              <p className="text-lg font-black text-slate-900 uppercase tracking-[0.2em]">NatureLens</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Architected by Atharva</p>
           </div>
        </div>
        <div className="flex items-center gap-16">
           <div className="text-right">
              <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Infrastructure</p>
              <p className="text-sm font-bold text-slate-900 italic serif">Atharva Core Vision v5.0</p>
           </div>
           <p className="text-[11px] font-black text-slate-200 uppercase tracking-[0.6em] hidden xl:block">Genomics • Taxonomy • AI Engineering</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
