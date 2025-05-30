import Image from 'next/image';

const BtnPrimaria = ({ button, disabled, onClick}) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center justify-center ${
        disabled ? 'pointer-events-none' : ''
      }`}
    >
      <Image
        src={
          !disabled
            ? '/primaria/btn-'+button+'.png'
            : '/primaria/btn-'+button+'-disable.png'
        }
        width={899}
        height={206}
        className='w-full'
        alt='Zirolu'
        priority
      />
    </button>
  );
};

export default BtnPrimaria;
