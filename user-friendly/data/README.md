# The kiosk's data files

All test results live in this folder, one file per source. The kiosk's wording, word list and contacts stay in `../data.js`.

| File | What it is | Status |
|---|---|---|
| `epa-water-sampling.js` | **Real** U.S. EPA water lab results for East Palestine (3,943 results, Feb 2023 – Aug 2025) | On |
| `raw/epa-labresults-water-through-2025-09-30.csv` | The original EPA file it was made from | Kept for checking |
| `location-names.js` | Everyday names for EPA's sampling-point codes (like `SW01-SR`) | All placeholders (`null`) |
| `not-yet-available.js` | Placeholders for sources the kiosk doesn't have yet (tap water, private wells, soil, creek names) | On |
| `sample-made-up.js` | Made-up demo data from the first prototype | **Off** |

Source of the real data: https://www.epa.gov/east-palestine-oh-train-derailment/water-sampling-data (the "EPA Lab Results: Water" CSV on that page).

## Update the EPA data when EPA posts a new file
1. Download the new CSV from the EPA page into `raw/`.
2. From the project folder, run:
   ```bash
   python3 user-friendly/tools/import_epa_water.py user-friendly/data/raw/NEW-FILE-NAME.csv
   ```
3. Check that everything still works:
   ```bash
   node user-friendly/test.js
   ```
4. In `../data.js`, update `corpusUpdated` and `dataNote`. Then record a signed refresh on the staff page.

Names you typed into `location-names.js` are kept when you re-run the import.

## Add a name for a sampling point
Open `location-names.js` and replace `null` with the name in quotes, for example `"SW01-SR": "Sulphur Run at Main Street",`. Only use names confirmed from EPA's map or documents.

## Add a new source (for example, the village tap water results)
1. Make a new file in this folder. Copy the shape of `epa-water-sampling.js`: one document, its places (`sites`) and its `records`.
2. Add the file name to `DATASET_FILES` in `../data.js`, **and** add a matching `<script src="data/...">` line in `../index.html`, above `data.js`. The tests check that the two lists match.
3. Delete the matching placeholder from `not-yet-available.js`.
4. Run `node user-friendly/test.js`.

## Remove a source
Set `enabled: false` in its file, or delete the file and its two lines (in `DATASET_FILES` and in `index.html`).

## Use the made-up demo data
In `sample-made-up.js`, set `enabled: true`. While it is on, **all real data is hidden**, so made-up and real results are never mixed. The staff page shows a red warning while it is on.

## What a placeholder does
When a resident asks about something listed in `not-yet-available.js`, the kiosk answers "We don't have data on that yet" and says which source is missing. It never guesses. Chemicals with no federal limit entered show "not entered in the kiosk yet".
