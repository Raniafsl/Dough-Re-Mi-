// Bakery floor plan, simulated motion sensors and route optimizer.
const SVGNS = "http://www.w3.org/2000/svg",
  M_PER_PX = 0.02, // floor plan scale: 1 px ≈ 2 cm
  PACE = 0.65, // metres / second while carrying a tray
  STOP_SECONDS = 8, // pause at each station while the sensor sees her
  DAYS_MONTH = 26,
  DAYS_YEAR = 312;

const stations = {
  fridge: {
    label: "WALK-IN FRIDGE",
    sub: "berries · cream · butter",
    x: 30,
    y: 30,
    w: 140,
    h: 95,
    fill: "#b3cdbb",
    stroke: "#6d896c",
    at: [182, 78],
    stage: "Keep one chilled batch in an under-counter fridge",
  },
  pantry: {
    label: "PANTRY",
    sub: "flour · sugar · granola",
    x: 30,
    y: 145,
    w: 140,
    h: 85,
    fill: "#f4e6c8",
    stroke: "#b8a584",
    at: [182, 188],
    stage: "Pre-weigh the dry mix into a bin",
  },
  wash: {
    label: "WASH",
    sub: "sink · dishwasher",
    x: 30,
    y: 250,
    w: 140,
    h: 58,
    fill: "#b3cdbb",
    stroke: "#6d896c",
    at: [182, 279],
  },
  mixer: {
    label: "MIXING BENCH",
    sub: "mixer · scales",
    x: 225,
    y: 30,
    w: 160,
    h: 75,
    fill: "#f4e6c8",
    stroke: "#b8a584",
    at: [305, 117],
  },
  ovens: {
    label: "OVENS",
    sub: "two deck ovens",
    x: 410,
    y: 30,
    w: 180,
    h: 75,
    fill: "#f0c9a8",
    stroke: "#b98463",
    at: [500, 117],
  },
  cooling: {
    label: "COOLING RACKS",
    sub: "fresh bakes",
    x: 615,
    y: 30,
    w: 145,
    h: 75,
    fill: "#f4e6c8",
    stroke: "#b8a584",
    at: [687, 117],
    stage: "Use a rolling cooling rack",
  },
  cupboard: {
    label: "CUPBOARD",
    sub: "bowls · spoons",
    x: 780,
    y: 30,
    w: 95,
    h: 170,
    fill: "#e9b4c7",
    stroke: "#a86e80",
    at: [768, 150],
    stage: "Hang bowls and spoons on a rail",
  },
  assembly: {
    label: "ASSEMBLY",
    sub: "parfait station",
    x: 300,
    y: 160,
    w: 200,
    h: 75,
    fill: "#f4e6c8",
    stroke: "#b8a584",
    at: [400, 148],
  },
  packing: {
    label: "PACKING",
    sub: "boxes · labels",
    x: 600,
    y: 215,
    w: 170,
    h: 70,
    fill: "#f2dfe4",
    stroke: "#a86e80",
    at: [685, 203],
    stage: "Keep folded boxes on a shelf",
  },
  counter: {
    label: "FRONT COUNTER",
    sub: "till · pickup",
    x: 320,
    y: 352,
    w: 260,
    h: 50,
    fill: "#e3c9a2",
    stroke: "#a8865e",
    at: [450, 340],
  },
  display: {
    label: "DISPLAY CASE",
    sub: "today’s bakes",
    x: 625,
    y: 352,
    w: 240,
    h: 50,
    fill: "#e9b4c7",
    stroke: "#a86e80",
    at: [745, 340],
  },
};

