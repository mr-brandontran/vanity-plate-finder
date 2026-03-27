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

  // Vault State
  const [vault, setVault] = useState<string[]>([]);
  const [showVault, setShowVault] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);

  const baseUrl = "https://unconserving-juridically-roselle.ngrok-free.dev"; // Your static ngrok URL

  const checkPlates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;

    setLoading(true);
    setResults(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const queryParams = new URLSearchParams({
        word: word,
        clean_only: cleanOnly.toString(),
        max_length: maxLength.toString(),
        max_variants: maxVariants.toString()
      });

      const response = await fetch(`${baseUrl}/api/check?${queryParams}`, {
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
         alert("The backend encountered an error. Check your Python terminal.");
         setLoading(false);
         return;
      }

      setResults(data);
      // Auto-refresh the vault if it's open so new finds appear instantly!
      if (showVault) loadVault(); 
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("Search timed out after 2 minutes. Try reducing the variant count.");
      } else {
        alert("Could not connect to the local server. Ensure ngrok and Uvicorn are running.");
      }
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch the Vault Data
  const loadVault = async () => {
    if (showVault && vault.length > 0) {
      setShowVault(false);
      return;
    }
    
    setVaultLoading(true);
    setShowVault(true);

    try {
      const response = await fetch(`${baseUrl}/api/vault`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await response.json();
      setVault(data.vault || []);
    } catch (error) {
      console.error("Failed to load vault", error);
      alert("Could not load the vault. Is your backend running?");
      setShowVault(false);
    } finally {
      setVaultLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-neutral-50 p-6 sm:p-12 font-sans selection:bg-[#0A84FF]/30 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-10 pt-10 sm:pt-20 pb-20">
        
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
              className="bg-[#0A84FF] hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-medium text-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Search'}
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
                <input type="checkbox" checked={cleanOnly} onChange={(e) => setCleanOnly(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div>
              </label>
            </div>
            <hr className="border-neutral-800" />
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-base font-medium text-neutral-200">Max Length</label>
                <span className="text-neutral-500">{maxLength}</span>
              </div>
              <input type="range" min="2" max="7" value={maxLength} onChange={(e) => setMaxLength(Number(e.target.value))} className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#0A84FF]" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-base font-medium text-neutral-200">Max Variants Tested</label>
                <span className="text-neutral-500">{maxVariants}</span>
              </div>
              <input type="range" min="1" max="25" value={maxVariants} onChange={(e) => setMaxVariants(Number(e.target.value))} className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#0A84FF]" />
            </div>
          </div>
        </form>

        {/* Search Results */}
        {results && (
          <div className="space-y-4 animate-in fade-in duration-500">
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
                <div className="p-8 text-center text-neutral-500 font-medium">No available variations found.</div>
              )}
            </div>
          </div>
        )}

        {/* THE VAULT SECTION */}
        <div className="pt-8 border-t border-neutral-800 mt-12">
          <button 
            onClick={loadVault}
            className="w-full py-4 rounded-2xl font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
          >
            {vaultLoading ? (
               <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
            ) : showVault ? 'Hide Database' : 'View Available Database'}
          </button>

          {showVault && !vaultLoading && (
            <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-medium tracking-tight text-white">All Available Plates</h2>
                <span className="text-sm text-neutral-500">{vault.length} total</span>
              </div>
              
              <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-800 max-h-[400px] overflow-y-auto">
                {vault.length > 0 ? (
                  vault.map((plate: string) => (
                    <div key={plate} className="flex items-center justify-between p-4 hover:bg-neutral-800/50 transition-colors">
                      <span className="text-xl font-medium tracking-widest text-white">{plate}</span>
                      <span className="text-xs font-medium text-neutral-500 px-2 py-1 bg-neutral-800 rounded-md">Saved</span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-neutral-500 font-medium">Your vault is empty. Search for some plates!</div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}