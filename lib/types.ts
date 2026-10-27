export type Photo = {
  id: string;
  title: string;
  caption: string;
  alt: string;
  width: number;
  height: number;
  url: string;
  thumb: string;
  albumIds: string[];
  credit?: string;
  source?: string;
};
export type Album = {
  id: string;
  title: string;
  description: string;
  position: number;
  published: boolean;
  coverId: string | null;
  photoIds: string[];
  sample?: boolean;
};
export type Settings = {
  name: string;
  tagline: string;
  bio: string;
  email: string;
  showSamples: boolean;
};
export type Collection = {
  settings: Settings;
  albums: Album[];
  photos: Photo[];
  isOwner: boolean;
  signedIn: boolean;
};
export const defaults: Settings = {
  name: "Quiet Studio",
  tagline: "A space for seeing slowly.",
  bio: "A collection of places, passing light, and things worth looking at twice.",
  email: "",
  showSamples: true,
};
