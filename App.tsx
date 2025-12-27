
import React, { useState, useCallback, useRef } from 'react';
import { identifySpecies, lookupSpeciesByName } from './services/geminiService';
import { NatureInfo, AppMode, RelatedSpecies } from './types';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  const [isLookingUp, setIsLookingUp] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessImage = useCallback(async (base64: string) => {
    setIsLoading(true);
    setResult(null);
    setErrorMsg(null);
    
    try {
      const data = await identifySpecies(base64);
      if (data) {
        setResult(data);
        // Delay scroll to ensure the DOM has updated
        setTimeout(() => {
          const element = document.getElementById('result-heading');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            element.focus();
          }
        }, 300);
      } else {
        setErrorMsg("The AI couldn't find a clear subject. Try taking the photo again from a different angle.");
      }
    } catch (err: any) {
      console.error("Processing error:", err);
      // Check for common failure causes
      if (!process.env.API_KEY) {
        setErrorMsg("API key not found. Please ensure the 'API_KEY' environment variable is correctly set in your deployment settings.");
      } else {
        setErrorMsg("Could not connect to the analysis engine. Please check your internet connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQuickLookup = async (species: RelatedSpecies) => {
    setIsLookingUp(species.name);
    try {
      const info = await lookupSpeciesByName(species.name);
      alert(`${species.name}\n\n${info}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLookingUp(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      if (res) {
        handleProcessImage(res.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  };

  const ResultCard = () => {
    if (!result) return null;

    return (
      <section 
        id="result" 
        className="mt-12 glass rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/60 animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
          <div className="max-w-xl">
            <p className="handwritten text-emerald-600 text-2xl mb-1 ml-1 transform -rotate-2">I found a...</p>
            <h2 
              id="result-heading" 
              tabIndex={-1} 
              className="text-5xl md:text-6xl font-bold text-emerald-950 mb-3 focus:outline-none leading-tight"
            >
              {result.friendlyName}
            </h2>
            <p className="text-xl text-emerald-700/70 italic font-medium tracking-wide font-serif">
              {result.scientificName}
            </p>
          </div>
          
          <div className="flex bg-emerald-950/5 p-1.5 rounded-2xl border border-emerald-950/10 self-start md:self-center">
            <button
              onClick={() => setMode(AppMode.EASY)}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500 ${
                mode === AppMode.EASY ? 'bg-emerald-800 text-white shadow-lg' : 'text-emerald-900/50 hover:text-emerald-900'
              }`}
            >
              Easy Read
            </button>
            <button
              onClick={() => setMode(AppMode.ADVANCED)}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500 ${
                mode === AppMode.ADVANCED ? 'bg-emerald-800 text-white shadow-lg' : 'text-emerald-900/50 hover:text-emerald-900'
              }`}
            >
              Scientist
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-900/20 to-transparent mb-12" />

        {mode === AppMode.EASY ? (
          <div className="grid gap-10">
            <div className="relative">
              <span className="absolute -left-6 -top-4 text-7xl text-emerald-100 font-serif italic -z-10 select-none">“</span>
              <p className="text-2xl text-emerald-900/90 leading-relaxed font-light pl-4">
                {result.easyDescription}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {result.funFacts.map((fact, i) => (
                <div key={i} className="bg-white/50 p-6 rounded-[2rem] border border-emerald-100/50 hover:shadow-xl transition-all">
                  <div className="handwritten text-emerald-500 text-xl mb-2">Did you know?</div>
                  <p className="text-emerald-900/80 text-sm leading-relaxed">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-12">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="bg-white/50 p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-900/30 mb-6">Taxonomy</h4>
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

                <div className="bg-emerald-950 text-emerald-50 p-8 rounded-[2rem] shadow-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-2">Conservation Status</h4>
                    <p className="text-2xl font-bold">{result.advancedInfo.conservationStatus}</p>
                  </div>
                  <div className="w-14 h-14 rounded-full border-2 border-emerald-800 flex items-center justify-center">
                    <span className="text-emerald-400 text-2xl animate-pulse">●</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/40 p-6 rounded-2xl border border-white/60">
                   <h4 className="text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest mb-3">Distribution</h4>
                   <p className="text-sm text-emerald-900/80 leading-relaxed">{result.advancedInfo.distribution}</p>
                </div>
                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-950/5">
                   <h4 className="text-[10px] font-bold text-emerald-700/50 uppercase tracking-widest mb-3">Conservation Efforts</h4>
                   <p className="text-sm text-emerald-900/80 leading-relaxed italic">{result.advancedInfo.conservationEfforts}</p>
                </div>
              </div>
            </div>

            {result.aquaticInfo && (
              <div className="bg-blue-50/50 border border-blue-200/40 p-10 rounded-[3rem] shadow-sm">
                <h4 className="text-blue-900 font-bold text-2xl font-serif mb-6">Aquatic Analysis</h4>
                <div className="grid md:grid-cols-2 gap-10">
                   <div>
                      <h5 className="text-[10px] font-bold text-blue-900/30 uppercase tracking-widest mb-4">Compatible Species</h5>
                      <div className="flex flex-wrap gap-2.5">
                        {result.aquaticInfo.compatibleTankMates.map((mate, i) => (
                          <span key={i} className="px-4 py-2 bg-white/80 text-blue-800 rounded-xl text-xs font-bold border border-blue-100/50">
                            {mate}
                          </span>
                        ))}
                      </div>
                   </div>
                   <div>
                      <h5 className="text-[10px] font-bold text-blue-900/30 uppercase tracking-widest mb-4">Habitat Notes</h5>
                      <p className="text-sm text-blue-900/80 leading-relaxed italic">
                        {result.aquaticInfo.cohabitationNotes}
                      </p>
                   </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/30 p-6 rounded-2xl border border-white/60">
                <h4 className="text-[10px] font-bold text-emerald-900/30 uppercase tracking-widest mb-3">Subspecies</h4>
                <p className="text-sm text-emerald-900/80 leading-relaxed">{result.advancedInfo.subspecies.join(', ') || 'None identified'}</p>
              </div>
              <div className="bg-white/30 p-6 rounded-2xl border border-white/60">
                <h4 className="text-[10px] font-bold text-emerald-900/30 uppercase tracking-widest mb-3">Diet</h4>
                <p className="text-sm text-emerald-900/80 leading-relaxed">{result.advancedInfo.diet}</p>
              </div>
              <div className="bg-white/30 p-6 rounded-2xl border border-white/60">
                <h4 className="text-[10px] font-bold text-emerald-900/30 uppercase tracking-widest mb-3">Behavior</h4>
                <p className="text-sm text-emerald-900/80 leading-relaxed">{result.advancedInfo.behavior}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-20">
          <p className="handwritten text-emerald-600/60 text-xl text-center mb-2">Explore related species</p>
          <div className="grid md:grid-cols-3 gap-8">
            {result.relatedSpecies.map((species, i) => (
              <button
                key={i}
                disabled={!!isLookingUp}
                onClick={() => handleQuickLookup(species)}
                className="group text-left bg-emerald-950/5 hover:bg-emerald-950 hover:text-white p-8 rounded-[2.5rem] border border-emerald-950/5 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-100 group-hover:bg-emerald-800 text-emerald-800 group-hover:text-emerald-50 px-3 py-1 rounded-full">
                    {species.relationType}
                  </span>
                  {isLookingUp === species.name && (
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <h4 className="text-xl font-bold mb-1 font-serif">{species.name}</h4>
                <p className="text-[11px] italic opacity-50 mb-4">{species.scientificName}</p>
                <p className="text-xs leading-relaxed opacity-70 group-hover:opacity-90 line-clamp-3">
                  {species.briefReason}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <header className="flex flex-col items-center mb-20 relative">
        <div className="bg-emerald-950 p-6 rounded-[2.5rem] shadow-2xl mb-8">
           <svg className="w-14 h-14 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </div>
        <h1 className="text-7xl font-bold text-emerald-950 tracking-tighter mb-3 italic">NatureLens</h1>
        <p className="handwritten text-emerald-800/60 text-2xl mb-2">Discover the world through AI</p>
      </header>

      <main className="space-y-16">
        <CameraView onCapture={handleProcessImage} isLoading={isLoading} />
        
        <div className="flex flex-col items-center gap-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-10 py-5 bg-emerald-950 text-white font-bold rounded-[2rem] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl"
          >
            Upload an Image
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-8 rounded-[2rem] text-center max-w-lg mx-auto">
            <p className="handwritten text-red-600 text-3xl mb-2">Optical Alert</p>
            <p className="text-red-900/70 text-sm font-medium">{errorMsg}</p>
            <button 
              onClick={() => setErrorMsg(null)}
              className="mt-6 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading && !result && (
          <div className="mt-16 text-center py-24" role="status">
             <div className="w-24 h-24 border-[3px] border-emerald-950/5 border-t-emerald-800 rounded-full animate-spin mb-10 mx-auto" />
             <p className="handwritten text-4xl text-emerald-900/70">Identifying your discovery...</p>
          </div>
        )}

        <ResultCard />
      </main>

      <footer className="mt-40 pt-16 border-t border-emerald-900/10 flex flex-col md:flex-row items-center justify-between gap-10 opacity-70">
        <div className="text-center md:text-left">
          <p className="text-sm font-bold text-emerald-950 uppercase tracking-[0.25em]">© 2025 NatureLens</p>
        </div>
        
        <div className="text-center bg-white/40 p-6 rounded-[2rem] border border-white/60 max-w-sm">
           <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest mb-2">Developed by Atharva</p>
           <p className="text-[11px] text-emerald-800/70 leading-relaxed italic">
             Connecting curiosity with intelligence.
           </p>
        </div>

        <div className="text-center md:text-right">
          <p className="text-sm font-bold text-emerald-950">Powered by Gemini 3</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
