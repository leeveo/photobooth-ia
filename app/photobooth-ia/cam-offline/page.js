'use client';

import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

let streamCam = null;
const useWebcam = ({
    videoRef
  }) => {
    useEffect(() => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true}).then((stream) => {
            streamCam = stream
            window.localStream = stream
          if (videoRef.current !== null) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        });
      }
    }, [videoRef]);
};

export default function CamOffline() {
    const router = useRouter();
    const [enabled, setEnabled] = useState(false);
    const [captured, setCaptured] = useState(false);
    const videoRef = useRef(null);
    const previewRef = useRef(null);
    const [imageFile, setImageFile] = useState(null);
    const [styleFix, setStyleFix] = useState(null);
    const [numProses1, setNumProses1] = useState(null);
    const [numProses, setNumProses] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [logs, setLogs] = useState([]);

    useWebcam({ videoRef, previewRef});

    useEffect(() => {
        if (typeof localStorage !== 'undefined') {
            const item1 = localStorage.getItem('styleFix');
            setStyleFix(item1);
        }
    }, []);

    const captureVideo = ({
        width = 512,
        height = 512,
    }) => {
        setCaptured(true);
        setTimeout(() => {
            setEnabled(true);
            setCaptured(null);
            const canvas = previewRef.current;
            const video = videoRef.current;
            if (canvas === null || video === null) {
                return;
            }
        
            // Calculate the aspect ratio and crop dimensions
            const aspectRatio = video.videoWidth / video.videoHeight;
            let sourceX, sourceY, sourceWidth, sourceHeight;
        
            if (aspectRatio > 1) {
                sourceWidth = video.videoHeight;
                sourceHeight = video.videoHeight;
                sourceX = (video.videoWidth - video.videoHeight) / 2;
                sourceY = 0;
            } else {
                sourceWidth = video.videoWidth;
                sourceHeight = video.videoWidth;
                sourceX = 0;
                sourceY = (video.videoHeight - video.videoWidth) / 2;
            }
        
            canvas.width = width;
            canvas.height = height;
        
            const context = canvas.getContext('2d');
            if (context === null) return;
        
            context.drawImage(
                video,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                width,
                height
            );
    
            let faceImage = canvas.toDataURL();
            setImageFile(faceImage);
            localStorage.setItem("faceImage", faceImage);
        }, 3000);
    };

    const retake = () => {
        setEnabled(false);
    };

    // Fonction simulant le traitement d'IA sans API externe
    const generateImageSwap = () => {
        setNumProses1(true);
        setNumProses(1);
        setLoading(true);
        const start = Date.now();
        
        // Simuler une progression et des logs
        const timer1 = setInterval(() => {
            setElapsedTime(Date.now() - start);
            setNumProses(prev => Math.min(prev + 0.1, 2));
            setLogs(prev => [...prev, "Traitement en cours..."]);
        }, 500);
        
        // Utiliser l'image de style directement comme résultat
        // pour tester sans appeler l'API externe
        setTimeout(() => {
            clearInterval(timer1);
            localStorage.setItem("faceURLResult", styleFix || '/tautaufest/result-placeholder.jpg');
            
            router.push('/photobooth-ia/result');
        }, 5000);
    };

    const generateAI = () => {
        setNumProses1(true);
        generateImageSwap();
    };

    return (
        <main className="flex fixed h-full w-full bg-tautaufest overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 lg:pt-12 lg:px-20">
            <div className={`relative top-0 w-[70%] mx-auto mb-10 ${numProses1 ? `opacity-0 pointer-events-none` : ''}`}>
                <Image src='/photobooth-ia/title-take.png' width={916} height={336} alt='Leeveo' className='w-full' priority />
            </div>
            
            {numProses1 && 
                <div className='absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-20'>
                    <div className="relative w-[70%] mx-auto mb-5">
                        <Image src='/photobooth-ia/logo.png' width={607} height={168} alt='Leeveo' className='w-full' priority />
                    </div>
                    <div className='relative py-2 px-4 mt-5 lg:mt-10 lg:p-5 lg:text-4xl border-2 border-[#E5E40A] text-center bg-[#811A53] text-[#E5E40A] lg:font-bold rounded-lg'>
                        <p>{`Merci de patienter, En cours de chargement...`}</p>
                        <p>{`Processus de création : ${(elapsedTime / 1000).toFixed(2)} secondes (${numProses.toFixed(1)} sur 2)`}</p>
                        <p>MODE TEST - PAS  API</p>
                        {error && <p>{error.message}</p>}
                    </div>

                    <pre className='relative py-2 px-4 mt-5 lg:mt-10 border-2 border-[#E5E40A] text-left bg-[#811A53] text-[#E5E40A] text-xs lg:text-sm overflow-auto no-scrollbar h-[100px] w-[80%] mx-auto rounded-lg'>
                        <code>
                        {logs.filter(Boolean).join('\n')}
                        </code>
                        Mode test activé - contournement de l&apos;API<br/>
                        Redirection vers la page de résultat après 5 secondes...<br/>
                    </pre>
                    
                    <button 
                        className="relative w-full mx-auto flex justify-center items-center mt-3 bg-yellow-500 text-black text-4xl font-bold py-2 px-4 rounded" 
                        onClick={() => router.push('/photobooth-ia')} 
                        style={{ width: '200px', height: '54px' }}
                    >
                        RETOUR
                    </button>
                </div>
            }
            
            <div className={`relative w-full flex flex-col justify-center items-center mt-0 mb-10 ${numProses1 ? 'opacity-0 pointer-events-none' : ''}`}>
                <div className='relative lg:w-full'>
                    {captured && 
                    <div className='absolute top-0 left-0 right-0 bottom-0 w-[100px] h-[100px] lg:w-[174px] lg:h-[174px] overflow-hidden m-auto flex justify-center items-center pointer-events-none z-10'>
                        <div className='w-full animate-countdown translate-y-[35%]'>
                            <Image src='/countdown.png' width={174} height={522} alt='Leeveo' className='w-full' priority />
                        </div>
                    </div>
                    }

                    <video ref={videoRef} className={`w-full mx-auto border-2 border-[#ffffff] rounded-sm ${enabled ? 'absolute opacity-0':'relative'}`} playsInline height={512}></video>
                    <canvas ref={previewRef} width="512" height="512" className={`${enabled ? 'relative':'absolute opacity-0'} w-[80%] top-0 left-0 right-0 mx-auto pointer-events-nones border-2 border-[#ffffff] rounded-sm`}></canvas>
                </div>
            </div>


            {!enabled && 
                <p className='block text-center text-4xl mt-0 mb-10 text-white' style={{ backgroundColor: '#f0e626', padding: '0 20px' }}>
                    C&apos;est vous le mannequin ! (MODE TEST)
                </p>
            }
            
            {!enabled && 
                <div className="relative w-full flex justify-center items-center">
                    <button className="relative mx-auto flex w-[80%] justify-center items-center" onClick={captureVideo}>
                        <Image src='/photobooth-ia/btn-capture.png' width={505} height={136} alt='Leeveo' className='w-full' priority />
                    </button>
                </div>
            }
            
            <div className={`relative w-full ${numProses1 ? 'opacity-0 pointer-events-none' : ''}`}>
                <div className={`relative w-full ${!enabled ? 'hidden' : ''}`}>
                    <div className="relative w-[75%] mx-auto flex justify-center items-center flex-col mt-0">
                        <button className="w-full relative mx-auto flex justify-center items-center" onClick={generateAI}>
                            <Image src='/photobooth-ia/btn-next.png' width={505} height={136} alt='Leeveo' className='w-full' priority />
                        </button>
                        <button className="relative w-full mx-auto flex justify-center items-center mt-3" onClick={retake}>
                            <Image src='/photobooth-ia/btn-retake.png' width={505} height={136} alt='Leeveo' className='w-full' priority />
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
};
