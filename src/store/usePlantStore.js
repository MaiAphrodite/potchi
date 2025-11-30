import { create } from 'zustand'

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const usePlantStore = create((set, get) => ({
  humidity: 50,        // 0-100 %
  moisture: 50,        // 0-100 %
  temperature: 25,     // °C, typical range 0-50
  lightExposure: 400,  // lux, arbitrary scale 0-2000+

  setHumidity: (v) => set({ humidity: v }),
  setMoisture: (v) => set({ moisture: v }),
  setTemperature: (v) => set({ temperature: v }),
  setLightExposure: (v) => set({ lightExposure: v }),

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
      return { emoji: '(－ω－) zzZ', label: 'Sleepy' }
    }
    return { emoji: '(◕‿◕)', label: 'Happy' }
  },
}))

export default usePlantStore
