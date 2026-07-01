# WebGL Animations

A gallery of interactive shader experiments built with **Three.js** and **Vite**.

## Run it

```bash
npm install
npm run dev
```

Open **http://localhost:5173** for the animation index.

For a one-command production build + serve:

```bash
npm start
```

Then open **http://localhost:4173**.

> **Note:** Your folder path contains `#` (`#Programming Projects`), which makes Vite print warnings. The app still runs; if `npm run dev` gives you trouble, use `npm start` instead, or rename the folder to remove `#`.

## Project structure

```
index.html                     # Gallery index
src/
  animations.js                # Animation registry (add new entries here)
  gallery.js                   # Renders the index cards
  gallery.css
animations/
  flow-field/
  wave-horizon/                  # 3D opposing waves with horizon line
    index.html
    main.js
    style.css
    shaders/
      index.js
```

## Add a new animation

1. Copy `animations/flow-field/` to `animations/your-animation/`
2. Customize the animation files
3. Register it in `src/animations.js`
4. Add an entry to `vite.config.js` under `build.rollupOptions.input`

## Flow Field controls

- **Move pointer** — warps the flowing noise field toward your cursor
- **Click** — sends a light pulse through the field
