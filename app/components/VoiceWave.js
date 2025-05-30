import { useEffect, useRef, useState } from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
let convertPersen = 0, sensitiveSuara = 180, udhBeres = false

export default function VoiceWave({ direct }) {
  const router = useRouter();
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const canvasRef = useRef(null);
  const [dB, setDB] = useState(0); // Set initial value to 0
  const [progressKetawa, setProgressKetawa] = useState(0); 
  

  useEffect(() => {
    const initAudio = async () => {
      try {
        // if(!udhBeres){
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          const audioContext = audioContextRef.current;
  
          const source = audioContext.createMediaStreamSource(stream);
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 2048;
  
          const analyser = analyserRef.current;
          source.connect(analyser);
  
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
  
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
  
          const drawWave = () => {
            analyser.getByteTimeDomainData(dataArrayRef.current);
  
            // Log to check if we are getting the audio data
            // console.log("Audio Data:", dataArrayRef.current);
  
            // Calculate RMS (Root Mean Square) and check its value
            let sum = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
              const value = (dataArrayRef.current[i] - 128) / 128; // Normalize to [-1, 1]
              sum += value * value;
            }
            const rms = Math.sqrt(sum / dataArrayRef.current.length);
  
            // Log RMS value
          //   console.log("RMS Value:", rms);
  
            // Adjust RMS if it's too low for reasonable dB calculation
            const MIN_RMS = 0.0001;  // Minimum RMS value before calculating dB
            const adjustedRMS = Math.max(rms, MIN_RMS); // Ensure RMS is never too low
  
            // Log adjusted RMS
            // console.log("Adjusted RMS:", adjustedRMS.toFixed(2) * 100);
  
            // Calculate dB value. If RMS is too low, set dB to 0.
          //   const dbValue = adjustedRMS > 0 ? 20 * Math.log10(adjustedRMS) : 100; // We can set a very low value for silence
          //   const finalDB = dbValue < 0 ? 0 : dbValue; // Ensure dB is not negative
          //   const finalDB = dbValue * -1;
            let finalDB = adjustedRMS.toFixed(2) * 3000;
  
            if(finalDB >= sensitiveSuara){
              convertPersen += (finalDB / 10000) * 100;
              // console.log(convertPersen)
              if(convertPersen <= 100){
                  setProgressKetawa(convertPersen.toFixed(0));
              }
              if(convertPersen.toFixed(0) >= 100 || convertPersen.toFixed(0) >= 99){
                  udhBeres = true
                  setProgressKetawa(100);
              }
  
              if(udhBeres){
                  setTimeout(() => {
                      // router.push('/primaria/'+direct);
                      location.href = '/primaria/'+direct
                  }, 1500);
              }
  
              // if(convertPersen >=)
            }

            if(finalDB <= 30){
              setDB(0);
            }else{
              setDB(finalDB);
            }
  
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
  
            // Define colors for 4 different waveforms
            const waveColors = ['#ff5733', '#33c4ff', '#9b33ff', '#75ff33'];
  
            // Draw 4 different waveforms
            const sliceWidth = canvas.width / dataArrayRef.current.length;
            let x = 0;
  
            for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
              ctx.lineWidth = 2;
              ctx.strokeStyle = waveColors[lineIndex];
              ctx.beginPath();
  
              for (let i = 0; i < dataArrayRef.current.length; i++) {
                const v = (dataArrayRef.current[i] - 128) / 5;
                const variation = Math.sin((i + lineIndex * 50) / 10); // Add variation for each line
                const y = canvas.height / 2 + v * (canvas.height / 2) * (adjustedRMS * 1) * variation;
  
                if (i === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
                x += sliceWidth;
              }
  
              ctx.stroke();
              x = 0; // Reset x for the next line
            }
  
            // Continue animation
            requestAnimationFrame(drawWave);
          };
  
          drawWave();
        // }
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
  }, [direct]);

  return (
    <div className="relative top-0 left-0 mt-5 lg:mt-20 w-full h-full">
        <div className="relative w-full">
            <div className='relative w-[35%] lg:w-[50%] mx-auto flex justify-center items-center'>
                <Image src='/primaria/orang-1.png' width={512} height={512} alt='Zirolu' className={`w-full ${progressKetawa >= 40 ? 'opacity-0' : ''}`} priority />
                <Image src='/primaria/orang-2.png' width={512} height={512} alt='Zirolu' className={`w-full absolute w-full ${progressKetawa >= 40 && progressKetawa <= 80  ? '' : 'opacity-0'}`} priority />
                <Image src='/primaria/orang-3.png' width={512} height={512} alt='Zirolu' className={`w-full absolute w-full ${progressKetawa >= 80 ? '' : 'opacity-0'}`} priority />
            </div>
            <div className="relative bg-white w-[80%] h-[30px] lg:h-[50px] mt-5 lg:mt-14 mx-auto rounded-full p-2 overflow-hidden">
                <div className="absolute top-0 left-0 border-4 bg-gradient-to-r from-[#FF2A38] to-[#EF000F] h-full mx-auto rounded-full flex items-center justify-center" style={{ width: progressKetawa+"%" }}>
                    <span className="text-xl lg:text-3xl">{progressKetawa}%</span>
                </div>
            </div>
            <div className={`animate-upDownCepet text-xl lg:text-5xl text-center mt-5 lg:mt-14 ${progressKetawa == 100 ? '' : 'hidden'}`}>Yeayyy!! Tunggu sebentar..</div>
        </div>
        <div className="fixed bottom-[-3rem] lg:bottom-[3rem] left-0 w-full">
        <p className="text-base lg:text-5xl text-center mb-5">Suara Lo : {dB !== -Infinity ? dB.toFixed(0) +' dB' : "No Signal"}</p>
            <canvas
                ref={canvasRef}
                width="1080"
                height="300"
                style={{ border: "1px solid transparent", display: "block", margin: "0 auto" }}
            ></canvas>
            {/* <p>Volume (dB): {dB} {dB > 0 ? dB.toFixed(0) : "No Signal"}</p> */}
        </div>
      
    </div>
  );
}
