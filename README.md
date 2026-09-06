# vaho marketplace

The community catalog behind the Store in [vaho](https://github.com/jorgeMartinez293/vaho): themes and
modes people share from the app. `index.json` is generated — don't edit it by hand.

- Uploads arrive through the vaho upload Worker (see `marketplace/worker` in the vaho repo).
- Every push rebuilds `index.json` (GitHub Action), which the app fetches from GitHub Pages.
- To take something down: `scripts/remove.sh themes <id>` / `scripts/remove.sh modes <id>`, then push.
- Reports from the app land as issues labeled `report`.

Adding an entry by hand (a mode you built): create `modes/<id>/` with the mode's `manifest.json`
(plus `bundle.zip` of the folder, and any screenshots referenced as `"screenshots": ["shot1.png"]`),
push, done.
