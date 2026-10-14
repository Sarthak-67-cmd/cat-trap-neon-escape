# Cat Trap: Neon Escape
[![Netlify Status](https://api.netlify.com/api/v1/badges/01397576-e423-43d3-bed4-8610d1dda319/deploy-status)](https://app.netlify.com/projects/karun-artist/deploys)

A standalone browser puzzle inspired by hex-grid cat-trapping games. This is an original implementation with its own neon arcade layout.

## Features

- Hex-style board with six-direction movement
- Cat pathfinding using breadth-first search
- New randomized starting barriers on each attempt
- Progressively larger boards as you advance through levels
- Synthesized sound effects (no audio files required)
- Optional original sneaky-jazz background loop synthesized in the browser (no music file required)
- Separate SOUND and MUSIC controls
- Responsive desktop and mobile/touch layout
- Best level and sound preference saved in the browser
- No framework, backend, build step, or third-party JavaScript dependency

## Run it on your computer

1. Download and extract `cat-trap-neon-escape.zip`.
2. Open the extracted folder.
3. Double-click `index.html` to open it in Chrome, Edge, Firefox, or another modern browser.

You can also run it through a local server. If Python is installed, open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000> in your browser. On Windows, `py -m http.server 8000` also works if the Python launcher is installed.

## Publish with GitHub Pages

1. Create a new GitHub repository, for example `cat-trap-neon-escape`.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root (not inside another nested project folder).
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then click **Save**.
6. Wait for GitHub Pages to publish the site. The Pages settings screen will show the published URL.

## Controls and gameplay

- Tap/click any open tile to place a barrier.
- After each barrier, the cat takes one step along a shortest available route toward the outer ring.
- Win by blocking every path from the cat to the outer ring.
- Lose if the cat reaches the outer ring.
- Use **Restart** to replay the current level.
- **SOUND** toggles gameplay sound effects; **MUSIC** toggles the original synthesized sneaky-jazz background loop. Music starts only after you press its button, because browsers restrict automatic audio playback.





