import Image from 'next/image';

const BtnHexagonAmero = ({ disabled, onClick}) => {
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
            ? '/amero/btn-register.png'
            : '/amero/btn-register-disable.png'
        }
        width={410}
        height={96}
        className='w-full'
        alt='Zirolu'
        priority
      />
    </button>
  );
};

export default BtnHexagonAmero;
