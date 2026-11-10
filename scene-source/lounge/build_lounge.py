"""Build the original sofa lounge, its editable Blender source and web model.

Run with Blender 4.5 LTS:
  blender --background --python scene-source/lounge/build_lounge.py
Texture inputs are documented in textures/cc0/provenance.json and are CC0.
"""
from pathlib import Path
import bpy
import math
import random
import json
import argparse
import shutil
import numpy as np
import sys
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
OUTPUT = ROOT / 'public/scene/lounge'
TEXTURES = SOURCE / 'textures/cc0'
OUTPUT.mkdir(parents=True, exist_ok=True)
random.seed(1427)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)


def material(name, color, roughness=0.65, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    return mat


def emission(name, color, strength=1):
    mat = material(name, color)
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = strength
    return mat


def textured(name, asset, color, roughness=0.8, tint=False):
    mat = material(name, color, roughness)
    shader = mat.node_tree.nodes.get('Principled BSDF')
    files = list(TEXTURES.rglob('*'))
    for kind, target in [('diff', 'Base Color'), ('rough', 'Roughness'), ('nor_gl', 'Normal')]:
        file_name = {'diff':'color', 'rough':'roughness', 'nor_gl':'normal'}[kind]
        candidates = [p for p in files if p.is_file() and asset in str(p) and p.stem == file_name and p.suffix.lower() in ['.jpg', '.png']]
        if not candidates:
            continue
        image = bpy.data.images.load(str(candidates[0]), check_existing=True)
        texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        texture.label = kind
        if kind != 'diff':
            image.colorspace_settings.name = 'Non-Color'
        if kind == 'nor_gl':
            normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = 1.35 if asset == 'rough_linen' else (.23 if asset == 'white_plaster_02' else .7)
            mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
            mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs[target])
        elif kind == 'diff' and tint:
            # A real photographed weave/plaster albedo, neutralized and tinted.
            pixels=np.empty(len(image.pixels),dtype=np.float32)
            image.pixels.foreach_get(pixels)
            pixels=pixels.reshape(-1,4)
            gray=np.dot(pixels[:,:3], [0.2126,0.7152,0.0722])
            gray=np.clip(gray/max(float(np.mean(gray)),.02),.3,1.8)
            gray=1+(gray-1)*(.15 if asset=='white_plaster_02' else .4)
            recolor=bpy.data.images.new(name+' albedo', width=image.size[0],height=image.size[1])
            pixels[:,:3]=np.clip(gray[:,None]*np.array(color)[None,:],0,1)
            recolor.pixels.foreach_set(pixels.ravel())
            recolor.scale(512,512)
            generated=SOURCE/'textures';generated.mkdir(exist_ok=True)
            recolor.filepath_raw=str(generated/(name.lower().replace(' ','-')+'.jpg'))
            recolor.file_format='JPEG';recolor.save()
            stored_path=recolor.filepath_raw
            bpy.data.images.remove(recolor)
            texture.image=bpy.data.images.load(stored_path,check_existing=True)
            mat.node_tree.links.new(texture.outputs['Color'],shader.inputs[target])
        else:
            mat.node_tree.links.new(texture.outputs['Color'], shader.inputs[target])
    return mat


OAK = textured('Warm natural oak', 'oak_veneer_02', (.34,.22,.115), .52)
PLASTER = textured('Warm mineral plaster', 'white_plaster_02', (.64,.58,.48), .94, True)
LINEN = textured('Woven flax upholstery', 'rough_linen', (.58,.52,.43), .98, True)
PILLOW = textured('Linen cushions', 'rough_linen', (.70,.65,.55), .94, True)
OLIVE = textured('Olive linen', 'rough_linen', (.19,.21,.105), .96, True)
TOBACCO = textured('Tobacco linen', 'rough_linen', (.28,.18,.10), .95, True)
RUG = textured('Wool woven rug', 'hessian_230', (.33,.27,.18), .98, True)
DARK_OAK = textured('Coffee table oak', 'oak_veneer_02', (.17,.105,.05), .5)
BLACK = material('Graphite metal', (.025,.029,.032), .35, .68)
SCREEN = material('Laptop display', (.003,.006,.009), .22)
PAPER = material('Book pages', (.72,.67,.53), .85)
CREAM = material('Warm ceramic', (.53,.45,.33), .26)
BRASS = material('Dark brass', (.35,.24,.09), .34, .8)
LEAF = material('Deep green foliage', (.035,.10,.023), .56)
LEAF_LIGHT = material('Young foliage', (.075,.17,.04), .58)
SOIL = material('Potting earth', (.025,.018,.009), 1)
SHELF_GLOW = emission('Shelf warm LEDs', (1,.51,.19), 1.6)
SOFA_GLOW = emission('Sofa warm LEDs', (1,.48,.14), 1.4)
LAMP_GLOW = emission('Lamp alabaster', (1,.64,.3), .28)


