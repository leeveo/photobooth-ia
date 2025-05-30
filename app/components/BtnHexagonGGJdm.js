import Image from 'next/image';

const BtnHexagonGGJdm = ({ disabled, onClick}) => {
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
            ? '/ggjdm/btn-register.png'
            : '/ggjdm/btn-register-disable.png'
        }
        width={479}
        height={96}
        className='w-full'
        alt='Zirolu'
        priority
      />
    </button>
  );
};

export default BtnHexagonGGJdm;
