{
  "version": 2,
  "routes": [
    { "src": "/(.*)", "dest": "/" }
  ],
  "images": {
    "sizes": [256, 640, 1024, 1920],
    "domains": ["*"],
    "remotePatterns": [
      {
        "protocol": "https",
        "hostname": "**"
      }
    ]
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION": "true"
    }
  },
  "functions": {
    "api/photos-animate": {
      "runtime": "edge",
      "maxDuration": 10,
      "memory": 3008
    }
  }
}