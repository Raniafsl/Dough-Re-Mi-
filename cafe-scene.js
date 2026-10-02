// Illustrated footer: the regulars enjoying an evening outside Grandma's Bakeria.
const LINE = "#6b4a3a",
  GROUND = 320;

const svgAttrs = (a) =>
  Object.entries(a)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
const shape = (tag, a) => `<${tag} ${svgAttrs(a)}/>`;

// Hair sits on a head of radius 19 centred at (cx, cy).
function hairFront(style, cx, cy, color, facing) {
  const cap = `M${cx - 20} ${cy + 3} Q${cx - 23} ${cy - 25} ${cx} ${cy - 23} Q${cx + 23} ${cy - 25} ${cx + 20} ${cy + 3} Q${cx + 13} ${cy - 9} ${cx + facing * 4} ${cy - 11} Q${cx - 13} ${cy - 9} ${cx - 20} ${cy + 3}Z`;
  const extras = {
    bun: shape("circle", {
      cx,
      cy: cy - 26,
      r: 9,
      fill: color,
      stroke: LINE,
      "stroke-width": 2,
    }),
    curly: [-14, -5, 5, 14]
      .map((dx) =>
        shape("circle", {
          cx: cx + dx,
          cy: cy - 18 + Math.abs(dx) / 3,
          r: 8,
          fill: color,
        }),
      )
      .join(""),
    ponytail: shape("ellipse", {
      cx: cx - facing * 21,
      cy: cy - 4,
      rx: 7,
      ry: 13,
      fill: color,
      stroke: LINE,
      "stroke-width": 2,
    }),
  };
  return (
    (extras[style] || "") +
    shape("path", { d: cap, fill: color, stroke: LINE, "stroke-width": 2 })
  );
}

function person({
  x,
  skin,
  hair,
  hairColor,
  shirt,
  facing = 0,
  eyes = "open",
  hands = [],
  headY = 228,
}) {
  const cy = headY,
    torsoTop = cy + 20;
  let s = "";
  if (hair === "long")
    s += shape("rect", {
      x: x - 23,
      y: cy - 14,
      width: 46,
      height: 50,
      rx: 18,
      fill: hairColor,
      stroke: LINE,
      "stroke-width": 2,
    });
  // torso
  s += shape("path", {
    d: `M${x - 25} 312 V${torsoTop + 14} Q${x - 25} ${torsoTop} ${x - 11} ${torsoTop} H${x + 11} Q${x + 25} ${torsoTop} ${x + 25} ${torsoTop + 14} V312Z`,
    fill: shirt,
    stroke: LINE,
    "stroke-width": 2,
  });
  // arms reach for whatever they're holding
  for (const [hx, hy] of hands) {
    const sx = x + (hx < x ? -16 : 16);
    s += shape("path", {
      d: `M${sx} ${torsoTop + 10} Q${(sx + hx) / 2} ${Math.max(torsoTop + 22, hy + 6)} ${hx} ${hy}`,
      fill: "none",
      stroke: LINE,
      "stroke-width": 12,
      "stroke-linecap": "round",
    });
    s += shape("path", {
      d: `M${sx} ${torsoTop + 10} Q${(sx + hx) / 2} ${Math.max(torsoTop + 22, hy + 6)} ${hx} ${hy}`,
      fill: "none",
      stroke: shirt,
      "stroke-width": 8,
      "stroke-linecap": "round",
    });
    s += shape("circle", {
      cx: hx,
      cy: hy,
      r: 5.5,
      fill: skin,
      stroke: LINE,
      "stroke-width": 1.5,
    });
  }
  // head and face
  s += shape("circle", {
    cx: x,
    cy,
    r: 19,
    fill: skin,
    stroke: LINE,
    "stroke-width": 2,
  });
  const ex = facing * 6;
  if (eyes === "happy")
    for (const d of [-7, 7])
      s += shape("path", {
        d: `M${x + ex + d - 3} ${cy + 1} q3 -4 6 0`,
        fill: "none",
        stroke: LINE,
        "stroke-width": 2,
        "stroke-linecap": "round",
      });
  else
    for (const d of [-7, 7])
      s += shape("circle", { cx: x + ex + d, cy: cy + 1, r: 2.2, fill: LINE });
  s += shape("path", {
    d: `M${x + ex - 4} ${cy + 8} q4 4 8 0`,
    fill: "none",
    stroke: LINE,
    "stroke-width": 1.8,
    "stroke-linecap": "round",
  });
  for (const d of [-11, 11])
    s += shape("circle", {
      cx: x + ex + d,
      cy: cy + 7,
      r: 3.2,
      fill: "#e98aa6",
      opacity: 0.55,
    });
  s += hairFront(hair, x, cy, hairColor, facing || 1);
  return s;
}

