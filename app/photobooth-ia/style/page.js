'use client';

// import * as fal from '@fal-ai/serverless-client';
import Image from "next/image";
import { useEffect, useState, useMemo } from 'react';
// import TopLogoGG from "../../components/TopLogoGG";
// import { Paytone_One} from "next/font/google";
// const paytone_one = Paytone_One({ subsets: ["latin"], weight: '400' });
import { useRouter } from 'next/navigation';
// import io from 'socket.io-client';

// @snippet:start(client.config)
// fal.config({
//     // credentials: 'FAL_KEY_ID:FAL_KEY_SECRET',
//     requestMiddleware: fal.withProxy({
//       targetUrl: '/api/fal/proxy', // the built-int nextjs proxy
//       // targetUrl: 'http://localhost:3333/api/fal/proxy', // or your own external proxy
//     }),
// });

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Register() {
    const router = useRouter();
    const [character, setCharacter] = useState(null);
    const [genderFix, setGenderFix] = useState(null);

    // useEffect(() => {
    //     // Perform localStorage action
    //     if (typeof localStorage !== 'undefined') {
    //         const item2 = localStorage.getItem('genderFix')
    //         setGenderFix(item2)
    //     }
    // }, [genderFix])

    const generateAI = () => {
        let urlGambar = '';
        if(genderFix == 'm' && character == 's1'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'm' && character == 's2'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 4)+'.jpeg';
        }else if(genderFix == 'm' && character == 's3'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'm' && character == 's4'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 3)+'.jpeg';
        }else if(genderFix == 'm' && character == 's5'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'm' && character == 's6'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'f' && character == 's1'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 3)+'.jpeg';
        }else if(genderFix == 'f' && character == 's2'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 4)+'.jpeg';
        }else if(genderFix == 'f' && character == 's3'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'f' && character == 's4'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 3)+'.jpeg';
        }else if(genderFix == 'f' && character == 's5'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'f' && character == 's6'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'ag' && character == 's1'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'ag' && character == 's2'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 4)+'.jpeg';
        }else if(genderFix == 'ag' && character == 's3'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'ag' && character == 's4'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 3)+'.jpeg';
        }else if(genderFix == 'ag' && character == 's5'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'ag' && character == 's6'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'af' && character == 's1'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 3)+'.jpeg';
        }else if(genderFix == 'af' && character == 's2'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 4)+'.jpeg';
        }else if(genderFix == 'af' && character == 's3'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'af' && character == 's4'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 3)+'.jpeg';
        }else if(genderFix == 'af' && character == 's5'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }else if(genderFix == 'af' && character == 's6'){
            urlGambar = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/kiabi/style/kompress/'+genderFix+'-'+character+'-'+getRandomInt(1, 2)+'.jpeg';
        }
       
        console.log(character)
        console.log(urlGambar)

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem("styleGeneral", character)
            localStorage.setItem("styleGenderFix", genderFix)
            localStorage.setItem("styleFix", urlGambar)
        }

        router.push('/photobooth-ia/cam');
    }
    return (
        <main className="flex fixed h-full w-full bg-tautaufest overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 lg:pt-12 lg:px-10">
            <div className="relative w-[60%] mx-auto mt-0]">
            {/*<Image src='/photobooth-ia/title-identify.png' width={900} height={340} alt='Zirolu' className='w-full' priority />*/}
            </div>
            {/* PILIH STYLE */}
            <div className="relative w-[90%] mx-auto mt-0">
                <div className="relative mt-0 w-full">
                    <div className="relative w-full mt-5">
                        <ul className="grid grid-cols-2 gap-4 justify-center items-center">
                            <li>
                                <input
                                    id="choose_gender1"
                                    type="radio"
                                    name="choose_gender"
                                    value="m"
                                    onChange={(e) => setGenderFix(e.target.value)}
                                    className="hidden"
                                />
                                <label htmlFor="choose_gender1" className="text-lg p-2 block cursor-pointer">
                                    <Image
                                        src="/photobooth-ia/categorie/btn-homme.png"
                                        alt="Homme"
                                        width={100}
                                        height={100}
                                        className="w-full max-w-[180px] h-auto"
                                    />
                                </label>
                            </li>
                            <li>
                                <input
                                    id="choose_gender2"
                                    type="radio"
                                    name="choose_gender"
                                    value="f"
                                    onChange={(e) => setGenderFix(e.target.value)}
                                    className="hidden"
                                />
                                <label htmlFor="choose_gender2" className="text-lg p-2 block cursor-pointer">
                                    <Image
                                        src="/photobooth-ia/categorie/btn-femme.png"
                                        alt="Femme"
                                        width={100}
                                        height={100}
                                        className="w-full max-w-[180px] h-auto"
                                    />
                                </label>
                            </li>
                            <li>
                                <input
                                    id="choose_gender3"
                                    type="radio"
                                    name="choose_gender"
                                    value="ag"
                                    onChange={(e) => setGenderFix(e.target.value)}
                                    className="hidden"
                                />
                                <label htmlFor="choose_gender3" className="text-lg p-2 block cursor-pointer">
                                    <Image
                                        src="/photobooth-ia/categorie/btn-ado-garcon.png"
                                        alt="Ado Garçon"
                                        width={100}
                                        height={100}
                                        className="w-full max-w-[180px] h-auto"
                                    />
                                </label>
                            </li>
                            <li>
                                <input
                                    id="choose_gender4"
                                    type="radio"
                                    name="choose_gender"
                                    value="af"
                                    onChange={(e) => setGenderFix(e.target.value)}
                                    className="hidden"
                                />
                                <label htmlFor="choose_gender4" className="text-lg p-2 block cursor-pointer">
                                    <Image
                                        src="/photobooth-ia/categorie/btn-ado-fille.png"
                                        alt="Ado Fille"
                                        width={100}
                                        height={100}
                                        className="w-full max-w-[180px] h-auto"
                                    />
                                </label>
                            </li>
                        </ul>
                    </div>
                    {genderFix && genderFix == 'm' && 
                    <div className='relative w-full mt-14 '>
                        <div className="relative w-[60%] mx-auto mt-0 ">
                        <Image src='/photobooth-ia/title-choose.png' width={959} height={130} alt='leeveo' className='w-full' priority />
                        </div>
                        <div className='overflow-hidden justify-center'>
                            <div className='px-12 '>
                            <ul className='choose mod5 mod'>
                            <li className="flex justify-center">
                                <input
                                id='choose_style1'
                                type="radio"
                                name='choose_style'
                                value="s1"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style1">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-m-1.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style2'
                                type="radio"
                                name='choose_style'
                                value="s2"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style2">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-m-2.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style3'
                                type="radio"
                                name='choose_style'
                                value="s3"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style3">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-m-3.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style4'
                                type="radio"
                                name='choose_style'
                                value="s4"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style4">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-m-4.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style5'
                                type="radio"
                                name='choose_style'
                                value="s5"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style5">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-m-6.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style6'
                                type="radio"
                                name='choose_style'
                                value="s6"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style6">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-m-5.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            </ul></div>
                        </div>
                    </div>
                    }
                    {genderFix && genderFix == 'f' && 
                    <div className='relative w-full mt-14'>
                        <div className="relative w-[60%] mx-auto mt-0">
                        <Image src='/photobooth-ia/title-choose.png' width={959} height={130} alt='Zirolu' className='w-full' priority />
                        </div>
                        <div className='overflow-hidden'>
                            <div className='px-12 '>
                            <ul className='choose mod5 mod'>
                            <li className="flex justify-center">
                                <input
                                id='choose_style1'
                                type="radio"
                                name='choose_style'
                                value="s1"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style1">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-1.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style2'
                                type="radio"
                                name='choose_style'
                                value="s2"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style2">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-2.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style3'
                                type="radio"
                                name='choose_style'
                                value="s3"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style3">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-3.png"
                                    alt="icon"
                                    width={250}
                                    height={318}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style4'
                                type="radio"
                                name='choose_style'
                                value="s4"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style4">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-4.png"
                                    alt="icon"
                                    width={250}
                                    height={318}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style5'
                                type="radio"
                                name='choose_style'
                                value="s5"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style5">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-5.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style6'
                                type="radio"
                                name='choose_style'
                                value="s6"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style6">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-6.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            </ul></div>
                        </div>
                    </div>
                    }
                    {genderFix && genderFix == 'ag' && 
                    <div className='relative w-full mt-14'>
                        <div className="relative w-[60%] mx-auto mt-0">
                        <Image src='/photobooth-ia/title-choose.png' width={959} height={130} alt='Zirolu' className='w-full' priority />
                        </div>
                        <div className='overflow-hidden'>
                            <div className='px-12 '>
                            <ul className='choose mod5 mod'>
                            <li className="flex justify-center">
                                <input
                                id='choose_style1'
                                type="radio"
                                name='choose_style'
                                value="s1"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style1">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-ag-1.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style2'
                                type="radio"
                                name='choose_style'
                                value="s2"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style2">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-ag-2.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style3'
                                type="radio"
                                name='choose_style'
                                value="s3"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style3">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-ag-3.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style4'
                                type="radio"
                                name='choose_style'
                                value="s4"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style4">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-ag-4.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style5'
                                type="radio"
                                name='choose_style'
                                value="s5"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style5">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-ag-5.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style6'
                                type="radio"
                                name='choose_style'
                                value="s6"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style6">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-ag-6.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            </ul></div>
                        </div>
                    </div>
                    }
                    {genderFix && genderFix == 'af' && 
                    <div className='relative w-full mt-14'>
                        <div className="relative w-[60%] mx-auto mt-0">
                        <Image src='/photobooth-ia/title-choose.png' width={959} height={130} alt='Zirolu' className='w-full' priority />
                        </div>
                        <div className='overflow-hidden'>
                            <div className='px-12 '>
                            <ul className='choose mod5 mod'>
                            <li className="flex justify-center">
                                <input
                                id='choose_style1'
                                type="radio"
                                name='choose_style'
                                value="s1"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style1">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-af-1.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style2'
                                type="radio"
                                name='choose_style'
                                value="s2"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style2">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-af-2.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style3'
                                type="radio"
                                name='choose_style'
                                value="s3"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style3">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-af-3.png"
                                    alt="icon"
                                    width={250}
                                    height={318}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style4'
                                type="radio"
                                name='choose_style'
                                value="s4"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style4">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-af-4.png"
                                    alt="icon"
                                    width={250}
                                    height={318}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style5'
                                type="radio"
                                name='choose_style'
                                value="s5"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style5">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-af-5.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            <li className="flex justify-center">
                                <input
                                id='choose_style6'
                                type="radio"
                                name='choose_style'
                                value="s6"
                                onChange={(e) => setCharacter(e.target.value)}
                                />
                                <label htmlFor="choose_style6">
                                <Image
                                    className="relative h-auto w-[70%] mx-auto"
                                    src="/photobooth-ia/style-af-6.png"
                                    alt="icon"
                                    width={322}
                                    height={410}
                                    priority
                                />
                                </label>
                            </li>
                            </ul></div>
                        </div>
                    </div>
                    }
                </div>
                {/* {character && */}
                    <div className={`relative w-full flex justify-center items-center mt-10 z-20  ${character ? `` : 'opacity-20 pointer-events-none'}`}>
                        <button className="relative mx-auto w-[80%] flex justify-center items-center" onClick={generateAI}>
                            <Image src='/photobooth-ia/btn-next.png' width={505} height={136} alt='Zirolu' className='w-full' priority />
                        </button>
                    </div>
                {/* } */}
            </div>
            {/* !PILIH STYLE */}
        </main>
    );
}
