// MADE-UP SAMPLE DATA, kept only for demos and tests. NOT real.
// It is OFF ("enabled": false). Turning it on hides all real data, so the two are never mixed.
// To use it for a demo: change enabled to true. To remove it: delete this file and its <script> line
// in index.html (and its name in data.js DATASET_FILES).
var KIOSK_DATASETS = (typeof KIOSK_DATASETS !== 'undefined') ? KIOSK_DATASETS : [];
KIOSK_DATASETS.push({
  id: "sample",
  sample: true,
  enabled: false,
  documents: [
    { id: "D1", title: "East Palestine Surface Water Sampling Results (sample)", agency: "U.S. EPA",
      published: "2026-08-01", cadenceDays: 90, link: "https://www.epa.gov/east-palestine-oh-train-derailment/water-sampling-data", shelf: "Binder A, tab 1" },
    { id: "D2", title: "Ohio EPA Stream Monitoring Summary (sample)", agency: "Ohio EPA",
      published: "2026-07-10", cadenceDays: 90, link: "", shelf: "Binder A, tab 2" },
    { id: "D3", title: "Columbiana County Private Well Testing Results (sample)", agency: "Columbiana County Health District",
      published: "2026-03-01", cadenceDays: 90, link: "", shelf: "Binder B, tab 1" },
    { id: "D4", title: "Village Municipal Water System Results (sample)", agency: "Ohio EPA",
      published: "2026-08-20", cadenceDays: 90, link: "", shelf: "Binder B, tab 2" },
    { id: "D6", title: "Soil Sampling Results Near Derailment Site (sample)", agency: "U.S. EPA",
      published: "2026-06-15", cadenceDays: 90, link: "", shelf: "Binder A, tab 3" }
  ],
  sites: {
    sulphur_run: { name: "Sulphur Run", plain: "Sulphur Run (creek)", aliases: ["sulphur run", "sulfur run"] },
    leslie_run: { name: "Leslie Run", plain: "Leslie Run (creek)", aliases: ["leslie run"] },
    municipal: { name: "the village water system", plain: "Village tap water", aliases: ["municipal", "village water", "city water", "tap water", "public water"] },
    private_wells: { name: "private wells (county program)", plain: "Private wells (county testing program)", aliases: ["private well", "private wells", "my well", "wells", "well water", "well"] },
    derailment_site: { name: "the derailment area", plain: "Soil near the derailment site", aliases: ["soil", "derailment site", "dirt", "ground"] }
  },
  records: [
    { docId: "D1", analyte: "vinyl_chloride", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2023-03-02", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D2", analyte: "vinyl_chloride", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2023-03-02", value: 0.6, detected: true, detectionLimit: 0.2, unit: "µg/L", agency: "Ohio EPA" },
    { docId: "D1", analyte: "vinyl_chloride", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2024-06-12", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D2", analyte: "vinyl_chloride", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2026-06-03", value: null, detected: false, detectionLimit: 0.2, unit: "µg/L", agency: "Ohio EPA" },
    { docId: "D1", analyte: "vinyl_chloride", site: "leslie_run", medium: "surface water", tract: "9516.02", sampleDate: "2023-04-11", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D1", analyte: "vinyl_chloride", site: "leslie_run", medium: "surface water", tract: "9516.02", sampleDate: "2025-05-20", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D1", analyte: "butyl_acrylate", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2023-02-20", value: 3.1, detected: true, detectionLimit: 1, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D1", analyte: "butyl_acrylate", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2023-08-15", value: 1.2, detected: true, detectionLimit: 1, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D1", analyte: "butyl_acrylate", site: "sulphur_run", medium: "surface water", tract: "9516.01", sampleDate: "2024-08-14", value: null, detected: false, detectionLimit: 1, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D1", analyte: "egbe", site: "leslie_run", medium: "surface water", tract: "9516.02", sampleDate: "2023-02-20", value: null, detected: false, detectionLimit: 5, unit: "µg/L", agency: "U.S. EPA" },
    { docId: "D3", analyte: "vinyl_chloride", site: "private_wells", medium: "private well water", tract: "9516.02", sampleDate: "2023-06-01", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "Columbiana County Health District" },
    { docId: "D3", analyte: "vinyl_chloride", site: "private_wells", medium: "private well water", tract: "9516.02", sampleDate: "2025-11-14", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "Columbiana County Health District" },
    { docId: "D3", analyte: "butyl_acrylate", site: "private_wells", medium: "private well water", tract: "9517.00", sampleDate: "2025-11-14", value: null, detected: false, detectionLimit: 1, unit: "µg/L", agency: "Columbiana County Health District" },
    { docId: "D4", analyte: "vinyl_chloride", site: "municipal", medium: "treated drinking water", tract: "9516.01", sampleDate: "2023-03-15", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "Ohio EPA" },
    { docId: "D4", analyte: "vinyl_chloride", site: "municipal", medium: "treated drinking water", tract: "9516.01", sampleDate: "2025-08-05", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "Ohio EPA" },
    { docId: "D4", analyte: "vinyl_chloride", site: "municipal", medium: "treated drinking water", tract: "9516.01", sampleDate: "2026-07-30", value: null, detected: false, detectionLimit: 0.5, unit: "µg/L", agency: "Ohio EPA" },
    { docId: "D4", analyte: "ethylhexyl_acrylate", site: "municipal", medium: "treated drinking water", tract: "9516.01", sampleDate: "2026-07-30", value: null, detected: false, detectionLimit: 2, unit: "µg/L", agency: "Ohio EPA" },
    { docId: "D6", analyte: "dioxins", site: "derailment_site", medium: "soil", tract: "9516.01", sampleDate: "2023-05-18", value: 9.4, detected: true, detectionLimit: 0.5, unit: "ng/kg", agency: "U.S. EPA" },
    { docId: "D6", analyte: "dioxins", site: "derailment_site", medium: "soil", tract: "9516.01", sampleDate: "2024-05-21", value: 4.1, detected: true, detectionLimit: 0.5, unit: "ng/kg", agency: "U.S. EPA" }
  ],
  streetToTract: { "main": "9516.01", "market": "9516.01", "taggart": "9516.02", "east taggart": "9516.02", "pleasant": "9517.00", "sulphur": "9516.01" },
  streets: ["Main Street", "Market Street", "Taggart Street", "East Taggart Street", "Pleasant Drive", "Sulphur Street"]
});
if (typeof module !== 'undefined') module.exports = KIOSK_DATASETS[KIOSK_DATASETS.length - 1];
