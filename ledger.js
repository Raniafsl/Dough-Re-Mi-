// One running total of what the systems save Grandma.
const LEDGER_KEY = "drm-ledger-v1",
  periods = { day: 1, week: 6, month: 26 };

function loadLedger() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEDGER_KEY));
    if (saved && periods[saved.period] && Array.isArray(saved.wins))
      return saved;
  } catch {}
  return { period: "week", wins: [] };
}
function saveLedger() {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {}
}
let ledger = loadLedger();

const categories = {
  steps: { name: "Steps saved", tab: "movement" },
  quotes: { name: "Smarter quotes", tab: "cost" },
  pantry: { name: "Pantry", tab: "cost" },
  rush: { name: "Rush order", tab: "story" },
};

// Each line: recurring minutes or cash per day (scaled by the period), or a
// one-off cash amount from a decision made in the app.
function ledgerLines() {
  const days = periods[ledger.period],
    lines = [],
    perItem = stepSeconds(false) - stepSeconds(true);
  lines.push({
    cat: "steps",
    label: "Parfait station: everything within reach",
    minutes: ((perItem * num("daily")) / 60) * days,
    math: `${perItem.toFixed(0)} s × ${num("daily")} items/day × ${days} day${days > 1 ? "s" : ""}`,
  });
  for (const key of ["cupcakes", "opening"]) {
    const w = workflows[key],
      s = workflowSavings(key);
    lines.push({
      cat: "steps",
      label: `${w.name}: efficient route`,
      minutes: ((s.sec * w.perDay) / 60) * days,
      math: `${s.sec.toFixed(0)} s × ${w.perDay}/day × ${days} day${days > 1 ? "s" : ""}${s.measured ? " · sensor-measured" : " · floor-plan estimate"}`,
    });
  }
  const monthly = pantrySavingsMonthly();
  lines.push({
    cat: "pantry",
    label: "Pantry: bulk packs and less spoilage",
    cash: (monthly / 26) * days,
    math: `${money(monthly)} / month ÷ 26 working days × ${days}`,
  });
  // The rush-order demo is Milo's order; when it's rescued there, that
  // replaces any counter decision on the same order so it isn't counted twice.
  const rushGain = challengeStarted
      ? modelOrder($("smartLayout").checked, $("laterPickup").checked).profit -
        modelOrder(false, false).profit
      : 0,
    rushProduct = customers[1].product;
  for (const w of ledger.wins)
    if (!(rushGain > 0 && w.product === rushProduct))
      lines.push({
        cat: "quotes",
        label: w.label,
        cash: w.cash,
        math: w.math,
        oneOff: true,
      });
  if (rushGain > 0)
    lines.push({
      cat: "rush",
      label: "Rush order: shorter route + later pickup",
      cash: rushGain,
      math: "profit with changes − profit as requested",
      oneOff: true,
    });
  const wage = num("wage");
  for (const l of lines)
    l.value = (l.cash || 0) + ((l.minutes || 0) / 60) * wage;
  return lines;
}

function ledgerTotals() {
  const lines = ledgerLines(),
    minutes = lines.reduce((s, l) => s + (l.minutes || 0), 0),
    cash = lines.reduce((s, l) => s + (l.cash || 0), 0),
    timeValue = (minutes / 60) * num("wage"),
    byCat = {};
  for (const l of lines) byCat[l.cat] = (byCat[l.cat] || 0) + l.value;
  return { lines, minutes, cash, timeValue, total: cash + timeValue, byCat };
}