def cube(name, center, size, mat, bevel=0, smooth=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3 if bevel >= .02 else 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal = obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=normal.name)
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    # UV scale maintains visible real material detail on large and small pieces.
    for polygon in obj.data.polygons:
        axis = max(range(3), key=lambda a: abs(polygon.normal[a]))
        coordinates = [a for a in range(3) if a != axis]
        scale = 1.8 if 'linen' in mat.name.lower() or mat == LINEN else 1
        for loop_index in polygon.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            obj.data.uv_layers.active.data[loop_index].uv = (vertex[coordinates[0]] * scale, vertex[coordinates[1]] * scale)
    return obj


def cylinder(name, center, radius, depth, mat, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = abs(polygon.normal.z) < .8
    bevel = obj.modifiers.new('Rounded rim', 'BEVEL')
    bevel.width = .007
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new('POLY')
    spline.points.add(len(points)-1)
    for point, position in zip(spline.points, points):
        point.co = (*position, 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def anchor(name, position):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    obj.empty_display_size = .08
    return obj


def light(name, position, power, color, size=1, target=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.color = color
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    if target:
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


# Fully closed shell. Right wall contains an actual window opening.
cube('Floor slab', (0,-.6,-.10), (6.7,7.4,.18), OAK)
for row in range(27):
    for col in range(4):
        x = -3.25 + row * .25
        y = -4 + col * 1.8 + ((row%2)*.4)
        cube('Oak floor plank', (x,y,.006), (.245,1.79,.018), OAK, .003)
cube('Back plaster wall',(0,2.55,1.75),(6.8,.15,3.5),PLASTER)
cube('Left plaster wall',(-3.35,-.6,1.75),(.15,6.3,3.5),PLASTER)
cube('Front plaster wall',(0,-5.1,1.75),(6.8,.16,3.5),PLASTER)
cube('Ceiling',(0,-.6,3.52),(6.8,8.2,.12),PLASTER)
cube('Right wall below window',(3.35,-.6,.31),(.15,8.2,.62),PLASTER)
cube('Right wall above window',(3.35,-.6,3.25),(.15,8.2,.55),PLASTER)
cube('Right wall forward',(3.35,-3.1,1.75),(.15,3.4,3.5),PLASTER)
cube('Right wall rear',(3.35,2.5,1.75),(.15,.25,3.5),PLASTER)
for x in [-3.26,3.26]:
    cube('Oak skirting',(x,-.6,.065),(.035,7.4,.13),OAK,.004)

# Under-stair library: shelving recedes in width toward the diagonal flight.
mesh=bpy.data.meshes.new('Triangular library oak panel')
mesh.from_pydata([(-3.01,2.42,.65),(2.33,2.42,.65),(-1.44,2.42,3.49),(-3.01,2.42,3.49)],[],[(0,1,2,3)])
mesh.materials.append(OAK)
o=bpy.data.objects.new('Library oak back',mesh);bpy.context.collection.objects.link(o)
uv=mesh.uv_layers.new(name='UVMap')
for li in mesh.polygons[0].loop_indices:
    v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v.x*.65,v.z*.65)
book_palette=[material('Book cloth '+str(i),c,.86) for i,c in enumerate([(.07,.08,.04),(.16,.09,.04),(.43,.37,.24),(.075,.15,.12),(.3,.12,.06),(.35,.32,.23)])]
for level,z in enumerate([.87,1.37,1.88,2.39,2.90,3.38]):
    right = min(1.72, 3.08 - z * 1.34)
    left = -2.92
    width = right-left
    cube('Oak shelf %02d'%level,((left+right)/2,2.11,z),(width,.65,.055),OAK,.008)
    cube('ShelfGlow %02d'%level,((left+right)/2,1.83,z-.033),(width-.12,.015,.012),SHELF_GLOW,.003)
    light('Shelf bounce %02d'%level,((left+right)/2,1.89,z-.08),5,(1,.56,.26),width*.45,((left+right)/2,2.4,z-.32))
    if level < 5:
        x = left+.07
        for group in range(max(1,int(width/1.05))):
            for book in range(random.randint(6,10)):
                thickness=random.uniform(.025,.055)
                height=random.uniform(.23,.39)
                colors=[(.15,.15,.11),(.29,.20,.12),(.51,.45,.31),(.19,.24,.22),(.42,.29,.16),(.48,.45,.34)]
                cover=random.choice(book_palette)
                obj=cube('Book', (x+thickness/2,2.10,z+.03+height/2),(thickness,.23,height),cover,.003)
                if book==0:
                    obj.rotation_euler.y=random.uniform(-.12,.12)
                cube('Book spine title',(x+thickness/2,1.982,z+.11),(thickness*.6,.002,.009),PAPER)
                cube('Book spine rule',(x+thickness/2,1.98,z+.06),(thickness*.75,.002,.003),BRASS)
                x+=thickness+.006
            x+=random.uniform(.14,.27)
            if x>right-.35:break

# Thick stairs with oak handrail; planted landing behind the diagonal line.
for step in range(13):
    x=2.73-step*.325
    z=.12+step*.255
    cube('Stone stair tread %02d'%step,(x,1.70,z),(.34,1.05,.23),PLASTER,.012)
# Continuous stringer closes the underside of the stepped flight.
a=Vector((2.84,1.68,.07));b=Vector((-1.38,1.68,3.38))
beam=cube('Diagonal stair structural edge',(a+b)/2,((b-a).length,1.08,.20),PLASTER,.015)
beam.rotation_euler.y=-math.atan2((b-a).z,(b-a).x)
curve('Oak stair handrail',[(2.87,1.08,.3),(-1.42,1.08,3.54)],.026,OAK)

# Sofa base, padded linen back and three seat cushions.
cube('Sofa oak plinth',(-.42,.84,.18),(4.83,1.22,.22),OAK,.025)
cube('SofaGlow',(-.42,.22,.24),(4.62,.018,.015),SOFA_GLOW,.002)
light('Sofa bounce',(-.4,.12,.22),13,(1,.52,.23),3.7,(-.4,-.4,.01))
cube('Sofa upholstered foundation',(-.42,.85,.34),(4.86,1.21,.22),LINEN,.065)
cube('Sofa back',(-.42,1.38,.86),(4.86,.31,.92),LINEN,.09)
for i in range(3):
    cube('Sofa seat %d'%i,(-2.03+i*1.59,.77,.53),(1.56,1.04,.25),LINEN,.105,True)
# Narrow sewn welts are real geometry, visible in close camera inspection.
for i in range(3):
    x=-2.03+i*1.59
    curve('Sofa cushion piping',[(x-.70,.25,.54),(x+.70,.25,.54),(x+.74,.30,.54),(x+.74,1.20,.54),(x+.70,1.25,.54),(x-.70,1.25,.54),(x-.74,1.20,.54),(x-.74,.30,.54),(x-.70,.25,.54)],.0035,PILLOW)
# Left chaise projects toward the viewer.
cube('Chaise plinth',(-2.54,-.02,.18),(1.12,2.25,.22),OAK,.025)
cube('Chaise base',(-2.54,-.02,.34),(1.17,2.25,.22),LINEN,.07)
cube('Chaise seat',(-2.54,-.02,.53),(1.14,2.21,.25),LINEN,.10,True)
cube('Left padded arm',(-3.06,.08,.73),(.22,2.40,.72),LINEN,.07)
cube('Right padded arm',(2.10,.85,.65),(.22,1.2,.53),LINEN,.07)


def cushion(name, center, size, mat, rotation=(0,0,0)):
    """Rounded subdivided pillow with shallow original fabric crumples and piping."""
    obj=cube(name,center,size,mat, min(size)*.35,True)
    subdiv=obj.modifiers.new('Soft cushion mesh','SUBSURF')
    subdiv.levels=2
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=subdiv.name)
    for vertex in obj.data.vertices:
        x,y,z=vertex.co
        envelope=max(0,1-(abs(x)/(size[0]/2))**4)*max(0,1-(abs(z)/(size[2]/2))**4)
        vertex.co.y += math.sin(x*42+z*13)*.009*envelope + math.sin(z*63-x*9)*.003
    obj.rotation_euler=rotation
    return obj

for name,center,size,mat,rotation in [
 ('Olive throw pillow',(-2.21,.95,1.00),(.65,.26,.63),OLIVE,(math.radians(-13),.14,-.12)),
 ('Natural throw pillow',(-1.62,1.03,.99),(.65,.23,.62),PILLOW,(-.15,-.12,.02)),
 ('Tobacco throw pillow',(1.26,1.04,.99),(.65,.27,.65),TOBACCO,(-.18,.08,-.12)),
 ('Right linen pillow',(1.78,1.08,1.03),(.65,.24,.72),PILLOW,(-.22,-.17,.04))]:
    cushion(name,center,size,mat,rotation)

# Irregular draped throw across the chaise.
verts=[];faces=[];nx=24;ny=32
for j in range(ny+1):
    for i in range(nx+1):
        x=-2.98+i/nx*.85
        y=-.85+j/ny*1.35
        z=.68+.035*math.sin(i*.7+j*.35)+.018*math.sin(j*.8)
        if y<-.60:z-=(.60+y)*-1.35
        verts.append((x,y,z))
for j in range(ny):
    for i in range(nx):
        k=j*(nx+1)+i;faces.append((k,k+1,k+nx+2,k+nx+1))
mesh=bpy.data.meshes.new('Draped throw');mesh.from_pydata(verts,[],faces);mesh.update()
throw=bpy.data.objects.new('Draped linen throw',mesh);bpy.context.collection.objects.link(throw);mesh.materials.append(PILLOW)
solid=throw.modifiers.new('Woven cloth thickness','SOLIDIFY');solid.thickness=.008
for p in mesh.polygons:p.use_smooth=True
uv=mesh.uv_layers.new(name='UVMap')
for p in mesh.polygons:
    for li in p.loop_indices:
        v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v.x*4,v.y*4)

