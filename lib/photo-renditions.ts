import type { Photo } from './types';

export type PhotoRendition = { width: number; url: string };
export type PhotoRenditions = Record<string, PhotoRendition[]>;

export function inlinePhoto(photo: Photo, sizes: string) {
  const variants = photo.renditions;
  if (!variants?.length) return { src: photo.url };
  return {
    src: variants[0].url,
    srcSet: variants.map(({url, width}) => `${url} ${width}w`).join(', '),
    sizes,
  };
}

export function atlasPhotoSizes(row: number, column: number) {
  const arrangement = row % 3;
  const narrow = arrangement === 2 ? column === 0 : column === 1;
  const desktop = [[45, 29], [37, 29], [29, 53]][arrangement][column];
  return `(max-width: 600px) ${narrow ? 79 : 92}vw, ${desktop}vw`;
}

export function streetPhotoSizes(photo: Photo) {
  const ratio = photo.width && photo.height ? photo.width / photo.height : 1.5;
  const px = (value: number) => Math.ceil(value * ratio);
  return `clamp(${px(180)}px, min(${54 * ratio}svh, ${50 * ratio}vw), ${px(680)}px)`;
}

export function albumPhotoSizes(index: number, portrait: boolean) {
  const frame = index % 4;
  const mobile = frame === 1 || frame === 2 || (frame === 0 && portrait) ? 75 : 90;
  const desktop = [portrait ? 60 : 90, 45, 53, 75][frame];
  const max = Math.round((desktop / 90) * 1320);
  return `(max-width: 760px) ${mobile}vw, min(${desktop}vw, ${max}px)`;
}