const hoursMinutes = (m) =>
  m >= 60
    ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`
    : `${Math.round(m)} min`;

const ledgerListeners = [];
let ledgerQueued = false;
function refreshLedger() {
  ledgerQueued = false;
  const t = ledgerTotals();
  $("ledgerPeriod").value = ledger.period;
  $("ledgerTotal").textContent = money(t.total);
  $("ledgerSplit").textContent =
    `${money(t.cash)} cash + ${hoursMinutes(t.minutes)} of Grandma’s time (${money(t.timeValue)} at ${money(num("wage"))}/h)`;
  $("ledgerChips").innerHTML = Object.entries(categories)
    .filter(([k]) => t.byCat[k])
    .map(
      ([k, c]) =>
        `<button class="chip" data-tab="${c.tab}">${c.name} <b>${money(t.byCat[k])}</b></button>`,
    )
    .join("");
  $("ledgerBadge").textContent = "PER " + ledger.period.toUpperCase();
  $("ledgerRows").innerHTML =
    `<div class="ledger-row head"><span>System</span><span>How it’s worked out</span><span>Time</span><span>Value</span></div>` +
    t.lines
      .map(
        (l) => `<div class="ledger-row${l.value < 0 ? " loss" : ""}">
          <span>${l.label}${l.oneOff ? ' <em class="tag">one-off</em>' : ""}</span>
          <span class="math">${l.math}</span>
          <span>${l.minutes ? hoursMinutes(l.minutes) : "—"}</span>
          <b>${money(l.value)}</b>
        </div>`,
      )
      .join("");
  $("ledgerTotals").innerHTML = `
    <div><span>CASH</span><b>${money(t.cash)}</b></div>
    <div><span>TIME FREED</span><b>${hoursMinutes(t.minutes)}</b><small>${money(t.timeValue)} of labour</small></div>
    <div class="grand"><span>TOTAL FOR THE PARFAIT FUND</span><b>${money(t.total)}</b></div>`;
  ledgerListeners.forEach((fn) => fn(t));
}
function queueLedger() {
  if (ledgerQueued) return;
  ledgerQueued = true;
  setTimeout(refreshLedger, 0);
}

// Order decisions made at the counter become one-off wins (or honest losses).
function offeredQuote() {
  const c = customers.find((c) => c.product === $("ticketProduct").textContent);
  return c ? c.values.quote : num("quote");
}
function recordWin(label, cash, math) {
  const ticket = $("ticketNumber").textContent;
  ledger.wins = ledger.wins.filter((w) => w.ticket !== ticket);
  if (cash)
    ledger.wins.push({
      ticket,
      label,
      cash,
      math,
      product: $("ticketProduct").textContent,
    });
  saveLedger();
}
$("acceptOrder").addEventListener("click", () => {
  const who = $("customerName").textContent.split(" · ")[0],
    offered = offeredQuote(),
    quote = num("quote");
  if (quote > offered + 0.005)
    recordWin(
      `Re-quoted ${who} before saying yes`,
      quote - offered,
      `accepted ${money(quote)} instead of the ${money(offered)} first offered`,
    );
  else if (lastProfit < 0)
    recordWin(
      `Said yes to ${who} below cost`,
      lastProfit,
      `quote ${money(quote)} − true cost ${money(quote - lastProfit)}`,
    );
  else recordWin("", 0, "");
});
$("declineOrder").addEventListener("click", () => {
  const who = $("customerName").textContent.split(" · ")[0];
  recordWin(
    lastProfit < 0 ? `Passed on ${who}’s money-losing order` : "",
    lastProfit < 0 ? -lastProfit : 0,
    `would have lost ${money(-lastProfit)} at ${money(num("quote"))}`,
  );
});

$("ledgerPeriod").addEventListener("change", (e) => {
  ledger.period = e.target.value;
  saveLedger();
  queueLedger();
});
$("ledgerOpen").addEventListener("click", () => {
  const open = $("ledgerPanel").hidden;
  $("ledgerPanel").hidden = !open;
  $("ledgerOpen").setAttribute("aria-expanded", String(open));
  $("ledgerOpen").textContent = open ? "Hide the math" : "See the math";
});
$("ledgerChips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-tab]");
  if (chip) showView(chip.dataset.tab);
});
$("ledgerSpend").addEventListener("click", () => {
  showView("lab");
  document
    .querySelector(".parfait-fund")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});
$("ledgerReset").addEventListener("click", () => {
  ledger.wins = [];
  saveLedger();
  queueLedger();
});
$("ledgerPrint").addEventListener("click", () => {
  document.body.classList.add("print-ledger");
  window.print();
  document.body.classList.remove("print-ledger");
});

for (const type of ["input", "change", "click", "savings-changed"])
  document.addEventListener(type, queueLedger);
refreshLedger();
