// The regulars vote on which recipe becomes the new Fall Parfait.
const VOTE_KEY = "drm-vote-v1";

const candidates = {
  maple: {
    name: "Maple Pumpkin Crumble",
    blurb:
      "Pumpkin-maple yogurt, spiced apples, brown-butter granola, whipped cream.",
    votes: 41,
  },
  cider: {
    name: "Apple Cider Crisp",
    blurb: "Vanilla yogurt, cider-soaked apples, oat crumble, salted caramel.",
    votes: 33,
  },
  chai: {
    name: "Chai Pear & Ginger",
    blurb: "Chai-honey yogurt, poached pears, gingersnap crumble, pecans.",
    votes: 26,
  },
};

function loadVote() {
  try {
    const saved = localStorage.getItem(VOTE_KEY);
    if (candidates[saved]) return saved;
  } catch {}
  return null;
}
let myVote = loadVote();

function renderVotes() {
  const tally = Object.fromEntries(
      Object.entries(candidates).map(([k, c]) => [
        k,
        c.votes + (myVote === k ? 1 : 0),
      ]),
    ),
    max = Math.max(...Object.values(tally)),
    sum = Object.values(tally).reduce((s, v) => s + v, 0);
  $("voteGrid").innerHTML = Object.entries(candidates)
    .map(
      ([k, c]) => `<div class="vote-card${tally[k] === max ? " leading" : ""}">
        ${tally[k] === max ? '<span class="lead-tag">LEADING</span>' : ""}
        <h3>${c.name}</h3>
        <p>${c.blurb}</p>
        <div class="vote-bar"><i style="width:${(tally[k] / sum) * 100}%"></i></div>
        <small>${tally[k]} votes · ${Math.round((tally[k] / sum) * 100)}%</small>
        <div class="vote-actions">
          <button class="${myVote === k ? "primary" : "secondary"}" data-vote="${k}" aria-pressed="${myVote === k}">${myVote === k ? "♡ Your vote" : "Vote"}</button>
        </div>
      </div>`,
    )
    .join("");
}

$("voteGrid").addEventListener("click", (e) => {
  const vote = e.target.closest("[data-vote]");
  if (!vote) return;
  myVote = vote.dataset.vote;
  try {
    localStorage.setItem(VOTE_KEY, myVote);
  } catch {}
  renderVotes();
});

renderVotes();
