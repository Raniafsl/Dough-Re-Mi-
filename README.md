# Mise & Magic

A whimsical bakery operations prototype: help Grandma see the hidden cost of a custom order before she says yes.

**Demo:** https://mise-and-magic.r22faisa.chatgpt.site (access is managed separately from this repository)

## Features

- **Movement studio:** animated Grandma, current and improved kitchen routes, editable walking/reaching times and daily labor-capacity estimates.
- **The cost of yes:** incoming customer tickets, custom-order costing, accept/pass/re-quote actions and optional linked movement costs.
- **Save Grandma’s day:** a rush-order scenario that combines workflow improvements and a later pickup, with a printable savings receipt.
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
| `app.js` | Animation, customer flow and financial calculations |
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

## Prototype limits

Movement is simulated; there is no camera or video tracking. Customer orders are local demo scenarios. Quote actions do not send messages. There is no backend, durable order storage or authentication in this export. The Grandma story is fictional. Google Fonts loads externally; system fonts are used as fallback.

## Artwork

Grandma was generated for the project. The storefront is a user-provided reference image whose creator/license has not been verified. Keep this repository private until its reuse rights are confirmed or replace that image with your own artwork. No license for third-party reference artwork is granted by this repository.

## Publish on GitHub Pages (optional)

The site files live at the repository root. In GitHub, choose **Settings → Pages → Deploy from a branch → main → / (root)**, when Pages is available for your repository/account. Pages access can differ from repository access; choose the audience intentionally.
