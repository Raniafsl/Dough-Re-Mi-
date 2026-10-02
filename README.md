# Dough-Re-Mi

A whimsical bakery operations prototype: help Grandma see the hidden cost of a custom order before she says yes.

**Demo (earlier version):** https://mise-and-magic.r22faisa.chatgpt.site (access is managed separately from this repository)

## Features

- **Movement studio:** a full top-down floor plan of the bakery (kitchen and shop floor) with a simulated motion sensor at every station. Pick a workflow (parfaits, a cupcake batch, opening the shop), run a sensor day to see a live log, a heatmap and the busiest paths, then compare the observed route with the shortest route that keeps the task order (ingredients before the oven, cooling before packing). A layout idea stages one station's supplies beside Grandma's home station. Savings show as minutes and dollars per day, month and year, and measured walking times can flow into the other workspaces.
- **The cost of yes:** incoming customer tickets, custom-order costing and accept/pass/re-quote actions. Accepted orders can be marked **baked & picked up**, which takes the recipe's ingredients off the pantry shelves and flags LOW or SHORT stock for the next ticket. A trends panel charts nine weeks of ingredient spend and suggests ways to save (bulk packs that won't spoil, smaller orders of perishables, rising flavours, best earners).
- **Save Grandma’s day:** the rush-order scenario and printable savings receipt, plus the **fall parfait fund**: donations sponsor real layers of an experimental Maple Pumpkin Crumble Parfait, and the cup fills as people give, with milestones and a donor wall.
- **Kind words:** neighbourhood testimonials on every tab, a ratings comparison with the chain across the street, and a form for adding your own.
- Responsive cream, sage and strawberry-pink interface.

## Run locally

No package installation, API key or build step is needed. From this folder:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Stop the server with Ctrl+C.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Workspaces, kitchen map and order counter |
| `style.css` | Theme, responsive layout and print styling |
| `app.js` | Tabs, customer flow and financial calculations |
| `bakery-map.js` | Floor plan, simulated motion sensors and route optimizer |
| `pantry.js` | Inventory, order completion and spending trends |
| `parfait.js` | Fall parfait “fill the cup” fund |
| `testimonials.js` | Testimonials, ratings comparison and kind-word form |
| `grandma-v2.png` | AI-generated Grandma character |
| `bakery-reference.jpeg` | User-supplied storefront reference illustration |

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
- Recipes are per cupcake (cake + frosting), with one box per dozen. Bulk-buy ideas only count items used up before they spoil; spoilage ideas count half the excess stock beyond shelf life as likely waste.

## Prototype limits

Movement and motion sensors are simulated; there is no camera, hardware sensor or video tracking. Customer orders are local demo scenarios. Quote actions do not send messages. Pantry stock, donations and added testimonials are saved only in the visitor's browser (localStorage). Donations are demo pledges and take no payment. There is no backend or authentication. Testimonials, ratings and the chain comparison are sample content for the fictional story. The Grandma story is fictional. Google Fonts loads externally; system fonts are used as fallback.

## Artwork

Grandma was generated for the project. The storefront is a user-provided reference image whose creator/license has not been verified. Keep this repository private until its reuse rights are confirmed or replace that image with your own artwork. No license for third-party reference artwork is granted by this repository.

## Publish on GitHub Pages (optional)

The site files live at the repository root. In GitHub, choose **Settings → Pages → Deploy from a branch → main → / (root)**, when Pages is available for your repository/account. Pages access can differ from repository access; choose the audience intentionally.
