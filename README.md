# Rolla

A lightweight, responsive dice roller with a warm ivory palette and animated red 3D dice. The application has no JavaScript dependencies or build step.

## Run locally

With Node.js installed, run `node server.mjs` in this folder and open <http://127.0.0.1:4173>.

## Features

- D4, D6, D8, D10, D12, D20, D100, and custom dice with 2–1,000 outcomes.
- One to six independently sampled dice, with an optional −100 to +100 modifier.
- Angled 3D view, shaded faces, contact shadows, tumbling motion, diminishing bounces, and a brief settling wobble. The winning face finishes level on top with brighter markings than the sides.
- Browser cryptographic randomness with rejection sampling to avoid modulo bias.
- Last 30 rolls saved in this browser; click a previous roll to reuse its setup.
- Optional synthesized impact sounds, Space/R shortcuts, and reduced-motion support.
- Tap dice or use their hold buttons to keep results and reroll the others. Held dice remain stationary.
- Six dice skins: Ruby, Obsidian, Pearl, Jade, Ocean, and Amethyst.
- Golden sparks for natural 20s, a shatter effect for natural 1s, and matching-dice moments. Effects and sound can be switched off.
- Up to 12 named favorite rolls, with reuse, rename and removal.
- Consent-controlled local saving, a privacy policy, and an imprint. The game works without optional storage.
- Responsive layouts, keyboard-operable die selection, and live result announcements.

Standard polyhedral dice use their corresponding geometry. D100 and custom dice use a stylized ten-face visual with the sampled result on its primary face. The outcome is sampled before animation; the animation never affects the probabilities.

## Verify

Run `node --test tests/*.test.mjs`. Tests cover geometry, fair sampling, stable top-face landings, diminishing bounces, held outcomes and poses, special-roll rules, favorite validation, and storage consent/withdrawal/expiry.

The static application is in `dist/`. Serve that directory over HTTP or HTTPS. DM Sans and Manrope are bundled locally with their SIL Open Font Licenses in `dist/fonts/`; the app makes no external font requests. It has no analytics, application cookies, or accounts. Only the privacy decision is saved before opt-in. Optional history, favorites and preferences stay in this browser after consent. The privacy choice expires after 180 days; withdrawal clears Rolla's optional keys without affecting other apps on the same origin.

Operator details in the imprint and privacy policy were supplied by the owner through [FARBIG's imprint](https://farbigmanagement.com/legal-notice.html). Review these pages when the operator or data handling changes.

## Host on GitHub Pages

1. Push this project to the `main` branch of a GitHub repository. GitHub Free supports Pages from public repositories.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open **Actions → Publish Rolla to GitHub Pages → Run workflow** for the first deployment. Future pushes to `main` publish automatically.

The workflow runs the dice tests, then publishes only `dist/`. No build step or deployment secret is needed. The website supports a project address such as `https://USERNAME.github.io/REPOSITORY/` through relative asset paths. Its published address appears in the workflow's `github-pages` environment.

See [GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
