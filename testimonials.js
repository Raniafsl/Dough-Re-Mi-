// Neighbourhood testimonials and the friendly comparison with the chain.
const KIND_KEY = "drm-kind-words-v1";

const testimonials = [
  {
    name: "Priya S.",
    tag: "Studied here all through finals",
    stars: 5,
    text: "Grandma topped up my tea without asking and saved my corner table every Thursday. The Bakery next door times you out after an hour.",
  },
  {
    name: "Marcus & Jen",
    tag: "First date, two years ago",
    stars: 5,
    text: "Our first date was awkward until Grandma brought over two spoons and one Fall Parfait. We’re still sharing parfaits here.",
  },
  {
    name: "The class of ’14",
    tag: "Ten-year reunion",
    stars: 5,
    text: "Same booths, same cinnamon smell, same Grandma remembering everyone’s order. You can’t franchise that.",
  },
  {
    name: "Mrs. Patel",
    tag: "Regular since 1998",
    stars: 5,
    text: "She remembered my granddaughter’s nut allergy three years after I mentioned it once. The Bakery asked me to spell my name twice.",
  },
  {
    name: "Daniel K.",
    tag: "Tried The Bakery’s ‘Autumn Parfait’",
    stars: 5,
    text: "It tastes like someone described Grandma’s Fall Parfait over the phone. Came back next door the same week.",
  },
  {
    name: "Milo R.",
    tag: "Office party, 48 cupcakes",
    stars: 5,
    text: "Grandma was honest about what a rush order really costs, then offered a pickup that worked for both of us.",
  },
  {
    name: "Ben",
    tag: "Owner, the bookshop down the street",
    stars: 4,
    text: "My customers come in smelling of cinnamon. Free advertising for both of us, and the parfaits come out faster since she rearranged the kitchen.",
  },
];

const versus = [
  ["Would recommend to a friend", 97, 61],
  ["Good place to study for hours", 95, 22],
  ["Remembers my order", 92, 18],
  ["Fall Parfait is the original", 100, 9],
];

function loadKind() {
  try {
    const saved = JSON.parse(localStorage.getItem(KIND_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [];
}
let kindWords = loadKind(),
  featureIndex = 0,
  featureTimer;

const allQuotes = () => [...kindWords, ...testimonials];
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

function quoteCard(q, fresh) {
  const card = document.createElement("figure");
  card.className = "quote-card-small" + (fresh ? " fresh" : "");
  card.innerHTML = `<div class="stars"></div><blockquote></blockquote><figcaption><b></b><span></span></figcaption>`;
  card.querySelector(".stars").textContent = stars(q.stars);
  card
    .querySelector(".stars")
    .setAttribute("aria-label", `${q.stars} out of 5 stars`);
  card.querySelector("blockquote").textContent = `“${q.text}”`;
  card.querySelector("b").textContent = q.name;
  card.querySelector("span").textContent = q.tag;
  return card;
}

function renderWallOfLove() {
  const wall = $("quoteWall");
  wall.replaceChildren(
    ...allQuotes().map((q, i) => quoteCard(q, i < kindWords.length)),
  );
  const all = allQuotes(),
    total = 214 + kindWords.length,
    avg = (4.9 * 214 + kindWords.reduce((s, k) => s + k.stars, 0)) / total;
  $("ourScore").textContent = avg.toFixed(1);
  $("ourCount").textContent = `${stars(Math.round(avg))} · ${total} reviews`;
  $("quoteDots").innerHTML = all
    .map(
      (_, i) =>
        `<button type="button" aria-label="Show testimonial ${i + 1}" class="${i === featureIndex ? "on" : ""}" data-i="${i}"></button>`,
    )
    .join("");
}

function showFeature(i) {
  const all = allQuotes();
  featureIndex = (i + all.length) % all.length;
  const q = all[featureIndex];
  $("featureText").textContent = `“${q.text}”`;
  $("featureWho").textContent = `${stars(q.stars)}  ${q.name} · ${q.tag}`;
  $("quoteDots")
    .querySelectorAll("button")
    .forEach((b, n) => b.classList.toggle("on", n === featureIndex));
}

function startRotation() {
  clearInterval(featureTimer);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  featureTimer = setInterval(() => showFeature(featureIndex + 1), 7000);
}

$("versus").innerHTML =
  `<div class="versus-key"><span><i class="ours"></i>Grandma’s</span><span><i class="theirs"></i>The Bakery (next door)</span></div>` +
  versus
    .map(
      ([label, ours, theirs]) => `<div class="versus-row">
        <span>${label}</span>
        <div class="vbar ours" style="--w:${ours}%"><b>${ours}%</b></div>
        <div class="vbar theirs" style="--w:${theirs}%"><b>${theirs}%</b></div>
      </div>`,
    )
    .join("");

$("quoteDots").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (!b) return;
  showFeature(Number(b.dataset.i));
  startRotation();
});

$("kindForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("kindName").value.trim(),
    text = $("kindText").value.trim();
  if (!name || !text) return;
  kindWords.unshift({
    name,
    text,
    stars: Number($("kindStars").value),
    tag: "Added just now",
  });
  try {
    localStorage.setItem(KIND_KEY, JSON.stringify(kindWords));
  } catch {}
  $("kindForm").reset();
  renderWallOfLove();
  showFeature(0);
  startRotation();
});

renderWallOfLove();
showFeature(0);
startRotation();