# Large rug with a dense woven edge and subtle irregular fringe.
cube('Woven rug',(-.45,-1.05,.03),(4.6,2.55,.025),RUG,.012)
for i in range(130):
    x=-2.7+i*.035
    curve('Rug fringe',[(x,-2.33,.045),(x+random.uniform(-.008,.008),-2.39-random.random()*.035,.035)],.0015,PILLOW)

# Low round table deliberately sits to the left of the laptop sightline.
cylinder('Coffee table top',(-1.82,-1.18,.39),.76,.065,DARK_OAK,64)
for x,y in [(-2.2,-1.40),(-1.46,-1.43),(-1.83,-.77)]:
    cylinder('Coffee table leg',(x,y,.19),.035,.35,BLACK,16)
for i in range(3):
    cube('Photography book',(-1.54,-1.22,.44+i*.035),(.43,.29,.033),[PAPER,OLIVE,PAPER][i],.005)
anchor('CameraPropAnchor',(-2.02,-1.26,.44))

# Laptop on an oak tray; screen plane has a stable local XY basis.
cube('Laptop lap tray',(.02,.57,.684),(.83,.54,.025),OAK,.02)
cube('Laptop base',(.02,.55,.714),(.70,.44,.023),BLACK,.012)
cube('Laptop trackpad',(.02,.409,.727),(.20,.105,.0018),material('Trackpad',(.065,.07,.076),.5),.01)
keymat=material('Laptop keys',(.011,.014,.018),.7)
for row in range(5):
    for col in range(14):
        width=.039
        cube('Keyboard key',(-.282+col*.043,.51+row*.038,.729),(width,.032,.004),keymat,.003)
