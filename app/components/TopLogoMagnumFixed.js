import Image from 'next/image';
import React from 'react';
import Link from 'next/link';

const TopLogoMagnumFixed = () => {
  return (
    <Link href='/magnumotion' className='fixed top-10 w-[50%] mx-auto flex justify-center items-center z-50'>
      <Image src='/magnumotion/logo.png' width={207} height={53} alt='Zirolu' className='w-full' priority />
    </Link>
  );
};

export default TopLogoMagnumFixed;
