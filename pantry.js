// Pantry stock that moves with completed orders, plus spending trends.
const PANTRY_KEY = "drm-pantry-v1",
  DAY = 86400000;

// unit cost in $, bulk = cheaper large pack, shelf = days before it spoils
const pantryItems = {
  flour: {
    name: "Flour",
    unit: "kg",
    start: 12,
    par: 20,
    reorderAt: 5,
    cost: 1.6,
    bulk: { size: 20, price: 24 },
    shelf: 180,
  },
  sugar: {
    name: "Sugar",
    unit: "kg",
    start: 8,
    par: 15,
    reorderAt: 4,
    cost: 1.9,
    bulk: { size: 20, price: 30 },
    shelf: 365,
  },
  icing: {
    name: "Icing sugar",
    unit: "kg",
    start: 5,
    par: 10,
    reorderAt: 3,
    cost: 2.4,
    bulk: { size: 10, price: 19 },
    shelf: 365,
  },
  butter: {
    name: "Butter",
    unit: "kg",
    start: 6,
    par: 10,
    reorderAt: 3,
    cost: 11,
    bulk: { size: 10, price: 92 },
    shelf: 30,
  },
  eggs: {
    name: "Eggs",
    unit: "",
    start: 90,
    par: 180,
    reorderAt: 48,
    cost: 0.38,
    bulk: { size: 180, price: 54 },
    shelf: 28,
  },
  strawberries: {
    name: "Strawberries",
    unit: "kg",
    start: 2.5,
    par: 4,
    reorderAt: 1.5,
    cost: 9,
    bulk: { size: 5, price: 38 },
    shelf: 4,
  },
  cocoa: {
    name: "Cocoa",
    unit: "kg",
    start: 1.5,
    par: 3,
    reorderAt: 0.6,
    cost: 14,
    bulk: { size: 5, price: 55 },
    shelf: 365,
  },
  lemons: {
    name: "Lemons",
    unit: "",
    start: 20,
    par: 40,
    reorderAt: 10,
    cost: 0.6,
    bulk: { size: 60, price: 27 },
    shelf: 21,
  },
  liners: {
    name: "Cupcake liners",
    unit: "",
    start: 400,
    par: 600,
    reorderAt: 150,
    cost: 0.03,
    bulk: { size: 1000, price: 20 },
    shelf: 9999,
  },
  boxes: {
    name: "Boxes (12)",
    unit: "",
    start: 30,
    par: 60,
    reorderAt: 15,
    cost: 1.2,
    bulk: { size: 100, price: 95 },
    shelf: 9999,
  },
};

// Amount used per cupcake (cake + frosting); boxes are added per dozen.
const baseRecipe = {
    flour: 0.045,
    sugar: 0.04,
    butter: 0.045,
    eggs: 0.4,
    icing: 0.03,
    liners: 1,
  },
  recipes = {
    strawberry: { ...baseRecipe, strawberries: 0.03 },
    chocolate: { ...baseRecipe, cocoa: 0.012 },
    lemon: { ...baseRecipe, lemons: 0.2 },
  },
  recipeNames = {
    strawberry: "Strawberry",
    chocolate: "Chocolate",
    lemon: "Lemon",
  };

function usage(recipe, qty) {
  const out = {};
  for (const [k, per] of Object.entries(recipes[recipe])) out[k] = per * qty;
  out.boxes = Math.ceil(qty / 12);
  return out;
}
const spend = (use) =>
  Object.entries(use).reduce((s, [k, v]) => s + v * pantryItems[k].cost, 0);

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Eight weeks of believable demo orders, with chocolate slowly catching on.
function seedHistory() {
  const rand = seededRandom(7),
    now = Date.now(),
    history = [];
  for (let week = 9; week >= 1; week--) {
    const orders = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < orders; i++) {
      const choc = 0.15 + (9 - week) * 0.05,
        r = rand(),
        recipe =
          r < choc ? "chocolate" : r < choc + 0.45 ? "strawberry" : "lemon",
        qty = [12, 18, 24, 24, 36, 48][Math.floor(rand() * 6)],
        price =
          { strawberry: 5.1, chocolate: 4.6, lemon: 5.6 }[recipe] +
          rand() * 0.6,
        use = usage(recipe, qty);
      history.push({
        date: now - (week * 7 - Math.floor(rand() * 7)) * DAY,
        recipe,
        qty,
        quote: qty * price,
        profit: qty * price - spend(use) - qty * 1.9,
        use,
        seeded: true,
      });
    }
  }
  return history;
}

