import { create } from 'zustand'

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const usePlantStore = create((set, get) => ({
  humidity: 50,        // 0-100 %
  moisture: 50,        // 0-100 %
  temperature: 25,     // °C, typical range 0-50
  lightExposure: 400,  // lux, arbitrary scale 0-2000+

  // Safe setters that clamp to realistic ranges and allow slight side-effects
  setHumidity: (v) => set((s) => ({ humidity: clamp(Math.round(v), 0, 100) })),
  setMoisture: (v) =>
    set((s) => {
      const newMoisture = clamp(Math.round(v), 0, 100)
      // when soil moisture changes, humidity should change a bit as well
      const humidityDelta = Math.round((newMoisture - s.moisture) * 0.25)
      const newHumidity = clamp(s.humidity + humidityDelta, 0, 100)
      return { moisture: newMoisture, humidity: newHumidity }
    }),
  setTemperature: (v) => set((s) => ({ temperature: clamp(Math.round(v), -10, 60) })),
  setLightExposure: (v) => set((s) => ({ lightExposure: clamp(Math.round(v), 0, 20000) })),

  // Actions that model real-world effects
  water: (amount = 30) =>
    set((s) => {
      // watering increases soil moisture and raises local humidity
      const newMoisture = clamp(Math.round(s.moisture + amount), 0, 100)
      const humidityIncrease = Math.round(amount * 0.5)
      const newHumidity = clamp(s.humidity + humidityIncrease, 0, 100)
      return { moisture: newMoisture, humidity: newHumidity }
    }),

  sleep: (targetLux = 50) =>
    set((s) => {
      // make it 'sleep' by lowering light exposure; remember previous value
      const prev = s.lightExposure
      return { lightExposure: clamp(Math.round(targetLux), 0, 20000), lastLightBeforeSleep: prev, isSleeping: true }
    }),

  wake: (restoreLux = null) =>
    set((s) => {
      const restore = restoreLux == null ? s.lastLightBeforeSleep || 800 : restoreLux
      return { lightExposure: clamp(Math.round(restore), 0, 20000), lastLightBeforeSleep: null, isSleeping: false }
    }),

  // Single-step simulation to be called periodically (or used by tests)
  // Uses an internal simulated time and a configurable day cycle length (fast by default)
  simTimeSeconds: 0,
  dayCycleSeconds: 30, // full day in 30 seconds (fast demo cycle)
  setDayCycleSeconds: (secs) => set(() => ({ dayCycleSeconds: Math.max(5, Number(secs) || 30) })),

  simulateStep: (opts = {}) =>
    set((s) => {
      const delta = typeof opts.deltaSeconds === 'number' ? opts.deltaSeconds : 1
      const simTime = (s.simTimeSeconds || 0) + delta
      const cycle = s.dayCycleSeconds || 30
      const phase = (simTime % cycle) / cycle // 0..1 over the day

      // Daylight curve (smooth sine, 0..1)
      const dayPhase = Math.max(0, Math.sin(phase * Math.PI * 2 - Math.PI / 2))
      const targetLight = Math.round(2000 * dayPhase + (Math.random() - 0.5) * 80)

      // Temperature: small diurnal swing around 22°C
      const diurnalTemp = 22 + 6 * Math.sin(phase * Math.PI * 2 - Math.PI / 2)
      const tempNoise = (Math.random() - 0.5) * 0.6
      const newTemperature = clamp(Math.round(s.temperature + (diurnalTemp - s.temperature) * 0.06 + tempNoise), -10, 60)

      // Moisture: decreases faster when temp and light are higher.
      const evapFactor = 0.03 + (newTemperature / 800) + (targetLight / 15000)
      const moistureLoss = Math.max(0, (evapFactor * (1 + Math.random() * 0.6)) * (opts.scale || 1))
      const newMoisture = clamp(Math.round(s.moisture - moistureLoss), 0, 100)

      // Humidity drifts toward an implied humidity based on moisture and light
      const impliedHumidity = clamp(Math.round(newMoisture * 0.6 + (targetLight < 200 ? 10 : 0)), 0, 100)
      const humidityDelta = Math.round((impliedHumidity - s.humidity) * 0.06 + (Math.random() - 0.5) * 0.6)
      const newHumidity = clamp(s.humidity + humidityDelta, 0, 100)

      return {
        simTimeSeconds: simTime,
        lightExposure: clamp(targetLight, 0, 20000),
        temperature: newTemperature,
        moisture: newMoisture,
        humidity: newHumidity,
      }
    }),

  randomize: () =>
    set({
      humidity: randInt(0, 100),
      moisture: randInt(0, 100),
      temperature: randInt(0, 50),
      lightExposure: randInt(0, 2000),
    }),

  // computed mood getter
  mood: () => {
    const { moisture, temperature, lightExposure } = get()

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
  },
}))

export default usePlantStore
