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
    

    /*
     * Fails soft. This is called from the like handler, and a sound that isn't
     * ready — the fetch/decode is async, the context may still be suspended,
     * or the device may have no audio output — must never stop a like from
     * registering. Previously it threw, which would take the action with it.
     */
    const playSound = (name: SystemSoundName, volume = 0.4) => {
        if (!audioCtx || !buffers.has(name)) return

        try {
            // Browsers suspend the context until a user gesture; this call site
            // is inside a click, so resuming here is allowed.
            if (audioCtx.state === "suspended") void audioCtx.resume()

            const source = audioCtx.createBufferSource()
            const gain = audioCtx.createGain()

            gain.gain.value = volume
            source.buffer = buffers.get(name)!
            source.connect(gain).connect(audioCtx.destination)
            source.start()
        } catch (error) {
            console.error(`Failed to play sound ${name}:`, error)
        }
    }

    return {
        initAudio,
        playSound,
    }
}