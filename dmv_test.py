from playwright.sync_api import sync_playwright
import time

def check_plate(plate_str):
    with sync_playwright() as p:
        # headless=False lets us watch the browser work!
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print(f"[{plate_str}] 1. Navigating to DMV site...")
        page.goto("https://www.dmv.ca.gov/wasapp/ipp2/initPers.do")

        # The DMV usually has a "Terms and Conditions" page first. 
        # This tells the bot to look for a checkbox, check it, and click Continue/Accept.
        try:
            checkbox = page.locator("input[type='checkbox']")
            if checkbox.is_visible(timeout=3000):
                print(f"[{plate_str}] 2. Accepting Terms and Conditions...")
                checkbox.check()
                # Click the continue/accept button (searches for common text)
                page.locator("button, input[type='submit']").filter(has_text="Continue").click()
        except Exception:
            pass # If there's no checkbox, just keep going!

        # Wait for the main form to load by looking for the Vehicle Type dropdown
        page.wait_for_selector("#vehicleType")
        
        print(f"[{plate_str}] 3. Filling out the form...")
        page.select_option("#vehicleType", "AUTO")
        
        # Click the 1960s Legacy Plate using the exact ID we found in your HTML
        page.click("#plateDiv_Z") 

        # Fix the Zero Quirk and enforce formatting
        clean_plate = plate_str.upper().replace(" ", "").replace("0", "O")
        
        # Type each character into the corresponding box
        for i, char in enumerate(clean_plate):
            if i < 7: # Max 7 characters for this plate
                page.fill(f"#plateChar{i}", char)
        
        print(f"[{plate_str}] 4. Checking Availability...")
        
        # We click the button and simultaneously intercept the hidden network response!
        with page.expect_response("**/checkPers.do") as response_info:
            page.click("#checkAvailable7")
            
        response = response_info.value
        
        try:
            result = response.json()
            if result.get('code') == 'AVAILABLE':
                print("✅ RESULT: AVAILABLE!")
            elif result.get('code') == 'NOT_AVAILABLE':
                print("❌ RESULT: TAKEN.")
            else:
                print(f"⚠️ RESULT: Validation Error: {result}")
        except Exception as e:
            print(f"Error reading response. The DMV might be acting up.")

        # Pause for 2 seconds so you can see the result on screen before it closes
        time.sleep(2) 
        browser.close()

if __name__ == "__main__":
    print("Booting up Playwright Engine...\n")
    check_plate("BGR88X")
    print("-" * 30)
    check_plate("BMW330E")