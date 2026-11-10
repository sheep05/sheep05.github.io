# Lounge PBR texture sources

Four free Poly Haven texture sets, downloaded from the official API manifests. Original 1K JPG maps total **8,988,109 bytes**; every file was checked against its official manifest MD5. No paid assets or generated texture imagery are included.

Poly Haven explicitly releases its assets under [CC0](https://polyhaven.com/license), allowing commercial reuse and redistribution. Exact download URLs, creator names, original checksums, and measured tile sizes are retained in `provenance.json`. `download.py` reproduces these originals from the saved official manifests.

| Directory | Use | Tile width × height | Material notes |
| --- | --- | --- | --- |
| `oak_veneer_02/` | Shelves, joinery, furniture | 1 × 1 m | Fine, warm horizontal grain. Rotate UVs to follow each board length; vary UV offset per board. |
| `rough_linen/` | Sofa fabric | 0.271 × 0.271 m | Photographed fine weave, blue original. For beige upholstery, retain normal and roughness with warm beige base color, or desaturate and tint in the Blender material. |
| `white_plaster_02/` | Walls | 1 × 1 m | Soft grey mineral surface, visibly mottled. Keep normal strength restrained and mix base color toward warm white for interior walls. |
| `hessian_230/` | Natural woven rug | 0.269 × 0.267 m | Coarse warm straw/brown open weave. Use shallow relief; avoid oversized weave. |

Each directory contains `color.jpg`, `normal.jpg`, and `roughness.jpg`. Color uses sRGB; normal and roughness use Non-Color data. Normals are OpenGL (+Y). These maps tile, so size UVs using the dimensions above rather than stretching one image over the entire object.

The four color maps were visually inspected: real wood grain, irregular linen fibers, plaster mottling, and hessian yarn are present. Avoid strong normal intensity: the relief should emerge in grazing light rather than read as chunky geometry. glTF can carry base color, normal, and roughness textures; arbitrary Blender tint nodes may require baking for identical browser appearance.
