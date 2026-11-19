// PLACEHOLDERS for information the web app does not have yet.
// When a resident asks about one of these, the web app says the data hasn't been added yet,
// instead of guessing or showing nothing.
//
// When real data for one of these arrives: add it as its own data file (like epa-water-sampling.js),
// then delete its entry here. Each entry's `waiting` text is what residents see.
var KIOSK_DATASETS = (typeof KIOSK_DATASETS !== 'undefined') ? KIOSK_DATASETS : [];
KIOSK_DATASETS.push({
  id: "not-yet-available",
  placeholder: true,
  enabled: true,
  sites: {
    municipal: { name: "the village water system", plain: "Village tap water",
      aliases: ["municipal", "village water", "city water", "tap water", "public water", "town water", "faucet", "my tap"],
      waiting: "Village water system test results have not been added to this web app yet." },
    private_wells: { name: "private wells", plain: "Private wells (county testing program)",
      aliases: ["private well", "private wells", "my well", "well water", "home well", "well", "wells"],
      waiting: "Columbiana County Health District private well results have not been added to this web app yet. EPA monitoring well results are available: ask for \"monitoring well results\". Monitoring wells are not home drinking-water wells." },
    derailment_site: { name: "soil near the derailment site", plain: "Soil near the derailment site",
      aliases: ["soil", "dirt", "ground", "derailment site"],
      waiting: "Soil results (including dioxins) have not been added to this web app yet. This web app only has EPA water results so far." },
    sulphur_run: { name: "Sulphur Run", plain: "Sulphur Run (creek)", aliases: ["sulphur run", "sulfur run"],
      waiting: "EPA's data file names sampling points by code, not by creek name, so the web app can't tell yet which points are on Sulphur Run. Ask for \"creek results\" to see all EPA stream sampling points." },
    leslie_run: { name: "Leslie Run", plain: "Leslie Run (creek)", aliases: ["leslie run"],
      waiting: "EPA's data file names sampling points by code, not by creek name, so the web app can't tell yet which points are on Leslie Run. Ask for \"creek results\" to see all EPA stream sampling points." }
  },
  // Sources the requirements list that are not in the web app yet (shown on the staff page).
  missingSources: [
    "Ohio EPA water monitoring results",
    "Village of East Palestine water system results",
    "Columbiana County Health District private well results",
    "EPA soil sampling results (dioxins)",
    "Village / EPA TASC Environmental Data Review Summary",
    "Names for EPA sampling-point codes (see location-names.js)",
    "Census tracts for sampling points (needed for \"Near my street\")"
  ]
});
if (typeof module !== 'undefined') module.exports = KIOSK_DATASETS[KIOSK_DATASETS.length - 1];
