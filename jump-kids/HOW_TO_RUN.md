# How to Run Jump Kids Game

## Option 1: Local Server (Recommended)
For the best experience with all features working:

1. Open Terminal/Command Prompt
2. Navigate to the jump-kids folder:
   ```bash
   cd /path/to/jump-kids
   ```
3. Start a local server:
   ```bash
   # Python 3
   python3 -m http.server 8080
   
   # Python 2
   python -m SimpleHTTPServer 8080
   
   # Node.js (if you have it installed)
   npx serve .
   ```
4. Open your browser and go to: `http://localhost:8080`

## Option 2: Direct File Opening (Limited)
If you want to run the game by opening `index.html` directly from Finder/File Explorer:

1. Double-click `index.html` to open it in your browser
2. The game will work but with some limitations:
   - Uses built-in level data only
   - Some external assets may not load
   - You'll see a "Running in File Mode" indicator

## Game Controls
- **Movement**: Arrow keys (← →) or WASD
- **Jump**: Spacebar or Z (press twice to double jump)
- **Dash**: D key
- **Special Moves**: S (S1), F (S2), E (S3), C (S4)
- **Pause**: P
- **Restart**: R (after game over) or Jump button

## Mobile/Touch
Use the on-screen buttons that appear on smaller screens.

## Troubleshooting
- If characters don't appear in character select: Refresh the page
- If the game doesn't start: Make sure you've selected a character and level
- If assets don't load: Use the local server method instead of opening the file directly
