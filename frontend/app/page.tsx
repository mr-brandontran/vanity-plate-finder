'use client';

import { useState } from 'react';

export default function Home() {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // NEW STATE VARIABLES FOR OUR TOGGLES
  const [cleanOnly, setCleanOnly] = useState(false);
  const [maxLength, setMaxLength] = useState(7);
  const [maxVariants, setMaxVariants] = useState(10);

  const checkPlates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;

    setLoading(true);
    setResults(null);

    try {
      // NEW: We inject the toggle states directly into the URL!
      const url = `https://vanity-plate-finder.onrender.com/api/check?word=${word}&clean_only=${cleanOnly}&max_length=${maxLength}&max_variants=${maxVariants}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data.variations_tested) {
         console.error("Backend Error Data:", data);
         alert("The backend encountered an error. Check your Python terminal for details!");
         setLoading(false);
         return;
      }

      setResults(data);
    } catch (error) {
      console.error("Failed to fetch plates", error);
      alert("Failed to connect to the backend. Is your Python server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8 font-sans flex flex-col items-center pt-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-2 text-center text-blue-400">Vanity Plate Finder</h1>
        <p className="text-slate-400 text-center mb-8">Mathematically generate and check California plate variations.</p>

        <form onSubmit={checkPlates} className="mb-8">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="e.g. BGR88X"
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500 text-xl tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal"
              maxLength={7}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Scanning...' : 'Search'}
            </button>
          </div>

          {/* NEW CONTROL PANEL */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-wrap gap-6 justify-between items-center text-sm">
            
            {/* Clean Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={cleanOnly} 
                onChange={(e) => setCleanOnly(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="font-semibold text-slate-300">Clean Plates Only</span>
              <span className="text-slate-500 text-xs">(No Numbers)</span>
            </label>

            {/* Max Length Slider */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-300 flex justify-between">
                Max Length: <span className="text-blue-400">{maxLength} chars</span>
              </label>
              <input 
                type="range" min="2" max="7" 
                value={maxLength} 
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="w-32 accent-blue-500"
              />
            </div>

            {/* Max Variants Slider */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-300 flex justify-between">
                Check Top: <span className="text-blue-400">{maxVariants} variants</span>
              </label>
              <input 
                type="range" min="1" max="25" 
                value={maxVariants} 
                onChange={(e) => setMaxVariants(Number(e.target.value))}
                className="w-32 accent-blue-500"
              />
            </div>
            
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="text-center p-8 bg-slate-800 rounded-lg animate-pulse border border-slate-700">
            <p className="text-blue-400 font-bold text-lg mb-2">Connecting to DMV...</p>
            <p className="text-slate-400 text-sm">Testing your selected variations against the California database.</p>
          </div>
        )}

        {/* Results State */}
        {results && (
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">Results for &quot;{results.seed_word}&quot;</h2>
            
            <div className="mb-6">
              <h3 className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-bold">Variations Tested</h3>
              <div className="flex flex-wrap gap-2">
                {results.variations_tested.map((plate: string) => (
                  <span key={plate} className="px-3 py-1 bg-slate-700 rounded text-slate-300 font-mono">
                    {plate}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm text-slate-400 mb-3 uppercase tracking-wider font-bold">Available to Claim</h3>
              {results.available_plates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.available_plates.map((plate: string) => (
                    <div key={plate} className="bg-green-900/30 border border-green-500/50 p-4 rounded-lg flex items-center justify-between">
                      <span className="text-2xl font-black tracking-widest text-green-400">{plate}</span>
                      <span className="text-xs font-bold uppercase tracking-wider bg-green-500/20 text-green-300 px-2 py-1 rounded">Available</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed border-red-500/30 rounded-lg bg-red-900/10">
                  <p className="text-red-400">All tested variations are taken.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}