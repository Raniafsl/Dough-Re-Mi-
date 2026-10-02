// Part 2: spend the savings at the in-house grocery store, plan a four-person
// assembly line, and let the regulars vote on the new Fall Parfait.
const PLANNER_KEY = "drm-planner-v1",
  REACH_SECONDS = 1.5, // solo makers reach across the table for every layer
  BAKERY_PRICE = 7.49; // The Bakery's Autumn Parfait (fictional)

const item = (name, price, size, unit, per, sec) => ({
  name,
  price,
  size,
  unit,
  per,
  sec,
});
const candidates = {
  maple: {
    name: "Maple Pumpkin Crumble",
    blurb:
      "Pumpkin-maple yogurt, spiced apples, brown-butter granola, whipped cream.",
    votes: 41,
    items: [
      item("Cups + spoons", 4.99, 20, "each", 1, 3),
      item("Greek yogurt", 5.49, 750, "g", 90, 6),
      item("Pumpkin purée", 2.99, 398, "g", 35, 5),
      item("Maple syrup", 7.99, 250, "ml", 10, 3),
      item("Apples (diced)", 0.99, 1, "each", 0.25, 5),
      item("Granola", 4.99, 500, "g", 30, 4),
      item("Whipped cream", 3.99, 225, "g", 12, 3),
      item("Cinnamon", 2.49, 40, "g", 0.5, 2),
    ],
  },
  cider: {
    name: "Apple Cider Crisp",
    blurb: "Vanilla yogurt, cider-soaked apples, oat crumble, salted caramel.",
    votes: 33,
    items: [
      item("Cups + spoons", 4.99, 20, "each", 1, 3),
      item("Vanilla yogurt", 5.49, 750, "g", 90, 6),
      item("Apple cider", 3.99, 1000, "ml", 15, 3),
      item("Apples (diced)", 0.99, 1, "each", 0.3, 5),
      item("Oat crumble", 3.49, 400, "g", 25, 4),
      item("Caramel sauce", 4.49, 300, "ml", 10, 3),
      item("Sea salt", 2.29, 250, "g", 0.3, 2),
    ],
  },
  chai: {
    name: "Chai Pear & Ginger",
    blurb: "Chai-honey yogurt, poached pears, gingersnap crumble, pecans.",
    votes: 26,
    items: [
      item("Cups + spoons", 4.99, 20, "each", 1, 3),
      item("Greek yogurt", 5.49, 750, "g", 90, 6),
      item("Chai tea bags", 4.29, 20, "each", 0.25, 2),
      item("Honey", 6.99, 500, "g", 10, 3),
      item("Pears (diced)", 1.19, 1, "each", 0.3, 5),
      item("Gingersnaps", 3.49, 300, "g", 15, 4),
      item("Pecans", 6.99, 200, "g", 8, 3),
    ],
  },
};

function freshPlanner() {
  return {
    recipe: "maple",
    items: Object.fromEntries(
      Object.entries(candidates).map(([k, c]) => [
        k,
        c.items.map((i) => ({ ...i })),
      ]),
    ),
    budget: 40,
    names: ["Rania", "Teammate 2", "Teammate 3", "Teammate 4"],
    target: null,
    minutes: 45,
    vote: null,
  };
}
function loadPlanner() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLANNER_KEY));
    if (saved?.items && candidates[saved.recipe])
      return { ...freshPlanner(), ...saved };
  } catch {}
  return freshPlanner();
}
function savePlanner() {
  try {
    localStorage.setItem(PLANNER_KEY, JSON.stringify(plan));
  } catch {}
}
let plan = loadPlanner();
const recipeItems = () => plan.items[plan.recipe];

// The store sells whole packs.
const packsFor = (i, n) =>
  i.size > 0 ? Math.ceil((n * i.per) / i.size - 1e-9) : 0;
const costFor = (n) =>
  recipeItems().reduce((s, i) => s + packsFor(i, n) * i.price, 0);
function maxParfaits(budget) {
  let n = 0;
  while (n < 2000 && costFor(n + 1) <= budget + 1e-9) n++;
  return n;
}

