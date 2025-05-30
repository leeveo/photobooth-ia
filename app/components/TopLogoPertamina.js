import Image from 'next/image';
import React from 'react';

const TopLogoPertamina = () => {
  return (
    <a href='/' className='fixed top-0 w-[120px] lg:w-[190px] mx-auto flex justify-center items-center z-50'>
      <Image src='/pertamina/logo.png' width={234} height={100} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default TopLogoPertamina;