const workflows = {
  parfait: {
    name: "The parfait shuffle",
    noun: "parfait",
    home: "assembly",
    itemsPerCycle: 1,
    perDay: 40,
    observed: [
      "assembly",
      "fridge",
      "assembly",
      "cupboard",
      "assembly",
      "fridge",
      "assembly",
      "cupboard",
      "assembly",
    ],
    stops: ["fridge", "cupboard"],
    order: [],
    tipTitle: "Everything within reach.",
    tips: [
      ["Bring berries to assembly.", "Stage one chilled batch at a time."],
      ["Give spoons a little home.", "Keep a clean tray beside the bowls."],
      ["Collect cream with berries.", "One fridge trip, two ingredients."],
    ],
  },
  cupcakes: {
    name: "A batch of cupcakes",
    noun: "batch of 12",
    home: "mixer",
    itemsPerCycle: 12,
    perDay: 4,
    observed: [
      "mixer",
      "pantry",
      "mixer",
      "fridge",
      "mixer",
      "pantry",
      "mixer",
      "ovens",
      "mixer",
      "cooling",
      "fridge",
      "cooling",
      "packing",
      "counter",
      "mixer",
    ],
    stops: ["pantry", "fridge", "ovens", "cooling", "packing", "counter"],
    order: [
      ["pantry", "ovens"],
      ["fridge", "ovens"],
      ["ovens", "cooling"],
      ["cooling", "packing"],
      ["packing", "counter"],
    ],
    tipTitle: "One trip per ingredient.",
    tips: [
      [
        "Read the whole recipe first.",
        "Collect every dry item in one pantry trip.",
      ],
      ["Grab frosting butter early.", "It softens while the cupcakes bake."],
      [
        "Box straight from the rack.",
        "Bring boxes to cooling, not cupcakes to boxes.",
      ],
    ],
  },
  opening: {
    name: "Opening the shop",
    noun: "morning restock",
    home: "counter",
    itemsPerCycle: 1,
    perDay: 3,
    observed: [
      "counter",
      "cooling",
      "display",
      "cooling",
      "display",
      "cupboard",
      "counter",
      "packing",
      "display",
      "wash",
      "counter",
    ],
    stops: ["cooling", "display", "cupboard", "packing", "wash"],
    order: [["cooling", "display"]],
    tipTitle: "Load the cart once.",
    tips: [
      ["Roll, don’t carry.", "One cart from the cooling racks to the case."],
      ["Batch the small stuff.", "Napkins, boxes and tongs in one loop."],
      ["Wash on the way back.", "Drop trays at the sink before the counter."],
    ],
  },
};

let workflowKey = "parfait",
  sensorResult = null,
  sensorRun = 0;
const wf = () => workflows[workflowKey];

function el(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

function drawFloor() {
  const g = $("floorBase");
  // Walls, zones and shop-floor details
  g.append(
    el("rect", {
      x: 14,
      y: 14,
      width: 872,
      height: 512,
      rx: 18,
      fill: "none",
      stroke: "#8a735c",
      "stroke-width": 6,
    }),
    el("rect", {
      x: 14,
      y: 330,
      width: 872,
      height: 196,
      fill: "#f9efe0",
      opacity: 0.75,
    }),
    el("line", {
      x1: 14,
      y1: 330,
      x2: 886,
      y2: 330,
      stroke: "#b8a584",
      "stroke-width": 2,
      "stroke-dasharray": "10 6",
    }),
    el("text", { x: 24, y: 322, class: "zone" }, "KITCHEN"),
    el("text", { x: 24, y: 348, class: "zone" }, "SHOP FLOOR"),
    // Entrance gap in the bottom wall
    el("rect", { x: 450, y: 518, width: 90, height: 14, fill: "#f9efe0" }),
    el("rect", {
      x: 462,
      y: 498,
      width: 66,
      height: 16,
      rx: 4,
      fill: "#d9b6a0",
    }),
    el(
      "text",
      { x: 495, y: 490, "text-anchor": "middle", class: "subtext" },
      "entrance",
    ),
  );
  // Café seating
  for (const [x, y] of [
    [80, 440],
    [180, 478],
    [250, 415],
  ]) {
    for (const [dx, dy] of [
      [-30, 0],
      [30, 0],
      [0, -28],
    ])
      g.append(
        el("circle", {
          cx: x + dx,
          cy: y + dy,
          r: 8,
          fill: "#e8d7b9",
          stroke: "#b8a584",
        }),
      );
    g.append(
      el("circle", { cx: x, cy: y, r: 20, fill: "#fff8e8", stroke: "#b8a584" }),
    );
  }
  g.append(
    el(
      "text",
      { x: 160, y: 515, "text-anchor": "middle", class: "subtext" },
      "café seating",
    ),
  );
  // Plants
  for (const [x, y] of [
    [860, 495],
    [40, 365],
  ])
    g.append(
      el("circle", { cx: x, cy: y, r: 13, fill: "#9fbf98", stroke: "#6d896c" }),
    );
  // Stations
  for (const [id, s] of Object.entries(stations)) {
    const box = el("g", { class: "station", "data-station": id });
    box.append(
      el("rect", {
        x: s.x,
        y: s.y,
        width: s.w,
        height: s.h,
        rx: 12,
        fill: s.fill,
        stroke: s.stroke,
        "stroke-width": 1.5,
      }),
      el(
        "text",
        { x: s.x + s.w / 2, y: s.y + s.h / 2 - 3, "text-anchor": "middle" },
        s.label,
      ),
      el(
        "text",
        {
          x: s.x + s.w / 2,
          y: s.y + s.h / 2 + 15,
          "text-anchor": "middle",
          class: "subtext",
        },
        s.sub,
      ),
    );
    g.append(box);
  }
  // One motion sensor per station
  const sg = $("sensors");
  for (const [id, s] of Object.entries(stations)) {
    const sensor = el("g", {
      class: "sensor",
      id: "sensor-" + id,
      transform: `translate(${s.at[0]} ${s.at[1]})`,
    });
    sensor.append(
      el("title", {}, s.label.toLowerCase() + " motion sensor"),
      el("circle", { r: 11, class: "sensor-ring" }),
      el("circle", { r: 5, class: "sensor-dot" }),
    );
    sg.append(sensor);
  }
}

const point = (id, anchors = {}) => anchors[id] || stations[id].at;
function legLength(a, b, anchors) {
  const [x1, y1] = point(a, anchors),
    [x2, y2] = point(b, anchors);
  return Math.hypot(x2 - x1, y2 - y1);
}
function routeLength(route, anchors) {
  let d = 0;
  for (let i = 1; i < route.length; i++)
    d += legLength(route[i - 1], route[i], anchors);
  return d;
}
function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  return arr.flatMap((x, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [
      x,
      ...p,
    ]),
  );
}
// Shortest loop from home through every stop, respecting "a before b" rules.
function bestRoute(w, anchors) {
  let best = null;
  for (const p of permutations(w.stops)) {
    if (w.order.some(([a, b]) => p.indexOf(a) > p.indexOf(b))) continue;
    const route = [w.home, ...p, w.home],
      d = routeLength(route, anchors);
    if (!best || d < best.d) best = { route, d };
  }
  return best;
}
// Try staging each movable station's supplies beside home; keep the biggest win.
function bestLayout(w) {
  const [hx, hy] = stations[w.home].at;
  let best = null;
  for (const id of w.stops) {
    if (!stations[id].stage) continue;
    const r = bestRoute(w, { [id]: [hx + 40, hy - 6] });
    if (!best || r.d < best.d) best = { ...r, station: id };
  }
  return best;
}
const seconds = (px) => (px * M_PER_PX) / PACE;
const metres = (px) => (px * M_PER_PX).toFixed(1) + " m";
const clock = (t) =>
  `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}`;