function freshPantry() {
  return {
    stock: Object.fromEntries(
      Object.entries(pantryItems).map(([k, v]) => [k, v.start]),
    ),
    history: seedHistory(),
    purchases: [],
    completed: [],
  };
}
function loadPantry() {
  try {
    const saved = JSON.parse(localStorage.getItem(PANTRY_KEY));
    if (saved?.stock && saved.history) return saved;
  } catch {}
  return freshPantry();
}
function savePantry() {
  try {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(pantry));
  } catch {}
}
let pantry = loadPantry();

const amount = (k, v) => {
  const it = pantryItems[k];
  return it.unit
    ? `${v.toFixed(v < 10 ? 2 : 1)} ${it.unit}`
    : `${Math.round(v)}`;
};
function ticketRecipe() {
  return (
    customers.find((c) => c.product === $("ticketProduct").textContent)
      ?.recipe || "strawberry"
  );
}
const ticketId = () => $("ticketNumber").textContent;

function renderStock() {
  const need = usage(ticketRecipe(), num("qty")),
    rows = [];
  let low = 0,
    short = 0;
  for (const [k, it] of Object.entries(pantryItems)) {
    const have = pantry.stock[k],
      needs = need[k] || 0,
      out = needs > have,
      isLow = have <= it.reorderAt;
    if (isLow) low++;
    if (out) short++;
    const flag = out ? "SHORT" : isLow ? "LOW" : "OK",
      cls = out ? "out" : isLow ? "low" : "ok";
    rows.push(`<div class="stock-row ${cls}${needs ? " needed" : ""}">
      <span class="stock-name">${it.name}${needs ? `<small>this ticket needs ${amount(k, needs)}</small>` : ""}</span>
      <div class="stock-bar" title="Reorder at ${amount(k, it.reorderAt)}"><i style="width:${Math.min(100, (have / it.par) * 100)}%"></i><b style="left:${(it.reorderAt / it.par) * 100}%"></b></div>
      <span class="stock-qty">${amount(k, have)}</span>
      <span class="flag">${flag}</span>
    </div>`);
  }
  $("stockList").innerHTML = rows.join("");
  $("stockBadge").textContent = short
    ? `${short} SHORT`
    : low
      ? `${low} LOW`
      : "ALL STOCKED";
  $("stockBadge").className = "badge " + (short ? "bad" : low ? "warn" : "");
  $("stockSummary").textContent = short
    ? `Not enough on the shelves for ticket ${ticketId()}: restock before you accept, or the bake will stall.`
    : low
      ? `${low} item${low > 1 ? "s are" : " is"} at or below the reorder line. Ticket ${ticketId()} can still be made.`
      : `Everything for ticket ${ticketId()} is on the shelves.`;
}

function weeklyBuckets() {
  const now = Date.now(),
    weeks = Array.from({ length: 9 }, () => ({ spend: 0, orders: 0, qty: 0 }));
  for (const o of pantry.history) {
    const age = Math.floor((now - o.date) / (7 * DAY));
    if (age < 0 || age > 8) continue;
    const w = weeks[8 - age];
    w.spend += spend(o.use);
    w.orders++;
    w.qty += o.qty;
  }
  return weeks;
}

function renderChart(weeks) {
  const W = 520,
    H = 190,
    pad = { l: 44, r: 8, t: 22, b: 26 },
    max = Math.max(...weeks.map((w) => w.spend), 1),
    step = (W - pad.l - pad.r) / weeks.length,
    bw = Math.min(30, step * 0.55),
    y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b),
    nice = Math.ceil(max / 50) * 50,
    ticks = [0, nice / 2, nice].filter((t) => t <= max * 1.05);
  let svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
  for (const t of ticks)
    svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">$${t}</text>`;
  weeks.forEach((w, i) => {
    const x = pad.l + step * i + (step - bw) / 2,
      top = y(w.spend),
      h = H - pad.b - top,
      r = Math.min(4, h),
      label = i === 8 ? "now" : `${8 - i}w`,
      tip = `${i === 8 ? "This week" : `${8 - i} weeks ago`}: ${money(w.spend)} on ingredients · ${w.orders} orders · ${w.qty} cupcakes`;
    svg += `<g class="bar${i === 8 ? " current" : ""}" data-tip="${tip}">
      <rect class="hit" x="${pad.l + step * i}" y="${pad.t}" width="${step}" height="${H - pad.t - pad.b}"/>
      <path d="M${x} ${H - pad.b}V${top + r}q0 -${r} ${r} -${r}h${bw - 2 * r}q${r} 0 ${r} ${r}V${H - pad.b}z"/>
      <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="axis">${label}</text>
    </g>`;
  });
  const last = weeks[8],
    lx = pad.l + step * 8 + step / 2;
  svg += `<text x="${lx}" y="${y(last.spend) - 6}" text-anchor="middle" class="value">${money(last.spend)}</text>`;
  svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}" class="baseline"/></svg><div class="chart-tip" hidden></div>`;
  const box = $("spendChart");
  box.innerHTML = svg;
  box.setAttribute(
    "aria-label",
    "Weekly ingredient spend, last nine weeks: " +
      weeks.map((w) => money(w.spend)).join(", "),
  );
  const tipEl = box.querySelector(".chart-tip");
  box.querySelectorAll(".bar").forEach((b) => {
    b.addEventListener("mouseenter", () => {
      tipEl.textContent = b.dataset.tip;
      tipEl.hidden = false;
      const r = b.getBoundingClientRect(),
        br = box.getBoundingClientRect();
      tipEl.style.left =
        Math.min(
          br.width - 220,
          Math.max(0, r.left - br.left + r.width / 2 - 110),
        ) + "px";
    });
    b.addEventListener("mouseleave", () => (tipEl.hidden = true));
  });
}

