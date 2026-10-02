// Fall parfait fund: donations fill the cup, one experimental layer at a time.
const FUND_KEY = "drm-parfait-v1";

const layers = [
  {
    id: "granola",
    name: "Brown-butter granola",
    goal: 60,
    color: "#c48a4a",
    dot: "#8a5a2b",
    buys: "oats, butter and honey for the crunchy base",
  },
  {
    id: "apple",
    name: "Spiced apple compote",
    goal: 50,
    color: "#e7bd62",
    dot: "#b5862e",
    buys: "local apples, cinnamon and nutmeg",
  },
  {
    id: "pumpkin",
    name: "Pumpkin-maple cream",
    goal: 70,
    color: "#e28a45",
    dot: "#c2662a",
    buys: "pumpkin purée, maple syrup and cream cheese",
  },
  {
    id: "cream",
    name: "Cinnamon whipped cream",
    goal: 40,
    color: "#fbf0dd",
    dot: "#e1c9a4",
    buys: "fresh cream and a pinch of cinnamon",
  },
  {
    id: "pecan",
    name: "Candied pecans & drizzle",
    goal: 30,
    color: "#8b5a2b",
    dot: "#5e3b1a",
    buys: "pecans and a maple drizzle on top",
  },
];
const fundGoal = layers.reduce((s, l) => s + l.goal, 0);
const milestones = [
  [0.25, "First test batch", "Grandma tries three granola ratios."],
  [0.5, "Taste-test Saturday", "Donors get the first spoonfuls."],
  [0.75, "Recipe card written", "The winning version goes in the book."],
  [
    1,
    "Fall parfait launches",
    "On the menu, with your names on the chalkboard.",
  ],
];

function seedFund() {
  const d = (name, layer, amount, note = "") => ({
    name,
    layer,
    amount,
    note,
    date: Date.now(),
  });
  return {
    donations: [
      d("Mrs. Patel", "granola", 20, "For the granola!"),
      d("Ben from the bookshop", "apple", 25),
      d("The Okafor kids", "pumpkin", 15, "PUMPKIN!!"),
      d("A friendly neighbour", "granola", 10),
      d("Lucía", "pumpkin", 20, "Maple forever."),
      d("Tom & Priya", "cream", 5),
    ],
    extra: 0,
  };
}
function loadFund() {
  try {
    const saved = JSON.parse(localStorage.getItem(FUND_KEY));
    if (Array.isArray(saved?.donations)) return saved;
  } catch {}
  return seedFund();
}
function saveFund() {
  try {
    localStorage.setItem(FUND_KEY, JSON.stringify(fund));
  } catch {}
}
let fund = loadFund(),
  pickedLayer = "apple";

const raisedFor = (id) =>
  Math.min(
    layers.find((l) => l.id === id).goal,
    fund.donations
      .filter((d) => d.layer === id)
      .reduce((s, d) => s + d.amount, 0),
  );
const totalRaised = () => layers.reduce((s, l) => s + raisedFor(l.id), 0);

// Glass geometry: fill runs from y=300 (bottom) to y=62 (rim).
const CUP_BOTTOM = 300,
  CUP_TOP = 62,
  perDollar = (CUP_BOTTOM - CUP_TOP) / fundGoal,
  glass = "M38 48 L222 48 L194 288 Q190 304 172 304 L88 304 Q70 304 66 288 Z";

function buildCup() {
  const svg = $("cup");
  svg.innerHTML = `
    <defs><clipPath id="glassClip"><path d="${glass}"/></clipPath></defs>
    <ellipse cx="130" cy="330" rx="62" ry="8" fill="#dcc6a3"/>
    <rect x="120" y="304" width="20" height="24" rx="4" fill="#efe4d0" stroke="#b8a584"/>
    <path d="${glass}" fill="#fffaf0"/>
    <g clip-path="url(#glassClip)" id="cupLayers"></g>
    <g clip-path="url(#glassClip)" id="cupGuides"></g>
    <path d="${glass}" fill="none" stroke="#9c8a73" stroke-width="3"/>
    <path d="M58 70 L80 270" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".55"/>
    <g id="cupTag"><line x1="214" y1="64" x2="236" y2="92" stroke="#a86e80"/><rect x="214" y="90" width="44" height="26" rx="5" fill="#e9b4c7" stroke="#a86e80"/><text x="236" y="107" text-anchor="middle" class="cup-tag">#7</text></g>
    <text id="cupLeaf" x="130" y="40" text-anchor="middle" font-size="30" opacity="0">🍁</text>`;
  const g = svg.querySelector("#cupLayers"),
    guides = svg.querySelector("#cupGuides");
  let goalY = CUP_BOTTOM;
  for (const l of layers) {
    const grp = el("g", { id: "layer-" + l.id });
    grp.append(
      el("rect", {
        x: 30,
        width: 200,
        y: CUP_BOTTOM,
        height: 0,
        fill: l.color,
        class: "cup-layer",
      }),
    );
    // A few flecks so each layer reads as texture, not just colour
    const flecks = el("g", { class: "flecks" });
    const rand = seededRandom(l.goal);
    for (let i = 0; i < 14; i++)
      flecks.append(
        el("circle", {
          cx: 50 + rand() * 160,
          cy: rand(),
          r: 1.6 + rand() * 2.2,
          fill: l.dot,
        }),
      );
    grp.append(flecks);
    g.append(grp);
    goalY -= l.goal * perDollar;
    guides.append(
      el("line", { x1: 30, x2: 230, y1: goalY, y2: goalY, class: "cup-guide" }),
    );
  }
}

