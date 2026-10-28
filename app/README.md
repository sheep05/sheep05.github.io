# Gallery, Studio, and API source

This folder contains the gallery, interactive room, private Studio dashboard, and server routes. Changes here affect the interface or the way the backend handles visitors and the owner.

| Folder | Purpose |
| --- | --- |
| `components/` | Shared public gallery and 3D-room components used on both websites. |
| `studio/` | Owner sign-in entrance and the photo/album editing dashboard. |
| `api/` | Upload/edit requests, the published collection feed, and protected image delivery. |
| `auth/` | GitHub sign-in, callback, and sign-out routes. |

`globals.css` defines the site's styling; `page.tsx` and `layout.tsx` provide the Cloudflare site's page and document layout.
