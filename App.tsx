
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { identifySpecies, lookupSpeciesByName, getRelatedSpeciesDetail } from './services/geminiService';
import { NatureInfo, AppMode, RelatedSpecies, SpeciesDetail } from './types';
import CameraView from './components/CameraView';

const App: React.FC = () => {
  const [result, setResult] = useState<NatureInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.EASY);
  const [isLookingUp, setIsLookingUp] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);
  
  // Related species detailed information state
  const [relatedDetails, setRelatedDetails] = useState<Record<string, SpeciesDetail>>({});
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  
  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Feedback Utilities
  const playSuccessSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
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

  const checkKeyStatus = useCallback(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === "undefined" || apiKey === "") {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(true);
      }
    } catch (e) {
      setHasKey(false);
    }
  }, []);

  useEffect(() => {
    checkKeyStatus();
  }, [checkKeyStatus]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setErrorMsg(null);
    } catch (err) {
      console.error("Failed to open key selector", err);
    }
  };

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
        
        // After main identification, fetch separate details for each related species
        setIsFetchingRelated(true);
        const detailPromises = data.relatedSpecies.map(async (species) => {
          try {
            const details = await getRelatedSpeciesDetail(species.name);
            return { name: species.name, details };
          } catch (e) {
            console.error(`Failed to fetch details for ${species.name}`, e);
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
          const element = document.getElementById('result-heading');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            element.focus();
          }
        }, 300);
      } else {
        playErrorSound();
        setErrorMsg("The AI couldn't find a clear subject. Try taking the photo again from a different angle.");
      }
    } catch (err: any) {
      playErrorSound();
      console.error("Processing error:", err);
      const errorMessage = err.message?.toLowerCase() || "";
      const isAuthError = 
        errorMessage.includes("api_key_missing") || 
        errorMessage.includes("unauthorized") || 
        errorMessage.includes("401") || 
        errorMessage.includes("key not found") ||
        errorMessage.includes("requested entity was not found") ||
        errorMessage.includes("invalid api key");

      if (isAuthError) {
        setHasKey(false);
        setErrorMsg("Your API key is missing or invalid. Please select a valid key to continue.");
      } else {
        setErrorMsg("The analysis engine is temporarily unavailable. Please check your connection or try a smaller image.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [playSuccessSound, playErrorSound]);

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

  // Zoom/Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setZoom(prev => Math.min(Math.max(prev + delta, 1), 5));
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-10 max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-emerald-950 p-8 rounded-[3rem] shadow-2xl">
            <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-emerald-950 italic">NatureLens Setup</h1>
          <p className="text-xl text-emerald-800/80 font-medium leading-relaxed">
            Ready to explore? We just need an API key to power the AI.
          </p>
        </div>

        <div className="grid gap-6 w-full max-w-md">
          <div className="bg-white/50 p-6 rounded-[2rem] border border-emerald-100 text-left">
            <h3 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-white text-[10px] flex items-center justify-center">1</span>
              Click the button below
            </h3>
            <p className="text-sm text-emerald-900/60 leading-relaxed">
              A secure dialog will appear. Select a Google Cloud project with the Gemini API enabled.
            </p>
          </div>

          <div className="bg-white/50 p-6 rounded-[2rem] border border-emerald-100 text-left">
            <h3 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-950 text-white text-[10px] flex items-center justify-center">2</span>
              Ensure Billing is Enabled
            </h3>
            <p className="text-sm text-emerald-900/60 leading-relaxed">
              Advanced vision tasks require a project from a paid tier. 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline ml-1 font-medium">View Billing Docs</a>
            </p>
          </div>
        </div>

        <button
          onClick={handleSelectKey}
          className="group relative px-12 py-6 bg-emerald-950 text-white font-bold rounded-[2.5rem] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(6,78,59,0.3)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <span className="relative text-lg">Select API Key</span>
        </button>

        <button 
          onClick={() => window.location.reload()}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-900/40 hover:text-emerald-900 transition-colors"
        >
          Already selected? Refresh Page
        </button>
      </div>
    );
  }

  const ResultCard = () => {
    if (!result || !capturedImage) return null;

    return (
      <section 
        id="result" 
        className="mt-12 glass rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/60 animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-3xl -mr-10 -mt-10" />
        
        {/* Specimen Observer Section */}
        <div className="mb-12 relative">
          <div className="handwritten text-emerald-600 text-2xl mb-4 text-center">Specimen Observation</div>
          <div 
            className="relative w-full aspect-video rounded-[2.5rem] bg-emerald-900/5 overflow-hidden cursor-move shadow-inner border border-emerald-950/10 group"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <img 
              src={`data:image/jpeg;base64,${capturedImage}`} 
              alt="Nature specimen"
              className="w-full h-full object-contain transition-transform duration-200 ease-out select-none pointer-events-none"
              style={{
                transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`
              }}
            />
            
            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-emerald-950/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))}
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Zoom Out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
              </button>
              <div className="text-[10px] font-bold text-white/50 w-12 text-center tabular-nums">
                {zoom.toFixed(1)}x
              </div>
              <button 
                onClick={() => setZoom(prev => Math.min(prev + 0.5, 5))}
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Zoom In"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button 
                onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
                className="px-4 h-10 flex items-center justify-center text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                Reset
              </button>
            </div>
            
            {/* Instructions Overlay */}
            <div className="absolute top-6 left-6 pointer-events-none opacity-40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-950">Drag to Pan • Wheel to Zoom</p>
            </div>
          </div>
        </div>

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

        {/* New Detailed Related Species Section */}
        <div className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="handwritten text-emerald-600 text-2xl mb-1">Ecosystem Context</p>
              <h3 className="text-3xl font-bold text-emerald-950">Related Species Deep-Dive</h3>
            </div>
            {isFetchingRelated && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Gathering Data...</span>
              </div>
            )}
          </div>

          <div className="grid gap-8">
            {result.relatedSpecies.map((species, i) => (
              <div 
                key={i} 
                className="group bg-white/40 p-10 rounded-[3rem] border border-white/60 hover:border-emerald-200/50 hover:bg-white/60 transition-all duration-700 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row gap-10">
                  <div className="lg:w-1/3">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
                      {species.relationType}
                    </span>
                    <h4 className="text-2xl font-bold text-emerald-950 mb-1">{species.name}</h4>
                    <p className="text-sm italic text-emerald-700/60 mb-6 font-serif">{species.scientificName}</p>
                    <p className="text-sm leading-relaxed text-emerald-900/70 border-l-2 border-emerald-100 pl-4 italic">
                      "{species.briefReason}"
                    </p>
                  </div>

                  <div className="lg:w-2/3">
                    {relatedDetails[species.name] ? (
                      <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-6">
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/30 mb-2">Description</h5>
                            <p className="text-sm text-emerald-900/80 leading-relaxed">
                              {relatedDetails[species.name].description}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/30 mb-2">Key Characteristic</h5>
                            <p className="text-sm font-bold text-emerald-800">
                              {relatedDetails[species.name].keyCharacteristic}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/30 mb-2">Habitat</h5>
                            <p className="text-xs text-emerald-900/70 leading-relaxed italic">
                              {relatedDetails[species.name].habitatSummary}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/30 mb-2">Status</h5>
                            <p className="text-xs font-medium text-emerald-700">
                              {relatedDetails[species.name].conservationNote}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-emerald-900/5 rounded-[2rem] bg-emerald-50/20 p-8">
                        {isFetchingRelated ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-emerald-900/20 uppercase tracking-widest">Compiling Files</p>
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-emerald-900/20 uppercase tracking-widest">Detail Not Available</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

        {(isLoading || isFetchingRelated) && !result && (
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
          <p className="text-sm font-bold text-emerald-950">Gemini 3 Flash</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
