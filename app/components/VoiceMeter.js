import { useEffect, useRef, useState } from "react";

export default function VoiceMeter() {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const [dB, setDB] = useState(-Infinity);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const audioContext = audioContextRef.current;

        const source = audioContext.createMediaStreamSource(stream);
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;

        const analyser = analyserRef.current;
        source.connect(analyser);

        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        const updateDB = () => {
          analyser.getByteTimeDomainData(dataArrayRef.current);

          // Calculate RMS
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const value = (dataArrayRef.current[i] - 128) / 128; // Normalize between -1 and 1
            sum += value * value;
          }
          const rms = Math.sqrt(sum / dataArrayRef.current.length);

          // Convert RMS to dB
          const dbValue = 20 * Math.log10(rms);
          setDB(dbValue > -Infinity ? dbValue.toFixed(2) : -Infinity);

          requestAnimationFrame(updateDB);
        };

        updateDB();
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Voice Meter</h1>
      <div
        style={{
          width: "300px",
          height: "30px",
          background: "#ddd",
          borderRadius: "5px",
          overflow: "hidden",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: `${Math.min(Math.max((dB + 50) * 2, 0), 100)}%`, // Scale dB to fit 0-100%
            height: "100%",
            background: "green",
            transition: "width 0.1s ease-out",
          }}
        ></div>
      </div>
      <p>Volume (dB): {dB !== -Infinity ? dB : "No Signal"}</p>
    </div>
  );
}
