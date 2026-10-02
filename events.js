// Events & deals: market the weekly specials, take sign-ups, and turn past
// events into a headcount forecast and a make-ahead list for Grandma.
const EVENTS_KEY = "drm-events-v1",
  PREP_CUSHION = 1.1;

// price and ingredient cost per item; recipe links cupcakes to the pantry
const menu = {
  parfait: { name: "Fall Parfait", price: 6.5, cost: 2.3, ahead: true },
  choc: {
    name: "Chocolate cupcakes",
    price: 3.5,
    cost: 1.1,
    ahead: true,
    recipe: "chocolate",
  },
  straw: {
    name: "Strawberry cupcakes",
    price: 3.5,
    cost: 1.17,
    ahead: true,
    recipe: "strawberry",
  },
  lemon: {
    name: "Lemon cupcakes",
    price: 3.5,
    cost: 1.05,
    ahead: true,
    recipe: "lemon",
  },
  cookie: { name: "Cookies", price: 2, cost: 0.45, ahead: true },
  drink: { name: "Coffee & tea", price: 3, cost: 0.4 },
  refill: { name: "Free refills", price: 0, cost: 0.25 },
};

function nextWeekday(day) {
  const d = new Date(),
    diff = (day - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const bakeryEvents = {
  friday: {
    name: "Student Fridays",
    icon: "🎓",
    when: `${nextWeekday(5)} · 3–7 PM`,
    perk: "15% off everything with a student card.",
    pitch: "Bring your study group. Grandma saves the big table.",
    discount: { all: 0.15 },
    perWeek: 1,
    rates: {
      drink: 0.9,
      parfait: 0.45,
      choc: 0.35,
      straw: 0.2,
      lemon: 0.1,
      cookie: 0.5,
    },
    baseSignups: [
      "Priya",
      "Jonah",
      "Mei",
      "Theo",
      "Aisha",
      "Sam",
      "Lucas",
      "Noor",
      "Ivy",
      "Dev",
      "Rosa",
      "Kai",
    ],
    seed: 11,
  },
  studyhall: {
    name: "Finals Study Hall",
    icon: "☕",
    when: "Sun–Thu · 6–10 PM",
    perk: "Free coffee and tea refills, and a plug at every table.",
    pitch: "Quiet tables, warm cookies, refills on Grandma.",
    discount: {},
    perWeek: 2,
    rates: { drink: 1, refill: 1.6, cookie: 0.6, parfait: 0.25, choc: 0.15 },
    baseSignups: [
      "Leah",
      "Omar",
      "Chen",
      "Bea",
      "Felix",
      "Hana",
      "Ravi",
      "June",
    ],
    seed: 23,
  },
  twospoons: {
    name: "Two-Spoon Thursdays",
    icon: "♡",
    when: `${nextWeekday(4)} · 6–9 PM`,
    perk: "Two Fall Parfaits and two teas for $16 (save $3).",
    pitch: "For first dates, old friends and anyone who shares.",
    discount: { parfait: 0.16, drink: 0.16 },
    perWeek: 1,
    rates: { parfait: 0.55, drink: 0.5, straw: 0.3, lemon: 0.2 },
    baseSignups: ["Marcus", "Jen", "Ana", "Tom", "Sofia", "Eli"],
    seed: 37,
  },
};

// Seeded sign-ups count as parties of 1–3 people.
const seededParty = (ev, i) => 1 + ((i * 7 + ev.seed) % 3);
const seededPeople = (ev) =>
  ev.baseSignups.reduce((s, _, i) => s + seededParty(ev, i), 0);

// Eight past weeks of each event: turnout swings week to week around
// today's sign-up level and creeps up as word spreads.
function eventHistory(ev) {
  const rand = seededRandom(ev.seed),
    base = seededPeople(ev);
  return Array.from({ length: 8 }, (_, i) => {
    const signups = Math.round(base * (0.72 + i * 0.03 + rand() * 0.3)),
      attended = Math.round(signups * (0.72 + rand() * 0.14)),
      walkIns = Math.round(signups * (0.45 + rand() * 0.25)),
      people = attended + walkIns,
      sold = {};
    for (const [k, r] of Object.entries(ev.rates))
      sold[k] = Math.round(people * r * (0.85 + rand() * 0.3));
    return { week: 8 - i, signups, attended, walkIns, people, sold };
  });
}
for (const ev of Object.values(bakeryEvents)) ev.history = eventHistory(ev);

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(EVENTS_KEY));
    if (saved?.signups) return saved;
  } catch {}
  return {
    active: "friday",
    signups: { friday: [], studyhall: [], twospoons: [] },
  };
}
function saveEvents() {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(eventState));
  } catch {}
}
let eventState = loadEvents();