function currentRoute() {
  return optimized ? bestRoute(wf()).route : wf().observed;
}

function drawRoute() {
  const route = currentRoute(),
    pts = route.map((id) => point(id));
  $("route").setAttribute("d", "M" + pts.map((p) => p.join(" ")).join(" L"));
  $("route").setAttribute("stroke", optimized ? "#639772" : "#d77a97");
  $("routeSwatch").style.borderTopColor = optimized ? "#639772" : "#d77a97";
  $("routeLabel").textContent =
    `${optimized ? "Efficient" : "Observed"} route · ${route.length - 1} trips`;
  $("routeDistance").textContent =
    `${metres(routeLength(route))} per ${wf().noun}`;
  $("optimize").textContent = optimized
    ? "↺ Show the observed route"
    : "✧ Show the efficient route";
  resetWalker();
}

function resetWalker() {
  cancelAnimationFrame(animation);
  const [x, y] = point(wf().home);
  $("walker").setAttribute("transform", `translate(${x} ${y})`);
  $("grandmaSprite").setAttribute("transform", "");
  $("play").textContent = "▶ Play workflow";
}

const lastPing = {};
function ping(id) {
  const s = $("sensor-" + id);
  if (!s || performance.now() - (lastPing[id] || 0) < 500) return;
  lastPing[id] = performance.now();
  s.classList.remove("ping");
  void s.getBBox();
  s.classList.add("ping");
}

function drawHeat(visits) {
  const g = $("heat");
  g.replaceChildren();
  const max = Math.max(1, ...Object.values(visits));
  for (const [id, v] of Object.entries(visits)) {
    const [x, y] = stations[id].at;
    g.append(
      el("circle", {
        cx: x,
        cy: y,
        r: 16 + 54 * Math.sqrt(v / max),
        fill: "url(#heatGlow)",
      }),
    );
    g.append(
      el(
        "text",
        { x, y: y + 28, "text-anchor": "middle", class: "heat-count" },
        v,
      ),
    );
  }
}