function renderRows() {
  const unitOptions = (u) =>
    ["g", "ml", "each"]
      .map((x) => `<option${x === u ? " selected" : ""}>${x}</option>`)
      .join("");
  $("groceryRows").innerHTML = recipeItems()
    .map(
      (i, n) => `<tr data-row="${n}">
        <td><input type="text" data-k="name" aria-label="Ingredient name" maxlength="40"></td>
        <td><input type="number" data-k="price" min="0" step="0.01" aria-label="Pack price" value="${i.price}"></td>
        <td><input type="number" data-k="size" min="0" step="any" aria-label="Pack size" value="${i.size}"></td>
        <td><select data-k="unit" aria-label="Unit">${unitOptions(i.unit)}</select></td>
        <td><input type="number" data-k="per" min="0" step="any" aria-label="Amount per parfait" value="${i.per}"></td>
        <td><input type="number" data-k="sec" min="0" step="0.5" aria-label="Seconds per parfait" value="${i.sec}"></td>
        <td><button type="button" class="remove" aria-label="Remove ${i.name.replace(/"/g, "")}">×</button></td>
      </tr>`,
    )
    .join("");
  // Names go in via .value so typed text is never parsed as HTML.
  $("groceryRows")
    .querySelectorAll("tr")
    .forEach((tr, n) => {
      tr.querySelector('[data-k="name"]').value = recipeItems()[n].name;
    });
}

function renderPlan() {
  const items = recipeItems(),
    budget = Math.max(0, Number($("budget").value) || 0),
    n = maxParfaits(budget),
    spent = costFor(n),
    used = items.reduce(
      (s, i) => s + (i.size ? ((n * i.per) / i.size) * i.price : 0),
      0,
    );
  $("plannerTitle").textContent = `Plan the ${candidates[plan.recipe].name}`;
  $("maxParfaits").innerHTML = `${n}<span>parfaits for ${money(spent)}</span>`;
  $("perParfait").textContent = n ? money(used / n) : "—";
  $("leftover").textContent = money(budget - spent);
  if (!n) {
    $("nextParfait").textContent =
      `Not enough for one parfait yet: the first full set of packs costs ${money(costFor(1))}.`;
  } else {
    const extra = costFor(n + 1) - spent,
      needed = items
        .filter((i) => packsFor(i, n + 1) > packsFor(i, n))
        .map((i) => i.name.toLowerCase());
    $("nextParfait").textContent =
      `Parfait #${n + 1} needs ${money(extra)} more (a new pack of ${needed.join(", ")}). Leftovers go back to Grandma’s pantry.`;
  }
  $("shoppingList").innerHTML = items
    .filter((i) => packsFor(i, n))
    .map((i) => {
      const packs = packsFor(i, n),
        spare = packs * i.size - n * i.per;
      return `<li><span><b>${packs} ×</b> <span class="item-name"></span> <small>(${i.size} ${i.unit})</small></span><em>${money(packs * i.price)}</em><small class="spare">${spare > 0 ? `${+spare.toFixed(1)} ${i.unit} spare` : "used up"}</small></li>`;
    })
    .join("");
  $("shoppingList")
    .querySelectorAll(".item-name")
    .forEach((s, k) => {
      s.textContent = items.filter((i) => packsFor(i, n))[k].name;
    });
  const price = n ? used / n / 0.35 : 0;
  $("menuPrice").textContent = n ? money(price) : "—";
  $("bakeryCompare").textContent = n
    ? price < BAKERY_PRICE
      ? `${money(BAKERY_PRICE - price)} under The Bakery’s ${money(BAKERY_PRICE)} Autumn Parfait.`
      : `Above The Bakery’s ${money(BAKERY_PRICE)} Autumn Parfait. Sell it on taste.`
    : "";
  if (!plan.target || plan.target > n) $("lineTarget").value = Math.max(1, n);
  renderLine();
}

