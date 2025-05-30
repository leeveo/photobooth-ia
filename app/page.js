import Image from "next/image";
import Link from 'next/link';
import TopLogo from "./components/TopLogo";
import { Paytone_One} from "next/font/google";
const paytone_one = Paytone_One({ subsets: ["latin"], weight: '400' });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center pt-2 pb-5 lg:pt-12" style={{ backgroundImage: "url('/tautaufest/bg.jpeg')", backgroundSize: 'cover' }}>
      <TopLogo></TopLogo>
      <h1 className={`text-center text-xl mt-[-.7rem] lg:mt-0 lg:text-7xl lg:mb-5 ${paytone_one.className}`}>Photobooth KIABI  </h1>
      <div className="relative w-full mt-7">
        <p className="text-center text-sm mb-3">Photobooth avec IA</p>
        <Link href='/tautaufest' rel="noopener noreferrer" target="_blank" className="relative mx-auto flex w-full justify-center items-center mt-0">
          <p className="text-center text-lg">Appuyez ICI pour demarrer le photobooth</p>
        </Link>
        <Link href="/photobooth2/your-slug-here" className="relative mx-auto flex w-full justify-center items-center mt-3">
          Essayer le nouveau Photobooth AI
        </Link>
        <div className="">
       </div>
      </div>
    </main>
  );
}
