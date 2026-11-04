const fs = require("node:fs");
const path = require("node:path");
const destination = path.resolve(__dirname, "../public/locket-frames");
fs.mkdirSync(destination, { recursive: true });
const wrap = (label, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><title>${label}</title>${body}</svg>`;
const border = (color, accent) => `<rect x="29" y="29" width="1022" height="1022" rx="86" fill="none" stroke="${color}" stroke-width="62"/><rect x="57" y="57" width="966" height="966" rx="64" fill="none" stroke="${accent}" stroke-width="2"/>`;
const flower = (x, y, size, petals, color, center, rotation = 0) => `<g transform="translate(${x} ${y}) rotate(${rotation})">${Array.from({ length: petals }, (_, index) => `<ellipse cx="0" cy="-${size * .45}" rx="${size * .3}" ry="${size * .48}" fill="${color}" transform="rotate(${index * 360 / petals})"/>`).join("")}<circle r="${size * .2}" fill="${center}"/></g>`;
const leaf = (x, y, angle, color, size = 22) => `<ellipse cx="${x}" cy="${y}" rx="${size}" ry="${size * .4}" transform="rotate(${angle} ${x} ${y})" fill="${color}"/>`;
const star = (x, y, size, color) => `<path d="M${x} ${y - size} Q${x + size * .14} ${y - size * .14} ${x + size} ${y} Q${x + size * .14} ${y + size * .14} ${x} ${y + size} Q${x - size * .14} ${y + size * .14} ${x - size} ${y} Q${x - size * .14} ${y - size * .14} ${x} ${y - size}Z" fill="${color}"/>`;

let sakura = border("#f8e8ec", "#dcb0bd");
for (const [x, y, rotate] of [[62, 75, -25], [1010, 1000, 155]]) {
  sakura += `<g transform="translate(${x} ${y}) rotate(${rotate})"><path d="M-45 100 Q25 25 210 -35 M25 45 Q45 -15 105 -60 M100 4 Q160 38 215 30" fill="none" stroke="#ab7b73" stroke-width="5" stroke-linecap="round"/>${leaf(85, -18, -35, "#a3af91")}${leaf(170, 15, 30, "#b4bea0")}${flower(8, 52, 35, 5, "#e7a6bb", "#d59e56", 10)}${flower(66, -5, 29, 5, "#f3bfd0", "#d59e56")}${flower(143, -22, 33, 5, "#edafc2", "#d59e56", 20)}${flower(191, 28, 22, 5, "#f5c8d7", "#d59e56")}</g>`;
}
for (const [x, y] of [[1020, 200], [38, 800], [780, 36], [300, 1044]]) sakura += `<ellipse cx="${x}" cy="${y}" rx="7" ry="12" fill="#e6a7bd" transform="rotate(30 ${x} ${y})"/>`;
fs.writeFileSync(path.join(destination, "sakura.svg"), wrap("Hoa anh đào", sakura));

let daisies = border("#fff7df", "#dfc786");
for (let x = 100; x <= 1000; x += 180) {
  daisies += leaf(x - 22, 35, 25, "#a1af77", 20) + flower(x, 32, 25, 9, "#fffefa", "#e4b751", 8);
  daisies += leaf(x + 22, 1045, -25, "#a1af77", 20) + flower(x, 1048, 25, 9, "#fffefa", "#e4b751");
}
daisies += flower(56, 850, 45, 9, "#fffefa", "#e4b751") + flower(1018, 200, 42, 9, "#fffefa", "#e4b751") + leaf(43, 905, -65, "#98aa77", 32) + leaf(1036, 145, -65, "#98aa77", 32);
fs.writeFileSync(path.join(destination, "daisies.svg"), wrap("Cúc họa mi", daisies));

let vines = border("#edf1e7", "#b5c3a1");
for (const mirror of [false, true]) {
  vines += `<g ${mirror ? 'transform="translate(1080 1080) rotate(180)"' : ""}><path d="M30 950 Q80 750 34 550 T37 120 Q90 30 300 34" fill="none" stroke="#8c9f79" stroke-width="4"/>`;
  for (let y = 150; y <= 940; y += 90) vines += leaf(37, y, -45, y % 180 ? "#a0b48b" : "#809976", 27) + leaf(48, y + 35, 35, "#b5c6a1", 24);
  for (let x = 130; x <= 370; x += 80) vines += leaf(x, 35, 28, "#93ac83", 25);
  vines += flower(65, 86, 27, 5, "#fff9e9", "#ccad69") + flower(43, 510, 18, 5, "#fff9e9", "#ccad69") + "</g>";
}
fs.writeFileSync(path.join(destination, "vines.svg"), wrap("Dây leo", vines));

let lace = border("#f6eadc", "#bb9680");
lace += `<rect x="72" y="72" width="936" height="936" rx="48" fill="none" stroke="#d4b49c" stroke-width="2" stroke-dasharray="3 9"/>`;
for (let position = 80; position <= 1000; position += 32) lace += `<g fill="none" stroke="#c4a58e" stroke-width="1.5"><circle cx="${position}" cy="39" r="12"/><circle cx="${position}" cy="1041" r="12"/><circle cx="39" cy="${position}" r="12"/><circle cx="1041" cy="${position}" r="12"/></g>`;
for (const [x, y, angle] of [[72, 72, 0], [1008, 72, 90], [1008, 1008, 180], [72, 1008, 270]]) lace += `<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 66 Q-30 15 0 0 Q15 -30 66 0 M0 36 Q34 34 36 0 M8 8 Q65 65 88 22 M8 8 Q65 65 22 88" fill="none" stroke="#b58e78" stroke-width="2.5"/>${flower(8, 8, 19, 6, "#dec4b0", "#ae8872")}</g>`;
fs.writeFileSync(path.join(destination, "lace.svg"), wrap("Ren cổ điển", lace));

let stars = border("#ebe6f4", "#b8a5cb");
for (const [x, y, size] of [[90, 40, 20], [300, 31, 13], [650, 35, 18], [960, 45, 25], [1040, 240, 15], [1044, 750, 19], [960, 1035, 18], [690, 1045, 12], [350, 1040, 21], [80, 1035, 15], [35, 800, 20], [40, 420, 12]]) stars += star(x, y, size, "#c8aa68");
stars += `<path d="M990 90 A50 50 0 1 0 1040 145 A43 43 0 0 1 990 90" fill="#dfc37e"/>`;
for (const [x, y] of [[80, 940], [120, 1005], [45, 1000], [910, 45]]) stars += flower(x, y, 22, 5, "#c5b1df", "#f8e8b8");
stars += `<path d="M42 930 Q100 960 130 1040" fill="none" stroke="#aa99bf" stroke-width="3"/>`;
fs.writeFileSync(path.join(destination, "stargarden.svg"), wrap("Vườn sao", stars));
console.log("Created 5 decorative SVG photo frames.");
