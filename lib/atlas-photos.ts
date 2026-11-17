import type { Album, Photo } from "./types";

/** Interleave the Atlas albums; show each original photograph once. */
export function mixedAtlasPhotos(albums: Album[], photos: Photo[]): Photo[] {
  const groups = albums.filter(album => album.chapters?.includes("scenes")).map(album => album.photoIds);
  const byId = new Map(photos.map(photo => [photo.id, photo]));
  const seen = new Set<string>();
  const result: Photo[] = [];
  for (let i = 0; i < Math.max(0, ...groups.map(group => group.length)); i++) {
    for (const group of groups) {
      const id = group[i], photo = byId.get(id);
      if (photo && !seen.has(id)) { seen.add(id); result.push(photo); }
    }
  }
  return result;
}
