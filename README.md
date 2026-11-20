# know-mynna

The public landing page for **Mynna**, the shared trip planner for Northeast India: an animated walkthrough of the app,
Mynna-curated trips, and a short FAQ. It is static HTML, CSS and JS with no build step and no dependency on the app's code.

Live: `https://sbrous-org.github.io/know-mynna/`

## Layout

| Path | What it is |
|---|---|
| `site/index.html` | The page. The only link to the app is `<meta name="mynna-app-url">` near the top; change it when the app's address moves. |
| `site/packages.js` | The curated trips shown as cards. Edit this file to add or change a trip (sample content for now). |
| `site/demo.css` | A replica of the app's phone UI, used by the animated walkthrough. Values are copied from the app's `frontend/index.html`. |
| `site/app.js` | The walkthrough player and the hero mascot. One clock drives everything. |
| `.github/workflows/pages.yml` | Deploys `site/` to GitHub Pages on every push to `main`. |
| `Dockerfile`, `nginx.conf`, `docker-compose.yml` | Optional: serve the same site from your own VM (`docker compose up -d --build`, port 8080). |

## Preview locally

```bash
python3 -m http.server 8090 --directory site   # http://localhost:8090
```

Append `?rec=1` to freeze the live loop and drive it frame by frame (`window.__mynna.demo(seconds)`), which is how the screen recordings are made.

## Publishing

Settings > Pages > Source must be **GitHub Actions**. After that, merging to `main` publishes. Everything uses relative paths, so it works at `/know-mynna/` and at a custom domain.

Permit, season and fee details in the demo and the sample trips are illustrative. Verify them against the app's knowledge base before launch.
