"""Turn U.S. EPA's East Palestine water lab results CSV into the kiosk's data file.

Source page: https://www.epa.gov/east-palestine-oh-train-derailment/water-sampling-data
CSV link on that page: "EPA Lab Results: Water (through 09/30/2025) - East Palestine, OH Response (csv)"

How to update when EPA posts a new CSV:
  1. Download the new CSV into user-friendly/data/raw/
  2. Run:   python3 user-friendly/tools/import_epa_water.py user-friendly/data/raw/<new file>.csv
  3. Run:   node user-friendly/test.js
This rewrites user-friendly/data/epa-water-sampling.js. It never touches location-names.js,
so names typed in by hand are kept. New location codes are added there as placeholders.
"""
import csv
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA_DIR, "epa-water-sampling.js")
NAMES = os.path.join(DATA_DIR, "location-names.js")

# Chemicals the kiosk already knows (keys used in data.js). Everything else gets a new key.
KNOWN = {
    "vinyl chloride": "vinyl_chloride",
    "n-butyl acrylate": "butyl_acrylate",
    "butyl acrylate": "butyl_acrylate",
    "2-ethylhexyl acrylate": "ethylhexyl_acrylate",
    "ethylene glycol monobutyl ether": "egbe",
}
UNITS = {"ug/l": "µg/L", "ppb": "µg/L", "ng/l": "ng/L", "mg/kg": "mg/kg", "mg/l": "mg/L"}
MEDIUM = {
    "Stream/River": "surface water",
    "Shallow Monitoring Well": "groundwater (monitoring well)",
    "Sentinel Monitoring Well": "groundwater (monitoring well)",
    "Deep Monitoring Well": "groundwater (monitoring well)",
    "Free Product": "free product",
}


def key_for(name):
    low = name.strip().lower()
    return KNOWN.get(low) or "c_" + re.sub(r"[^a-z0-9]+", "_", low).strip("_")


def nice(name):
    name = name.strip()
    return name[0].upper() + name[1:].lower() if name.isupper() or name.istitle() else name


def num(text):
    m = re.search(r"-?\d+(\.\d+)?", text or "")
    return float(m.group()) if m else None


def site_key(code):
    return "epa_" + re.sub(r"[^a-z0-9]+", "_", code.lower()).strip("_")


def main(path):
    with open(path, encoding="cp1252", newline="") as f:
        rows = list(csv.DictReader(f))

    records, analytes, sites, skipped = [], {}, {}, {"rejected (R)": 0, "unusable value": 0}
    for r in rows:
        qual = (r["Result_Qualifier_Final"] or "").strip()
        if qual == "R":  # lab rejected the result as unusable
            skipped["rejected (R)"] += 1
            continue
        txt = (r["Result_Final_Txt"] or "").strip()
        detected = not txt.startswith("<") and "U" not in qual
        value = num(txt) if detected else None
        limit = num(txt) if txt.startswith("<") else num(r["Reporting_Limit"])
        if detected and value is None:
            skipped["unusable value"] += 1
            continue
        akey = key_for(r["Analyte"])
        analytes.setdefault(akey, nice(r["Analyte"]))
        code = r["Location"].strip()
        skey = site_key(code)
        medium = MEDIUM.get(r["SampleMedia"], r["SampleMedia"].lower())
        group = "streams" if r["Activity"] == "Surface Water" else "monitoring_wells"
        sites.setdefault(skey, {"code": code, "group": group})
        date = datetime.datetime.strptime(r["SampleDate_txt"], "%m/%d/%Y").date().isoformat()
        unit = UNITS.get(r["Result_Units"].strip().lower(), r["Result_Units"].strip())
        rec = {"docId": "EPA-W", "analyte": akey, "site": skey, "medium": medium, "tract": None,
               "sampleDate": date, "value": value, "detected": detected, "detectionLimit": limit,
               "unit": unit, "agency": "U.S. EPA", "sampleId": r["Samp_No"]}
        if "J" in qual:
            rec["estimated"] = True
        if r["Validation_Level"].strip().lower().startswith("prelim"):
            rec["preliminary"] = True
        records.append(rec)

    dataset = {
        "id": "epa-water",
        "real": True,
        "enabled": True,
        "document": {
            "id": "EPA-W",
            "title": "EPA Lab Results: Water (through 09/30/2025) - East Palestine, OH Response",
            "agency": "U.S. EPA",
            "published": "2026-10-13",  # "Last updated" date on the EPA page that hosts the CSV
            "cadenceDays": 90,
            "link": "https://www.epa.gov/east-palestine-oh-train-derailment/water-sampling-data",
            "shelf": "[PLACEHOLDER: binder and tab for the printed copy]",
        },
        "analytes": {k: {"name": v, "aliases": sorted({v.lower(), re.sub(r"\s+", " ", re.sub(r"[^a-z0-9µ.'\- ]+", " ", v.lower())).strip()})}
                     for k, v in sorted(analytes.items()) if k not in KNOWN.values()},
        "sites": {k: sites[k] for k in sorted(sites)},
        "records": sorted(records, key=lambda x: (x["sampleDate"], x["site"], x["analyte"])),
        "importNotes": {"sourceRows": len(rows), "imported": len(records), "skipped": skipped,
                        "importedOn": datetime.date.today().isoformat(), "sourceFile": os.path.basename(path)},
    }
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// GENERATED FILE: do not edit by hand. Made by tools/import_epa_water.py from EPA's public CSV.\n")
        f.write("// Real U.S. EPA data. To remove it from the kiosk, set \"enabled\": false below,\n")
        f.write("// or delete this file and its <script> line in index.html (and its name in data.js DATASET_FILES).\n")
        f.write("var KIOSK_DATASETS = (typeof KIOSK_DATASETS !== 'undefined') ? KIOSK_DATASETS : [];\n")
        f.write("KIOSK_DATASETS.push(" + json.dumps(dataset, ensure_ascii=False, separators=(",", ":"))
                .replace('{"docId"', '\n{"docId"') + ");\n")
        f.write("if (typeof module !== 'undefined') module.exports = KIOSK_DATASETS[KIOSK_DATASETS.length - 1];\n")

    # Location names: add any new codes as placeholders; never overwrite names already filled in.
    existing = {}
    if os.path.exists(NAMES):
        existing = dict(re.findall(r'"([^"]+)":\s*(null|"[^"]*")', open(NAMES, encoding="utf-8").read()))
    lines = []
    for k in sorted(sites):
        code = sites[k]["code"]
        lines.append(f'  "{code}": {existing.get(code, "null")},   // {"stream" if sites[k]["group"] == "streams" else "monitoring well"}')
    with open(NAMES, "w", encoding="utf-8") as f:
        f.write("// Everyday names for EPA sampling points. EPA's CSV only gives codes (like SW01-SR).\n")
        f.write("// null = name not known yet, so the kiosk shows the code instead.\n")
        f.write('// To add a name, replace null with text in quotes, e.g. "SW01-SR": "Sulphur Run at Main Street",\n')
        f.write("// Only use names confirmed from EPA's map or documents. Re-running the import script keeps your names.\n")
        f.write("var KIOSK_LOCATION_NAMES = {\n" + "\n".join(lines) + "\n};\n")
        f.write("if (typeof module !== 'undefined') module.exports = KIOSK_LOCATION_NAMES;\n")

    print(f"Imported {len(records)} of {len(rows)} rows, {len(analytes)} chemicals, {len(sites)} locations. Skipped: {skipped}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA_DIR, "raw", "epa-labresults-water-through-2025-09-30.csv"))
