import Image from 'next/image';
import React from 'react';

const TopLogoPrimaria = () => {
  return (
    <div className='relative w-[120px] lg:w-[66%] mx-auto flex justify-center items-center z-10'>
      <Image src='/primaria/logo-top.png' width={496} height={196} alt='Zirolu' className='w-full' priority />
    </div>
  );
};

export default TopLogoPrimaria;
