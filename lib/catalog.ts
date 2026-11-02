// Portable gallery metadata: no database, hosting SDK, or authentication dependency.
export const chapters = [
  { id: 'scenes', title: 'Scenes', subtitle: 'A personal atlas', note: 'Places that stay with me.' },
  { id: 'portraits', title: 'Portraits', subtitle: 'In the presence of others', note: 'A face. A gesture. A moment shared.' },
  { id: 'street', title: 'Street', subtitle: 'Life, passing by', note: 'Unscripted encounters along the way.' },
] as const;
export type ChapterId = typeof chapters[number]['id'];
// ISO country codes keep assignments stable if labels or hosting change.
// Coordinates are representative points, not the exact location of every photograph.
export const regions = [
  { id: 'JP', name: 'Japan', lat: 36, lon: 138, labelX: 24, labelY: -28 },
  { id: 'SG', name: 'Singapore', lat: 1.35, lon: 103.82, labelX: 24, labelY: 46 },
  { id: 'MY', name: 'Malaysia', lat: 4.2, lon: 101.98, labelX: -116, labelY: 0 },
  { id: 'CN', name: 'China', lat: 35.86, lon: 104.2, labelX: -92, labelY: -30 },
] as const;
export type CatalogAssignment = { chapters: ChapterId[]; regions: string[] };
export function normalizeAssignment(value: { chapters?: unknown; regions?: unknown }): CatalogAssignment {
  const list = (v: unknown, valid: (s: string) => boolean, label: string): string[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.length > 250 || v.some(x => typeof x !== 'string' || !valid(x)))
      throw new Error(`Choose valid ${label}.`);
    return [...new Set(v)];
  };
  return {
    chapters: list(value.chapters, id => chapters.some(c => c.id === id), 'gallery chapters') as ChapterId[],
    regions: list(value.regions, id => /^[A-Z]{2}$/.test(id), 'two-letter country codes'),
  };
}
export function readAssignment(chaptersJSON?: string, regionsJSON?: string): CatalogAssignment {
  return normalizeAssignment({ chapters: JSON.parse(chaptersJSON || '[]'), regions: JSON.parse(regionsJSON || '[]') });
}
export function inChapter(album: { chapters?: ChapterId[] }, chapter: string) {
  return album.chapters?.includes(chapter as ChapterId) ?? false;
}
export function atRegion(album: { chapters?: ChapterId[]; regions?: string[] }, region: string) {
  return inChapter(album, 'scenes') && (album.regions?.includes(region) ?? false);
}
export function globePoint(lat: number, lon: number, radius = 1) {
  const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
  return [radius * Math.cos(a) * Math.cos(b), radius * Math.sin(a), -radius * Math.cos(a) * Math.sin(b)] as const;
}
