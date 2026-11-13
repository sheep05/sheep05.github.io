// Keep the image preload and the rendered cover in sync to avoid duplicate downloads.
export function coverPhoto(base: string) {
  return {
    src: `${base}cover/sheep-about-hq-2000.webp`,
    srcset: [1200, 2000, 3200, 4800].map(width => `${base}cover/sheep-about-hq-${width}.webp ${width}w`).join(', '),
    // On phones the portrait crop is 480px tall, so its landscape source spans 720px.
    sizes: '(max-width:700px) 720px, 100vw',
  };
}