function chair(x, color = "#a8865e") {
  return (
    shape("rect", {
      x: x - 24,
      y: 238,
      width: 48,
      height: 70,
      rx: 14,
      fill: "none",
      stroke: color,
      "stroke-width": 6,
    }) +
    [-12, 0, 12]
      .map((dx) =>
        shape("line", {
          x1: x + dx,
          y1: 244,
          x2: x + dx,
          y2: 300,
          stroke: color,
          "stroke-width": 3,
        }),
      )
      .join("") +
    shape("line", {
      x1: x - 20,
      y1: 336,
      x2: x - 26,
      y2: 376,
      stroke: color,
      "stroke-width": 5,
      "stroke-linecap": "round",
    }) +
    shape("line", {
      x1: x + 20,
      y1: 336,
      x2: x + 26,
      y2: 376,
      stroke: color,
      "stroke-width": 5,
      "stroke-linecap": "round",
    })
  );
}

function table(cx, cloth) {
  const hem = Array.from({ length: 8 }, (_, i) => {
    const x = cx - 80 + i * 20;
    return `Q${x + 10} 346 ${x + 20} 338`;
  }).join(" ");
  return (
    shape("rect", {
      x: cx - 5,
      y: 330,
      width: 10,
      height: 44,
      fill: "#8a735c",
    }) +
    shape("ellipse", { cx, cy: 376, rx: 28, ry: 6, fill: "#8a735c" }) +
    shape("path", {
      d: `M${cx - 80} 298 V338 ${hem} V298Z`,
      fill: cloth,
      stroke: LINE,
      "stroke-width": 2,
    }) +
    shape("ellipse", {
      cx,
      cy: 298,
      rx: 82,
      ry: 12,
      fill: "#fff8e8",
      stroke: LINE,
      "stroke-width": 2,
    })
  );
}

const mug = (x, y, color = "#fff8e8", steam = true) =>
  shape("rect", {
    x: x - 9,
    y: y - 16,
    width: 18,
    height: 18,
    rx: 4,
    fill: color,
    stroke: LINE,
    "stroke-width": 2,
  }) +
  shape("path", {
    d: `M${x + 9} ${y - 12} q8 1 0 9`,
    fill: "none",
    stroke: LINE,
    "stroke-width": 2,
  }) +
  (steam
    ? `<g class="steam">${[-4, 4].map((d) => shape("path", { d: `M${x + d} ${y - 22} q-5 -8 0 -14 q5 -6 0 -12`, fill: "none", stroke: "#c9b28e", "stroke-width": 2, "stroke-linecap": "round" })).join("")}</g>`
    : "");

const parfaitCup = (x, y, w = 22) => {
  const h = w * 1.3;
  return (
    shape("path", {
      d: `M${x - w / 2} ${y - h} L${x + w / 2} ${y - h} L${x + w * 0.35} ${y} L${x - w * 0.35} ${y}Z`,
      fill: "#fffaf0",
      stroke: LINE,
      "stroke-width": 2,
    }) +
    shape("rect", {
      x: x - w * 0.37,
      y: y - h * 0.32,
      width: w * 0.74,
      height: h * 0.3,
      fill: "#c48a4a",
    }) +
    shape("rect", {
      x: x - w * 0.42,
      y: y - h * 0.6,
      width: w * 0.84,
      height: h * 0.28,
      fill: "#e28a45",
    }) +
    shape("rect", {
      x: x - w * 0.46,
      y: y - h * 0.86,
      width: w * 0.92,
      height: h * 0.26,
      fill: "#fbf0dd",
    }) +
    shape("circle", { cx: x, cy: y - h - 2, r: 3.5, fill: "#c0392b" })
  );
};