function simulateDay(w) {
  const events = [],
    legs = {},
    visits = {},
    span = (12 * 3600) / w.perDay;
  let px = 0;
  for (let c = 0; c < w.perDay; c++) {
    const route = [w.observed[0]];
    for (let i = 1; i < w.observed.length; i++) {
      route.push(w.observed[i]);
      // Real days include forgotten items: an extra trip back out and home.
      if (
        w.observed[i] === w.home &&
        i < w.observed.length - 1 &&
        Math.random() < 0.12
      )
        route.push(w.stops[Math.floor(Math.random() * w.stops.length)], w.home);
    }
    let t = 7 * 3600 + c * span + Math.random() * span * 0.2;
    route.forEach((s, i) => {
      if (i) {
        const a = route[i - 1],
          d = legLength(a, s),
          key = [a, s].sort().join("|");
        px += d;
        t += seconds(d) + STOP_SECONDS;
        legs[key] = (legs[key] || 0) + 1;
      }
      visits[s] = (visits[s] || 0) + 1;
      events.push({ t, s });
    });
  }
  return { events, legs, visits, px, cycles: w.perDay };
}

function renderInsights() {
  const w = wf(),
    eff = bestRoute(w),
    lay = bestLayout(w),
    measured = sensorResult,
    obsPx = measured ? measured.px / measured.cycles : routeLength(w.observed),
    obsSec = seconds(obsPx),
    effSec = seconds(eff.d),
    laySec = lay ? seconds(lay.d) : effSec,
    wage = num("wage"),
    dayMin = ((obsSec - effSec) * w.perDay) / 60,
    dayCash = (dayMin / 60) * wage,
    layExtra = (((effSec - laySec) * w.perDay) / 3600) * wage;
  $("obsRoute").textContent = duration(obsSec);
  $("obsRouteSub").textContent =
    `${metres(obsPx)} per ${w.noun}${measured ? " · measured" : " · floor-plan estimate"}`;
  $("effRoute").textContent = duration(effSec);
  $("effRouteSub").textContent =
    `${metres(eff.d)} · ${eff.route.length - 1} trips`;
  $("layRoute").textContent = duration(laySec);
  $("layRouteSub").textContent = lay
    ? `${metres(lay.d)} · ${stations[lay.station].label.toLowerCase()} staged`
    : "nothing movable";
  $("saveDay").textContent = `${dayMin.toFixed(0)} min · ${money(dayCash)}`;
  $("saveMonth").textContent = money(dayCash * DAYS_MONTH);
  $("saveYear").textContent = money(dayCash * DAYS_YEAR);
  $("layoutIdea").innerHTML = lay
    ? `<b>Layout idea:</b> ${stations[lay.station].stage} beside the ${stations[w.home].label.toLowerCase()}. With the efficient route, that saves another <b>${money(layExtra * DAYS_YEAR)}</b> a year in walking time.`
    : "The efficient route is already as tight as this layout allows.";
  $("sensorHeadline").textContent = measured
    ? `${measured.events.length} footsteps logged across ${measured.cycles} ${w.noun === "parfait" ? "parfaits" : "cycles"}.`
    : "Switch the sensors on for a day.";
  $("applySensors").disabled = !measured;
}

