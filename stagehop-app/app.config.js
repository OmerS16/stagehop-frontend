module.exports = ({ config }) => {
    // Read the secret injected by EAS
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!mapsKey) {
      throw new Error(
        "Missing GOOGLE_MAPS_API_KEY. Did you run `eas env:create --environment production --name GOOGLE_MAPS_API_KEY --value <your-key> --visibility secret --scope project`?"
      );
    }
  
    return {
      // merge base config
      ...config,
  
      // core properties
      name: "stagehop",
      slug: "stagehop",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "stagehop",
      userInterfaceStyle: "automatic",
      // Disable new architecture for react-native-maps compatibility
      newArchEnabled: false,
  
      ios: {
        supportsTablet: true,
        ...config.ios,
      },
  
      android: {
        ...config.android,
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.omers16.stagehop",
        config: {
          googleMaps: {
            apiKey: mapsKey,
          },
        },
      },
  
      web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png",
      },
  
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          {
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          },
        ],
      ],
  
      experiments: {
        typedRoutes: true,
      },
  
      extra: {
        router: {
          origin: false,
        },
        eas: {
          projectId: "6abbfc0b-da4d-4eed-b8b9-2b1589d7a88c",
        },
      },
  
      owner: "omers16",
    };
  };
  