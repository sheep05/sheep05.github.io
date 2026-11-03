import bpy,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
(ROOT / "work").mkdir(exist_ok=True)
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Equirectangular UVs match Three.js SphereGeometry and the atlas marker convention.
verts=[];uvs=[];faces=[];cols=192;rows=128
for row in range(rows+1):
    theta=math.pi*row/rows
    for col in range(cols+1):
        phi=2*math.pi*col/cols
        verts.append((-math.cos(phi)*math.sin(theta),-math.sin(phi)*math.sin(theta),math.cos(theta)))
        uvs.append((col/cols,1-row/rows))
for row in range(rows):
    for col in range(cols):
        a=row*(cols+1)+col;b=a+1;c=a+cols+2;d=a+cols+1
        faces.append((a,d,c,b))
mesh=bpy.data.meshes.new('Earth');mesh.from_pydata(verts,[],faces);mesh.update()
uv=mesh.uv_layers.new(name='Equirectangular')
for face in mesh.polygons:
    face.use_smooth=True
    for i in face.loop_indices:uv.data[i].uv=uvs[mesh.loops[i].vertex_index]
earth=bpy.data.objects.new('Earth',mesh);bpy.context.collection.objects.link(earth)
mat=bpy.data.materials.new('Earth surface');mat.use_nodes=True;n=mat.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.9;p.inputs['Specular IOR Level'].default_value=.15
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT / "public/atlas/earth-day-8k.jpg"));mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.035;earth.data.materials.append(mat)
lat=math.radians(20);lon=math.radians(116);direction=Vector((math.cos(lat)*math.cos(lon),math.cos(lat)*math.sin(lon),math.sin(lat)))
camdata=bpy.data.cameras.new('Earth portrait');cam=bpy.data.objects.new('Earth portrait',camdata);bpy.context.collection.objects.link(cam);cam.location=direction*5;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.14;bpy.context.scene.camera=cam
right=cam.rotation_euler.to_matrix()@Vector((1,0,0));up=Vector((0,0,1))
data=bpy.data.lights.new('Sunlight','AREA');data.energy=330;data.shape='DISK';data.size=2
sun=bpy.data.objects.new('Sunlight',data);bpy.context.collection.objects.link(sun);sun.location=direction*3-right*2+up*2;sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.09,.14,.22,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=scene.render.resolution_y=1400;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath=str(ROOT / "work/earth-card.png");bpy.ops.render.render(write_still=True)
