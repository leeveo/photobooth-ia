import Image from 'next/image';
import React from 'react';

const TopLogoFerron = () => {
  return (
    <a href='/ferron' className='relative w-[12%] mx-auto flex justify-center items-center z-50'>
      <Image src='/dexa/ferron2.png' width={312} height={333} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default TopLogoFerron;