cube('Keyboard spacebar',(.02,.47,.729),(.27,.032,.004),keymat,.003)
# Hinge runs along X. Local display +Y means screen-up, local +Z faces viewer.
screen_width=.64;screen_height=.40
screen_angle=math.radians(78)
hinge=Vector((.02,.752,.73))
up=Vector((0,math.cos(screen_angle),math.sin(screen_angle)))
normal=Vector((0,-math.sin(screen_angle),math.cos(screen_angle)))
center=hinge+up*(screen_height/2+.025)
frame=cube('Laptop screen frame',center,(.69,.018,.45),BLACK,.012)
frame.rotation_euler.x=-math.radians(12)
# A plane in XY rotated 78deg has front normal -Y, +Z.
bpy.ops.mesh.primitive_plane_add(size=1, location=center+normal*.012)
screen=bpy.context.object;screen.name='GalleryScreen';screen.scale=(screen_width,screen_height,1)
screen.rotation_euler.x=screen_angle
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
screen.data.materials.append(SCREEN)
screen['screenWidth']=screen_width;screen['screenHeight']=screen_height
anchor('ScreenCenter',screen.location)
anchor('ScreenTopLeft',screen.location + up * screen_height / 2 + Vector((-screen_width / 2, 0, 0)))
anchor('ScreenTopRight',screen.location + up * screen_height / 2 + Vector((screen_width / 2, 0, 0)))
anchor('ScreenBottomLeft',screen.location - up * screen_height / 2 + Vector((-screen_width / 2, 0, 0)))

