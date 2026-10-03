# Dough-Re-Mi

**Countertop** is Grandma’s Bakeria’s home screen: no menus, no tab bar, just three cards hanging over her counter.

| Card           | Grandma’s problem                                        | What it does                                                                                                     |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 📜 Recipe card | She guesses what to bake, so she wastes food or runs out | Flips to today’s plan: what to bake, how many, and one plain reason                                              |
| 🔔 Shop bell   | The Bakery can afford marketing; she can’t               | One sentence becomes Instagram, Discord and text messages, sent at once                                          |
| 🍨 Parfait     | She can’t see what’s working                             | She scans each receipt; the parfait builds toward today’s goal, with card/cash, best sellers and the week so far |

**Plan, Ring, Earn.** Students never download anything: the bell’s message reaches them where they already are, and the parfait shows what the day actually brought in.

Open `index.html` for the Countertop. The earlier, fuller prototype is the **back office** at `studio.html`. How the four parts fit together, and the live-mode plan with the Discord bot, are in [CONTRACT.md](CONTRACT.md).

Run the backend (`cd server && npm install && npm start`, then open http://localhost:3000) for the real thing: a SQLite database, the Discord bot, receipts that sync to every screen, and the automatic monthly check-in. Opened as a plain file, the Countertop runs in demo mode with simulated replies. The Countertop ends on the pavement outside the shop; the back office keeps the full illustrated café scene.

---

## Back office (`studio.html`)

## The challenge

A buildathon prompt: Grandma's Bakeria is a neighbourhood favourite for studying, first dates and reunions, but **The Bakery**, a nationwide chain, opened right next door with a suspiciously similar "Autumn Parfait". Build systems that save Grandma time and money so she can focus on a new Fall Parfait.

## Features

- **Saved for Grandma (savings ledger):** one running total across every system, per day, week or month. Cash and time are listed separately, the math for each line is shown, and the receipt prints. **Fund the new Fall Parfait →** jumps to the cup it fills.
- **Movement studio:** a top-down floor plan of the bakery with a simulated motion sensor at every station. Pick a workflow (parfaits, a cupcake batch, opening the shop) and run a sensor day to get a live log, a heatmap and the busiest paths. The observed route is compared with the shortest route that keeps the task order, and a layout idea stages one station's supplies closer.
- **The cost of yes:** custom-order costing with accept/pass/re-quote. Re-quoting before saying yes, or passing on a money-losing order, is logged in the ledger (accepting below cost is logged as a loss). Completed orders take ingredients off the pantry shelves and flag LOW/SHORT stock; a trends panel suggests savings.
- **Events & deals:** weekly specials that bring people in (Student Fridays at 15% off, Finals Study Hall with free refills, Two-Spoon Thursdays). Customers sign up with a first name and party size, and a copyable promo post is ready for Instagram or the window. Grandma's side forecasts the crowd from past show-up and walk-in rates, lists what to bake ahead (checking cupcake ingredients against the pantry), charts past turnout and best sellers, and checks whether the deal pays. Baking to the forecast instead of the busiest night adds a line to the ledger.
- **Save Grandma’s day:** the rush-order scenario and its savings receipt.
- **The new Fall Parfait:**
  - _Regulars' vote_: neighbours pick which of three candidate recipes becomes the new Fall Parfait.
  - _Fill the cup_: each system's savings becomes a layer of the new parfait; neighbours' gifts add the topping.
- **Café scene:** an illustrated evening outside the bakery above the footer on every tab: a student studying, a first date sharing one Fall Parfait, friends at a reunion, Grandma at the door and a napping cat.
- **Kind words:** testimonials from the study crowd, first dates and reunions, and a comparison with The Bakery next door.

## Two-minute demo

1. _The Bakery opened next door._ Show the floor plan and run a sensor day: Grandma's steps become minutes and dollars.
2. At the order counter, re-quote Poppy and pass on Milo's money-losing order; watch the ledger change.
3. Rescue the rush order in **Save Grandma’s day**.
4. Open **See the math**, then press **Fund the new Fall Parfait →**.
5. Show the regulars' vote picking the recipe The Bakery can't copy.

## Run locally

No package installation, API key or build step is needed. From this folder:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Stop the server with Ctrl+C.

## Files

| File                               | Purpose                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `index.html`                       | Countertop: recipe card, shop bell, parfait                                               |
| `hub.js`                           | Part 3 · the hub: plan data, rewriting, broadcasts, sales, votes and the monthly check-in |
| `countertop.js` / `countertop.css` | Part 1 · home screen, recipe card and parfait                                             |
| `bell.js`                          | Part 2 · the bell: voice, four buttons, three previews                                    |
| `receipts.js`                      | Receipt scanning (Tesseract OCR in the browser)                                           |
| `studio.html`                      | Back office: workspaces, kitchen map and order counter                                    |
| `style.css`                        | Theme, responsive layout and print styling                                                |
| `app.js`                           | Tabs, customer flow and financial calculations                                            |
| `bakery-map.js`                    | Floor plan, simulated motion sensors and route optimizer                                  |
| `pantry.js`                        | Inventory, order completion and spending trends                                           |
| `parfait.js`                       | Fill the cup from savings and gifts                                                       |
| `events.js`                        | Events & deals: promos, sign-ups, forecast and prep list                                  |
| `ledger.js`                        | Savings ledger, receipt and order wins                                                    |
| `vote.js`                          | Regulars' vote on the new Fall Parfait                                                    |
| `testimonials.js`                  | Testimonials, ratings comparison and kind-word form                                       |
| `cafe-scene.js` / `cafe-scene.css` | Illustrated café scene (back office footer)                                               |
| `street-scene.js`                  | The pavement outside the shop (Countertop footer)                                         |
| `grandma-v2.png`                   | AI-generated Grandma character                                                            |
| `bakery-reference.jpeg`            | User-supplied storefront reference illustration                                           |

## A quick demo

1. Open **Save Grandma’s day**.
2. Click **Bring in the rush order**.
3. Show why the $180 order initially loses money.
4. Enable the shorter route and later pickup.
5. Replay Grandma’s route, inspect the linked costs and print the receipt.

With the default assumptions, incremental profit changes from **−$59.47 to $32.60**. This is a model, not measured business performance.

## Calculation assumptions

- Labor cost = (hands-on making + cleanup + linked movement time) / 60 × hourly rate.
- Movement time = item quantity × (walking seconds + reaching seconds) / 60.
- Incremental cost includes ingredients, packaging, labor, rush delivery and displaced contribution profit.
- Suggested quote = incremental cost / (1 − desired margin).
- The challenge assumes 100 available minutes, or 160 with a proposed later pickup. It assumes baking/cooling fits existing oven capacity.
- Time value is already included in profit improvement; it must not be added again.
- Freed labor capacity is not automatically cash savings.
- Floor plan scale is 2 cm per pixel with a tray-carrying pace of 0.65 m/s. The efficient route is the shortest loop through every required station that keeps the workflow's ordering rules. Monthly figures use 26 working days and yearly figures 312.
- The ledger counts each saving once: a rush-order rescue replaces any counter decision on the same order. Time is valued at the Movement studio hourly rate and shown separately from cash. A week is 6 working days.
- Event forecasts: expected guests = people signed up × (past show-up rate + past walk-ins per sign-up); make-ahead amounts add a 10% cushion. Past events are seeded demo history, and the savings compare against baking for the busiest past night.
- Recipes are per cupcake (cake + frosting), with one box per dozen. Bulk-buy ideas only count items used up before they spoil; spoilage ideas count half the excess stock beyond shelf life as likely waste.

## Prototype limits

Movement and motion sensors are simulated; there is no camera, hardware sensor or video tracking. Customer orders are local demo scenarios. Quote actions do not send messages. Pantry stock, ledger wins, event sign-ups, votes, donations and added testimonials are saved only in the visitor's browser (localStorage). Donations are demo pledges and take no payment. There is no backend or authentication. Testimonials, ratings and the chain comparison are sample content for the fictional story. The Grandma story is fictional. Google Fonts loads externally; system fonts are used as fallback.

## Artwork

Grandma was generated for the project. The storefront is a user-provided reference image whose creator/license has not been verified. Keep this repository private until its reuse rights are confirmed or replace that image with your own artwork. No license for third-party reference artwork is granted by this repository.

## Publish on GitHub Pages (optional)

The site files live at the repository root. In GitHub, choose **Settings → Pages → Deploy from a branch → main → / (root)**, when Pages is available for your repository/account. Pages access can differ from repository access; choose the audience intentionally.
