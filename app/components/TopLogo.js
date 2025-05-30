import Image from 'next/image';
import React from 'react';

const Nav = () => {
  return (
    <a href='/' className='relative w-[120px] lg:w-[234px] mx-auto flex justify-center items-center z-50'>
      <Image src='/logo.png' width={234} height={100} alt='Zirolu' className='w-full' priority />
    </a>
  );
};

export default Nav;