function renderCup() {
  let y = CUP_BOTTOM;
  for (const l of layers) {
    const h = raisedFor(l.id) * perDollar,
      grp = $("layer-" + l.id);
    y -= h;
    const rect = grp.querySelector("rect");
    rect.setAttribute("y", y);
    rect.setAttribute("height", h);
    grp.querySelectorAll(".flecks circle").forEach((c, i) => {
      if (!c.dataset.f) c.dataset.f = c.getAttribute("cy");
      c.setAttribute("cy", y + Number(c.dataset.f) * h);
      c.style.opacity = h > 6 ? 1 : 0;
    });
  }
  const pct = totalRaised() / fundGoal;
  $("cupLeaf").setAttribute("opacity", pct >= 1 ? 1 : 0);
  $("fundRaised").textContent = money(totalRaised());
  $("fundGoal").textContent =
    pct >= 1
      ? "Cup full! The parfait launches."
      : `of ${money(fundGoal)} to launch · ${Math.round(pct * 100)}%`;
  $("fundFill").style.width = Math.min(100, pct * 100) + "%";
  $("milestones").innerHTML = milestones
    .map(
      ([at, title, text]) =>
        `<li class="${pct >= at ? "done" : ""}"><b>${pct >= at ? "✓" : Math.round(at * 100) + "%"}</b><span><strong>${title}</strong> ${text}</span></li>`,
    )
    .join("");
}

function renderPicks() {
  if (raisedFor(pickedLayer) >= layers.find((l) => l.id === pickedLayer).goal)
    pickedLayer =
      layers.find((l) => raisedFor(l.id) < l.goal)?.id || pickedLayer;
  $("layerPicks").innerHTML = layers
    .map((l) => {
      const r = raisedFor(l.id),
        full = r >= l.goal;
      return `<label class="layer-pick${full ? " full" : ""}">
        <input type="radio" name="layer" value="${l.id}" ${l.id === pickedLayer ? "checked" : ""} ${full ? "disabled" : ""}/>
        <i style="background:${l.color}"></i>
        <span><b>${l.name}</b><small>${full ? "Fully funded ♡" : `${money(r)} of ${money(l.goal)} · ${l.buys}`}</small></span>
        <em style="width:${(r / l.goal) * 100}%"></em>
      </label>`;
    })
    .join("");
}

function renderWall() {
  const wall = $("donorWall");
  wall.replaceChildren();
  for (const d of fund.donations.slice(-7).reverse()) {
    const li = document.createElement("li"),
      layer = layers.find((l) => l.id === d.layer);
    li.innerHTML = `<i style="background:${layer.color}"></i><span><b></b> added ${money(d.amount)} of ${layer.name.toLowerCase()}<q></q></span>`;
    li.querySelector("b").textContent = d.name;
    if (d.note) li.querySelector("q").textContent = d.note;
    else li.querySelector("q").remove();
    wall.append(li);
  }
}

function renderFund() {
  renderCup();
  renderPicks();
  renderWall();
}

$("amountPicks").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-amount]");
  if (!b) return;
  $("donateAmount").value = b.dataset.amount;
  $("amountPicks")
    .querySelectorAll("button")
    .forEach((x) => x.classList.toggle("on", x === b));
});
$("donateAmount").addEventListener("input", () =>
  $("amountPicks")
    .querySelectorAll("button")
    .forEach((x) =>
      x.classList.toggle("on", x.dataset.amount === $("donateAmount").value),
    ),
);
$("layerPicks").addEventListener(
  "change",
  (e) => (pickedLayer = e.target.value),
);

$("donateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  let left = Math.round(num("donateAmount") * 100) / 100;
  if (!left) return;
  const name = $("donorName").value.trim() || "A friendly neighbour",
    note = $("donorNote").value.trim(),
    given = left,
    order = [
      pickedLayer,
      ...layers.map((l) => l.id).filter((id) => id !== pickedLayer),
    ],
    parts = [];
  // Fill the chosen layer first; any overflow tops up the next layer that needs it.
  for (const id of order) {
    const room = layers.find((l) => l.id === id).goal - raisedFor(id);
    if (room <= 0 || left <= 0) continue;
    const amount = Math.min(room, left);
    fund.donations.push({
      name,
      layer: id,
      amount,
      note: parts.length ? "" : note,
      date: Date.now(),
    });
    parts.push(
      `${money(amount)} → ${layers.find((l) => l.id === id).name.toLowerCase()}`,
    );
    left -= amount;
  }
  if (left > 0) fund.extra += left;
  saveFund();
  renderFund();
  $("donorNote").value = "";
  $("donateStatus").textContent = parts.length
    ? `Thank you, ${name}! ${parts.join(", ")}.${left > 0 ? ` ${money(left)} goes to tasting-day cups.` : ""}`
    : `The cup is already full. ${money(given)} goes to tasting-day cups. Thank you!`;
});

$("resetFund").addEventListener("click", () => {
  fund = seedFund();
  saveFund();
  renderFund();
  $("donateStatus").textContent = "Demo cup reset.";
});

buildCup();
renderFund();
