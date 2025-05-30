/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_URL_PRIMARIA: 'https://api.minigim.fun/v1/primaria-scores/submit',
    API_KEY_PRIMARIA: 'YTgzrl1nI85XBv2nXz4go/vSqeuvhM3YHEvvGpdgJsU='
  },
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'ai.zirolu.id',
            pathname: "**",
          },
          {
            protocol: 'https',
            hostname: 'storage.googleapis.com',
          },
          {
            protocol: 'https',
            hostname: 'v3.fal.media',
          },
        ],
    }
};

export default nextConfig;
