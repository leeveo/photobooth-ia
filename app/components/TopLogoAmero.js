import Image from 'next/image';
import React from 'react';

const TopLogoAmero = () => {
  return (
    <a href='/amero' className='relative w-[120px] lg:w-[50%] mx-auto flex justify-center items-center z-50'>
      <Image src='/amero/logo.png' width={314} height={134} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default TopLogoAmero;
