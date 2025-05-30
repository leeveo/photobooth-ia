"use client";
import { useEffect, useRef } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TauTauHome() {
  const router = useRouter();
  const fullscreenButtonRef = useRef(null);

  const requestFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.mozRequestFullScreen) { // Firefox
        await element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { // IE/Edge
        await element.msRequestFullscreen();
      }
      console.log("Fullscreen mode requested");
    } catch (error) {
      console.error("Fullscreen request failed:", error);
    }
  };

  const handleFullscreenAndNavigate = async (path) => {
    await requestFullscreen();
    router.push(path);
  };

  useEffect(() => {
    if (fullscreenButtonRef.current) {
      fullscreenButtonRef.current.click();
    }
  }, []);

  return (
    <main className="flex fixed h-full w-full bg-tautaufest overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 lg:pt-0 lg:px-20 mt-0">
      <button ref={fullscreenButtonRef} onClick={requestFullscreen} style={{ display: 'none' }}>Go Fullscreen</button>
      <Link href='/photobooth-ia/how' className="fixed w-full h-full top-0 left-0 z-10"></Link>
      <div className="fixed top-0 mx-auto w-[65%] mt-4">
        <Image src='/photobooth-ia/logo.png' width={607} height={168} alt='Leeveo' className='w-full' priority />
      </div>
      <div className="relative w-full flex justify-center items-center mt-[4vh] mb-[5vh]">
        <div className='animate-upDown relative w-[100%] mx-auto flex justify-center items-center pointer-events-none'>
          <Image src='/photobooth-ia/preview.png' width={744} height={654} alt='leeveo' className='w-full' priority />
        </div>
      </div>
      <div className="relative w-full flex justify-center items-center">
        <div 
          id="btn-taptostart" 
          className="relative mx-auto flex w-[75%] justify-center items-center cursor-pointer"
          onClick={requestFullscreen}
        >
          <Image src='/photobooth-ia/btn-taptostart.png' width={505} height={136} alt='leeveo' className='w-full' priority />
        </div>
      </div>
    </main>
  );
}
