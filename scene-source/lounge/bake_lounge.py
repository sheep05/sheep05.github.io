"""Bake original soft illumination into two portable UV atlases and export the web scene.

Run after build_lounge.py. The editable scene stays unjoined in sofa-lounge.blend.
The optimized web mesh embeds the night atlas as emissiveTexture/TEXCOORD_1;
the Three.js adapter moves it to lightMap, and blends to lightmap-off.png.
"""
from pathlib import Path
import bpy
import json
import numpy as np

SOURCE=Path(__file__).resolve().parent
ROOT=SOURCE.parents[1]
OUTPUT=ROOT/'public/scene/lounge'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'sofa-lounge.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=64
scene.cycles.use_denoising=True
scene.render.bake.margin=8
scene.render.bake.use_pass_direct=True
scene.render.bake.use_pass_indirect=True
scene.render.bake.use_pass_color=False
scene.render.bake.use_selected_to_active=False
scene.render.bake.use_clear=True

# Export one static interior mesh with material groups. Interaction surfaces and
# animated curtains remain distinct, named meshes; target empties stay untouched.
bpy.ops.object.select_all(action='DESELECT')
for obj in list(scene.objects):
    if obj.type=='CURVE':
        obj.select_set(True)
if bpy.context.selected_objects:
    bpy.context.view_layer.objects.active=bpy.context.selected_objects[0]
    bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
def separate(obj):
    return obj.name=='GalleryScreen' or (obj.name.startswith('GalleryPrint') and 'photograph' in obj.name) or obj.name.startswith(('Curtain','LampShade','ShelfGlow','SofaGlow','Japanese','Neighbour','Pitched','Roof'))
static=[obj for obj in scene.objects if obj.type=='MESH' and not separate(obj)]
for obj in static:
    if not obj.data.uv_layers:obj.data.uv_layers.new(name='UVMap')
    obj.data.uv_layers[0].name='UVMap'
    obj.select_set(True)
bpy.context.view_layer.objects.active=static[0]
bpy.ops.object.join()
mesh=bpy.context.object
mesh.name='Baked lounge interior'
# Shared graphite/oak also occur outside the atlas: isolate interior materials.
for index,material in enumerate(list(mesh.data.materials)):
    copied=material.copy();copied.name='Baked '+material.name
    mesh.data.materials[index]=copied
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
uv=mesh.data.uv_layers.new(name='LightmapUV')
mesh.data.uv_layers.active_index=1
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15192,island_margin=.002,area_weight=.8,correct_aspect=True,scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
mesh.data.uv_layers[0].active_render=True
for mat in mesh.data.materials:
    # Explicit primary UV prevents the atlas from changing photographed albedo.
    nodes=mat.node_tree.nodes
    uv0=nodes.new('ShaderNodeUVMap');uv0.uv_map='UVMap'
    for node in list(nodes):
        if node.type=='TEX_IMAGE' and not node.inputs['Vector'].is_linked:
            mat.node_tree.links.new(uv0.outputs['UV'],node.inputs['Vector'])

atlas=bpy.data.images.new('Warm room irradiance',width=4096,height=4096,alpha=False,float_buffer=True)
atlas.colorspace_settings.name='Non-Color'
for mat in mesh.data.materials:
    nodes=mat.node_tree.nodes
    node=nodes.new('ShaderNodeTexImage');node.name='Baked diffuse irradiance';node.image=atlas
    nodes.active=node
    node.select=True

scale=2.0
for mode in ['on','off']:
    if mode=='off':
        for obj in scene.objects:
            if obj.type=='LIGHT' and obj.name!='Window moon fill':obj.data.energy=0
        for name in ['Shelf warm LEDs','Sofa warm LEDs','Lamp alabaster']:
            bpy.data.materials[name].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=0
    print('BAKE_START',mode,flush=True)
    bpy.ops.object.bake(type='DIFFUSE',uv_layer='LightmapUV')
    pixels=np.empty(len(atlas.pixels),dtype=np.float32)
    atlas.pixels.foreach_get(pixels)
    pixels=pixels.reshape(-1,4)
    pixels[:,:3]/=scale
    target=bpy.data.images.new('Lightmap '+mode,width=4096,height=4096,alpha=False)
    target.colorspace_settings.name='Non-Color'
    target.pixels.foreach_set(pixels.ravel())
    target.filepath_raw=str(OUTPUT/('lightmap-'+mode+'.png'))
    target.file_format='PNG';target.save()
    if mode=='on':onmap=target
    print('BAKE_COMPLETE',mode,float(np.max(pixels[:,:3])),flush=True)

# Use the official emissive channel to transport the atlas and its UV set.
# The frontend restores emission=black and uses this as lightMap instead.
for mat in mesh.data.materials:
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    shader=nodes.get('Principled BSDF')
    node=nodes.get('Baked diffuse irradiance');node.image=onmap
    uv1=nodes.new('ShaderNodeUVMap');uv1.uv_map='LightmapUV'
    links.new(uv1.outputs['UV'],node.inputs['Vector'])
    links.new(node.outputs['Color'],shader.inputs['Emission Color'])
    shader.inputs['Emission Strength'].default_value=1
    mat['bakedIrradiance']=True
    mat['lightmapScale']=scale
# Undo emission toggles on independent practical light geometry.
for name,strength in [('Shelf warm LEDs',1.6),('Sofa warm LEDs',1.4),('Lamp alabaster',.28)]:
    bpy.data.materials[name].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=strength

# Batch the distant city by material to keep draw calls bounded.
bpy.ops.object.select_all(action='DESELECT')
exterior=[o for o in scene.objects if o.type=='MESH' and o.name.startswith(('Japanese','Neighbour','Pitched','Roof'))]
groups={mat:[o for o in exterior if o.active_material==mat] for mat in {o.active_material for o in exterior}}
for mat,group in groups.items():
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    bpy.ops.object.join();bpy.context.object.name='Exterior '+mat.name
    bpy.ops.object.select_all(action='DESELECT')

# Compress generated albedo and packed source textures during export.
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'sofa-lounge.glb'),export_format='GLB',export_cameras=True,export_extras=True,export_lights=False,export_apply=True,export_image_format='AUTO',export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
interface=json.loads((OUTPUT/'interface.json').read_text())
interface['lighting']={'on':'lightmap-on.png','off':'lightmap-off.png','uv':1,'scale':scale,'encoded':'Linear RGB PNG; emission texture transports UV1, use as lightMap','bakedMesh':'Baked lounge interior'}
(OUTPUT/'interface.json').write_text(json.dumps(interface,indent=2)+'\n')
print('BAKED_EXPORT_COMPLETE',flush=True)