function signedPeople(key) {
  const ev = bakeryEvents[key];
  return (
    seededPeople(ev) + eventState.signups[key].reduce((s, p) => s + p.size, 0)
  );
}

function forecast(key) {
  const ev = bakeryEvents[key],
    h = ev.history,
    sum = (f) => h.reduce((s, e) => s + f(e), 0),
    showRate = sum((e) => e.attended) / sum((e) => e.signups),
    walkRate = sum((e) => e.walkIns) / sum((e) => e.signups),
    ratios = h.map((e) => e.people / e.signups),
    signed = signedPeople(key),
    expected = Math.round(signed * (showRate + walkRate)),
    low = Math.round(signed * Math.min(...ratios)),
    high = Math.round(signed * Math.max(...ratios)),
    totalPeople = sum((e) => e.people),
    items = Object.keys(ev.rates).map((k) => {
      const perPerson = sum((e) => e.sold[k]) / totalPeople,
        likely = expected * perPerson,
        prep = menu[k].ahead
          ? Math.ceil(likely * PREP_CUSHION)
          : Math.ceil(likely),
        oldWay = Math.max(...h.map((e) => e.sold[k])),
        avg = sum((e) => e.sold[k]) / h.length;
      return { key: k, perPerson, likely, prep, oldWay, avg };
    });
  return { signed, showRate, walkRate, expected, low, high, items };
}

// Food made ahead for the busiest night, minus what the forecast says to make.
function prepSavingsPerEvent(key) {
  return forecast(key).items.reduce(
    (s, i) =>
      s +
      (menu[i.key].ahead
        ? Math.max(0, i.oldWay - i.prep) * menu[i.key].cost
        : 0),
    0,
  );
}
function eventPrepSavingsPerWeek() {
  return Object.entries(bakeryEvents).reduce(
    (s, [k, ev]) => s + prepSavingsPerEvent(k) * ev.perWeek,
    0,
  );
}

function renderCards() {
  $("eventCards").innerHTML = Object.entries(bakeryEvents)
    .map(([k, ev]) => {
      const people = signedPeople(k),
        last = ev.history.at(-1).signups;
      return `<button class="event-card${eventState.active === k ? " active" : ""}" data-event="${k}" aria-pressed="${eventState.active === k}">
        <span class="event-icon" aria-hidden="true">${ev.icon}</span>
        <span class="event-when">${ev.when}</span>
        <strong>${ev.name}</strong>
        <span class="event-perk">${ev.perk}</span>
        <span class="event-count"><b>${people}</b> signed up${people > last ? ` · more than last time` : ""}</span>
      </button>`;
    })
    .join("");
  const ev = bakeryEvents[eventState.active];
  $("promoText").value =
    `${ev.icon} ${ev.name} at Grandma’s Bakeria! ${ev.when}. ${ev.perk} ${ev.pitch} Sign up at the counter or online so Grandma bakes enough for everyone. ♡`;
}

function renderSignup() {
  const key = eventState.active,
    ev = bakeryEvents[key],
    mine = eventState.signups[key];
  $("signupEyebrow").textContent = `${ev.icon} ${ev.when.toUpperCase()}`;
  $("signupTitle").textContent = `Save me a seat at ${ev.name}`;
  $("signupLede").textContent = `${ev.perk} ${ev.pitch}`;
  $("comingHead").textContent = `WHO’S COMING · ${signedPeople(key)} PEOPLE`;
  const list = $("comingList");
  list.replaceChildren();
  mine.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "mine";
    li.textContent = p.size > 1 ? `${p.name} +${p.size - 1}` : p.name;
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "×";
    x.setAttribute("aria-label", `Remove ${p.name}`);
    x.dataset.remove = i;
    li.append(x);
    list.append(li);
  });
  ev.baseSignups.forEach((name, i) => {
    const li = document.createElement("li"),
      extra = seededParty(ev, i) - 1;
    li.textContent = extra ? `${name} +${extra}` : name;
    list.append(li);
  });
}

