import Image from 'next/image';
import React from 'react';

const TopLogoDexa = () => {
  return (
    <a href='/amero' className='relative w-[35%] mx-auto flex justify-center items-center z-50'>
      <Image src='/dexa/logo.png' width={224} height={84} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default TopLogoDexa;