function drawCafeScene() {
  const svg = $("cafeScene");
  if (!svg) return;
  let s = `<defs>
    <pattern id="awningStripes" width="40" height="10" patternUnits="userSpaceOnUse">
      <rect width="20" height="10" fill="#e9b4c7"/><rect x="20" width="20" height="10" fill="#fff3df"/>
    </pattern>
    <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7dcc4"/><stop offset="1" stop-color="#f4e6c8"/>
    </linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
  </defs>`;
  // wall, bricks, sidewalk
  s += shape("rect", { width: 1400, height: GROUND, fill: "url(#dusk)" });
  for (const [x, y] of [
    [40, 60],
    [120, 110],
    [250, 50],
    [930, 70],
    [1040, 120],
    [1250, 60],
    [1330, 140],
    [180, 180],
  ])
    s += shape("rect", {
      x,
      y,
      width: 46,
      height: 18,
      rx: 3,
      fill: "none",
      stroke: "#e2c9a8",
      "stroke-width": 2,
    });
  s += shape("rect", { y: GROUND, width: 1400, height: 80, fill: "#ead9ba" });
  for (let x = 0; x < 1400; x += 70)
    s += shape("line", {
      x1: x,
      y1: GROUND,
      x2: x - 20,
      y2: 400,
      stroke: "#dcc6a3",
      "stroke-width": 2,
    });
  s += shape("line", {
    x1: 0,
    y1: GROUND,
    x2: 1400,
    y2: GROUND,
    stroke: "#c9b28e",
    "stroke-width": 3,
  });

  // string lights
  for (const [x1, x2] of [
    [0, 372],
    [828, 1400],
  ]) {
    const mid = (x1 + x2) / 2;
    s += shape("path", {
      d: `M${x1} 96 Q${mid} 150 ${x2} 96`,
      fill: "none",
      stroke: LINE,
      "stroke-width": 1.5,
    });
    for (let t = 0.08; t < 1; t += 0.12) {
      const bx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mid + t * t * x2,
        by = (1 - t) ** 2 * 96 + 2 * (1 - t) * t * 150 + t * t * 96;
      s += `<g class="bulb" style="animation-delay:${(t * 3).toFixed(2)}s">${shape("circle", { cx: bx, cy: by + 7, r: 11, fill: "url(#glow)" })}${shape("circle", { cx: bx, cy: by + 6, r: 4.5, fill: "#ffd977", stroke: LINE, "stroke-width": 1 })}</g>`;
    }
  }

  // the shop
  s += shape("rect", {
    x: 380,
    y: 92,
    width: 440,
    height: 228,
    fill: "#b3cdbb",
    stroke: "#6d896c",
    "stroke-width": 3,
  });
  s += shape("rect", {
    x: 470,
    y: 36,
    width: 260,
    height: 48,
    rx: 10,
    fill: "#fff8e8",
    stroke: LINE,
    "stroke-width": 2.5,
  });
  s += `<text x="600" y="68" text-anchor="middle" class="scene-sign">Grandma’s Bakeria</text>`;
  s += shape("path", {
    d: "M372 92 H828 L842 140 H358Z",
    fill: "url(#awningStripes)",
    stroke: LINE,
    "stroke-width": 2,
  });
  for (let x = 368; x <= 832; x += 20)
    s += shape("path", {
      d: `M${x - 10} 140 a10 10 0 0 0 20 0`,
      fill: "url(#awningStripes)",
      stroke: LINE,
      "stroke-width": 2,
    });
  // window with today's bakes
  s += shape("rect", {
    x: 400,
    y: 160,
    width: 252,
    height: 138,
    rx: 6,
    fill: "#fff3d6",
    stroke: "#56704f",
    "stroke-width": 5,
  });
  s += shape("rect", {
    x: 404,
    y: 164,
    width: 244,
    height: 130,
    fill: "url(#glow)",
    opacity: 0.6,
  });
  for (const y of [204, 250])
    s += shape("line", {
      x1: 404,
      y1: y,
      x2: 648,
      y2: y,
      stroke: "#a8865e",
      "stroke-width": 4,
    });
  for (let i = 0; i < 6; i++)
    s +=
      shape("ellipse", {
        cx: 428 + i * 40,
        cy: 192,
        rx: 16,
        ry: 10,
        fill: "#d9a35b",
        stroke: LINE,
        "stroke-width": 1.5,
      }) +
      shape("path", {
        d: `M${420 + i * 40} 188 l6 -4 M${430 + i * 40} 190 l6 -4`,
        stroke: "#a8743a",
        "stroke-width": 1.5,
      });
  for (let i = 0; i < 8; i++) s += parfaitCup(422 + i * 30, 248, 18);
  for (const [x, c] of [
    [450, "#e9b4c7"],
    [526, "#8b5a2b"],
    [602, "#fbf0dd"],
  ])
    s +=
      shape("rect", {
        x: x - 24,
        y: 266,
        width: 48,
        height: 28,
        rx: 5,
        fill: c,
        stroke: LINE,
        "stroke-width": 1.5,
      }) +
      shape("path", {
        d: `M${x - 24} 272 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0`,
        fill: "none",
        stroke: "#fff8e8",
        "stroke-width": 2,
      });
  s += shape("line", {
    x1: 526,
    y1: 160,
    x2: 526,
    y2: 298,
    stroke: "#56704f",
    "stroke-width": 3,
  });
  // door with an OPEN sign
  s += shape("rect", {
    x: 680,
    y: 158,
    width: 118,
    height: 162,
    rx: 4,
    fill: "#6d896c",
    stroke: "#4f6a4e",
    "stroke-width": 3,
  });
  s += shape("rect", {
    x: 694,
    y: 172,
    width: 90,
    height: 72,
    rx: 4,
    fill: "#fff3d6",
    stroke: "#4f6a4e",
    "stroke-width": 2,
  });
  s += shape("rect", {
    x: 710,
    y: 254,
    width: 58,
    height: 22,
    rx: 4,
    fill: "#fff8e8",
    stroke: LINE,
    "stroke-width": 1.5,
  });
  s += `<text x="739" y="270" text-anchor="middle" class="scene-small">OPEN</text>`;
  s += shape("circle", {
    cx: 785,
    cy: 260,
    r: 4,
    fill: "#e3c9a2",
    stroke: LINE,
  });
  // flower box
  s += shape("rect", {
    x: 396,
    y: 298,
    width: 260,
    height: 22,
    rx: 3,
    fill: "#a8865e",
    stroke: LINE,
    "stroke-width": 2,
  });
  for (let i = 0; i < 12; i++)
    s +=
      shape("circle", {
        cx: 408 + i * 21,
        cy: 295 - (i % 2) * 5,
        r: 7,
        fill: i % 3 ? "#d4567d" : "#c0392b",
        stroke: LINE,
        "stroke-width": 1,
      }) +
      shape("circle", { cx: 414 + i * 21, cy: 302, r: 5, fill: "#7fa36f" });

  // chalkboard
  s += shape("line", {
    x1: 318,
    y1: 250,
    x2: 300,
    y2: 372,
    stroke: "#8a735c",
    "stroke-width": 5,
  });
  s += shape("line", {
    x1: 350,
    y1: 250,
    x2: 368,
    y2: 372,
    stroke: "#8a735c",
    "stroke-width": 5,
  });
  s += shape("rect", {
    x: 292,
    y: 248,
    width: 84,
    height: 92,
    rx: 5,
    fill: "#3f3a36",
    stroke: "#a8865e",
    "stroke-width": 4,
  });
  s += `<text x="334" y="276" text-anchor="middle" class="chalk">Fall</text><text x="334" y="296" text-anchor="middle" class="chalk">Parfait</text><text x="334" y="318" text-anchor="middle" class="chalk">is back ♡</text>`;

  // potted plants
  for (const [x, scale] of [[40, 1]]) {
    s += shape("path", {
      d: `M${x - 22 * scale} ${330 - 40 * scale} H${x + 22 * scale} L${x + 16 * scale} 330 H${x - 16 * scale}Z`,
      fill: "#d98b5f",
      stroke: LINE,
      "stroke-width": 2,
    });
    for (const [dx, dy] of [
      [-14, -58],
      [0, -70],
      [14, -56],
      [-6, -46],
      [8, -44],
    ])
      s += shape("circle", {
        cx: x + dx * scale,
        cy: 330 + dy * scale,
        r: 13 * scale,
        fill: "#7fa36f",
        stroke: "#56704f",
        "stroke-width": 1.5,
      });
    for (const [dx, dy] of [
      [-10, -64],
      [10, -60],
      [0, -50],
    ])
      s += shape("circle", {
        cx: x + dx * scale,
        cy: 330 + dy * scale,
        r: 5 * scale,
        fill: "#d4567d",
      });
  }

  // study table: a student with a laptop and tea
  s += chair(150);
  s += person({
    x: 150,
    skin: "#e0ac7e",
    hair: "long",
    hairColor: "#3b2a22",
    shirt: "#9fbf98",
    facing: 1,
    hands: [
      [205, 290],
      [186, 294],
    ],
  });
  s += table(200, "#f2dfe4");
  s += shape("path", {
    d: "M196 296 L208 262 H252 L246 296Z",
    fill: "#c9d4da",
    stroke: LINE,
    "stroke-width": 2,
  });
  s += shape("path", {
    d: "M226 274 c-3 -5 -9 -1 -5 4 l5 5 l5 -5 c4 -5 -2 -9 -5 -4z",
    fill: "#e98aa6",
  });
  for (const [y, c, w] of [
    [290, "#d4567d", 40],
    [282, "#6d896c", 36],
    [274, "#e7bd62", 38],
  ])
    s += shape("rect", {
      x: 254,
      y,
      width: w,
      height: 8,
      rx: 2,
      fill: c,
      stroke: LINE,
      "stroke-width": 1.5,
    });
  s += mug(140, 296, "#fff8e8");

  // Grandma waves from the door
  s += `<image href="grandma-v2.png" x="806" y="196" width="128" height="128" aria-hidden="true"/>`;
  s += shape("rect", {
    x: 860,
    y: 150,
    width: 150,
    height: 36,
    rx: 14,
    fill: "#fff8e8",
    stroke: LINE,
    "stroke-width": 2,
  });
  s += shape("path", {
    d: "M884 186 l-8 12 l18 -12",
    fill: "#fff8e8",
    stroke: LINE,
    "stroke-width": 2,
  });
  s += shape("line", {
    x1: 883,
    y1: 186,
    x2: 893,
    y2: 186,
    stroke: "#fff8e8",
    "stroke-width": 3,
  });
  s += `<text x="935" y="173" text-anchor="middle" class="scene-small">Two spoons? On me.</text>`;

  // lamp post
  s += shape("rect", {
    x: 1166,
    y: 150,
    width: 7,
    height: 172,
    fill: "#4f6a4e",
  });
  s += shape("circle", { cx: 1170, cy: 140, r: 30, fill: "url(#glow)" });
  s += shape("path", {
    d: "M1156 128 H1184 L1178 152 H1162Z",
    fill: "#ffe39a",
    stroke: "#4f6a4e",
    "stroke-width": 3,
  });
  s += shape("path", { d: "M1152 128 L1170 114 L1188 128Z", fill: "#4f6a4e" });

  // first date: two spoons, one Fall Parfait
  s += chair(1010, "#c08c9d");
  s += chair(1110, "#c08c9d");
  s += person({
    x: 1010,
    skin: "#f6d3b5",
    hair: "short",
    hairColor: "#8b5a2b",
    shirt: "#e9b4c7",
    facing: 1,
    hands: [[1052, 262]],
  });
  s += person({
    x: 1110,
    skin: "#8a5a3c",
    hair: "curly",
    hairColor: "#2b1d16",
    shirt: "#e7bd62",
    facing: -1,
    hands: [[1070, 260]],
  });
  s += table(1060, "#e1e8d5");
  s += parfaitCup(1061, 296, 30);
  s += shape("line", {
    x1: 1050,
    y1: 264,
    x2: 1058,
    y2: 272,
    stroke: "#9c8a73",
    "stroke-width": 3,
    "stroke-linecap": "round",
  });
  s += shape("line", {
    x1: 1072,
    y1: 262,
    x2: 1064,
    y2: 272,
    stroke: "#9c8a73",
    "stroke-width": 3,
    "stroke-linecap": "round",
  });
  s += `<g class="float-heart">${shape("path", { d: "M1060 214 c-6 -10 -20 -4 -12 8 l12 12 l12 -12 c8 -12 -6 -18 -12 -8z", fill: "#d4567d", stroke: LINE, "stroke-width": 1.5 })}</g>`;

  // reunion: three friends raise their mugs
  s += chair(1250);
  s += chair(1350);
  s += person({
    x: 1300,
    skin: "#f1c7a5",
    hair: "bun",
    hairColor: "#c48a4a",
    shirt: "#b3cdbb",
    eyes: "happy",
    headY: 220,
    hands: [[1300, 190]],
  });
  s += person({
    x: 1250,
    skin: "#b9784f",
    hair: "short",
    hairColor: "#2b1d16",
    shirt: "#f0c9a8",
    facing: 1,
    eyes: "happy",
    hands: [[1270, 192]],
  });
  s += person({
    x: 1350,
    skin: "#f6d3b5",
    hair: "ponytail",
    hairColor: "#e3b04b",
    shirt: "#c46a88",
    facing: -1,
    eyes: "happy",
    hands: [[1330, 192]],
  });
  s +=
    mug(1272, 194, "#fbf0dd", false) +
    mug(1300, 192, "#fff8e8", false) +
    mug(1328, 194, "#f2dfe4", false);
  for (const [x, y] of [
    [1284, 164],
    [1316, 160],
    [1300, 148],
  ])
    s += `<text x="${x}" y="${y}" text-anchor="middle" class="sparkle">✦</text>`;
  s += table(1300, "#f2e0bf");
  s += parfaitCup(1270, 296, 18) + parfaitCup(1330, 296, 18);

  // a café cat naps on the warm step
  s += `<g class="cat">
    ${shape("path", { d: "M612 372 q40 -12 34 -30", fill: "none", stroke: LINE, "stroke-width": 7, "stroke-linecap": "round", class: "cat-tail" })}
    ${shape("path", { d: "M612 372 q40 -12 34 -30", fill: "none", stroke: "#fbf0dd", "stroke-width": 4, "stroke-linecap": "round", class: "cat-tail" })}
    ${shape("ellipse", { cx: 580, cy: 362, rx: 38, ry: 16, fill: "#fbf0dd", stroke: LINE, "stroke-width": 2 })}
    ${shape("ellipse", { cx: 590, cy: 356, rx: 13, ry: 9, fill: "#e7a15a" })}
    ${shape("circle", { cx: 545, cy: 354, r: 15, fill: "#fbf0dd", stroke: LINE, "stroke-width": 2 })}
    ${shape("path", { d: "M534 346 l2 -14 l9 9 M556 346 l-2 -14 l-9 9", fill: "#fbf0dd", stroke: LINE, "stroke-width": 2, "stroke-linejoin": "round" })}
    ${shape("path", { d: "M538 356 q3 3 6 0 M547 356 q3 3 6 0", fill: "none", stroke: LINE, "stroke-width": 1.8, "stroke-linecap": "round" })}
    <text x="520" y="334" class="scene-small zzz">z</text><text x="510" y="322" class="scene-small zzz" style="animation-delay:.8s">z</text>
  </g>`;

  svg.innerHTML = s;
}

drawCafeScene();
