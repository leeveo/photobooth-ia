import Image from 'next/image';
import React from 'react';
import Link from 'next/link';

const TopLogoGG = () => {
  return (
    <Link href='/gg-jdm' className='fixed top-10 w-[30%] mx-auto flex justify-center items-center z-50'>
      <Image src='/ggjdm/logo-big.png' width={724} height={364} alt='Zirolu' className='w-full' priority />
    </Link>
  );
};

export default TopLogoGG;