function stockCheck(items) {
  const need = {};
  for (const i of items) {
    const r = menu[i.key].recipe;
    if (!r || !i.prep) continue;
    for (const [k, v] of Object.entries(usage(r, i.prep)))
      need[k] = (need[k] || 0) + v;
  }
  return Object.entries(need)
    .filter(([k, v]) => v > pantry.stock[k])
    .map(
      ([k, v]) =>
        `${pantryItems[k].name.toLowerCase()} (short ${amount(k, v - pantry.stock[k])})`,
    );
}

function renderPrep() {
  const key = eventState.active,
    ev = bakeryEvents[key],
    f = forecast(key);
  $("prepEyebrow").textContent = `${ev.name.toUpperCase()} · EXPECT ABOUT`;
  $("expectedPeople").innerHTML =
    `${f.expected}<span>people (likely ${f.low}–${f.high})</span>`;
  $("expectedMath").textContent =
    `${f.signed} signed up × (${Math.round(f.showRate * 100)}% usually show + ${Math.round(f.walkRate * 100)}% extra walk-ins)`;
  const ahead = f.items
      .filter((i) => menu[i.key].ahead)
      .sort((a, b) => b.prep - a.prep),
    drinks = f.items.filter((i) => !menu[i.key].ahead);
  $("prepList").innerHTML =
    ahead
      .map(
        (i) =>
          `<div class="cost-row prep-row"><span>${menu[i.key].name}<small>old way: ${i.oldWay}${i.oldWay > i.prep ? ` · ${i.oldWay - i.prep} fewer to waste` : i.oldWay < i.prep ? ` · would have run out` : ""}</small></span><b>${i.prep}</b></div>`,
      )
      .join("") +
    drinks
      .map(
        (i) =>
          `<div class="cost-row prep-row brew"><span>${menu[i.key].name}<small>made to order</small></span><b>~${Math.round(i.likely)} cups</b></div>`,
      )
      .join("");
  const short = stockCheck(ahead),
    saved = prepSavingsPerEvent(key);
  $("prepCheck").textContent = short.length
    ? `Not enough in the pantry for the cupcakes: ${short.join(", ")}. Restock in The cost of yes.`
    : `The pantry has everything for the cupcakes. Prepping to the forecast instead of the busiest night saves about ${money(saved)} of unsold food.`;
  $("prepCheck").classList.toggle("warn", short.length > 0);
  // Revenue at the deal price versus ingredient cost and what the deal gives away.
  let revenue = 0,
    given = 0,
    cost = 0;
  for (const i of f.items) {
    const m = menu[i.key],
      off = ev.discount.all ?? ev.discount[i.key] ?? 0;
    revenue += i.likely * m.price * (1 - off);
    given +=
      i.likely * m.price * off + (i.key === "refill" ? i.likely * m.cost : 0);
    cost += i.likely * m.cost;
  }
  $("dealProfit").textContent = money(revenue - cost);
  $("dealMath").textContent =
    `${money(revenue)} in sales − ${money(cost)} ingredients. The deal gives away ${money(given)}, about ${money(given / Math.max(1, f.expected))} per guest, to fill ${f.expected} seats.`;
}

function columnChart(values, labels, highlightLast) {
  const W = 360,
    H = 160,
    pad = { l: 8, r: 8, t: 20, b: 24 },
    max = Math.max(...values, 1),
    step = (W - pad.l - pad.r) / values.length,
    bw = Math.min(26, step * 0.6);
  let s = `<svg viewBox="0 0 ${W} ${H}">`;
  values.forEach((v, i) => {
    const x = pad.l + step * i + (step - bw) / 2,
      h = (v / max) * (H - pad.t - pad.b),
      y = H - pad.b - h,
      r = Math.min(4, h);
    s += `<g class="col${highlightLast && i === values.length - 1 ? " current" : ""}"><title>${labels[i]}: ${v} people</title>
      <path d="M${x} ${H - pad.b}V${y + r}q0 -${r} ${r} -${r}h${bw - 2 * r}q${r} 0 ${r} ${r}V${H - pad.b}z"/>
      <text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" class="value">${v}</text>
      <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="axis">${labels[i]}</text></g>`;
  });
  return (
    s +
    `<line x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}" class="baseline"/></svg>`
  );
}