// Split the layers, in recipe order, into up to four stations so the
// busiest station (which sets the pace) is as light as possible.
function bestSplit(secs, people) {
  const k = Math.min(people, secs.length);
  let best = null;
  function place(start, left, groups) {
    if (left === 1) {
      const all = [...groups, [start, secs.length]],
        loads = all.map(([a, b]) =>
          secs.slice(a, b).reduce((s, x) => s + x, 0),
        ),
        max = Math.max(...loads);
      if (!best || max < best.max) best = { groups: all, loads, max };
      return;
    }
    for (let end = start + 1; end <= secs.length - left + 1; end++)
      place(end, left - 1, [...groups, [start, end]]);
  }
  if (k) place(0, k, []);
  return best;
}

function renderLine() {
  const items = recipeItems(),
    secs = items.map((i) => Math.max(0, i.sec)),
    total = secs.reduce((s, x) => s + x, 0),
    target = Math.max(1, Number($("lineTarget").value) || 1),
    minutes = Math.max(1, Number($("lineMinutes").value) || 45),
    split = bestSplit(secs, 4);
  if (!split) {
    $("lineViz").innerHTML =
      '<p class="muted">Add ingredients to plan the line.</p>';
    return;
  }
  const lineSec = total - split.max + target * split.max,
    soloSec = Math.ceil(target / 4) * (total + REACH_SECONDS * items.length),
    saved = soloSec - lineSec;
  $("lineViz").innerHTML = split.groups
    .map(([a, b], p) => {
      const chips = items
        .slice(a, b)
        .map(() => `<span class="step"></span>`)
        .join("");
      return `<div class="station-card${split.loads[p] === split.max ? " pace" : ""}">
        <span class="who"></span>
        <div class="steps">${chips}</div>
        <div class="load"><i style="width:${(split.loads[p] / split.max) * 100}%"></i></div>
        <small>${split.loads[p].toFixed(1)} s per parfait${split.loads[p] === split.max ? " · sets the pace" : ""}</small>
      </div>`;
    })
    .join('<span class="arrow" aria-hidden="true">→</span>');
  $("lineViz")
    .querySelectorAll(".station-card")
    .forEach((card, p) => {
      card.querySelector(".who").textContent =
        plan.names[p] || `Teammate ${p + 1}`;
      const [a] = split.groups[p];
      card
        .querySelectorAll(".step")
        .forEach((s, k) => (s.textContent = items[a + k].name));
    });
  $("soloTime").textContent = duration(soloSec);
  $("lineTime").textContent = duration(lineSec);
  $("lineRate").textContent = `one parfait every ${split.max.toFixed(1)} s`;
  $("lineSaved").textContent = saved > 0 ? duration(saved) : "0m 0s";
  $("lineFits").textContent =
    lineSec <= minutes * 60
      ? `${target} parfaits fit in ${minutes} min with ${duration(minutes * 60 - lineSec)} spare`
      : `${duration(lineSec - minutes * 60)} over your ${minutes} min`;
}

function renderNames() {
  $("teamNames").innerHTML = [0, 1, 2, 3]
    .map(
      (p) =>
        `<label>Station ${p + 1}<input type="text" data-p="${p}" maxlength="20" aria-label="Name at station ${p + 1}"></label>`,
    )
    .join("");
  $("teamNames")
    .querySelectorAll("input")
    .forEach((inp, p) => (inp.value = plan.names[p] || ""));
}

function renderVotes() {
  const tally = Object.fromEntries(
      Object.entries(candidates).map(([k, c]) => [
        k,
        c.votes + (plan.vote === k ? 1 : 0),
      ]),
    ),
    max = Math.max(...Object.values(tally)),
    sum = Object.values(tally).reduce((s, v) => s + v, 0);
  $("voteGrid").innerHTML = Object.entries(candidates)
    .map(
      ([
        k,
        c,
      ]) => `<div class="vote-card${tally[k] === max ? " leading" : ""}${plan.vote === k ? " mine" : ""}">
        ${tally[k] === max ? '<span class="lead-tag">LEADING</span>' : ""}
        <h3>${c.name}</h3>
        <p>${c.blurb}</p>
        <div class="vote-bar"><i style="width:${(tally[k] / sum) * 100}%"></i></div>
        <small>${tally[k]} votes · ${Math.round((tally[k] / sum) * 100)}%</small>
        <div class="vote-actions">
          <button class="${plan.vote === k ? "primary" : "secondary"}" data-vote="${k}" aria-pressed="${plan.vote === k}">${plan.vote === k ? "♡ Your vote" : "Vote"}</button>
          <button class="secondary" data-plan="${k}">Plan this one</button>
        </div>
      </div>`,
    )
    .join("");
}

