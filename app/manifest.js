export default function manifest() {
    return {
      name: 'WAIBOOTH',
      short_name: 'WAIBOOTH',
      description: 'WAIBOOTH',
      start_url: 'https://waibooth.app',
      display: 'standalone',
      background_color: '#fff',
      theme_color: '#fff',
      icons: [
        {
          src: '/favicon.ico',
          sizes: 'any',
          type: 'image/x-icon',
        },
      ],
    }
}