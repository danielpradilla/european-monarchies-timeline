const fs = require('fs');
const path = require('path');

const monarchies = JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','sample_monarchies.json')));
const people = JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','sample_people.json')));

// config
const topYear = -27; // 27 BC
const bottomYear = 2026;
const height = 2400; // px for full span
const width = 1200;
const margin = {left:220, right:20, top:40, bottom:40};

function yearToY(y){
  const span = bottomYear - topYear;
  return margin.top + ((y - topYear) / span) * (height - margin.top - margin.bottom);
}

// group monarchies by region
const regions = {};
monarchies.forEach(m => {
  const r = (m.region && m.region[0]) || 'Unknown';
  if (!regions[r]) regions[r] = [];
  regions[r].push(m);
});
const regionKeys = Object.keys(regions);

// color per country (monarchy)
const palette = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#17becf","#bcbd22","#393b79","#637939"];
const monarchyColor = {};
monarchies.forEach((m,i)=>{ monarchyColor[m.id] = palette[i % palette.length]; });

let svg = [];
svg.push(`<?xml version="1.0" encoding="utf-8"?>`);
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
svg.push(`<style>text{font-family: Arial, Helvetica, sans-serif; font-size:12px; fill:#111} .label{font-weight:700}</style>`);

// background
svg.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>`);

// year axis
svg.push(`<line x1="${margin.left-20}" x2="${margin.left-20}" y1="${margin.top}" y2="${height-margin.bottom}" stroke="#333" stroke-width="2"/>`);
for(let y = Math.ceil(topYear/100)*100; y<=bottomYear; y+=200){
  const yy = yearToY(y);
  svg.push(`<line x1="${margin.left-30}" x2="${margin.left-10}" y1="${yy}" y2="${yy}" stroke="#666"/>`);
  svg.push(`<text x="${margin.left-40}" y="${yy+4}" text-anchor="end">${y>0?y:y+' BC'}</text>`);
}

// compute column layout
const columns = regionKeys.length;
const colWidth = Math.floor((width - margin.left - margin.right) / Math.max(1, columns));

// draw one column per region; inside each column, draw each country's band across the full column width
regionKeys.forEach((region, colIndex)=>{
  const items = regions[region];
  const x0 = margin.left + colIndex*colWidth;
  const colPadding = 10;
  const x = x0 + colPadding;
  const w = colWidth - 2*colPadding;

  // column header
  svg.push(`<text x="${x0 + 8}" y="${margin.top-10}" font-weight="700">${region}</text>`);

  items.forEach((m)=>{
    const y1 = yearToY(m.start_year);
    const y2 = yearToY(m.end_year);
    const bandHeight = Math.max(18, y2 - y1 - 2);
    const color = monarchyColor[m.id] || '#999';

    svg.push(`<rect x="${x}" y="${y1}" width="${w}" height="${bandHeight}" rx="6" ry="6" fill="${color}" fill-opacity="0.95" stroke="#222"/>`);
    svg.push(`<text x="${x+6}" y="${y1+14}" class="label">${m.name}</text>`);

    // show up to 3 notable monarchs
    const notable = people.filter(p => (m.dynasties && m.dynasties.includes(p.dynasty)) || (p.reign_start && p.reign_start >= m.start_year && p.reign_start <= m.end_year)).slice(0,3);
    notable.forEach((p,i)=>{
      const py = yearToY(p.reign_start || m.start_year) + 16 + i*12;
      svg.push(`<text x="${x+18}" y="${py}" font-size="11">• ${p.name}</text>`);
    });
  });
});

// legend: countries (monarchies) with colours (limited to pilot set)
let lx = width - 220; let ly = margin.top;
svg.push(`<g transform="translate(${lx},${ly})">`);
svg.push(`<text x="0" y="0" class="label">Countries (colors)</text>`);
monarchies.forEach((m,i)=>{
  if(i>10) return; // limit legend size for prototype
  const cy = 20 + i*18;
  svg.push(`<rect x="0" y="${cy-12}" width="14" height="14" fill="${monarchyColor[m.id]}" stroke="#333"/>`);
  svg.push(`<text x="20" y="${cy}" font-size="12">${m.name}</text>`);
});
svg.push(`</g>`);

svg.push(`</svg>`);

fs.writeFileSync(path.join(__dirname,'..','www','histomap-prototype.svg'), svg.join('\n'));
fs.writeFileSync(path.join(__dirname,'..','www','histomap-prototype.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Histomap prototype</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:18px}.container{max-width:920px;margin:0 auto}.viz{border:1px solid #eee;overflow:auto}.viz embed{display:block;width:800px;height:1600px}@media(max-width:900px){.viz embed{width:640px;height:1280px}}@media(max-width:700px){.viz embed{width:480px;height:960px}}</style></head><body><div class="container"><h2>Histomap prototype (vertical)</h2><div class="viz"><embed src="histomap-prototype.svg" type="image/svg+xml"/></div></div></body></html>`);
console.log('Wrote www/histomap-prototype.svg and www/histomap-prototype.html (one column per region)');