function barList(rows) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return rows
    .map(
      (r) =>
        `<div class="hbar"><span>${r.label}</span><i style="width:${(r.value / max) * 100}%"></i><b>${r.value.toFixed(0)}</b></div>`,
    )
    .join("");
}

function renderHistory() {
  const key = eventState.active,
    ev = bakeryEvents[key],
    h = ev.history,
    f = forecast(key);
  $("historyTitle").textContent = `The last eight ${ev.name}`;
  const values = [...h.map((e) => e.people), f.expected],
    labels = [...h.map((e) => `${e.week}w`), "next"];
  $("turnoutChart").innerHTML = columnChart(values, labels, true);
  $("turnoutChart").setAttribute(
    "aria-label",
    `People per event over eight weeks: ${h.map((e) => e.people).join(", ")}; ${f.expected} expected next.`,
  );
  const sellers = f.items
    .filter((i) => i.key !== "refill")
    .map((i) => ({ label: menu[i.key].name, value: i.avg }))
    .sort((a, b) => b.value - a.value);
  $("sellersChart").innerHTML = barList(sellers);
  $("sellersChart").setAttribute(
    "aria-label",
    "Average sold per event: " +
      sellers.map((s) => `${s.label} ${s.value.toFixed(0)}`).join(", "),
  );
  const first = h[0].people,
    last = h.at(-1).people,
    avgSpend = f.items.reduce(
      (s, i) =>
        s +
        i.perPerson *
          menu[i.key].price *
          (1 - (ev.discount.all ?? ev.discount[i.key] ?? 0)),
      0,
    );
  $("eventStats").innerHTML = `
    <div><span>SHOW-UP RATE</span><b>${Math.round(f.showRate * 100)}%</b></div>
    <div><span>WALK-INS PER SIGN-UP</span><b>${f.walkRate.toFixed(2)}</b></div>
    <div><span>SPEND PER GUEST</span><b>${money(avgSpend)}</b></div>`;
  const top = sellers[0],
    ahead = sellers.find((s) => s.label !== "Coffee & tea");
  $("eventInsight").textContent =
    `Turnout grew ${Math.round(((last - first) / first) * 100)}% in eight weeks. ${top.label} sells most (${top.value.toFixed(0)} a night)${ahead && ahead !== top ? `; the top make-ahead item is ${ahead.label.toLowerCase()}` : ""}. Grandma used to bake for the busiest night; the forecast trims that to what sign-ups say.`;
}

function renderEvents() {
  renderCards();
  renderSignup();
  renderPrep();
  renderHistory();
}

$("eventCards").addEventListener("click", (e) => {
  const card = e.target.closest("[data-event]");
  if (!card) return;
  eventState.active = card.dataset.event;
  saveEvents();
  $("signupStatus").textContent = "";
  $("promoStatus").textContent = "";
  renderEvents();
});

$("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("signupName").value.trim(),
    size = Number($("signupSize").value) || 1;
  if (!name) return;
  const key = eventState.active;
  eventState.signups[key].unshift({ name, size, date: Date.now() });
  saveEvents();
  $("signupForm").reset();
  $("signupStatus").textContent =
    `You’re on the list, ${name}! ${size > 1 ? `Grandma will set ${size} places.` : "See you there."}`;
  renderEvents();
});

$("comingList").addEventListener("click", (e) => {
  const x = e.target.closest("[data-remove]");
  if (!x) return;
  eventState.signups[eventState.active].splice(Number(x.dataset.remove), 1);
  saveEvents();
  renderEvents();
});

$("copyPromo").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("promoText").value);
    $("promoStatus").textContent =
      "Copied. Paste it into a post or print it for the window.";
  } catch {
    $("promoText").select();
    $("promoStatus").textContent = "Selected. Press Ctrl/⌘ + C to copy.";
  }
});

// Pantry stock can change on another tab; refresh the stock check on return.
document
  .querySelectorAll('.tab[data-view="events"]')
  .forEach((t) => t.addEventListener("click", renderPrep));

renderEvents();
