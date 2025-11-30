import { useState, useMemo, useEffect, useRef } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import usePlantStore from './store/usePlantStore'

function ProgressRow({ label, value, valueText, percent, color, editable = false, onPercentChange }) {
  const [dragging, setDragging] = useState(false)

  function computePercentFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width)
    return Math.round((x / rect.width) * 100)
  }

  function handlePointerDown(e) {
    if (!editable) return
    setDragging(true)
    const p = computePercentFromEvent(e)
    onPercentChange && onPercentChange(p)
  }

  function handlePointerMove(e) {
    if (!editable || !dragging) return
    const p = computePercentFromEvent(e)
    onPercentChange && onPercentChange(p)
  }

  function handlePointerUp() {
    if (!editable) return
    setDragging(false)
  }

  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <span className="progress-value">{valueText}</span>
      </div>
      <div
        className="progress-bar-outer"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <div className="progress-bar-inner" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)
  const [hidePot, setHidePot] = useState(false)
  const [hoveredSensor, setHoveredSensor] = useState(null)
  const potWrapperRef = useRef(null)
  const sensorRefs = {
    buzzer: useRef(null),
    esp32: useRef(null),
    bh1750: useRef(null),
    dht22: useRef(null),
    soil: useRef(null),
  }
  const [highlightStyle, setHighlightStyle] = useState({ opacity: 0 })
  const sensorBoundsRef = useRef({})

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
  const water = usePlantStore((s) => s.water)
  const sleep = usePlantStore((s) => s.sleep)
  const wake = usePlantStore((s) => s.wake)
  const isSleeping = usePlantStore((s) => s.isSleeping)
  const simulateStep = usePlantStore((s) => s.simulateStep)

  // Local UI mode: when `setValueMode` is true the left progress bars become editable
  const [setValueMode, setSetValueMode] = useState(false)

  // Button pulse state: track briefly which button was pressed so we can animate color
  const [activeButtons, setActiveButtons] = useState({})

  function triggerButtonPulse(key, duration = 700) {
    setActiveButtons((s) => ({ ...s, [key]: true }))
    setTimeout(() => setActiveButtons((s) => ({ ...s, [key]: false })), duration)
  }

  // Start background simulation tick
  useEffect(() => {
    // faster simulation for more dynamic UI during demo/testing
    const interval = setInterval(() => {
      try {
        simulateStep()
      } catch (e) {
        // ignore errors from store during unmount
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [simulateStep])

  // compute highlight position when hoveredSensor changes or window resizes
  useEffect(() => {
    function updateHighlight() {
      if (!hoveredSensor) {
        setHighlightStyle({ opacity: 0 })
        return
      }
      const ref = sensorRefs[hoveredSensor]
      const wrapper = potWrapperRef.current
      if (!ref || !ref.current || !wrapper) {
        setHighlightStyle({ opacity: 0 })
        return
      }
      // Try to use pixel-accurate bounds if we computed them for this sensor
      const bounds = sensorBoundsRef.current[hoveredSensor]
      const iconRect = ref.current.getBoundingClientRect()
      const wrapRect = wrapper.getBoundingClientRect()

      if (bounds && bounds.width > 0 && bounds.height > 0 && ref.current.naturalWidth && ref.current.naturalHeight) {
        // Map bounds from image natural pixels -> displayed pixels
        const scaleX = iconRect.width / ref.current.naturalWidth
        const scaleY = iconRect.height / ref.current.naturalHeight
        const dispLeft = iconRect.left - wrapRect.left + bounds.left * scaleX
        const dispTop = iconRect.top - wrapRect.top + bounds.top * scaleY
        const dispWidth = bounds.width * scaleX
        const dispHeight = bounds.height * scaleY
        // add a little padding for the stroke so it doesn't clip the image
        const padding = 6 // in displayed pixels
        setHighlightStyle({
          opacity: 1,
          left: `${dispLeft - padding}px`,
          top: `${dispTop - padding}px`,
          width: `${dispWidth + padding * 2}px`,
          height: `${dispHeight + padding * 2}px`,
          transform: 'scale(1)'
        })
        return
      }

      // Fallback: center/scale-based overlay (previous behavior)
      const left = iconRect.left - wrapRect.left + iconRect.width / 2
      const top = iconRect.top - wrapRect.top + iconRect.height / 2
      const size = Math.max(iconRect.width, iconRect.height) * 1.2
      setHighlightStyle({
        opacity: 1,
        left: `${left - size / 2}px`,
        top: `${top - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: 'scale(1.02)'
      })
    }
    updateHighlight()
    window.addEventListener('resize', updateHighlight)
    // also recompute on scroll to handle layout changes
    window.addEventListener('scroll', updateHighlight, true)
    return () => {
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
    }
  }, [hoveredSensor])

  // compute non-transparent pixel bounds for an image element and store
  function computeImageAlphaBounds(sensorKey) {
    const ref = sensorRefs[sensorKey]
    if (!ref || !ref.current) return
    const img = ref.current
    // ensure image has loaded
    if (!img.naturalWidth || !img.naturalHeight) return
    try {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h).data
      let minX = w, minY = h, maxX = 0, maxY = 0
      let found = false
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          const a = data[idx + 3]
          if (a > 16) { // alpha threshold
            found = true
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
        }
      }
      if (!found) {
        // all transparent: store zero bounds
        sensorBoundsRef.current[sensorKey] = { left: 0, top: 0, width: 0, height: 0 }
      } else {
        sensorBoundsRef.current[sensorKey] = {
          left: minX,
          top: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        }
      }
    } catch (e) {
      // in rare cases canvas may be tainted; fallback by leaving bounds undefined
      console.warn('Could not compute alpha bounds for', sensorKey, e)
    }
  }

  // clear sensor highlight when clicking outside the pot wrapper
  useEffect(() => {
    function onDocPointer(e) {
      const wrapper = potWrapperRef.current
      if (!wrapper) return
      if (!wrapper.contains(e.target)) {
        setHoveredSensor(null)
      }
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [])

  // sensor metadata for info panel
  const sensorInfo = {
    buzzer: {
      title: 'Buzzer',
      img: '/images/buzzer.png',
      desc: 'Plays sounds or alerts when events occur (e.g., low water).' },
    esp32: {
      title: 'ESP32',
      img: '/images/MicroController_ESP32.png',
      desc: 'Microcontroller that reads sensors and controls actuators; central brain of Potchi.' },
    bh1750: {
      title: 'BH1750 (Light)',
      img: '/images/Sensor_BH1750.png',
      desc: 'Light sensor that measures ambient illumination (lux) used to adjust plant lighting.' },
    dht22: {
      title: 'DHT22 (Temp/Humidity)',
      img: '/images/Sensor_DHT22.png',
      desc: 'Measures air temperature and relative humidity for environmental feedback.' },
    soil: {
      title: 'Soil Moisture Sensor',
      img: '/images/Sensor_SoilMoisture.png',
      desc: 'Measures soil moisture percentage to decide watering needs.' },
  }

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
      return { emoji: '(－ω－)', label: 'Sleepy' }
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
        {/* small subtitle placed visually under the title image without affecting layout */}
        <div className="title-subtext">Your Plant Best Friend!</div>
      </div>
      <div className="container">
        <div className="left-card sub-card">
          <div className="stats-header">
            <div className="stats-title">Stats</div>
            {/* future: small control or icon could go to the right */}
          </div>

          <div className="stats-bars">
            {/* Progress bars for plant variables */}
            <ProgressRow
              label="Soil Moisture"
              value={moisture}
              valueText={`${moisture}%`}
              percent={moisture}
              color="#4CAF50"
              editable={setValueMode}
              onPercentChange={(p) => setMoisture(Math.round(p))}
            />
            <ProgressRow
              label="Air Humidity"
              value={humidity}
              valueText={`${humidity}%`}
              percent={humidity}
              color="#2196F3"
              editable={setValueMode}
              onPercentChange={(p) => setHumidity(Math.round(p))}
            />
            <ProgressRow
              label="Temperature"
              value={temperature}
              valueText={`${temperature}°C`}
              percent={tempPercent}
              color="#FF9800"
              editable={setValueMode}
              onPercentChange={(p) => setTemperature(Math.round((p / 100) * 50))}
            />
            <ProgressRow
              label="Light Exposure"
              value={lightExposure}
              valueText={`${lightExposure} lux`}
              percent={lightPercent}
              color="#FFD54F"
              editable={setValueMode}
              onPercentChange={(p) => setLightExposure(Math.round((p / 100) * 2000))}
            />
          </div>

          <div className="left-separator" aria-hidden="true" />

          <div className="left-bottom-empty">
            {hoveredSensor ? (
              (() => {
                const info = sensorInfo[hoveredSensor]
                if (!info) return null
                return (
                  <div className="sensor-info" role="region" aria-live="polite">
                    <img src={info.img} alt={info.title} className="sensor-info-img" />
                    <div className="sensor-info-body">
                      <div className="sensor-info-title">{info.title}</div>
                      <div className="sensor-info-desc">{info.desc}</div>
                    </div>
                  </div>
                )
              })()
            ) : null}
          </div>
        </div>

        <div className="right-column">
          <div className="right-top-card sub-card">
            {/* Pot + plant stacked artwork. Images should be placed in `public/images/` as
                `potchi_pot.png` and `potchi_plant.png`. Adjust offsets via CSS variables on
                the `.pot-stack` element (see App.css). */}
            {/* New: stack fills the whole top card area. Use CSS variables to nudge overlays. */}
            <div
              className="pot-stack-wrapper"
              ref={potWrapperRef}
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

              {/* highlight overlay positioned over the hovered sensor (separate element, no hitbox changes) */}
              <div className="sensor-highlight" style={highlightStyle} aria-hidden="true" />
              <img src="/images/potchi_plant.png" alt="plant" className="pot-plant-overlay" />

              {/* Small hardware/component icons placed relative to the cross-section */}
              <img
                src="/images/buzzer.png"
                alt="buzzer"
                ref={sensorRefs.buzzer}
                className="component-icon sensor-icon buzzer-icon"
                onLoad={() => computeImageAlphaBounds('buzzer')}
                onPointerEnter={() => setHoveredSensor('buzzer')}
                onPointerLeave={() => setHoveredSensor(null)}
                onClick={() => setHoveredSensor((s) => (s === 'buzzer' ? null : 'buzzer'))}
              />
              <img
                src="/images/MicroController_ESP32.png"
                alt="esp32"
                ref={sensorRefs.esp32}
                className="component-icon sensor-icon esp32-icon"
                onLoad={() => computeImageAlphaBounds('esp32')}
                onPointerEnter={() => setHoveredSensor('esp32')}
                onPointerLeave={() => setHoveredSensor(null)}
                onClick={() => setHoveredSensor((s) => (s === 'esp32' ? null : 'esp32'))}
              />
              <img
                src="/images/Sensor_BH1750.png"
                alt="bh1750"
                ref={sensorRefs.bh1750}
                className="component-icon sensor-icon bh1750-icon"
                onLoad={() => computeImageAlphaBounds('bh1750')}
                onPointerEnter={() => setHoveredSensor('bh1750')}
                onPointerLeave={() => setHoveredSensor(null)}
                onClick={() => setHoveredSensor((s) => (s === 'bh1750' ? null : 'bh1750'))}
              />
              <img
                src="/images/Sensor_DHT22.png"
                alt="dht22"
                ref={sensorRefs.dht22}
                className="component-icon sensor-icon dht22-icon"
                onLoad={() => computeImageAlphaBounds('dht22')}
                onPointerEnter={() => setHoveredSensor('dht22')}
                onPointerLeave={() => setHoveredSensor(null)}
                onClick={() => setHoveredSensor((s) => (s === 'dht22' ? null : 'dht22'))}
              />
              <img
                src="/images/Sensor_SoilMoisture.png"
                alt="soil moisture sensor"
                ref={sensorRefs.soil}
                className="component-icon sensor-icon soil-icon"
                onLoad={() => computeImageAlphaBounds('soil')}
                onPointerEnter={() => setHoveredSensor('soil')}
                onPointerLeave={() => setHoveredSensor(null)}
                onClick={() => setHoveredSensor((s) => (s === 'soil' ? null : 'soil'))}
              />
              {/* attach hover handlers to sensors */}

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
            <h2>Controls</h2>
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => {
                  setSetValueMode((s) => !s)
                  triggerButtonPulse('set')
                }}
                aria-pressed={setValueMode}
                style={
                  setValueMode
                    ? { background: '#FFD54F' }
                    : activeButtons['set']
                    ? { background: '#FFD54F' }
                    : undefined
                }
              >
                Set Value
              </button>
              {/* Optional quick setters for manual testing */}
              <button
                onClick={() => {
                  water(30)
                  triggerButtonPulse('water')
                }}
                style={{ marginLeft: '0.5rem', ...(activeButtons['water'] ? { background: '#4CAF50' } : {}) }}
              >
                Water
              </button>
              <button
                onClick={() => {
                  if (isSleeping) wake()
                  else sleep(50)
                  triggerButtonPulse('sleep')
                }}
                style={{ marginLeft: '0.5rem', ...(activeButtons['sleep'] ? { background: '#FFD54F' } : {}) }}
              >
                {isSleeping ? 'Wake' : 'Sleep'}
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
