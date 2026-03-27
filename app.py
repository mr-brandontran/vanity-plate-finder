import itertools
import re
import asyncio
from playwright.async_api import async_playwright
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import db

app = FastAPI()

# Enable CORS so your Vercel frontend can talk to your Mac
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. THE GENERATOR BRAIN ---
LEET_DICT = {
    'A': ['A', '4'], 'B': ['B', '8'], 'E': ['E', '3'], 
    'G': ['G', '6'], 'I': ['I', '1'], 'L': ['L', '1'], 
    'S': ['S', '5', 'Z'], 'T': ['T', '7'], 'Z': ['Z', '2']
}

PHONETIC_CHUNKS = {'ATE': '8', 'FOR': '4', 'TO': '2', 'TOO': '2', 'YOU': 'U', 'AND': 'N'}
SUFFIXES = ['', 'Z', 'X', 'V', 'S']

def drop_vowels(word):
    if len(word) > 2:
        return word[0] + re.sub(r'[AEIOU]', '', word[1:])
    return word

def apply_doubling(word):
    doubled = [word]
    if 0 < len(word) < 7:
        doubled.append(word[0] + word) 
        doubled.append(word + word[-1])
    return doubled

def get_variations(word):
    word = word.upper().replace(" ", "").replace("0", "O")
    if not word: return []
    bases = set([word, drop_vowels(word)])
    for chunk, replacement in PHONETIC_CHUNKS.items():
        if chunk in word:
            bases.add(word.replace(chunk, replacement))

    leet_vars = set()
    for base in bases:
        char_options = [LEET_DICT.get(char, [char]) for char in base]
        combinations = list(itertools.product(*char_options))
        for combo in combinations:
            leet_vars.add("".join(combo))

    final_vars = set()
    for v in leet_vars:
        for suffix in SUFFIXES:
            suffixed = v + suffix
            if 2 <= len(suffixed) <= 7: final_vars.add(suffixed)
        for doubled in apply_doubling(v):
            if 2 <= len(doubled) <= 7: final_vars.add(doubled)
    return list(final_vars)

def rank_plates(plate_list, original_word, clean_only: bool, max_length: int):
    ranked_results = []
    original_clean = original_word.upper().replace(" ", "").replace("0", "O")
    for plate in plate_list:
        if len(plate) > max_length or len(plate) < 2: continue
        if clean_only and any(c.isdigit() for c in plate): continue
        score = sum(c.isdigit() for c in plate) * 10
        score += abs(len(plate) - len(original_clean)) * 4
        ranked_results.append({"plate": plate, "score": score})
    ranked_results.sort(key=lambda x: x['score'])
    return [item['plate'] for item in ranked_results]

# --- 2. THE ASYNC PLAYWRIGHT ENGINE ---
async def check_plates_bulk(plates_to_check):
    available_plates = []
    plates_to_scrape = []
    
    print("\n--- CACHE CHECK ---")
    for plate_str in plates_to_check:
        clean_plate = plate_str.upper().replace("0", "O")
        cached_status = db.get_cached_status(clean_plate)
        if cached_status == 'AVAILABLE':
            available_plates.append(clean_plate)
        elif cached_status != 'TAKEN':
            plates_to_scrape.append(clean_plate)

    if plates_to_scrape:
        print(f"\n--- SCRAPING {len(plates_to_scrape)} PLATES ---")
        async with async_playwright() as p:
            # HEADLESS=FALSE so you can solve CAPTCHAs manually
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()

            for plate_str in plates_to_scrape:
                print(f"Checking: {plate_str}...")
                try:
                    await page.goto("https://www.dmv.ca.gov/wasapp/ipp2/initPers.do")
                    await page.wait_for_timeout(3000) # Wait for page to settle

                    # Auto-check the "I agree" box if it appears
                    try:
                        if await page.is_visible("input[type='checkbox']"):
                            await page.check("input[type='checkbox']")
                            await page.click("button:has-text('Continue')")
                    except: pass

                    await page.wait_for_selector("#vehicleType", timeout=10000)
                    await page.select_option("#vehicleType", "AUTO")
                    await page.click("#plateDiv_Z")

                    for i, char in enumerate(plate_str[:7]):
                        await page.fill(f"#plateChar{i}", char)

                    async with page.expect_response("**/checkPers.do") as response_info:
                        await page.click("#checkAvailable7")

                    resp_data = await (await response_info.value).json()
                    if resp_data.get('code') == 'AVAILABLE':
                        print("  ✅ AVAILABLE!")
                        available_plates.append(plate_str)
                        db.save_plate_status(plate_str, 'AVAILABLE')
                    else:
                        print("  ❌ TAKEN.")
                        db.save_plate_status(plate_str, 'TAKEN')

                except Exception as e:
                    print(f"  ⚠️ Error checking {plate_str}: {e}")
                
                await asyncio.sleep(1) # Small gap between checks

            await browser.close()
    return available_plates

# --- 3. THE API ENDPOINT ---
@app.get("/api/check")
async def check_vanity_plate(word: str, clean_only: str = "false", max_length: int = 7, max_variants: int = 10):
    is_clean = clean_only.lower() == "true"
    print(f"\n🚀 Search: {word} | Max: {max_variants}")
    
    variations = get_variations(word)
    test_batch = rank_plates(variations, word, is_clean, max_length)[:max_variants]
    
    found = await check_plates_bulk(test_batch)
    return {"seed_word": word, "available_plates": found}