# Water & Soil Test Results web app

A web app for the IEEE Tech4Good project (26-T4G-227) with the East Palestine Memorial Public Library. It helps residents find and read official environmental test results.

**The app is in `user-friendly/`.** Start with `user-friendly/README.md`.

## How to open it
1. Open Terminal and run:
   ```bash
   cd ~/Desktop/water-data-app/user-friendly
   python3 -m http.server 8765
   ```
2. In a browser, go to `http://localhost:8765`. The staff page is `http://localhost:8765/#/staff`.

## Checks
```bash
node user-friendly/test.js
node user-friendly/features/test-features.js
```
Both must say everything passed.

## Other files
- `DECISIONS.md`: every decision and why, with dates.
