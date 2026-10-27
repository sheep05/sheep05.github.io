import type { Album, Photo } from "./types";
import data from "@/public/samples/samples.json";
const topics = [
  {
    id: "coastal",
    title: "Where the land ends",
    description: "Quiet horizons, sea air, and the space between.",
    cover: "coastal-02",
  },
  {
    id: "architecture",
    title: "In the shape of light",
    description: "A study of surfaces, shadows, and small geometries.",
    cover: "architecture-01",
  },
  {
    id: "nocturne",
    title: "After the city sleeps",
    description: "Rain on the pavement. A different kind of daylight.",
    cover: "nocturne-01",
  },
];
export const sampleCollection: { albums: Album[]; photos: Photo[] } = {
  albums: topics.map((t, i) => ({
    id: `sample-${t.id}`,
    title: t.title,
    description: t.description,
    position: i,
    published: true,
    coverId: t.cover,
    photoIds: data.filter((p) => p.album === t.id).map((p) => p.id),
    sample: true,
  })),
  photos: data.map((p) => ({
    id: p.id,
    title: p.title,
    caption: "",
    alt: p.title,
    width: p.width,
    height: p.height,
    url: p.file,
    thumb: p.file,
    albumIds: [`sample-${p.album}`],
    credit: p.photographer,
    source: p.source,
  })),
};
