'use client';

import { useState } from 'react';

export default function Home() {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Search parameters
  const [cleanOnly, setCleanOnly] = useState(false);
  const [maxLength, setMaxLength] = useState(7);
  const [maxVariants, setMaxVariants] = useState(10);

  const checkPlates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;

    setLoading(true);
    setResults(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      // Remember to keep your ngrok static URL here if you set it up!
      const baseUrl = "https://unconserving-juridically-roselle.ngrok-free.dev/api/check";
      const queryParams = new URLSearchParams({
        word: word,
        clean_only: cleanOnly.toString(),
        max_length: maxLength.toString(),
        max_variants: maxVariants.toString()
      });

      const response = await fetch(`${baseUrl}?${queryParams}`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" 
        }
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
         console.error("Backend Error:", data);
         alert("The backend encountered an error. Check your Python terminal.");
         setLoading(false);
         return;
      }

      setResults(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("Search timed out after 2 minutes. Try reducing the variant count.");
      } else {
        console.error("Connection failed", error);
        alert("Could not connect to the local server. Ensure ngrok and Uvicorn are running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-neutral-50 p-6 sm:p-12 font-sans selection:bg-[#0A84FF]/30 flex justify-center">
      <div className="w-full max-w-lg space-y-10 pt-10 sm:pt-20">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Vanity Plate Finder</h1>
        </div>

        {/* Main Interface */}
        <form onSubmit={checkPlates} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="Enter plate idea"
              className="flex-1 bg-[#1C1C1E] border border-neutral-800 focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF] rounded-2xl px-5 py-4 text-xl tracking-wide uppercase placeholder:normal-case placeholder:text-neutral-500 placeholder:tracking-normal outline-none transition-all"
              maxLength={7}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#0A84FF] hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-medium text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>

          {/* Settings Panel */}
          <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-neutral-200">Clean Plates Only</p>
                <p className="text-sm text-neutral-500">Exclude numbers from variations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cleanOnly} 
                  onChange={(e) => setCleanOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div>
              </label>
            </div>

            <hr className="border-neutral-800" />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-base font-medium text-neutral-200">Max Length</label>
                <span className="text-neutral-500">{maxLength}</span>
              </div>
              <input 
                type="range" min="2" max="7" 
                value={maxLength} 
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#0A84FF]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-base font-medium text-neutral-200">Max Variants Tested</label>
                <span className="text-neutral-500">{maxVariants}</span>
              </div>
              <input 
                type="range" min="1" max="25" 
                value={maxVariants} 
                onChange={(e) => setMaxVariants(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#0A84FF]"
              />
            </div>
          </div>
        </form>

        {/* Results */}
        {results && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-medium tracking-tight text-white">Results</h2>
              <span className="text-sm text-neutral-500">{results.available_plates.length} found</span>
            </div>
            
            <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-800">
              {results.available_plates.length > 0 ? (
                results.available_plates.map((plate: string) => (
                  <div key={plate} className="flex items-center justify-between p-5 hover:bg-neutral-800/50 transition-colors">
                    <span className="text-2xl font-medium tracking-widest text-white">{plate}</span>
                    <span className="text-sm font-medium text-[#34C759]">Available</span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-neutral-500 font-medium">No available variations found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}