function selectRecipe(key) {
  plan.recipe = key;
  $("recipePick").value = key;
  savePlanner();
  renderRows();
  renderPlan();
}

$("recipePick").innerHTML = Object.entries(candidates)
  .map(([k, c]) => `<option value="${k}">${c.name}</option>`)
  .join("");
$("recipePick").addEventListener("change", (e) => selectRecipe(e.target.value));

$("groceryRows").addEventListener("input", (e) => {
  const tr = e.target.closest("tr[data-row]"),
    key = e.target.dataset.k;
  if (!tr || !key) return;
  const row = recipeItems()[Number(tr.dataset.row)];
  row[key] =
    key === "name" || key === "unit"
      ? e.target.value
      : Math.max(0, Number(e.target.value) || 0);
  savePlanner();
  renderPlan();
});
$("groceryRows").addEventListener("change", (e) => {
  if (e.target.dataset.k === "unit")
    e.target.dispatchEvent(new Event("input", { bubbles: true }));
});
$("groceryRows").addEventListener("click", (e) => {
  const btn = e.target.closest("button.remove");
  if (!btn) return;
  recipeItems().splice(Number(btn.closest("tr").dataset.row), 1);
  savePlanner();
  renderRows();
  renderPlan();
});
$("addIngredient").addEventListener("click", () => {
  recipeItems().push(item("New ingredient", 3, 100, "g", 10, 3));
  savePlanner();
  renderRows();
  renderPlan();
  $("groceryRows").querySelector("tr:last-child input").select();
});
$("resetRecipe").addEventListener("click", () => {
  plan.items[plan.recipe] = candidates[plan.recipe].items.map((i) => ({
    ...i,
  }));
  savePlanner();
  renderRows();
  renderPlan();
  $("plannerStatus").textContent = "Prices reset to the starting guesses.";
});
$("budget").addEventListener("input", () => {
  plan.budget = Number($("budget").value) || 0;
  savePlanner();
  renderPlan();
});
$("useSavings").addEventListener("click", () => {
  $("budget").value = ledgerTotals().total.toFixed(2);
  $("budget").dispatchEvent(new Event("input"));
  $("plannerStatus").textContent =
    `Budget set to this ${ledger.period}’s savings.`;
});
$("lineTarget").addEventListener("input", () => {
  plan.target = Number($("lineTarget").value) || null;
  savePlanner();
  renderLine();
});
$("lineMinutes").addEventListener("input", () => {
  plan.minutes = Number($("lineMinutes").value) || 45;
  savePlanner();
  renderLine();
});
$("teamNames").addEventListener("input", (e) => {
  plan.names[Number(e.target.dataset.p)] = e.target.value;
  savePlanner();
  renderLine();
});
$("voteGrid").addEventListener("click", (e) => {
  const vote = e.target.closest("[data-vote]"),
    planBtn = e.target.closest("[data-plan]");
  if (vote) {
    plan.vote = vote.dataset.vote;
    savePlanner();
    renderVotes();
  }
  if (planBtn) {
    selectRecipe(planBtn.dataset.plan);
    $("lab").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
$("printList").addEventListener("click", () => {
  document.body.classList.add("print-list");
  window.print();
  document.body.classList.remove("print-list");
});

$("budget").value = plan.budget;
$("lineMinutes").value = plan.minutes;
if (plan.target) $("lineTarget").value = plan.target;
$("recipePick").value = plan.recipe;
renderNames();
renderRows();
renderPlan();
renderVotes();
