/// <reference types="vite/client" />

// Browser environment types used by the GitHub Pages frontend.

declare module "virtual:published-photo-renditions" {
  const renditions: import("./lib/photo-renditions").PhotoRenditions;
  export default renditions;
}

declare module "virtual:cover-slides" {
  const slides: import("./lib/cover-assets").CoverSlide[];
  export default slides;
}
