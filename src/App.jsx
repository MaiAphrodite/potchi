import { useState, useMemo } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import usePlantStore from './store/usePlantStore'

function ProgressRow({ label, value, valueText, percent, color }) {
  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <span className="progress-value">{valueText}</span>
      </div>
      <div className="progress-bar-outer">
        <div className="progress-bar-inner" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)
  const [hidePot, setHidePot] = useState(false)

  // Zustand selectors for each state and action (safer than destructuring s => s)
  const humidity = usePlantStore((s) => s.humidity)
  const moisture = usePlantStore((s) => s.moisture)
  const temperature = usePlantStore((s) => s.temperature)
  const lightExposure = usePlantStore((s) => s.lightExposure)

  const setHumidity = usePlantStore((s) => s.setHumidity)
  const setMoisture = usePlantStore((s) => s.setMoisture)
  const setTemperature = usePlantStore((s) => s.setTemperature)
  const setLightExposure = usePlantStore((s) => s.setLightExposure)
  const randomize = usePlantStore((s) => s.randomize)

  // Compute mood locally to avoid calling a stored function inside a selector
  const currentMood = useMemo(() => {
    // Priority: drowning/thirsty -> temperature -> light -> happy
    if (moisture > 80) {
      return { emoji: '(ﾟДﾟ;)', label: 'Drowning' }
    }
    if (moisture < 30) {
      return { emoji: '(´；ω；`)', label: 'Thirsty' }
    }
    if (temperature > 35) {
      return { emoji: '(; ﾟДﾟ)', label: 'Hot' }
    }
    if (temperature < 15) {
      return { emoji: '(｡•́_•̀｡)', label: 'Cold' }
    }
    if (lightExposure < 200) {
      return { emoji: '(－ω－) zzZ', label: 'Sleepy' }
    }
    return { emoji: '(◕‿◕)', label: 'Happy' }
  }, [moisture, temperature, lightExposure])

  // Helper to scale variables to percent for progress bars.
  const tempPercent = Math.min(100, Math.max(0, (temperature / 50) * 100)) // map 0-50°C
  const lightPercent = Math.min(100, Math.max(0, (lightExposure / 2000) * 100)) // map 0-2000 lux

  return (
    <div className="big-card">
      {/* Title area: 10% of big-card height */}
      <div className="title">
        <img src="/images/title_potchi.png" alt="Potchi title" className="title-image" />
      </div>
      <div className="container">
        <div className="left-card sub-card">
          {/* Progress bars for plant variables */}
          <ProgressRow
            label="Soil Moisture"
            value={moisture}
            valueText={`${moisture}%`}
            percent={moisture}
            color="#4CAF50"
          />
          <ProgressRow
            label="Air Humidity"
            value={humidity}
            valueText={`${humidity}%`}
            percent={humidity}
            color="#2196F3"
          />
          <ProgressRow
            label="Temperature"
            value={temperature}
            valueText={`${temperature}°C`}
            percent={tempPercent}
            color="#FF9800"
          />
          <ProgressRow
            label="Light Exposure"
            value={lightExposure}
            valueText={`${lightExposure} lux`}
            percent={lightPercent}
            color="#FFD54F"
          />
        </div>

        <div className="right-column">
          <div className="right-top-card sub-card">
            {/* Pot + plant stacked artwork. Images should be placed in `public/images/` as
                `potchi_pot.png` and `potchi_plant.png`. Adjust offsets via CSS variables on
                the `.pot-stack` element (see App.css). */}
            {/* New: stack fills the whole top card area. Use CSS variables to nudge overlays. */}
            <div
              className="pot-stack-wrapper"
              style={{
                '--plant-offset-x': '-3px',
                '--plant-offset-y': '50px',
                '--mood-offset-x': '0px',
                '--mood-offset-y': '20px',
                /* Defaults for new components: tweak these inline or via CSS */
                '--cross-scale': '1',
                '--cross-offset-x': '0px',
                '--cross-offset-y': '0px',
                '--pot-offset-y': '20px',
                '--buzzer-scale': '0.04',
                '--buzzer-offset-x': '110px',
                '--buzzer-offset-y': '250px',
                  /* generic sensor defaults (used as fallbacks) */
                  '--sensor-scale': '0.14',
                  '--sensor-offset-x': '-60px',
                  '--sensor-offset-y': '30px',
                  /* per-sensor overrides (tweak these individually) */
                  '--esp32-offset-x': '0px',
                  '--esp32-offset-y': '234px',
                  '--esp32-scale': '0.090',
                  '--bh1750-offset-x': '-55px',
                  '--bh1750-offset-y': '120px',
                  '--bh1750-scale': '0.070',
                  '--dht22-offset-x': '70px',
                  '--dht22-offset-y': '-65px',
                  '--dht22-scale': '0.090',
                  '--soil-offset-x': '-100px',
                  '--soil-offset-y': '210px',
                  '--soil-scale': '0.090',
                  /* rotation defaults (0deg so nothing changes unless tweaked) */
                  '--cross-rotate': '0deg',
                  '--buzzer-rotate': '0deg',
                  '--sensor-rotate': '0deg',
                  '--esp32-rotate': '0deg',
                  '--bh1750-rotate': '-90deg',
                  '--dht22-rotate': '0deg',
                  '--soil-rotate': '-90deg',
                  '--pot-rotate': '0deg',
                  '--plant-rotate': '0deg',
              }}
            >
              {/* cross-section under the pot (always present, behind the pot) */}
              <img src="/images/cross_section.png" alt="cross section" className="cross-section" />

              {/* pot is fixed at the bottom center; hidden when toggled */}
              {!hidePot && (
                <img src="/images/potchi_pot.png" alt="pot" className="pot-base" />
              )}

              {/* plant overlay (movable) */}
              <img
                src="/images/potchi_plant.png"
                alt="plant"
                className="pot-plant-overlay"
              />

              {/* Small hardware/component icons placed relative to the cross-section */}
              <img src="/images/buzzer.png" alt="buzzer" className="component-icon buzzer-icon" />
              <img src="/images/MicroController_ESP32.png" alt="esp32" className="component-icon sensor-icon esp32-icon" />
              <img src="/images/Sensor_BH1750.png" alt="bh1750" className="component-icon sensor-icon bh1750-icon" />
              <img src="/images/Sensor_DHT22.png" alt="dht22" className="component-icon sensor-icon dht22-icon" />
              <img src="/images/Sensor_SoilMoisture.png" alt="soil moisture sensor" className="component-icon sensor-icon soil-icon" />

              {/* mood overlay centered on the pot (movable). Hide the expression when the cross-section is revealed (pot hidden) */}
              {/* show only the kaomoji (strip surrounding brackets if present) */}
              {!hidePot && (() => {
                const kaomojiOnly = currentMood.emoji.replace(/^[\(\[\{]+|[\)\]\}]+$/g, '')
                return (
                  <div className="mood-overlay" aria-hidden="false" title={currentMood.label}>
                    <div className="mood-emoji">{kaomojiOnly}</div>
                  </div>
                )
              })()}
            </div>
            <div className="mood-details">{currentMood.label}</div>
          </div>
          <div className="right-bottom-card sub-card">
            <h2>Controls & Alerts</h2>
            <p>Buttons or status messages go here.</p>
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => randomize()}>Randomize values</button>
              {/* Optional quick setters for manual testing */}
              <button onClick={() => setMoisture(20)} style={{ marginLeft: '0.5rem' }}>
                Set Thirsty
              </button>
              <button onClick={() => setMoisture(90)} style={{ marginLeft: '0.5rem' }}>
                Set Drowning
              </button>
              <button
                onClick={() => setHidePot((s) => !s)}
                style={{ marginLeft: '0.5rem' }}
                aria-pressed={hidePot}
              >
                {hidePot ? 'Show pot' : 'Reveal cross-section'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Footer removed per request */}
    </div>
  )
}

export default App
