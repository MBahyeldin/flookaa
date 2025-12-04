import { useEffect, useState } from "react";

export default function VoiceIndicator({
    previewAudioStream,
}: {
    previewAudioStream: MediaStream | null;
}) {
    const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
    const [dataBuffer, setDataBuffer] = useState<Uint8Array<ArrayBuffer> | null>(null);
    const [peakLevel, setPeakLevel] = useState(0);
    const [forceUpdate, setForceUpdate] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setForceUpdate((prev) => prev + 1);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!previewAudioStream) return;
        const context = new AudioContext();
        const source = context.createMediaStreamSource(previewAudioStream);
        const analyzer = context.createAnalyser();
        source.connect(analyzer);
        setAnalyzer(analyzer);

        const array = new Uint8Array(analyzer.fftSize);
        setDataBuffer(array);
    }, [previewAudioStream]);

    useEffect(() => {
        if (!analyzer || !dataBuffer) return;
        analyzer.getByteTimeDomainData(dataBuffer);
        let max = 0;
        for (let i = 0; i < dataBuffer.length; i++) {
            const value = Math.abs(dataBuffer[i] - 128) / 128;
            if (value > max) {
                max = value;
            }
        }
        setPeakLevel(max);
    }, [analyzer, dataBuffer, forceUpdate]);

    return (
        <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${Math.min(peakLevel * 100, 100)}%` }}
            />
        </div>
    );
}