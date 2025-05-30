'use client';

import * as fal from '@fal-ai/serverless-client';
import { useEffect, useRef, useState, useMemo } from 'react';
import TopLogoGG from '../../components/TopLogoGG';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// @snippet:start(client.config)
fal.config({
    // credentials: 'FAL_KEY_ID:FAL_KEY_SECRET',
    requestMiddleware: fal.withProxy({
      targetUrl: '/api/fal/proxy', // the built-int nextjs proxy
      // targetUrl: 'http://localhost:3333/api/fal/proxy', // or your own external proxy
    }),
});


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

let FACE_URL_RESULT = ''
let FACE_URL_RESULT2 = ''
let FACE_URL_RESULT3 = ''
export default function Cam() {
    const router = useRouter();
    const [enabled, setEnabled] = useState(false);
    const [captured, setCaptured] = useState(false);
    // const [countDown, setCoundown] = useState(5);
    // const [counter, setCounter] = useState(60);
    // const waktuBatasTake = useRef(null);
    const videoRef = useRef(null);
    const previewRef = useRef(null);

    useWebcam({ videoRef,previewRef});

    const captureVideo  = ({
        width = 512,
        height = 512,
    }) => {
        setCaptured(true)
        setTimeout(() => {
            setEnabled(true)
            setCaptured(null)
            const canvas = previewRef.current;
            const video = videoRef.current;
            video.play;
            if (canvas === null || video === null) {
                return;
            }
        
            // Calculate the aspect ratio and crop dimensions
            const aspectRatio = video.videoWidth / video.videoHeight;
            let sourceX, sourceY, sourceWidth, sourceHeight;
        
            if (aspectRatio > 1) {
                // If width is greater than height
                sourceWidth = video.videoHeight;
                sourceHeight = video.videoHeight;
                sourceX = (video.videoWidth - video.videoHeight) / 2;
                sourceY = 0;
            } else {
                // If height is greater than or equal to width
                sourceWidth = video.videoWidth;
                sourceHeight = video.videoWidth;
                sourceX = 0;
                sourceY = (video.videoHeight - video.videoWidth) / 2;
            }
        
            // Resize the canvas to the target dimensions
            canvas.width = width;
            canvas.height = height;
        
            const context = canvas.getContext('2d');
            if (context === null) {
                return;
            }
        
            // Draw the image on the canvas (cropped and resized)
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
            setImageFile(faceImage)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem("faceImage", faceImage)
            }
            // setTimeout(() => {
            //     router.push('/generate');
            // }, 1250);
        }, 3000);
    }

    const retake = () => {
        setEnabled(false)
    }


    // AI
    const [imageFile, setImageFile] = useState(null);
    const [imageFile2, setImageFile2] = useState(null);
    const [imageFile3, setImageFile3] = useState(null);
    const [styleFix, setStyleFix] = useState(null);
    const [styleFix2, setStyleFix2] = useState(null);
    const [styleFix3, setStyleFix3] = useState(null);
    const [formasiFix, setFormasiFix] = useState(null);
    const [numProses, setNumProses] = useState(0);
    const [numProses1, setNumProses1] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [resultFaceSwap, setResultFaceSwap] = useState(null);
    const [resultFaceSwap2, setResultFaceSwap2] = useState(null);
    const [resultFaceSwap3, setResultFaceSwap3] = useState(null);
    const [logs, setLogs] = useState([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    // @snippet:end
    useEffect(() => {
        // Perform localStorage action
        if (typeof localStorage !== 'undefined') {
            const item1 = localStorage.getItem('styleFix')
            // const item2 = localStorage.getItem('styleFix2')
            // const item3 = localStorage.getItem('styleFix3')
            // const item4 = localStorage.getItem('formasiFix')
            setStyleFix(item1)
            // setStyleFix2(item2)
            // setStyleFix3(item3)
            // setFormasiFix(item4)
        }
    }, [styleFix, styleFix2, styleFix3])

    const generateAI = () => {
        setNumProses1(true)
        generateImageSwap()

        // videoRef.current.stop();
        // videoRef.current.srcObject = ''
        // streamCam.getVideoTracks()[0].stop();
        // console.log(streamCam)

        
        // localStream.getVideoTracks()[0].stop();
        // console.log(streamCam)
        // console.log(videoRef)
        // videoRef.src=''
        // STOP CAM
        // streamCam.getTracks().forEach(function(track) {
        //     track.stop();
        // });
    }

    const reset2 = () => {
      setLoading(false);
      setError(null);
      setElapsedTime(0);
    };
    const toDataURL = url => fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    }))

    const generateImageSwap = async () => {
        setNumProses(2)
        reset2();
        setLoading(true);
        const start = Date.now();
        
        // Déterminer le genre en fonction du styleFix (basé sur votre logique existante)
        // Extraire le genre à partir de l'URL de l'image ou du localStorage
        let gender = "";
        const styleGenderFix = localStorage.getItem('styleGenderFix');
        if (styleGenderFix === 'f' || styleGenderFix === 'af') {
            gender = "female";
        } else if (styleGenderFix === 'm' || styleGenderFix === 'ag') {
            gender = "male";
        }
        
        try {
            // Log pour débogage des variables d'entrée
            console.log('Face swap input:', {
                face_image_0: imageFile,
                gender_0: gender,
                target_image: styleFix,
                workflow_type: "user_hair" // Utiliser le mode qui préserve les cheveux de l'utilisateur
            });
            
            const result = await fal.subscribe(
                'easel-ai/advanced-face-swap',
                {
                    input: {
                        face_image_0: imageFile,    // Image utilisateur (visage capturé)
                        gender_0: gender,           // Genre détecté ou spécifié par l'utilisateur
                        target_image: styleFix,     // Image de référence (mannequin)
                        workflow_type: "target_hair"  // Conserver les cheveux de l'utilisateur
                    },
                    pollInterval: 5000,
                    logs: true,
                    onQueueUpdate: (update) => {
                        setElapsedTime(Date.now() - start);
                        if (
                            update.status === 'IN_PROGRESS' ||
                            update.status === 'COMPLETED'
                        ) {
                            setLogs((update.logs || []).map((log) => log.message));
                        }
                    },
                }
            );
            
            setResultFaceSwap(result);
            
            // Stocker les métadonnées de génération pour le débogage
            const generationMetadata = {
                requestTime: new Date().toISOString(),
                processingTime: Date.now() - start,
                modelUsed: 'easel-ai/advanced-face-swap',
                parameters: {
                    face_image_0: imageFile ? imageFile.substring(0, 100) + '...' : null,
                    gender_0: gender,
                    target_image: styleFix ? styleFix.substring(0, 100) + '...' : null,
                    workflow_type: "user_hair"
                }
            };
            
            // La propriété où l'URL résultante est stockée peut différer dans la nouvelle API
            // Vérifiez result.image.url, result.data.url, ou result.data.image_url selon la structure retournée
            FACE_URL_RESULT = result.image?.url || result.data?.url || result.data?.image_url;
            
            if (!FACE_URL_RESULT) {
                console.error("URL d'image non trouvée dans la réponse:", result);
                throw new Error("URL d'image non trouvée dans la réponse");
            }
            
            // Stocker les métadonnées dans localStorage pour débogage
            localStorage.setItem("falGenerationMetadata", JSON.stringify(generationMetadata));
            
            toDataURL(FACE_URL_RESULT)
            .then(dataUrl => {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem("resulAIBase64", dataUrl)
                    localStorage.setItem("faceURLResult", FACE_URL_RESULT)
                }
                // Augmenter le délai avant redirection pour s'assurer que localStorage est bien mis à jour
                setTimeout(() => {
                    router.push('/photobooth-ia/result');
                }, 1000); // Augmentation de 500ms à 1000ms
            })
            .catch(error => {
                console.error("Erreur lors de la conversion de l'image en base64:", error);
                // Malgré l'erreur, rediriger avec l'URL directe
                localStorage.setItem("faceURLResult", FACE_URL_RESULT);
                setTimeout(() => {
                    router.push('/photobooth-ia/result');
                }, 1000);
            });
        } catch (error) {
            console.error("Erreur lors de la génération de l'image:", error);
            setError(error);
        } finally {
            setLoading(false);
            setElapsedTime(Date.now() - start);
        }
    };

    return (
        <main className="flex fixed h-full w-full bg-tautaufest overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 lg:pt-12 lg:px-20">
            <div className={`fixed top-10 w-[100%] mx-auto flex justify-center items-center z-50`}>
            {/* <TopLogoGG></TopLogoGG> */}
            </div>
            <div className={`relative top-0 w-[70%] mx-auto  mb-10 ${numProses1 ? `opacity-0 pointer-events-none` : ''}`}>
            <Image src='/photobooth-ia/title-take.png' width={916} height={336} alt='Leeveo' className='w-full' priority />
            </div>
            {/* LOADING */}
            {numProses1 && 
                <div className='absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-20'>
                    {/* <div className='relative w-[250px] h-[78px] lg:w-[555px] lg:h-[180px] overflow-hidden'>
                        <div className='animate-loading1 absolute left-0 top-0 w-full mx-auto flex justify-center items-center pointer-events-none'>
                            <Image src='/loading.png' width={770} height={714} alt='Leeveo' className='w-full' priority />
                        </div>
                    </div> */}

                    <div className="relative w-[70%] mx-auto mb-5">
                        <Image src='/photobooth-ia/logo.png' width={607} height={168} alt='Leeveo' className='w-full' priority />
                    </div>
                    <div className='animate-upDownCepet relative py-2 px-4 mt-5 lg:mt-10 lg:p-5 lg:text-4xl border-2 border-[#E5E40A] text-center bg-[#811A53] text-[#E5E40A] lg:font-bold rounded-lg'>
                        <p>{`Merci de patienter, En cours de chargement...`}</p>
                        <p>{`Processus de création : ${(elapsedTime / 1000).toFixed(2)} secondes (${numProses} sur 2)`}</p>
                        {error && <p>{error.message}</p>}
                    </div>

                    <pre className='relative py-2 px-4 mt-5 lg:mt-10 border-2 border-[#E5E40A] text-left bg-[#811A53] text-[#E5E40A] text-xs lg:text-sm overflow-auto no-scrollbar h-[100px] w-[80%] mx-auto rounded-lg'>
                        <code>
                        {logs.filter(Boolean).join('\n')}
                        </code>
                        Génération IA de votre visage ... <br></br>
                        Chargement du modèle d&apos;intelligence artificielle ...<br></br>
                        Fusion en attente ...<br></br>
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
            {/* LOADING */}
            <div className={`relative w-full flex flex-col justify-center items-center mt-0 mb-10 ${numProses1 ? 'opacity-0 pointer-events-none' : ''}`}>
                <div className='relative lg:w-full'>
                    {/* {!enabled && 
                    <div className='absolute top-0 left-0 right-0 bottom-0 w-[50%] mx-auto flex justify-center items-center pointer-events-none z-10'>
                        <Image src='/icon-capture.png' width={389} height={220} alt='Leeveo' className='w-full' priority />
                    </div>
                    } */}

                    {captured && 
                    <div className='absolute top-0 left-0 right-0 bottom-0 w-[100px] h-[100px] lg:w-[174px] lg:h-[174px] overflow-hidden m-auto flex justify-center items-center pointer-events-none z-10'>
                        <div className='w-full animate-countdown translate-y-[35%]'>
                            <Image src='/countdown.png' width={174} height={522} alt='Leeveo' className='w-full' priority />
                        </div>
                    </div>
                    }

                    {!enabled && 
                    <div className='w-[55%] mx-auto absolute left-0 right-0 bottom-0 z-10'>
                        {/* <Image src='/frame-pose.png' width={426} height={461} alt='Leeveo' className='w-full' priority /> */}
                    </div>
                    }

                    <video ref={videoRef} className={`w-full mx-auto border-2 border-[#ffffff] rounded-sm ${enabled ? 'absolute opacity-0':'relative'}`} playsInline height={512}></video>
                    <canvas ref={previewRef} width="512" height="512" className={`${enabled ? 'relative':'absolute opacity-0'} w-[80%] top-0 left-0 right-0 mx-auto pointer-events-nones border-2 border-[#ffffff] rounded-sm`}></canvas>
                </div>
            </div>


            {!enabled && 
                                   <p className='block text-center text-4xl mt-0 mb-10 text-white' style={{ backgroundColor: '#f0e626', padding: '0 20px' }}>C&apos;est vous le mannequin ! </p>
            }
            {!enabled && 
                <div className="relative w-full flex justify-center items-center">
                    <button className="relative mx-auto flex  w-[80%] justify-center items-center" onClick={captureVideo}>
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
            </div></div>
        </main>
    );
}
