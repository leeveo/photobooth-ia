import { useEffect, useRef, useState } from "react";
import Image from 'next/image';

export default function BgWave() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const image = new window.Image();
    image.src = "/primaria/bg.jpg"; // Ganti dengan path gambarmu

    image.onload = () => {
      const width = canvas.width = image.width;
      const height = canvas.height = image.height;

      let offset = 0;

      const drawWave = () => {
        ctx.clearRect(0, 0, width, height);
        for (let y = 0; y < height; y++) {
          const waveOffset = Math.sin((y + offset) * 0.1) * 7;
          ctx.drawImage(image, 0, y, width, 1, waveOffset, y, width, 1);
        }
        offset += 1;
        requestAnimationFrame(drawWave);
      };

      drawWave();
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none -z-1 scale-[1.02]"></canvas>
  );
}
