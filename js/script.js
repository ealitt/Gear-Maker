const sbp = require("svg-blueprint");
const makerjs = require('makerjs');

// create blueprint
const blueprint = new sbp.Blueprint({
  parentSelector: "main",
  width: '100%',
  height: '100%'
});

const gear = new Gear(1, 24, 20);

const gearModel = makerjs.exporter.toSVGPathData(gear, { origin: [0, 0]});

blueprint.append('path', { d: gearModel });

// fit view
blueprint.fit();

let dxf = makerjs.exporter.toDXF(gear);

let downloadSVGBtn = document.querySelector("button");

document.getElementById("downloadSVG").addEventListener("click", (downloadSVGBtn) => {
    let svgBlob = new Blob([makerjs.exporter.toSVG(gear)], {type: "image/svg+xml"});
    saveAs(svgBlob, "gear.svg");
})