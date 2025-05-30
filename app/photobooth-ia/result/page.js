'use client';

import Link from 'next/link';
import Image from "next/image";
import React, { useEffect, useState, useRef } from 'react';
import { useQRCode } from 'next-qrcode';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Add timestamp function for better logging
const logWithTimestamp = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
};

const s3Client = new S3Client({
    region: 'eu-west-3',
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
});

export default function Result() {
    const [imageResultAI, setImageResultAI] = useState(null);
    const [generateQR, setGenerateQR] = useState(null);
    const [linkQR, setLinkQR] = useState(null);
    const [loadingDownload, setLoadingDownload] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const componentRef = useRef();
    const { Canvas } = useQRCode();

    useEffect(() => {
        logWithTimestamp('Result page mounted, checking for stored image');
        const startTime = performance.now();
        
        const storedImage = localStorage.getItem('faceURLResult');
        if (storedImage) {
            logWithTimestamp('Found stored image URL:', storedImage);
            
            // Vérifier que nous sommes bien côté client avant d'utiliser l'API Image
            if (typeof window !== 'undefined') {
                // Add image load timing - utiliser window.Image au lieu de Image
                const img = new window.Image();
                img.onload = () => {
                    const loadTime = performance.now() - startTime;
                    logWithTimestamp(`Image loaded in ${loadTime.toFixed(2)}ms`, {
                        width: img.width,
                        height: img.height,
                        src: storedImage.substring(0, 100) + '...' // Truncate for readability
                    });
                    setImageDimensions({ width: img.width, height: img.height });
                };
                
                img.onerror = (err) => {
                    logWithTimestamp('Error loading image:', err);
                };
                
                img.src = storedImage;
            }
            
            // Définir l'URL de l'image dans l'état, indépendamment de son chargement
            setImageResultAI(storedImage);
        } else {
            logWithTimestamp('No stored image found in localStorage');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const imageUrl = urlParams.get('imageUrl');
        if (imageUrl) {
            logWithTimestamp('Image URL found in URL params:', imageUrl);
            setLinkQR(imageUrl);
            setGenerateQR(true);
        }
        
        // Log any stored metadata about fal.ai generation if it exists
        const falMetadata = localStorage.getItem('falGenerationMetadata');
        if (falMetadata) {
            try {
                logWithTimestamp('fal.ai generation metadata:', JSON.parse(falMetadata));
            } catch (e) {
                logWithTimestamp('Error parsing fal.ai metadata:', e);
            }
        } else {
            logWithTimestamp('No fal.ai metadata found in localStorage');
        }
    }, []);

    const uploadToS3 = async (imageUrl) => {
        const startTime = performance.now();
        logWithTimestamp('Starting S3 upload process for:', imageUrl.substring(0, 100) + '...');
        
        try {
            logWithTimestamp('Fetching image from URL...');
            const fetchStart = performance.now();
            const response = await fetch(imageUrl);
            const fetchTime = performance.now() - fetchStart;
            
            logWithTimestamp(`Fetch completed in ${fetchTime.toFixed(2)}ms with status:`, response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            
            const blobStart = performance.now();
            const blob = await response.blob();
            logWithTimestamp(`Blob creation completed in ${(performance.now() - blobStart).toFixed(2)}ms, size:`, `${blob.size} bytes`);
            
            const arrayBufferStart = performance.now();
            const arrayBuffer = await blob.arrayBuffer();
            logWithTimestamp(`ArrayBuffer creation completed in ${(performance.now() - arrayBufferStart).toFixed(2)}ms`);
            
            const buffer = Buffer.from(arrayBuffer);
            logWithTimestamp(`Buffer created, size: ${buffer.length} bytes`);
            
            const fileName = `generated-image-${Date.now()}.jpg`;

            const uploadParams = {
                Bucket: 'leeveostockage',
                Key: fileName,
                Body: buffer,
                ContentType: 'image/jpeg',
            };

            logWithTimestamp('Uploading to S3 with params:', { 
                Bucket: uploadParams.Bucket, 
                Key: uploadParams.Key,
                ContentType: uploadParams.ContentType,
                ContentLength: buffer.length
            });
            
            const s3Start = performance.now();
            const result = await s3Client.send(new PutObjectCommand(uploadParams));
            const s3Time = performance.now() - s3Start;
            
            logWithTimestamp(`S3 upload completed in ${s3Time.toFixed(2)}ms:`, result);
            
            const s3Url = `https://${uploadParams.Bucket}.s3.eu-west-3.amazonaws.com/${uploadParams.Key}`;
            logWithTimestamp('Generated S3 URL:', s3Url);
            
            const totalTime = performance.now() - startTime;
            logWithTimestamp(`Total S3 upload process completed in ${totalTime.toFixed(2)}ms`);
            
            return s3Url;
        } catch (error) {
            logWithTimestamp('Error uploading to S3:', error);
            return null;
        }
    };

    const handleUpload = async () => {
        if (imageResultAI) {
            logWithTimestamp('Starting upload process');
            setLoadingDownload(true);
            try {
                const s3Url = await uploadToS3(imageResultAI);
                if (s3Url) {
                    logWithTimestamp('Image successfully uploaded to S3:', s3Url);
                    setLinkQR(s3Url);
                    setGenerateQR(true);
                } else {
                    logWithTimestamp('Failed to upload image to S3');
                }
            } catch (error) {
                logWithTimestamp('Error during upload:', error);
            } finally {
                setLoadingDownload(false);
                logWithTimestamp('Upload process completed');
            }
        } else {
            logWithTimestamp('Error: No image to upload');
        }
    };

    const backHome = () => {
        // gtag('event', 'ClickButton', {
        //     event_category: 'Button',
        //     event_label: 'ResultPage - '+payload.stasiunName,
        //     event_action: 'BackToHome'
        // })
    }

    return (
        <main className="flex fixed h-full w-full bg-tautaufest overflow-auto flex-col justify-center items-center py-16 px-20" onContextMenu={(e)=> e.preventDefault()}>
            {/* Title Image at the Top */}
            <div className='fixed top-0 mx-auto w-[65%] mt-4'>
                <Image src='/photobooth-ia/title-scan.png' width={815} height={195} alt='Leeveo' className='w-full' priority />
            </div>
            {/* QR */}
            {generateQR && 
                <div className='absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-40 bg-kai3 text-black bg-opacity-0'>
                    <div className='relative mt-12 mx-auto flex items-center justify-center canvas-qr border-4 border-black' onClick={()=>{setGenerateQR(null)}}>
                        <Canvas
                        text={linkQR}
                        options={{
                            errorCorrectionLevel: 'M',
                            margin: 3,
                            scale: 4,
                            width: '100%',
                            color: {
                            dark: '#000000',
                            light: '#ffffff',
                            },
                        }}
                        style={{ width: '60%', maxWidth: '500px', height: 'auto' }}
                        />
                    </div>
                    {/* Scrollable GDPR Information */}
                    <div className="relative mt-8 w-[80%] h-32 overflow-y-auto border-2 border-black bg-white p-4 text-sm text-justify">
                        <p><strong>INFORMATION SUR LA PROTECTION DES DONNEES PERSONNELLES (RGPD)</strong></p>
                        <p>Dans le cadre de l&rsquo;animation &quot;Photobooth IA&quot; organis&eacute; par KIABI<br />www.kiabi.fr</p>
                        <p>Dans le cadre de votre participation &agrave; l&rsquo;animation &quot;Photobooth IA&quot; propos&eacute;e par Kiabi, une photo a &eacute;t&eacute; g&eacute;n&eacute;r&eacute;e via une solution d&rsquo;intelligence artificielle, et vous pouvez la r&eacute;cup&eacute;rer via un QR code personnel. Conform&eacute;ment au R&egrave;glement G&eacute;n&eacute;ral sur la Protection des Donn&eacute;es (RGPD), nous vous informons de la mani&egrave;re dont vos donn&eacute;es sont trait&eacute;es.</p>
                        <p><strong>1. Responsable du traitement</strong><br />KIABI Europe – 100 rue du Calvaire, 59510 Hem – www.kiabi.fr</p>
                        <p><strong>2. Finalit&eacute; du traitement</strong><br />Les donn&eacute;es sont collect&eacute;es dans le but de :</p>
                        <ul className="list-disc pl-5">
                            <li>G&eacute;n&eacute;rer une photo personnalis&eacute;e à l&rsquo;aide d&rsquo;une technologie de traitement d&rsquo;image assist&eacute;e par intelligence artificielle (IA).</li>
                            <li>Permettre au participant de r&eacute;cup&eacute;rer sa photo via un QR code s&eacute;curis&eacute;.</li>
                        </ul>
                        <p>Aucune diffusion publique ne sera faite sans votre accord explicite.</p>
                        <p><strong>3. Base legale</strong><br />Le traitement repose sur votre consentement (article 6.1.a du RGPD), donne au moment de l&rsquo;utilisation du photobooth.</p>
                        <p><strong>4. Donn&eacute;es collect&eacute;es</strong><br />Image (visage ou silhouette selon le photobooth utilis&eacute;)<br />Donn&eacute;es biom&eacute;triques non stock&eacute;es (elles peuvent être utilis&eacute;es temporairement par l&rsquo;IA pour g&eacute;n&eacute;rer l&rsquo;image mais ne sont pas conserv&eacute;es)<br />QR code g&eacute;n&eacute;r&eacute; pour un accès individuel à la photo</p>
                        <p><strong>5. Dur&eacute;e de conservation</strong><br />Les photos sont conserv&eacute;es sur un serveur s&eacute;curis&eacute; pour une dur&eacute;e maximale de 7 jours, afin de permettre leur r&eacute;cup&eacute;ration. Pass&eacute; ce d&eacute;lai, elles sont automatiquement supprim&eacute;es.</p>
                        <p><strong>6. Destinataires des donn&eacute;es</strong><br />Les donn&eacute;es sont uniquement accessibles :</p>
                        <ul className="list-disc pl-5">
                            <li>Aux services internes de Kiabi encadrant l&rsquo;animation</li>
                            <li>Au prestataire technique en charge du photobooth et de l&rsquo;h&eacute;bergement s&eacute;curis&eacute; des images, li&eacute; par un contrat de confidentialit&eacute;</li>
                        </ul>
                        <p><strong>7. Vos droits</strong><br />Vous b&eacute;n&eacute;ficiez des droits suivants :</p>
                        <ul className="list-disc pl-5">
                            <li>Accès à vos donn&eacute;es</li>
                            <li>Rectification ou suppression</li>
                            <li>Retrait du consentement</li>
                            <li>Limitation du traitement</li>
                        </ul>
                        <p>Pour exercer vos droits :<br />dpo@kiabi.com ou par courrier à :<br />DPO Kiabi, 100 rue du Calvaire, 59510 Hem</p>
                        <p><strong>8. Consentement</strong><br />En utilisant le Photobooth IA et en scannant le QR code pour r&eacute;cup&eacute;rer votre photo, vous consentez au traitement de vos donn&eacute;es tel que d&eacute;crit ci-dessus.</p>
                    </div>
                    <div className={`fixed left-0 bottom-0 w-full`}>
                        <div className="relative w-[80%] mx-auto flex justify-center items-center flex-col" onClick={backHome}>
                            <Link href='/photobooth-ia' className="relative w-full mx-auto flex justify-center items-center pb-14">
                                <Image src='/photobooth-ia/btn-back.png' width={772} height={135} alt='Leeveo' className='w-full' priority />
                            </Link>
                        </div>
                    </div>
                </div>
            }
            {/* QR */}

            {/* DOWNLOAD & PRINT */}
            
            <div className={generateQR ? `opacity-0 pointer-events-none w-full` : 'w-full'}>
                {imageResultAI && 
                <div className='relative w-full mt-10 mx-auto flex justify-center items-center rounded-sm'>
                    <div className='relative w-full'>
                        {/* Add onLoad handler to Image component */}
                        <Image 
                            src={imageResultAI} 
                            width={683} 
                            height={1024} 
                            alt="leeveo" 
                            className="relative block w-full h-auto"
                            onLoad={() => logWithTimestamp('Next/Image component loaded successfully', imageDimensions)}
                            onError={(e) => logWithTimestamp('Error loading Next/Image component:', e)} 
                        />
                        {/* Image debugging info */}
                        <div className='hidden'>Image dimensions: {JSON.stringify(imageDimensions)}</div>
                    </div>
                </div>
                }
                {loadingDownload && 
                    <div className='relative p-5 mt-14 border-2 border-[#b1454a] text-center bg-[#71c7b3] text-[#fff] text-lg overflow-auto no-scrollbar w-[70%] mx-auto rounded-lg'>
                        <p>Merci de patienter, En cours de chargement...</p>
                    </div>
                }
                <div className={`relative w-full ${loadingDownload ? 'hidden' : ''}`}>
                    <div className={`w-full`}>
                        <div className={`w-full mt-14`}>
                            <div className="relative w-[80%] mx-auto flex justify-center items-center flex-col">
                                <button className="relative w-full mx-auto flex justify-center items-center" onClick={handleUpload}>
                                    <Image src='/photobooth-ia/btn-send.png' width={480} height={96} alt='Envoyer' className='w-full' priority />
                                </button>
                                <Link href='/photobooth-ia' className="relative w-full mx-auto flex justify-center items-center" onClick={backHome}>
                                    <Image src='/photobooth-ia/btn-back.png' width={772} height={135} alt='Retour' className='w-full' priority />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
