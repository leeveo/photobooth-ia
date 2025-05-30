import Image from 'next/image';
import React from 'react';

const TopLogoKAI = () => {
  return (
    <a href='/kai-demo' className='relative w-[180px] lg:w-[50%] mx-auto flex justify-center items-center z-50'>
      <Image src='/kai/logo-new.png' width={384} height={230} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default TopLogoKAI;
