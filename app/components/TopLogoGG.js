import Image from 'next/image';

const TopLogoGG = () => {
  return (
    <div className="flex justify-center items-center w-full py-4">
      <Image
        src="/placeholder-bg.jpg" // Utiliser une image placeholder disponible
        alt="Logo"
        width={150}
        height={50}
        priority
      />
    </div>
  );
};

export default TopLogoGG;
