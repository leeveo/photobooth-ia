import Image from 'next/image';

const BtnHexagonTauTau = ({ disabled, onClick}) => {
  // Utiliser des chemins d'images qui existent dans le déploiement
  const enabledBtnPath = '/placeholder-bg.jpg'; // Remplacer l'image manquante
  const disabledBtnPath = '/placeholder-bg.jpg'; // Remplacer l'image manquante
  
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center justify-center ${
        disabled ? 'pointer-events-none' : ''
      }`}
    >
      <Image
        src={!disabled ? enabledBtnPath : disabledBtnPath}
        width={479}
        height={96}
        className='w-full'
        alt='waibooth'
        priority
      />
    </button>
  );
};

export default BtnHexagonTauTau;
