# potchi

> Browser dashboard for an ESP32 plant-monitor kit, driven by a simulated sensor loop

[![License](https://img.shields.io/badge/license-MIT-2ea44f?style=flat-square)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite-000?style=flat-square)](#tech-stack)

Potchi is a single-page React dashboard for a houseplant wired to an ESP32 kit: a
DHT22 for air temperature and humidity, a BH1750 for ambient light, and a soil
moisture probe. The page shows four readings, a kaomoji face that reacts to them,
and a clickable cutaway of the hardware. The readings are simulated in the browser.
This repository contains no firmware, no MQTT client, and no backend calls, so treat
it as a front-end demo of the dashboard rather than a connected product.

Live site: [potchi.vercel.app](https://potchi.vercel.app)

## Features

- Four stat bars: soil moisture in percent, air humidity in percent, temperature in
  degrees Celsius, and light exposure in lux.
- Set Value mode turns the bars into draggable inputs so a reading can be set by hand.
- Kaomoji mood driven by thresholds: drowning above 80 percent moisture, thirsty
  below 30 percent, hot above 35 C, cold below 15 C, sleepy under 200 lux, happy
  otherwise.
- A simulation loop advances a full day every 30 seconds: a sine daylight curve, a
  temperature swing around 22 C, and soil evaporation that rises with heat and light.
- Water, Sleep, and Wake controls: watering adds 30 points of moisture and raises
  humidity, sleep parks light at 50 lux, wake restores the previous level.
- Hardware hotspots for the ESP32, DHT22, BH1750, soil probe, and buzzer. Hovering or
  tapping one draws a highlight box computed from that PNG's alpha bounds on a canvas.
- Reveal cross-section toggle that replaces the pot with a cutaway view.
- Fixed 860 by 520 artwork frame that scales to fit its container with a ResizeObserver.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 |
| State | Zustand 5 |
| Build | Vite (via `rolldown-vite` 7.2.5) |
| Styling | Hand-written CSS in `src/App.css` and `src/index.css` |
| Linting | ESLint 9 with the React hooks and React refresh plugins |
| Hosting | Vercel static build |

## Getting started

Requires Node.js 20.19 or newer, or Bun.

```bash
npm install
npm run dev
```

The dev server starts on the Vite default port, http://localhost:5173.

| Command | Action |
|---------|--------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run lint` | Run ESLint over the project |

There are no environment variables. Everything the page displays comes from the
Zustand store in `src/store/usePlantStore.js`.

## Project structure

```text
src/
  App.jsx                  dashboard layout, sensor hotspots, mood logic
  store/usePlantStore.js   readings, simulation step, water/sleep/wake actions
  App.css, index.css       layout and artwork positioning
public/images/             pot, plant, cross-section, and sensor artwork
```

## Deployment

The build is fully static, so Vercel needs no configuration: build command
`npm run build`, output directory `dist`. The deployment at
[potchi.vercel.app](https://potchi.vercel.app) is the result.

## Notes and limitations

- Sensor values are simulated. There is no code that talks to a real ESP32, and no
  endpoint, WebSocket, or MQTT broker is referenced anywhere in `src/`.
- `public/images/` holds 8.9 MB of PNG artwork (9,277,082 bytes across 13 files),
  which is most of the repository weight.
- Both `bun.lock` and `package-lock.json` are committed and describe the same tree.
  Pick one package manager and keep one lockfile.
- `src/App.jsx` still imports `reactLogo` and declares a `count` state that the UI
  never renders, and `public/vite.svg` is a Vite starter leftover. The ESLint config
  sets `no-unused-vars` to error, so a lint run reports the unused import and state.

## License

MIT. See [LICENSE](LICENSE).
