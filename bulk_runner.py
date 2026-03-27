import asyncio
import random
import time
from app import check_plates_bulk

async def run_mass_check():
    # 1. Access the Mac's hidden dictionary file
    with open('/usr/share/dict/words', 'r') as f:
        all_words = f.read().splitlines()

    # 2. Filter for "Clean" plates (letters only, 2-7 characters long)
    valid_words = [w.upper() for w in all_words if w.isalpha() and 2 <= len(w) <= 7]

    # 3. Pick 1000 random words
    target_words = random.sample(valid_words, 1000)
    print(f"🎯 Target Acquired: 1000 clean words selected.")

    # 4. Chunk them into batches of 50 to avoid crashing the browser or getting IP banned
    batch_size = 10
    for i in range(0, len(target_words), batch_size):
        batch = target_words[i:i+batch_size]
        print(f"\n🚀 --- STARTING BATCH {i//batch_size + 1} OF {1000//batch_size} ---")
        
        # Call your existing scraping function
        await check_plates_bulk(batch)
        
        print("🛑 Batch complete. Sleeping for 45 seconds to let the DMV cool down...")
        time.sleep(45)

if __name__ == "__main__":
    print("Starting Vanity Plate Bulk Runner...")
    asyncio.run(run_mass_check())