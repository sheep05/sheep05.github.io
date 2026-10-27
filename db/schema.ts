import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const studio = sqliteTable("studio", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  bio: text("bio").notNull(),
  email: text("email").notNull(),
  showSamples: integer("show_samples").notNull().default(1),
});
export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull().default(0),
  published: integer("published").notNull().default(0),
  coverId: text("cover_id"),
});
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  caption: text("caption").notNull().default(""),
  alt: text("alt").notNull().default(""),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  key: text("key").notNull(),
  thumbKey: text("thumb_key").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const albumPhotos = sqliteTable(
  "album_photos",
  {
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.albumId, t.photoId] })],
);
