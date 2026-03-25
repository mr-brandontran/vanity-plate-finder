import itertools
import re

# 1. The Substitution Matrix (California Compliant)
# Note: We do NOT map 'O' to '0' because CA prohibits the number 0 on personalized plates.
LEET_DICT = {
    'A': ['A', '4'],
    'B': ['B', '8'],
    'E': ['E', '3'],
    'G': ['G', '6'],
    'I': ['I', '1'],
    'L': ['L', '1'],
    'S': ['S', '5', 'Z'],
    'T': ['T', '7'],
    'Z': ['Z', '2']
}

def get_variations(word):
    """Generates all possible leetspeak combinations for a given word."""
    word = word.upper().replace(" ", "")
    
    # Create a list of possible character lists
    # E.g., "LATE" -> [['L', '1'], ['A', '4'], ['T', '7'], ['E', '3']]
    char_options = [LEET_DICT.get(char, [char]) for char in word]
    
    # Calculate the Cartesian product of all character options
    combinations = list(itertools.product(*char_options))
    
    # Join the tuples back into strings
    return ["".join(combo) for combo in combinations]

def rank_plates(plate_list, original_word):
    """Scores plates based on desirability. Lower score = better rank."""
    ranked_results = []
    
    for plate in plate_list:
        score = 0
        
        # Rule 1: The Character Limit Check (Auto-fail if over 7)
        if len(plate) > 7 or len(plate) < 2:
            continue
            
        # Rule 2: Clean Plate Bonus
        # Plates with zero numbers are highly desirable
        numbers_in_plate = sum(c.isdigit() for c in plate)
        score += (numbers_in_plate * 10) # Heavy penalty for numbers
        
        # Rule 3: Purity Score
        # How many substitutions were made? Closer to the original = better
        changes = sum(1 for a, b in zip(plate, original_word) if a != b)
        score += (changes * 5)
        
        ranked_results.append({
            "plate": plate,
            "score": score
        })
        
    # Sort the list by score (lowest to highest)
    ranked_results.sort(key=lambda x: x['score'])
    
    return [item['plate'] for item in ranked_results]

if __name__ == "__main__":
    # Let's test it with some words you might use for your build
    seed_words = ["G20", "HYBRID", "BIMMER"]
    
    for word in seed_words:
        print(f"\n--- Generating ideas for: {word} ---")
        
        raw_variations = get_variations(word)
        print(f"Mathematical combinations generated: {len(raw_variations)}")
        
        top_plates = rank_plates(raw_variations, word)
        
        print("Top 5 Ranked Recommendations:")
        for i, plate in enumerate(top_plates[:5]):
            print(f"{i+1}. {plate}")