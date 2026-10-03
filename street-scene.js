// The pavement outside the shop, under the arch: a lamppost, potted flowers,
// a bench with a napping cat, a welcome sign, and Grandma at the door.
// Drawn light and borderless so it reads as part of the shop front.
(function drawStreet() {
  const svg = document.getElementById("streetScene");
  if (!svg) return;
  const LINE = "#8a6f5c",
    a = (attrs) =>
      Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" "),
    el = (tag, attrs) => `<${tag} ${a(attrs)}/>`,
    GROUND = 182;
  let s = `<defs>
    <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
  </defs>`;

  // Pavement, kept pale so it doesn't compete with the counter above.
  s += el("rect", {
    x: -40,
    y: GROUND,
    width: 1280,
    height: 60,
    fill: "#efe1c6",
  });
  s += el("line", {
    x1: -40,
    y1: GROUND,
    x2: 1240,
    y2: GROUND,
    stroke: "#dcc7a3",
    "stroke-width": 3,
  });
  for (let x = 20; x < 1200; x += 90)
    s += el("line", {
      x1: x,
      y1: GROUND + 4,
      x2: x - 14,
      y2: 230,
      stroke: "#e4d2b2",
      "stroke-width": 2,
    });

  // Lamppost with a hanging flower basket
  s += el("circle", { cx: 150, cy: 44, r: 46, fill: "url(#lampGlow)" });
  s += el("rect", {
    x: 146,
    y: 60,
    width: 8,
    height: 116,
    rx: 3,
    fill: "#7f9c7e",
  });
  s += el("rect", {
    x: 136,
    y: 172,
    width: 28,
    height: 10,
    rx: 4,
    fill: "#6d896c",
  });
  s += el("path", {
    d: "M154 78 H196",
    stroke: "#7f9c7e",
    "stroke-width": 4,
    "stroke-linecap": "round",
  });
  s += el("path", {
    d: "M134 34 H166 L160 60 H140 Z",
    fill: "#fff1c4",
    stroke: LINE,
    "stroke-width": 2,
  });
  s += el("path", {
    d: "M130 34 L150 20 L170 34 Z",
    fill: "#7f9c7e",
    stroke: LINE,
    "stroke-width": 2,
    "stroke-linejoin": "round",
  });
  s += el("path", {
    d: "M188 78 v10 M204 78 v10",
    stroke: LINE,
    "stroke-width": 1.5,
  });
  s += el("path", {
    d: "M182 88 h28 q0 16 -14 16 t-14 -16 Z",
    fill: "#c9a77f",
    stroke: LINE,
    "stroke-width": 2,
  });
  for (const [x, y, c] of [
    [186, 86, "#e8a2b8"],
    [196, 84, "#f3c5d4"],
    [206, 86, "#e8a2b8"],
  ])
    s += el("circle", {
      cx: x,
      cy: y,
      r: 5,
      fill: c,
      stroke: LINE,
      "stroke-width": 1,
    });
  s += el("path", {
    d: "M184 100 q-4 14 2 24 M208 100 q5 12 -1 22",
    fill: "none",
    stroke: "#9fbf98",
    "stroke-width": 3,
    "stroke-linecap": "round",
  });

  // A tall potted plant
  s += el("path", {
    d: "M268 146 H312 L304 182 H276 Z",
    fill: "#e3a27c",
    stroke: LINE,
    "stroke-width": 2,
  });
  for (const [x, y, r] of [
    [290, 110, 20],
    [274, 126, 15],
    [306, 126, 15],
    [290, 88, 14],
  ])
    s += el("circle", {
      cx: x,
      cy: y,
      r,
      fill: "#a9c79f",
      stroke: "#7f9c7e",
      "stroke-width": 1.5,
    });

  // Bench, with a cat napping on it
  s += el("rect", {
    x: 382,
    y: 118,
    width: 150,
    height: 8,
    rx: 3,
    fill: "#d9b48f",
    stroke: LINE,
    "stroke-width": 1.5,
  });
  s += el("rect", {
    x: 382,
    y: 132,
    width: 150,
    height: 8,
    rx: 3,
    fill: "#d9b48f",
    stroke: LINE,
    "stroke-width": 1.5,
  });
  s += el("rect", {
    x: 374,
    y: 150,
    width: 166,
    height: 10,
    rx: 4,
    fill: "#c99c70",
    stroke: LINE,
    "stroke-width": 1.5,
  });
  for (const x of [390, 520])
    s += el("path", {
      d: `M${x} 118 V182`,
      stroke: LINE,
      "stroke-width": 4,
      "stroke-linecap": "round",
    });
  s += `<g class="street-cat">
    ${el("path", { d: "M488 148 q30 -4 30 -18", fill: "none", stroke: LINE, "stroke-width": 6, "stroke-linecap": "round" })}
    ${el("path", { d: "M488 148 q30 -4 30 -18", fill: "none", stroke: "#fbf0dd", "stroke-width": 3, "stroke-linecap": "round" })}
    ${el("ellipse", { cx: 462, cy: 141, rx: 30, ry: 11, fill: "#fbf0dd", stroke: LINE, "stroke-width": 1.8 })}
    ${el("ellipse", { cx: 472, cy: 137, rx: 10, ry: 6, fill: "#e7a15a" })}
    ${el("circle", { cx: 434, cy: 136, r: 11, fill: "#fbf0dd", stroke: LINE, "stroke-width": 1.8 })}
    ${el("path", { d: "M426 130 l1 -10 l7 6 M442 130 l-1 -10 l-7 6", fill: "#fbf0dd", stroke: LINE, "stroke-width": 1.8, "stroke-linejoin": "round" })}
    ${el("path", { d: "M429 138 q2 2 4 0 M436 138 q2 2 4 0", fill: "none", stroke: LINE, "stroke-width": 1.4, "stroke-linecap": "round" })}
  </g>`;

  // Grandma at the door, waving people in
  s += el("rect", {
    x: 588,
    y: GROUND - 6,
    width: 112,
    height: 12,
    rx: 5,
    fill: "#e6c9b1",
    stroke: "#cdae93",
    "stroke-width": 1.5,
  });
  s += `<text x="644" y="${GROUND + 3}" text-anchor="middle" class="street-mat">WELCOME</text>`;
  s += `<image href="grandma-v2.png" x="569" y="26" width="150" height="150" class="street-grandma"/>`;
  s += el("rect", {
    x: 700,
    y: 30,
    width: 128,
    height: 32,
    rx: 14,
    fill: "#fffaf2",
    stroke: "#d8c6a6",
    "stroke-width": 2,
  });
  s += el("path", {
    d: "M712 62 l-10 10 l20 -10",
    fill: "#fffaf2",
    stroke: "#d8c6a6",
    "stroke-width": 2,
  });
  s += el("line", {
    x1: 712,
    y1: 62,
    x2: 722,
    y2: 62,
    stroke: "#fffaf2",
    "stroke-width": 3,
  });
  s += `<text x="764" y="51" text-anchor="middle" class="street-say">Come on in, dears!</text>`;

  // Chalkboard sign
  s += el("path", {
    d: "M858 104 L846 182 M902 104 L914 182",
    stroke: "#c9a77f",
    "stroke-width": 4,
    "stroke-linecap": "round",
  });
  s += el("rect", {
    x: 842,
    y: 98,
    width: 76,
    height: 66,
    rx: 5,
    fill: "#5a5350",
    stroke: "#c9a77f",
    "stroke-width": 4,
  });
  s += `<text x="880" y="122" text-anchor="middle" class="street-chalk">Welcome in</text>`;
  s += `<text x="880" y="140" text-anchor="middle" class="street-chalk">Fall Parfait</text>`;
  s += `<text x="880" y="156" text-anchor="middle" class="street-chalk">is back ♡</text>`;

  // Flower pots
  for (const [x, scale, flower] of [
    [990, 1, "#e8a2b8"],
    [1072, 0.8, "#f3c5d4"],
  ]) {
    s += el("path", {
      d: `M${x - 22 * scale} ${GROUND - 34 * scale} H${x + 22 * scale} L${x + 16 * scale} ${GROUND} H${x - 16 * scale} Z`,
      fill: "#e3a27c",
      stroke: LINE,
      "stroke-width": 2,
    });
    for (const [dx, dy] of [
      [-14, -50],
      [0, -60],
      [14, -48],
      [-4, -40],
      [8, -38],
    ])
      s += el("circle", {
        cx: x + dx * scale,
        cy: GROUND + dy * scale,
        r: 12 * scale,
        fill: "#a9c79f",
        stroke: "#7f9c7e",
        "stroke-width": 1.2,
      });
    for (const [dx, dy] of [
      [-10, -56],
      [10, -52],
      [0, -44],
      [-14, -40],
    ])
      s += el("circle", {
        cx: x + dx * scale,
        cy: GROUND + dy * scale,
        r: 5 * scale,
        fill: flower,
        stroke: LINE,
        "stroke-width": 1,
      });
  }
  svg.innerHTML = s;
})();
