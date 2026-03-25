import itertools
import re
import time
from playwright.sync_api import sync_playwright
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. THE ADVANCED GENERATOR BRAIN ---
LEET_DICT = {
    'A': ['A', '4'], 'B': ['B', '8'], 'E': ['E', '3'], 
    'G': ['G', '6'], 'I': ['I', '1'], 'L': ['L', '1'], 
    'S': ['S', '5', 'Z'], 'T': ['T', '7'], 'Z': ['Z', '2']
}

PHONETIC_CHUNKS = {
    'ATE': '8', 'FOR': '4', 'TO': '2', 
    'TOO': '2', 'YOU': 'U', 'AND': 'N'
}

SUFFIXES = ['', 'Z', 'X', 'V', 'S']

def drop_vowels(word):
    if len(word) > 2:
        return word[0] + re.sub(r'[AEIOU]', '', word[1:])
    return word

def apply_doubling(word):
    doubled = [word]
    if len(word) > 0 and len(word) < 7:
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
            if 2 <= len(suffixed) <= 7:
                final_vars.add(suffixed)
        
        for doubled in apply_doubling(v):
            if 2 <= len(doubled) <= 7:
                final_vars.add(doubled)

    return list(final_vars)

def rank_plates(plate_list, original_word, clean_only: bool, max_length: int):
    ranked_results = []
    original_clean = original_word.upper().replace(" ", "").replace("0", "O")
    
    for plate in plate_list:
        # NEW: Filter by Max Length
        if len(plate) > max_length or len(plate) < 2:
            continue
            
        # NEW: Filter out numbers if "Clean Only" is checked
        numbers_in_plate = sum(c.isdigit() for c in plate)
        if clean_only and numbers_in_plate > 0:
            continue
            
        score = 0
        score += (numbers_in_plate * 10) 
        length_diff = abs(len(plate) - len(original_clean))
        score += (length_diff * 4)
        changes = sum(1 for a, b in zip(plate, original_clean) if a != b)
        score += (changes * 5)
        
        ranked_results.append({"plate": plate, "score": score})
        
    ranked_results.sort(key=lambda x: x['score'])
    return [item['plate'] for item in ranked_results]


# --- 2. THE PLAYWRIGHT MUSCLE ---
def check_plates_bulk(plates_to_check):
    available_plates = []
    plates_to_scrape = []
    
    print("\n--- CACHE CHECK ---")
    for plate_str in plates_to_check:
        clean_plate = plate_str.upper().replace("0", "O")
        cached_status = db.get_cached_status(clean_plate)
        
        if cached_status == 'AVAILABLE':
            print(f"⚡ {clean_plate} is AVAILABLE (Loaded from Cache)")
            available_plates.append(clean_plate)
        elif cached_status == 'TAKEN':
            print(f"⚡ {clean_plate} is TAKEN (Loaded from Cache)")
        else:
            print(f"🔍 {clean_plate} is UNKNOWN. Adding to scrape queue.")
            plates_to_scrape.append(clean_plate)

    if plates_to_scrape:
        print("\n--- SCRAPING DMV FOR UNKNOWN PLATES ---")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            for plate_str in plates_to_scrape:
                print(f"Scraping: {plate_str}...")
                try:
                    page.goto("https://www.dmv.ca.gov/wasapp/ipp2/initPers.do")
                    
                    try:
                        checkbox = page.locator("input[type='checkbox']")
                        if checkbox.is_visible(timeout=2000):
                            checkbox.check()
                            page.locator("button, input[type='submit']").filter(has_text="Continue").click()
                    except Exception:
                        pass

                    page.wait_for_selector("#vehicleType")
                    page.select_option("#vehicleType", "AUTO")
                    page.click("#plateDiv_Z")

                    for i, char in enumerate(plate_str):
                        if i < 7:
                            page.fill(f"#plateChar{i}", char)

                    with page.expect_response("**/checkPers.do") as response_info:
                        page.click("#checkAvailable7")

                    response = response_info.value
                    result = response.json()

                    if result.get('code') == 'AVAILABLE':
                        print(f"  ✅ AVAILABLE!")
                        available_plates.append(plate_str)
                        db.save_plate_status(plate_str, 'AVAILABLE')
                    elif result.get('code') == 'NOT_AVAILABLE':
                        print(f"  ❌ TAKEN.")
                        db.save_plate_status(plate_str, 'TAKEN')
                    else:
                        print(f"  ⚠️ Error: {result}")

                except Exception as e:
                    print(f"  ⚠️ Script got stuck. Skipping to next. ({e})")
                
                time.sleep(2)

            browser.close()
            
    return available_plates


# --- 3. THE API ENDPOINT ---
# --- 3. THE API ENDPOINT ---
@app.get("/api/check")
def check_vanity_plate(
    word: str, 
    clean_only: str = "false", # Changed to string to handle JS fetch defaults
    max_length: int = 7, 
    max_variants: int = 10
):
    # Convert string "true"/"false" from URL to Python Boolean
    is_clean = clean_only.lower() == "true"
    
    print(f"\n🚀 API Request: {word} | Clean: {is_clean} | Max Len: {max_length} | Variants: {max_variants}")
    
    raw_variations = get_variations(word)
    
    # Pass the filters into the ranking engine
    top_plates = rank_plates(raw_variations, word, is_clean, max_length)
    
    # Slice the list based on the user's choice
    test_batch = top_plates[:max_variants]
    print(f"Sending the top {len(test_batch)} plates to the engine: {test_batch}")
    
    found_plates = check_plates_bulk(test_batch)
    
    return {
        "seed_word": word,
        "variations_tested": test_batch,
        "available_plates": found_plates
    }