# A readable 16-inch display remains generous in the wide room composition.
origin=Vector((.02,.55,.69))
for o in list(bpy.context.scene.objects):
    if o.name.startswith(('Laptop','Keyboard','GalleryScreen','Screen')):
        o.location=origin+(o.location-origin)*1.15
        if o.type=='MESH':o.scale*=1.15
screen_width*=1.15;screen_height*=1.15
screen['screenWidth']=screen_width;screen['screenHeight']=screen_height

# Side lamp: warm translucent mushroom shade, with a tactile oak pedestal.
cylinder('Side table',(-2.98,1.58,.66),.26,.06,OAK)
cylinder('Lamp oak base',(-2.98,1.58,.85),.10,.31,OAK)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.25,location=(-2.98,1.58,1.10))
shade=bpy.context.object;shade.name='LampShade';shade.scale.z=.7
shade.data.materials.append(LAMP_GLOW)
for p in shade.data.polygons:p.use_smooth=True
anchor('LampTarget',(-2.98,1.58,1.10))
light('Lamp soft light',(-2.98,1.4,1.10),14,(1,.62,.31),.45,(-2.2,.5,1))

# Closed side window with textured linen curtains and depth outside.
for y in [-1.4,.45,2.35]:
    cube('Window oak mullion',(3.22,y,1.80),(.12,.065,2.38),OAK,.01)
for z in [.61,2.98]:cube('Window oak lintel',(3.22,.475,z),(.14,3.85,.08),OAK,.01)
cube('Window sill',(3.16,.475,.59),(.34,3.98,.075),OAK,.012)
anchor('WindowTarget',(3.2,.475,1.8))
CURTAIN=textured('Sheer linen curtain','rough_linen',(.65,.61,.51),.98,True)
CURTAIN.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.52
CURTAIN.surface_render_method='DITHERED'
for name,y0,y1 in [('CurtainLeft',-1.38,-.83),('CurtainRight',1.9,2.36)]:
    vs=[];fs=[];nu=20;nv=32
    for j in range(nv+1):
        z=.38+j/nv*2.65
        for i in range(nu+1):
            y=y0+(y1-y0)*i/nu
            x=3.06+.065*math.sin(i/nu*math.pi*10)+.045*math.sin(z*2)*(1-j/nv)
            vs.append((x,y,z))
    for j in range(nv):
        for i in range(nu):
            k=j*(nu+1)+i;fs.append((k,k+1,k+nu+2,k+nu+1))
    m=bpy.data.meshes.new(name);m.from_pydata(vs,[],fs);m.update();m.materials.append(CURTAIN)
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o)
    for p in m.polygons:p.use_smooth=True
    uv=m.uv_layers.new(name='UVMap')
    for p in m.polygons:
        for li in p.loop_indices:
            v=m.vertices[m.loops[li].vertex_index].co;uv.data[li].uv=(v.y*5,v.z*5)

