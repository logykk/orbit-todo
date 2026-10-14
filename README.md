# Orbit

A first-person, space-themed todo app built with Three.js. Fly around a giant planet to find your tasks, complete them with a laser, and watch deleted tasks explode.

## Run locally

```bash
npm install
npm run dev
```

## Controls

- Click **Enter flight** or an empty part of the 3D scene to fly.
- Move with **WASD** (or arrow keys); look with the mouse.
- **Space** ascends, **Shift** descends, **Ctrl** boosts speed.
- Aim at a task and press **E** to select it. **Esc** leaves flight mode.
- On touch devices, drag to look and use the on-screen movement controls.

Tasks are saved in your browser's local storage. No account or backend is required.

## Build

```bash
npm run build
npm run preview
```

## Zenith deployment

The [image workflow](.github/workflows/publish-image.yml) builds this app on GitHub Actions, publishes it to `ghcr.io/logykk/orbit-todo`, then commits the exact image digest into [`zenith-compose.yml`](zenith-compose.yml). Push application changes to `main` or run the workflow manually. The `:bootstrap` image in Compose is replaced after the first successful run; do not publish the bootstrap reference.

Set the GHCR package to **public** so Zenith can pull the pinned image without credentials. For a Zenith CLI test preview, use a temporary Compose variant with `build: .` because the local preview checker requires an app built from the root Dockerfile; the checked-in Compose file is for the published image.

Tasks live in each visitor’s browser local storage and are not synchronized between devices.

## License

MIT — see [LICENSE](LICENSE).