function buildInsights() {
  const now = Date.now(),
    recent = pantry.history.filter((o) => now - o.date < 28 * DAY),
    prior = pantry.history.filter(
      (o) => now - o.date >= 28 * DAY && now - o.date < 56 * DAY,
    ),
    daily = {},
    ideas = [];
  for (const k of Object.keys(pantryItems)) daily[k] = 0;
  for (const o of recent)
    for (const [k, v] of Object.entries(o.use)) daily[k] += v / 28;

  // Bulk packs that would be used up before they spoil
  for (const [k, it] of Object.entries(pantryItems)) {
    const monthly = daily[k] * 30,
      bulkUnit = it.bulk.price / it.bulk.size;
    if (!monthly || bulkUnit >= it.cost) continue;
    if (it.bulk.size > daily[k] * it.shelf) continue;
    if (monthly < it.bulk.size * 0.5) continue;
    const save = monthly * (it.cost - bulkUnit);
    if (save >= 2)
      ideas.push({
        save,
        html: `<b>Buy ${it.name.toLowerCase()} in bulk.</b> You use about ${amount(k, monthly)} a month; the ${amount(k, it.bulk.size)} pack drops the price ${Math.round((1 - bulkUnit / it.cost) * 100)}% and is used up before it spoils.`,
      });
  }
  // Perishables kept at a par level far beyond their shelf life
  for (const [k, it] of Object.entries(pantryItems)) {
    if (it.shelf > 30 || !daily[k]) continue;
    const keepDays = it.par / daily[k];
    if (keepDays <= it.shelf * 1.5) continue;
    const excess = it.par - daily[k] * it.shelf,
      save = excess * it.cost * (30 / keepDays) * 0.5;
    ideas.push({
      save,
      html: `<b>Order ${it.name.toLowerCase()} smaller and more often.</b> A full restock lasts ~${Math.round(keepDays)} days, but they keep ${it.shelf}. Aim for ${amount(k, Math.max(daily[k] * it.shelf, 0.1))} at a time; we count half the excess as likely waste.`,
    });
  }
  // Demand shifts and best earners (no dollar figure, just direction)
  const qtyBy = (list) =>
    list.reduce((m, o) => ((m[o.recipe] = (m[o.recipe] || 0) + o.qty), m), {});
  const nowQ = qtyBy(recent),
    thenQ = qtyBy(prior);
  let rising = null;
  for (const r of Object.keys(recipes)) {
    const change =
      ((nowQ[r] || 0) - (thenQ[r] || 0)) / Math.max(1, thenQ[r] || 0);
    if (!rising || change > rising.change) rising = { r, change };
  }
  if (rising && rising.change > 0.15)
    ideas.push({
      save: 0,
      html: `<b>${recipeNames[rising.r]} is trending up ${Math.round(rising.change * 100)}%</b> over the last four weeks. Pre-weigh its dry mix on Mondays and raise its par level before you run short.`,
    });
  const perCup = {};
  for (const o of pantry.history) {
    perCup[o.recipe] ??= { p: 0, q: 0 };
    perCup[o.recipe].p += o.profit;
    perCup[o.recipe].q += o.qty;
  }
  const ranked = Object.entries(perCup)
    .map(([r, v]) => [r, v.p / v.q])
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1)
    ideas.push({
      save: 0,
      html: `<b>${recipeNames[ranked[0][0]]} earns the most</b> at ${money(ranked[0][1])} profit per cupcake, against ${money(ranked.at(-1)[1])} for ${recipeNames[ranked.at(-1)[0]].toLowerCase()}. Feature it in the window.`,
    });
  const savers = ideas
    .filter((i) => i.save)
    .sort((a, b) => b.save - a.save)
    .slice(0, 4);
  return [...savers, ...ideas.filter((i) => !i.save)];
}

