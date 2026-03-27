'use client';

import { useState } from 'react';

export default function Home() {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Settings for the search engine
  const [cleanOnly, setCleanOnly] = useState(false);
  const [maxLength, setMaxLength] = useState(7);
  const [maxVariants, setMaxVariants] = useState(10);

  const checkPlates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;

    setLoading(true);
    setResults(null);

    // 1. Setup a 2-minute (120,000ms) timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      // 2. Dynamic URL: Sends your toggle choices to the backend on your Mac
      const baseUrl = "https://unconserving-juridically-roselle.ngrok-free.dev/api/check";
      const queryParams = new URLSearchParams({
        word: word,
        clean_only: cleanOnly.toString(),
        max_length: maxLength.toString(),
        max_variants: maxVariants.toString()
      });

      const response = await fetch(`${baseUrl}?${queryParams}`, {
        method: "GET",
        signal: controller.signal, // Connects the timeout to this request
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" 
        }
      });

      // Clear the timer if it finishes before 2 minutes
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error("Backend Error Data:", data);
        alert("The backend encountered an error. Check your Python terminal!");
        setLoading(false);
        return;
     }

      setResults(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("The DMV search took over 2 minutes. Try searching for fewer variants (Check Top slider)!");
      } else {
        console.error("Connection failed", error);
        alert("Could not connect to your Mac. Is ngrok and python3 app.py running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans flex flex-col items-center pt-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic tracking-tighter">
            VANITY PLATE FINDER
          </h1>
          <p className="text-slate-400 font-medium">UCLA Math x CA DMV Real-time Scraper</p>
        </div>

        <form onSubmit={checkPlates} className="space-y-4 mb-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="ENTER PLATE IDEA"
              className="flex-1 px-6 py-4 rounded-2xl bg-slate-900 border-2 border-slate-800 focus:outline-none focus:border-blue-600 text-2xl tracking-[0.2em] font-black uppercase placeholder:tracking-normal placeholder:font-medium"
              maxLength={7}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-2xl font-black text-xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-900/20"
            >
              {loading ? 'SCANNING...' : 'SEARCH'}
            </button>
          </div>

          {/* CONTROL PANEL */}
          <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-wrap gap-8 justify-between items-center text-sm backdrop-blur-sm">
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={cleanOnly} 
                onChange={(e) => setCleanOnly(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-none checked:bg-blue-500 accent-blue-500"
              />
              <div className="flex flex-col">
                <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">Clean Only</span>
                <span className="text-slate-500 text-[10px] uppercase">No Numbers</span>
              </div>
            </label>

            <div className="flex flex-col gap-2 min-w-[120px]">
              <label className="font-bold text-slate-400 text-[10px] uppercase tracking-widest flex justify-between">
                Max Length <span className="text-blue-400">{maxLength}</span>
              </label>
              <input 
                type="range" min="2" max="7" 
                value={maxLength} 
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2 min-w-[120px]">
              <label className="font-bold text-slate-400 text-[10px] uppercase tracking-widest flex justify-between">
                Check Top <span className="text-blue-400">{maxVariants}</span>
              </label>
              <input 
                type="range" min="1" max="25" 
                value={maxVariants} 
                onChange={(e) => setMaxVariants(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </form>

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center p-12 bg-slate-900 rounded-[2rem] border-2 border-blue-500/20 animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-400 font-black text-xl mb-1 italic">BYPASSING DMV FIREWALL...</p>
            <p className="text-slate-500 text-sm font-medium">Check your MacBook terminal to see the live logs.</p>
          </div>
        )}

        {/* RESULTS SECTION */}
        {results && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic tracking-tighter">RESULTS: {results.seed_word}</h2>
                <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full font-bold text-slate-500 uppercase tracking-widest">
                  {results.available_plates.length} FOUND
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.available_plates.length > 0 ? (
                  results.available_plates.map((plate: string) => (
                    <div key={plate} className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border-2 border-green-500/20 p-5 rounded-2xl flex items-center justify-between group hover:border-green-500/50 transition-all">
                      <span className="text-3xl font-black tracking-widest text-green-400 font-mono group-hover:scale-105 transition-transform">
                        {plate}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">AVAILABLE</span>
                        <span className="text-[8px] text-green-600 font-bold uppercase">CALIFORNIA</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-500 font-bold">All tested variations are currently taken.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}