# Exterior: three layers of actual houses, with tiled pitched roofs.
NIGHT=emission('Night stucco',(.065,.085,.12),.08)
ROOF=emission('Charcoal roof tiles',(.035,.055,.09),.1)
WINDOW_GLOW=emission('Neighbour window glow',(1,.54,.20),.8)
WINDOW_DARK=material('Unlit windows',(.01,.02,.035),.35)
for row in range(3):
    for col in range(5):
        x=5.8+row*2.5;y=-5+col*2.3;h=random.uniform(1.4,2.5)+row*.45
        cube('Japanese neighbourhood home',(x,y,h/2-.4),(1.7,1.9,h),NIGHT,.015)
        for sign in [-1,1]:
            roof=cube('Pitched tiled roof',(x+sign*.48,y,h-.25),(.98,2.12,.055),ROOF,.005)
            roof.rotation_euler.y=sign*math.radians(26)
            for tile in range(14):
                strip=cube('Roof tile seam',(x+sign*.48,y-1+tile*.15,h-.22),(.99,.018,.025),ROOF)
                strip.rotation_euler.y=sign*math.radians(26)
        for floor in range(int(h/1.1)):
            for column in [-.5,.5]:
                cube('Neighbour glowing window',(x-.856,y+column,.45+floor*.9),(.012,.46,.47),WINDOW_GLOW if random.random()>.42 else WINDOW_DARK)
                for bar in [-.15,0,.15]:cube('Neighbour window lattice',(x-.867,y+column+bar,.45+floor*.9),(.02,.014,.49),BLACK)


def plant(name,center,height=.6,leaf_count=20):
    x,y,z=center
    cylinder(name+' planter',(x,y,z+.09),.11,.18,CREAM)
    cylinder(name+' earth',(x,y,z+.183),.10,.006,SOIL)
    for i in range(leaf_count):
        angle=random.random()*math.tau
        extension=random.uniform(.12,.38)*height
        top=z+.18+random.uniform(.3,1)*height
        endpoint=(x+math.cos(angle)*extension,y+math.sin(angle)*extension,top)
        curve(name+' stem',[(x,y,z+.18),endpoint],.0035,LEAF)
        direction=Vector((math.cos(angle),math.sin(angle),.3))
        length=random.uniform(.12,.27)*height
        width=length*.36
        base=Vector(endpoint)
        tangent=Vector((-math.sin(angle),math.cos(angle),0))
        verts=[];faces=[]
        for j in range(9):
            t=j/8
            mid=base+direction*length*t+Vector((0,0,math.sin(t*math.pi)*length*.18-t*t*length*.24))
            w=math.sin(t*math.pi)**.75*width
            for side in [-1,0,1]:verts.append(mid+tangent*w*side+Vector((0,0,-abs(side)*w*.2)))
        for j in range(8):
            for k in range(2):
                a=j*3+k;faces.append((a,a+1,a+4,a+3))
        mesh=bpy.data.meshes.new(name+' leaf');mesh.from_pydata(verts,[],faces);mesh.materials.append(LEAF_LIGHT if i%3==0 else LEAF)
        obj=bpy.data.objects.new(name+' leaf',mesh);bpy.context.collection.objects.link(obj)
        for p in mesh.polygons:p.use_smooth=True

plant('Landing palm',(1.85,2.13,1.02),1.45,75)
plant('Upper stair foliage',(-.55,2.12,2.65),.65,48)
plant('Shelf pothos',(-2.59,2.0,2.93),.5,32)
plant('Side fern',(-3.02,1.99,.71),.55,38)

