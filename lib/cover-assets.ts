// Keep the image preload and the rendered cover in sync to avoid duplicate downloads.
export function coverPhoto(base: string) {
  return {
    src: `${base}cover/sheep-about-2000.webp`,
    srcset: [800, 1200, 1600, 2000].map(width => `${base}cover/sheep-about-${width}.webp ${width}w`).join(', '),
    // On phones the portrait crop is 480px tall, so its landscape source spans 720px.
    sizes: '(max-width:700px) 720px, 100vw',
  };
}