function renderTrends() {
  const weeks = weeklyBuckets();
  renderChart(weeks);
  const orders = weeks.reduce((s, w) => s + w.orders, 0),
    cups = weeks.reduce((s, w) => s + w.qty, 0),
    avg = weeks.slice(0, 8).reduce((s, w) => s + w.spend, 0) / 8;
  $("trendStats").innerHTML = `
    <div><span>ORDERS</span><b>${orders}</b></div>
    <div><span>CUPCAKES</span><b>${cups}</b></div>
    <div><span>AVG SPEND / WEEK</span><b>${money(avg)}</b></div>`;
  const ideas = buildInsights();
  $("insights").innerHTML = ideas
    .map(
      (i) =>
        `<li>${i.html}${i.save ? `<span class="save">≈ ${money(i.save)} / month</span>` : ""}</li>`,
    )
    .join("");
  $("insightTotal").textContent =
    money(ideas.reduce((s, i) => s + i.save, 0)) + " / month";
}

function renderPantry() {
  renderStock();
  renderTrends();
}

function hideComplete() {
  $("completeOrder").hidden = true;
}

$("acceptOrder").addEventListener("click", () => {
  const need = usage(ticketRecipe(), num("qty")),
    missing = Object.entries(need).filter(([k, v]) => v > pantry.stock[k]);
  if (pantry.completed.includes(ticketId()))
    return setOrderState(
      "COMPLETED",
      `Ticket ${ticketId()} is already baked and picked up. Its stock has been used.`,
    );
  $("completeOrder").hidden = false;
  if (missing.length)
    $("orderResponse").textContent +=
      " Heads up: short on " +
      missing
        .map(
          ([k, v]) =>
            `${pantryItems[k].name.toLowerCase()} (need ${amount(k, v - pantry.stock[k])} more)`,
        )
        .join(", ") +
      ".";
  renderStock();
});

$("completeOrder").addEventListener("click", () => {
  const recipe = ticketRecipe(),
    qty = num("qty"),
    use = usage(recipe, qty),
    low = [];
  for (const [k, v] of Object.entries(use)) {
    pantry.stock[k] = Math.max(0, pantry.stock[k] - v);
    if (pantry.stock[k] <= pantryItems[k].reorderAt)
      low.push(pantryItems[k].name.toLowerCase());
  }
  pantry.history.push({
    date: Date.now(),
    recipe,
    qty,
    quote: num("quote"),
    profit: lastProfit,
    use,
  });
  pantry.completed.push(ticketId());
  savePantry();
  hideComplete();
  setOrderState(
    "COMPLETED",
    `Baked, boxed and picked up. ${qty} cupcakes came off the shelves${low.length ? `; time to reorder ${low.join(", ")}.` : "."}`,
  );
  renderPantry();
});

$("restock").addEventListener("click", () => {
  let cost = 0,
    count = 0;
  for (const [k, it] of Object.entries(pantryItems)) {
    if (pantry.stock[k] > it.reorderAt) continue;
    cost += (it.par - pantry.stock[k]) * it.cost;
    pantry.stock[k] = it.par;
    count++;
  }
  if (count) pantry.purchases.push({ date: Date.now(), cost });
  savePantry();
  $("pantryStatus").textContent = count
    ? `Restocked ${count} item${count > 1 ? "s" : ""} to par for ${money(cost)}.`
    : "Nothing is below its reorder line.";
  renderStock();
});

$("resetPantry").addEventListener("click", () => {
  pantry = freshPantry();
  savePantry();
  $("pantryStatus").textContent = "Demo pantry reset.";
  renderPantry();
});

$("declineOrder").addEventListener("click", hideComplete);
$("nextCustomer").addEventListener("click", () => {
  hideComplete();
  renderStock();
});
document.querySelectorAll("#cost input").forEach((e) =>
  e.addEventListener("input", () => {
    hideComplete();
    renderStock();
  }),
);
$("startChallenge").addEventListener("click", renderStock);

const pantrySavingsMonthly = () =>
  buildInsights().reduce((s, i) => s + i.save, 0);

renderPantry();