# Rounded ceramic vessels add silhouettes without excessive clutter.
for x,z in [(-.35,1.40),(-1.0,1.92),(-.9,2.43),(.72,.92)]:
    cylinder('Ceramic vase foot',(x,2.10,z+.04),.06,.04,CREAM)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.12,location=(x,2.10,z+.14))
    obj=bpy.context.object;obj.name='Ceramic vase';obj.scale=(.8,.8,1.15);obj.data.materials.append(CREAM)
    for p in obj.data.polygons:p.use_smooth=True
    cylinder('Ceramic vase neck',(x,2.10,z+.26),.045,.10,CREAM)

# Existing public photographs are used as original artwork references.
collection=json.loads((ROOT/'public/published/collection.json').read_text())['collection']
photo_paths=[ROOT/'public'/p['thumb'].lstrip('/') for p in collection['photos'] if p['thumb'].startswith('/')]

def framed_photo(name,center,width,height,index,side=False):
    x,y,z=center
    frame=cube(name+' frame',center,(width,.045,height),OAK,.006)
    matte=cube(name+' mat',(x,y-.026,z),(width-.04,.006,height-.04),PAPER)
    mat=material(name+' photograph',(1,1,1),.9)
    shader=mat.node_tree.nodes.get('Principled BSDF')
    image=bpy.data.images.load(str(photo_paths[index%len(photo_paths)]),check_existing=True)
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
    mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=1,location=(x,y-.031,z))
    plane=bpy.context.object;plane.name=name+' photograph';plane.scale=(width-.12,height-.12,1);plane.rotation_euler.x=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    plane.data.materials.append(mat)
    if side:
        for obj in [frame,matte,plane]:
            obj.rotation_euler.z=-math.pi/2
            obj.location.x=x-(obj.location.y-y)
            obj.location.y=y

framed_photo('GalleryPrint01',(-1.48,1.83,1.60),.45,.33,1)
framed_photo('GalleryPrint02',(-.25,1.83,1.14),.42,.30,3)
framed_photo('GalleryPrint03',(-2.18,1.83,2.65),.34,.30,6)
framed_photo('GalleryPrint04',(-3.24,.08,1.94),.77,.94,8,True)

# Camera and authored lighting. Light placement is retained in the .blend.
scene=bpy.context.scene
world=bpy.data.worlds.new('Blue hour environment');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.15,.24,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.20
scene.world=world
light('Window moon fill',(3.0,.15,2),25,(.40,.55,1),2.2,(0,.5,1))
light('Room warm bounce',(0,-1.9,2.9),65,(1,.72,.46),4,(0,.9,1))
light('Soft ceiling practical',(-.2,.1,3.35),12,(1,.67,.35),1.8,(0,.5,.4))
bpy.ops.object.camera_add(location=(.0,-4.65,1.64))
camera=bpy.context.object;camera.name='OverviewCamera';camera.data.lens=28
look=Vector((-.05,.95,1.31));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera=camera
anchor('OverviewTarget',look)

# Export all original geometry with glTF metallic/roughness materials.
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.15
scene.render.image_settings.file_format='JPEG'
scene.render.image_settings.quality=90
# Packed images make the .blend portable and editable.
for image in bpy.data.images:
    if image.source=='FILE':image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'sofa-lounge.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'sofa-lounge.glb'),export_format='GLB',export_cameras=True,export_extras=True,export_lights=False,export_apply=True,export_image_format='AUTO',export_yup=True)
interface={
 'screenWidth':screen_width,'screenHeight':screen_height,
 'overviewPosition':[0,1.64,4.65],'overviewTarget':[-.05,1.31,-.95],
 'cameraPropPosition':[-2.02,.44,1.26],
 'lampPosition':[-2.98,1.1,-1.58],
 'screenCenter':[screen.location.x,screen.location.z,-screen.location.y],
 'screenNormal':[normal.x,normal.z,-normal.y],
 'screenUp':[up.x,up.z,-up.y],
 'source':'Original geometry and CC0 texture maps. No paid source scene.',
}
(OUTPUT/'interface.json').write_text(json.dumps(interface,indent=2)+'\n')
scene.render.filepath=str(SOURCE/'preview.jpg')
bpy.ops.render.render(write_still=True)
shutil.copy2(SOURCE/'preview.jpg',OUTPUT/'preview.jpg')
print('LOUNGE_BUILD_COMPLETE',json.dumps(interface))
