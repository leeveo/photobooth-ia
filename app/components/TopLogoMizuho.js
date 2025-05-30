import Image from 'next/image';
import React from 'react';

const TopLogoMizuho = () => {
  return (
    <a href='/mizuho' className='relative w-[120px] lg:w-[190px] mx-auto flex justify-center items-center z-50 opacity-0 hidden'>
      <Image src='/mizuho/logo.png' width={234} height={100} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default TopLogoMizuho;
