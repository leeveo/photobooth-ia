/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure image domains to allow images from Supabase, AWS S3 and fal.ai
  images: {
    domains: [
      'gyohqmahwntkmebayeej.supabase.co',  // Supabase storage
      'leeveostockage.s3.eu-west-3.amazonaws.com', // AWS S3 bucket
      'leeveostockage.s3.amazonaws.com',
      'replicate.delivery',
      'v3.fal.media'  // fal.ai generated images domain
    ]
  },
  reactStrictMode: true,
  // Any other existing configuration...
}

module.exports = nextConfig
