// Everyday names for EPA sampling points. EPA's CSV only gives codes (like SW01-SR).
// null = name not known yet, so the web app shows the code instead.
// To add a name, replace null with text in quotes, e.g. "SW01-SR": "Sulphur Run at Main Street",
// Only use names confirmed from EPA's map or documents. Re-running the import script keeps your names.
var KIOSK_LOCATION_NAMES = {
  "EESTW-01": null,   // monitoring well
  "EESTW-02": null,   // monitoring well
  "EESTW-04": null,   // monitoring well
  "EESTW-05": null,   // monitoring well
  "EESTW-06": null,   // monitoring well
  "MW-03": null,   // monitoring well
  "MW-05": null,   // monitoring well
  "MW-07": null,   // monitoring well
  "MW-10": null,   // monitoring well
  "MW-7": null,   // monitoring well
  "SMW-04S": null,   // monitoring well
  "SMW-08": null,   // monitoring well
  "SMW-09": null,   // monitoring well
  "SMW-18": null,   // monitoring well
  "STW-13": null,   // monitoring well
  "STW-14": null,   // monitoring well
  "STW-15S": null,   // monitoring well
  "STW-2": null,   // monitoring well
  "STW-21": null,   // monitoring well
  "STW-23": null,   // monitoring well
  "STW-24": null,   // monitoring well
  "STW-26": null,   // monitoring well
  "STW-26R": null,   // monitoring well
  "STW-29": null,   // monitoring well
  "STW-31": null,   // monitoring well
  "STW-32S": null,   // monitoring well
  "STW-34": null,   // monitoring well
  "STW-36": null,   // monitoring well
  "STW-36R": null,   // monitoring well
  "STW-37": null,   // monitoring well
  "STW-38": null,   // monitoring well
  "STW-38R": null,   // monitoring well
  "STW-39": null,   // monitoring well
  "STW-40": null,   // monitoring well
  "STW-7": null,   // monitoring well
  "STW-7R": null,   // monitoring well
  "STW-8": null,   // monitoring well
  "STW-8R": null,   // monitoring well
  "SW01-SR": null,   // stream
  "SW02-SR": null,   // stream
  "SW03-SR": null,   // stream
  "SW-01": null,   // stream
  "SW-02": null,   // stream
  "SW-03": null,   // stream
  "SW-04": null,   // stream
  "SW-05": null,   // stream
  "SW-06": null,   // stream
  "SW-07": null,   // stream
  "SW-08": null,   // stream
  "SW-09": null,   // stream
  "SW-10": null,   // stream
  "SW-11": null,   // stream
  "W010": null,   // stream
  "WLSTW-01": null,   // monitoring well
  "WLSTW-02": null,   // monitoring well
  "WLSTW-03": null,   // monitoring well
};
if (typeof module !== 'undefined') module.exports = KIOSK_LOCATION_NAMES;
