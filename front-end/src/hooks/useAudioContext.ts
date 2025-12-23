const systemSoundName = [
    "HEART_REACT",
] as const

type SystemSoundName = typeof systemSoundName[number]

const loadedSounds: Record<string, boolean> = {}
const soundUrls: Record<SystemSoundName, string> = {
    HEART_REACT: import.meta.env.VITE_HEART_REACT_VOICE_URL,
}

let audioCtx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
let isInit = false

const initAudio = async () => {
    if (isInit) return
    if (!audioCtx) audioCtx = new AudioContext()
    console.log("audio context is init"); 
    systemSoundName.forEach(async(item: SystemSoundName) => {
            if (!audioCtx) throw new Error("AudioContext not initialized")
            const urlToFetch = soundUrls[item]
            if (!urlToFetch) throw new Error(`Sound URL for ${item} not defined`)
            const res = await fetch(urlToFetch)
            const array = await res.arrayBuffer()
            buffers.set(item, await audioCtx.decodeAudioData(array))
            loadedSounds[item] = true
        }
    )
    isInit = true
    if (audioCtx.state === "suspended") await audioCtx.resume()
}



export default function useAudioContext() {
    

    const playSound = (name: SystemSoundName, volume = 0.4) => {
        if (!audioCtx) throw new Error("AudioContext not initialized")
        if (!buffers.has(name)) throw new Error(`Sound ${name} not loaded`)
        const source = audioCtx.createBufferSource()
        const gain = audioCtx.createGain()

        gain.gain.value = volume
        source.buffer = buffers.get(name)!
        source.connect(gain).connect(audioCtx!.destination)
        source.start()
    }

    return {
        initAudio,
        playSound,
    }
}