function renderLegs(legs) {
  const top = Object.entries(legs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const max = top[0]?.[1] || 1;
  $("hotLegs").innerHTML = top
    .map(([k, n]) => {
      const [a, b] = k.split("|");
      return `<div class="leg"><span>${stations[a].label.toLowerCase()} ↔ ${stations[b].label.toLowerCase()}</span><b>${n}×</b><i style="width:${(n / max) * 100}%"></i><small>${metres(legLength(a, b) * n)} walked</small></div>`;
    })
    .join("");
}

function renderTips() {
  const w = wf();
  $("tipTitle").textContent = w.tipTitle;
  $("tipList").innerHTML = w.tips
    .map(([b, t]) => `<li><b>${b}</b><br />${t}</li>`)
    .join("");
}

function selectWorkflow(key) {
  workflowKey = key;
  sensorResult = null;
  sensorRun++;
  $("workflowTitle").textContent = wf().name;
  $("heat").replaceChildren();
  $("hotLegs").innerHTML = '<p class="muted">No trips recorded yet.</p>';
  $("sensorLog").innerHTML =
    '<li class="muted">Waiting for the first footstep…</li>';
  $("playStatus").textContent = "Grandma is ready when you are.";
  drawRoute();
  renderTips();
  renderInsights();
}

$("workflow").innerHTML = Object.entries(workflows)
  .map(([k, w]) => `<option value="${k}">${w.name}</option>`)
  .join("");
$("workflow").addEventListener("change", (e) => selectWorkflow(e.target.value));

$("optimize").addEventListener("click", () => {
  optimized = !optimized;
  drawRoute();
  $("playStatus").textContent = optimized
    ? "Same tasks, smarter order. Collect together, then go home."
    : "This is the route the sensors saw.";
  cost();
});

$("play").addEventListener("click", () => {
  cancelAnimationFrame(animation);
  let start;
  const path = $("route"),
    length = path.getTotalLength(),
    ms = Math.min(12000, Math.max(5000, length * 3.5));
  $("play").textContent = "↺ Restart replay";
  function frame(t) {
    start ??= t;
    const p = Math.min((t - start) / ms, 1),
      pos = path.getPointAtLength(p * length);
    $("walker").setAttribute("transform", `translate(${pos.x} ${pos.y})`);
    $("grandmaSprite").setAttribute(
      "transform",
      `rotate(${Math.sin(p * 90) * 4} 0 -15)`,
    );
    for (const [id, s] of Object.entries(stations))
      if (Math.hypot(s.at[0] - pos.x, s.at[1] - pos.y) < 18) ping(id);
    $("playStatus").textContent =
      p < 1
        ? `Grandma is ${optimized ? "taking the efficient route" : "walking the observed route"}…`
        : "Replay complete. Tiny changes add up.";
    if (p < 1) animation = requestAnimationFrame(frame);
    else {
      $("play").textContent = "▶ Replay workflow";
      $("grandmaSprite").setAttribute("transform", "");
    }
  }
  animation = requestAnimationFrame(frame);
});

$("sensorDay").addEventListener("click", () => {
  const run = ++sensorRun,
    w = wf(),
    day = simulateDay(w),
    visits = {},
    legs = {},
    reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    perFrame = reduce
      ? day.events.length
      : Math.max(1, Math.ceil(day.events.length / 120));
  let i = 0;
  sensorResult = null;
  $("sensorDay").disabled = true;
  $("playStatus").textContent = "Sensors listening… simulating a full day.";
  function step() {
    if (run !== sensorRun) return ($("sensorDay").disabled = false);
    for (let n = 0; n < perFrame && i < day.events.length; n++, i++) {
      const e = day.events[i],
        prev = day.events[i - 1];
      visits[e.s] = (visits[e.s] || 0) + 1;
      if (prev && prev.s !== e.s) {
        const key = [prev.s, e.s].sort().join("|");
        legs[key] = (legs[key] || 0) + 1;
      }
      ping(e.s);
    }
    drawHeat(visits);
    renderLegs(legs);
    $("sensorLog").innerHTML = day.events
      .slice(Math.max(0, i - 6), i)
      .reverse()
      .map(
        (e) =>
          `<li><time>${clock(e.t)}</time> ◉ ${stations[e.s].label.toLowerCase()} · motion</li>`,
      )
      .join("");
    if (i < day.events.length) requestAnimationFrame(step);
    else {
      sensorResult = day;
      renderLegs(day.legs);
      renderInsights();
      $("sensorDay").disabled = false;
      $("sensorDay").textContent = "◉ Run another day";
      $("playStatus").textContent = "Day logged. Compare the routes below.";
    }
  }
  requestAnimationFrame(step);
});

$("heatToggle").addEventListener(
  "change",
  (e) => ($("heat").style.display = e.target.checked ? "" : "none"),
);

$("applySensors").addEventListener("click", () => {
  if (!sensorResult) return;
  const w = wf(),
    obs = seconds(sensorResult.px / sensorResult.cycles) / w.itemsPerCycle,
    eff = seconds(bestRoute(w).d) / w.itemsPerCycle;
  $("walking").value = Math.round(obs);
  $("daily").value = w.perDay * w.itemsPerCycle;
  improvedWalk = Math.round(eff);
  $("movementFootnote").textContent =
    `Walking now comes from the sensor day (${Math.round(obs)} sec observed, ${improvedWalk} sec on the efficient route, per item). Reaching can’t be seen by motion sensors, so it stays as you set it. Simulated sensors, not live hardware.`;
  $("walking").dispatchEvent(new Event("input"));
  $("playStatus").textContent = "Measured times applied to every workspace.";
});

$("wage").addEventListener("input", renderInsights);

drawFloor();
selectWorkflow("parfait");
