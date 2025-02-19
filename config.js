const config = {
  staging: {
    baseUrl: "https://choctawcstg.wpengine.com",
    urls: [
      "/",           // Home page
      "/durant",
      "/pocola",
      "/hochatown",
      "/grant",
      "/mcalester",
      "/broken-bow",
      "/idabel",
      "/stringtown",
      "/events",
      "/promotions",
      "/newsroom"
    ]
  },
  prod: {
    baseUrl: "https://www.choctawcasinos.com",
    urls: [
      "/",           // Home page
      "/durant",
      "/pocola",
      "/hochatown",
      "/grant",
      "/mcalester",
      "/broken-bow",
      "/idabel",
      "/stringtown",
      "/events",
      "/promotions",
      "/newsroom"
    ]
  }
};

export default config;