// Fill the cup: every system's savings becomes a layer of the new Fall
// Parfait, and neighbours' gifts add the topping.
const FUND_KEY = "drm-parfait-v2",
  fundGoal = 300;

const layers = [
  {
    id: "steps",
    name: "Brown-butter granola",
    from: "steps saved",
    color: "#c48a4a",
    dot: "#8a5a2b",
  },
  {
    id: "quotes",
    name: "Spiced apples",
    from: "smarter quotes",
    color: "#e7bd62",
    dot: "#b5862e",
  },
  {
    id: "pantry",
    name: "Pumpkin-maple cream",
    from: "pantry savings",
    color: "#e28a45",
    dot: "#c2662a",
  },
  {
    id: "rush",
    name: "Cinnamon whipped cream",
    from: "the rush-order rescue",
    color: "#fbf0dd",
    dot: "#e1c9a4",
  },
  {
    id: "events",
    name: "Maple drizzle",
    from: "event prep",
    color: "#b5651d",
    dot: "#7a4211",
  },
  {
    id: "gifts",
    name: "Candied pecans",
    from: "neighbours’ gifts",
    color: "#8b5a2b",
    dot: "#5e3b1a",
  },
];
const milestones = [
  [0.25, "First test batch", "Grandma tries three granola ratios."],
  [0.5, "Taste-test Saturday", "The regulars get the first spoonfuls."],
  [0.75, "Recipe card written", "The winning version goes in the book."],
  [1, "Fall parfait launches", "On the menu, with names on the chalkboard."],
];

function seedFund() {
  const d = (name, amount, note = "") => ({
    name,
    amount,
    note,
    date: Date.now(),
  });
  return {
    donations: [
      d("Mrs. Patel", 20, "For the granola!"),
      d("The Thursday study group", 15, "Fuel for finals."),
      d("Ben from the bookshop", 10),
      d("Lucía", 5, "Maple forever."),
    ],
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
  layerAmounts = {};

const giftsTotal = () => fund.donations.reduce((s, d) => s + d.amount, 0);

// Glass geometry: fill runs from y=300 (bottom) to y=62 (rim).
const CUP_BOTTOM = 300,
  CUP_TOP = 62,
  glass = "M38 48 L222 48 L194 288 Q190 304 172 304 L88 304 Q70 304 66 288 Z";

function buildCup() {
  const svg = $("cup");
  svg.innerHTML = `
    <defs><clipPath id="glassClip"><path d="${glass}"/></clipPath></defs>
    <ellipse cx="130" cy="330" rx="62" ry="8" fill="#dcc6a3"/>
    <rect x="120" y="304" width="20" height="24" rx="4" fill="#efe4d0" stroke="#b8a584"/>
    <path d="${glass}" fill="#fffaf0"/>
    <g clip-path="url(#glassClip)" id="cupLayers"></g>
    <line x1="30" x2="230" y1="${CUP_TOP}" y2="${CUP_TOP}" class="cup-guide"/>
    <path d="${glass}" fill="none" stroke="#9c8a73" stroke-width="3"/>
    <path d="M58 70 L80 270" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".55"/>
    <text id="cupLeaf" x="130" y="40" text-anchor="middle" font-size="30" opacity="0">🍁</text>`;
  const g = svg.querySelector("#cupLayers");
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
    const flecks = el("g", { class: "flecks" }),
      rand = seededRandom(l.id.length * 97);
    for (let i = 0; i < 14; i++)
      flecks.append(
        el("circle", {
          cx: 50 + rand() * 160,
          cy: 0,
          "data-f": rand(),
          r: 1.6 + rand() * 2.2,
          fill: l.dot,
        }),
      );
    grp.append(flecks);
    g.append(grp);
  }
}

function renderCup(totals) {
  layerAmounts = { ...totals.byCat, gifts: giftsTotal() };
  const total = layers.reduce(
      (s, l) => s + Math.max(0, layerAmounts[l.id] || 0),
      0,
    ),
    perDollar = (CUP_BOTTOM - CUP_TOP) / Math.max(fundGoal, total);
  let y = CUP_BOTTOM;
  for (const l of layers) {
    const h = Math.max(0, layerAmounts[l.id] || 0) * perDollar,
      grp = $("layer-" + l.id),
      rect = grp.querySelector("rect");
    y -= h;
    rect.setAttribute("y", y);
    rect.setAttribute("height", h);
    grp.querySelectorAll(".flecks circle").forEach((c) => {
      c.setAttribute("cy", y + Number(c.dataset.f) * h);
      c.style.opacity = h > 6 ? 1 : 0;
    });
  }
  const pct = total / fundGoal;
  $("cupLeaf").setAttribute("opacity", pct >= 1 ? 1 : 0);
  $("fundRaised").textContent = money(total);
  $("fundGoal").textContent =
    pct >= 1
      ? `Cup full! ${money(total - fundGoal)} over the ${money(fundGoal)} goal.`
      : `of ${money(fundGoal)} to launch · ${Math.round(pct * 100)}% · per ${ledger.period}`;
  $("fundFill").style.width = Math.min(100, pct * 100) + "%";
  $("cupLegend").innerHTML = [...layers]
    .reverse()
    .map(
      (l) =>
        `<li><i style="background:${l.color}"></i><span><b>${l.name}</b> from ${l.from}</span><em>${money(Math.max(0, layerAmounts[l.id] || 0))}</em></li>`,
    )
    .join("");
  $("milestones").innerHTML = milestones
    .map(
      ([at, title, text]) =>
        `<li class="${pct >= at ? "done" : ""}"><b>${pct >= at ? "✓" : Math.round(at * 100) + "%"}</b><span><strong>${title}</strong> ${text}</span></li>`,
    )
    .join("");
}

function renderWall() {
  const wall = $("donorWall");
  wall.replaceChildren();
  for (const d of fund.donations.slice(-7).reverse()) {
    const li = document.createElement("li");
    li.innerHTML = `<i style="background:#8b5a2b"></i><span><b></b> added ${money(d.amount)} of candied pecans<q></q></span>`;
    li.querySelector("b").textContent = d.name;
    if (d.note) li.querySelector("q").textContent = d.note;
    else li.querySelector("q").remove();
    wall.append(li);
  }
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

$("donateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Math.round(num("donateAmount") * 100) / 100;
  if (!amount) return;
  const name = $("donorName").value.trim() || "A friendly neighbour",
    note = $("donorNote").value.trim();
  fund.donations.push({ name, amount, note, date: Date.now() });
  saveFund();
  renderWall();
  queueLedger();
  $("donorNote").value = "";
  $("donateStatus").textContent =
    `Thank you, ${name}! ${money(amount)} of candied pecans went on top.`;
});

$("resetFund").addEventListener("click", () => {
  fund = seedFund();
  saveFund();
  renderWall();
  queueLedger();
  $("donateStatus").textContent = "Gifts reset to the demo ones.";
});

buildCup();
renderWall();
ledgerListeners.push(renderCup);
renderCup(ledgerTotals());
