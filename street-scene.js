// The view outside the shop, under the arch: soft hills, a little
// neighbourhood in the distance, and along the pavement a lamppost,
// flowers, a bench with a napping cat, a welcome sign and Grandma.
// Kept pale and quiet so it frames the counter instead of competing with it.
(function drawStreet() {
  const svg = document.getElementById("streetScene");
  if (!svg) return;
  const LINE = "#8a6f5c",
    W = 1200,
    PAVE = 262, // top of the pavement
    attrs = (o) =>
      Object.entries(o)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" "),
    el = (tag, o) => `<${tag} ${attrs(o)}/>`,
    at = (x, y, inner) => `<g transform="translate(${x} ${y})">${inner}</g>`;

  let s = `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbeee0" stop-opacity="0"/>
      <stop offset=".35" stop-color="#fbeee0"/>
      <stop offset="1" stop-color="#f8ecd8"/>
    </linearGradient>
    <radialGradient id="sunGlow"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient>
    <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
  </defs>`;

  // ── Sky, sun and clouds ───────────────────────────────────────────────
  s += el("rect", {
    x: -60,
    y: 0,
    width: W + 120,
    height: 300,
    fill: "url(#sky)",
  });
  s += el("circle", { cx: 1010, cy: 70, r: 70, fill: "url(#sunGlow)" });
  s += el("circle", { cx: 1010, cy: 70, r: 22, fill: "#fbd9a0", opacity: 0.8 });
  const cloud = (x, y, k) =>
    at(
      x,
      y,
      `<g transform="scale(${k})" fill="#fffaf2" opacity=".9">
      ${el("ellipse", { cx: 0, cy: 12, rx: 46, ry: 12 })}${el("circle", { cx: -16, cy: 4, r: 16 })}${el("circle", { cx: 8, cy: -2, r: 20 })}${el("circle", { cx: 28, cy: 6, r: 13 })}</g>`,
    );
  s += cloud(250, 60, 1) + cloud(620, 38, 0.8) + cloud(860, 92, 0.65);

  // ── Hills and the neighbourhood in the distance ───────────────────────
  s += el("path", {
    d: `M-60 200 Q120 130 300 170 T660 150 T1000 160 T${W + 60} 140 V300 H-60Z`,
    fill: "#e3ecd9",
  });
  // Little houses on the far hill
  const house = (x, y, wall, roof) =>
    at(
      x,
      y,
      `${el("rect", { x: -14, y: -16, width: 28, height: 22, fill: wall, stroke: "#c9b39a", "stroke-width": 1.2 })}
      ${el("path", { d: "M-18 -14 L0 -30 L18 -14Z", fill: roof, stroke: "#c9b39a", "stroke-width": 1.2, "stroke-linejoin": "round" })}
      ${el("rect", { x: -4, y: -10, width: 8, height: 8, fill: "#fff1c4" })}`,
    );
  s +=
    house(380, 168, "#fbf3e4", "#e9b4c7") +
    house(420, 162, "#f3e3cf", "#b3cdbb") +
    house(560, 156, "#fbf3e4", "#e8c39b") +
    house(930, 158, "#fbf3e4", "#e9b4c7");
  s += el("path", {
    d: `M-60 222 Q160 176 380 206 T780 196 T${W + 60} 186 V300 H-60Z`,
    fill: "#d6e5ca",
  });
  // Round trees
  const tree = (x, y, k, c = "#b6d0a8") =>
    at(
      x,
      y,
      `<g transform="scale(${k})">${el("rect", { x: -3, y: -6, width: 6, height: 26, rx: 2, fill: "#b89a7a" })}
      ${el("circle", { cx: 0, cy: -22, r: 20, fill: c })}${el("circle", { cx: -14, cy: -12, r: 13, fill: c })}${el("circle", { cx: 14, cy: -12, r: 13, fill: c })}</g>`,
    );
  s +=
    tree(60, 214, 0.9) +
    tree(330, 210, 0.7, "#c3d9b5") +
    tree(640, 202, 0.8) +
    tree(1150, 196, 1, "#c3d9b5") +
    tree(1090, 206, 0.6);

  // ── Grass verge with tiny flowers, then the pavement ──────────────────
  s += el("path", {
    d: `M-60 244 Q300 232 600 240 T${W + 60} 236 V${PAVE + 2} H-60Z`,
    fill: "#cfe1c0",
  });
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 46 + ((i * 17) % 23),
      y = PAVE - 8 - ((i * 7) % 9);
    s += el("circle", {
      cx: x,
      cy: y,
      r: 2.6,
      fill: ["#f3c5d4", "#fffaf2", "#f7e39a"][i % 3],
    });
  }
  s += el("rect", {
    x: -60,
    y: PAVE,
    width: W + 120,
    height: 60,
    fill: "#efe1c6",
  });
  s += el("line", {
    x1: -60,
    y1: PAVE,
    x2: W + 60,
    y2: PAVE,
    stroke: "#dcc7a3",
    "stroke-width": 3,
  });
  for (let x = 30; x < W; x += 90)
    s += el("line", {
      x1: x,
      y1: PAVE + 4,
      x2: x - 14,
      y2: 300,
      stroke: "#e4d2b2",
      "stroke-width": 2,
    });

  // ── Along the pavement ────────────────────────────────────────────────
  // Lamppost with a hanging flower basket
  s += at(
    40,
    PAVE - 182,
    `${el("circle", { cx: 50, cy: 44, r: 46, fill: "url(#lampGlow)" })}
    ${el("rect", { x: 46, y: 60, width: 8, height: 116, rx: 3, fill: "#7f9c7e" })}
    ${el("rect", { x: 36, y: 172, width: 28, height: 10, rx: 4, fill: "#6d896c" })}
    ${el("path", { d: "M54 78 H96", stroke: "#7f9c7e", "stroke-width": 4, "stroke-linecap": "round" })}
    ${el("path", { d: "M34 34 H66 L60 60 H40 Z", fill: "#fff1c4", stroke: LINE, "stroke-width": 2 })}
    ${el("path", { d: "M30 34 L50 20 L70 34 Z", fill: "#7f9c7e", stroke: LINE, "stroke-width": 2, "stroke-linejoin": "round" })}
    ${el("path", { d: "M88 78 v10 M104 78 v10", stroke: LINE, "stroke-width": 1.5 })}
    ${el("path", { d: "M82 88 h28 q0 16 -14 16 t-14 -16 Z", fill: "#c9a77f", stroke: LINE, "stroke-width": 2 })}
    ${[
      [86, 86, "#e8a2b8"],
      [96, 84, "#f3c5d4"],
      [106, 86, "#e8a2b8"],
    ]
      .map(([x, y, c]) =>
        el("circle", {
          cx: x,
          cy: y,
          r: 5,
          fill: c,
          stroke: LINE,
          "stroke-width": 1,
        }),
      )
      .join("")}
    ${el("path", { d: "M84 100 q-4 14 2 24 M108 100 q5 12 -1 22", fill: "none", stroke: "#9fbf98", "stroke-width": 3, "stroke-linecap": "round" })}`,
  );

  // A tall potted plant
  s += at(
    250,
    PAVE,
    `${el("path", { d: "M-22 -36 H22 L14 0 H-14 Z", fill: "#e3a27c", stroke: LINE, "stroke-width": 2 })}
    ${[
      [0, -72, 20],
      [-16, -56, 15],
      [16, -56, 15],
      [0, -94, 14],
    ]
      .map(([x, y, r]) =>
        el("circle", {
          cx: x,
          cy: y,
          r,
          fill: "#a9c79f",
          stroke: "#7f9c7e",
          "stroke-width": 1.5,
        }),
      )
      .join("")}`,
  );

  // Bench, with a cat napping on it
  s += at(
    360,
    PAVE,
    `${el("rect", { x: 8, y: -64, width: 150, height: 8, rx: 3, fill: "#d9b48f", stroke: LINE, "stroke-width": 1.5 })}
    ${el("rect", { x: 8, y: -50, width: 150, height: 8, rx: 3, fill: "#d9b48f", stroke: LINE, "stroke-width": 1.5 })}
    ${el("rect", { x: 0, y: -32, width: 166, height: 10, rx: 4, fill: "#c99c70", stroke: LINE, "stroke-width": 1.5 })}
    ${[16, 146].map((x) => el("path", { d: `M${x} -64 V0`, stroke: LINE, "stroke-width": 4, "stroke-linecap": "round" })).join("")}
    ${el("path", { d: "M114 -34 q30 -4 30 -18", fill: "none", stroke: LINE, "stroke-width": 6, "stroke-linecap": "round" })}
    ${el("path", { d: "M114 -34 q30 -4 30 -18", fill: "none", stroke: "#fbf0dd", "stroke-width": 3, "stroke-linecap": "round" })}
    ${el("ellipse", { cx: 88, cy: -41, rx: 30, ry: 11, fill: "#fbf0dd", stroke: LINE, "stroke-width": 1.8 })}
    ${el("ellipse", { cx: 98, cy: -45, rx: 10, ry: 6, fill: "#e7a15a" })}
    ${el("circle", { cx: 60, cy: -46, r: 11, fill: "#fbf0dd", stroke: LINE, "stroke-width": 1.8 })}
    ${el("path", { d: "M52 -52 l1 -10 l7 6 M68 -52 l-1 -10 l-7 6", fill: "#fbf0dd", stroke: LINE, "stroke-width": 1.8, "stroke-linejoin": "round" })}
    ${el("path", { d: "M55 -44 q2 2 4 0 M62 -44 q2 2 4 0", fill: "none", stroke: LINE, "stroke-width": 1.4, "stroke-linecap": "round" })}`,
  );

  // Grandma on the welcome mat, waving people in
  s += at(
    680,
    PAVE,
    `${el("rect", { x: -56, y: -6, width: 112, height: 12, rx: 5, fill: "#e6c9b1", stroke: "#cdae93", "stroke-width": 1.5 })}
    <text x="0" y="3" text-anchor="middle" class="street-mat">WELCOME</text>
    <image href="grandma-v2.png" x="-75" y="-156" width="150" height="150" class="street-grandma"/>
    ${el("rect", { x: 56, y: -152, width: 128, height: 32, rx: 14, fill: "#fffaf2", stroke: "#d8c6a6", "stroke-width": 2 })}
    ${el("path", { d: "M68 -120 l-10 10 l20 -10", fill: "#fffaf2", stroke: "#d8c6a6", "stroke-width": 2 })}
    ${el("line", { x1: 68, y1: -120, x2: 78, y2: -120, stroke: "#fffaf2", "stroke-width": 3 })}
    <text x="120" y="-131" text-anchor="middle" class="street-say">Come on in, dears!</text>`,
  );

  // Chalkboard sign
  s += at(
    900,
    PAVE,
    `${el("path", { d: "M-22 -78 L-34 0 M22 -78 L34 0", stroke: "#c9a77f", "stroke-width": 4, "stroke-linecap": "round" })}
    ${el("rect", { x: -38, y: -84, width: 76, height: 66, rx: 5, fill: "#5a5350", stroke: "#c9a77f", "stroke-width": 4 })}
    <text x="0" y="-60" text-anchor="middle" class="street-chalk">Welcome in</text>
    <text x="0" y="-42" text-anchor="middle" class="street-chalk">Fall Parfait</text>
    <text x="0" y="-26" text-anchor="middle" class="street-chalk">is back ♡</text>`,
  );

  // Flower pots and a low bush
  const pot = (x, k, flower) =>
    at(
      x,
      PAVE,
      `<g transform="scale(${k})">${el("path", { d: "M-22 -34 H22 L16 0 H-16 Z", fill: "#e3a27c", stroke: LINE, "stroke-width": 2 })}
      ${[
        [-14, -50],
        [0, -60],
        [14, -48],
        [-4, -40],
        [8, -38],
      ]
        .map(([dx, dy]) =>
          el("circle", {
            cx: dx,
            cy: dy,
            r: 12,
            fill: "#a9c79f",
            stroke: "#7f9c7e",
            "stroke-width": 1.2,
          }),
        )
        .join("")}
      ${[
        [-10, -56],
        [10, -52],
        [0, -44],
        [-14, -40],
      ]
        .map(([dx, dy]) =>
          el("circle", {
            cx: dx,
            cy: dy,
            r: 5,
            fill: flower,
            stroke: LINE,
            "stroke-width": 1,
          }),
        )
        .join("")}</g>`,
    );
  s += pot(1030, 1, "#e8a2b8") + pot(1110, 0.8, "#f3c5d4");
  s += at(
    1170,
    PAVE,
    [
      [-14, -14, 14],
      [4, -18, 16],
      [20, -12, 12],
    ]
      .map(([x, y, r]) => el("circle", { cx: x, cy: y, r, fill: "#b6d0a8" }))
      .join(""),
  );

  svg.innerHTML = s;
})();
