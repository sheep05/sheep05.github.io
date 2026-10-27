import bpy, math, os, random, json
import numpy as np
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(os.path.dirname(ROOT),'public','scene')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for block in bpy.data.materials: bpy.data.materials.remove(block)
random.seed(43)
def mat(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
plaster=mat('Muted taupe plaster',(.34,.29,.235)); floor=mat('Warm limestone',(.30,.255,.20)); oak=mat('Smoked oak',(.24,.15,.085),.46); edge=mat('Oak edges',(.33,.22,.12),.5)
# Subtle authored wood grain stored as a standard image texture for glTF.
yy,xx=np.mgrid[0:512,0:256];rng=np.random.default_rng(10)
wave=xx*.38+np.sin(yy*.016)*1.5+np.sin(yy*.004+xx*.026)*4
v=.96+.035*np.sin(wave)+.018*np.sin(wave*3.7)+rng.normal(0,.009,(512,256))
pixels=np.ones((512,256,4),dtype=np.float32)
for i,c in enumerate((.48,.34,.21)):pixels[:,:,i]=v*c
woodimg=bpy.data.images.new('Walnut fine grain',width=256,height=512);woodimg.pixels.foreach_set(pixels.ravel());woodimg.filepath_raw=os.path.join(ROOT,'walnut-grain.png');woodimg.file_format='PNG';woodimg.save()
node=oak.node_tree.nodes.new('ShaderNodeTexImage');node.image=woodimg;oak.node_tree.links.new(node.outputs['Color'],oak.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
black=mat('Soft charcoal',(.025,.029,.028),.55); silver=mat('Anodized aluminium',(.29,.31,.30),.27,.7); paper=mat('Warm paper',(.85,.82,.73)); ivory=mat('Ivory linen',(.65,.63,.54)); olive=mat('Olive canvas',(.20,.24,.17)); clay=mat('Unglazed ceramic',(.39,.28,.21)); brass=mat('Aged brass',(.37,.26,.12),.3,.65); green=mat('Olive leaves',(.17,.23,.13)); glass=mat('Lens',(.018,.044,.045),.1,.5)
def box(name,loc,dim,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object;o.name=name;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if material:o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,material,rotation=None,verts=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material)
 if rotation:o.rotation_euler=rotation
 for p in o.data.polygons:p.use_smooth=True
 return o
def photo_mat(name,file,emission=0):
 m=mat(name,(1,1,1),.7);p=m.node_tree.nodes.get('Principled BSDF');t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(os.path.join(ROOT,file),check_existing=True);m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 if emission:m.node_tree.links.new(t.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=emission
 return m
def photo_plane(name,loc,w,h,material):
 bpy.ops.mesh.primitive_plane_add(size=1,location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.scale=(w,h,1);o.data.materials.append(material);return o
mountain=photo_mat('Mountain photograph — demonstration','mountain.jpg',.18)
lake=photo_mat('Lake photograph — demonstration','lake.jpg')
# Fully enclosed bedroom studio; cameras remain inside the architecture.
box('Room plinth',(0,-.25,-.12),(8.1,7.6,.24),floor,.025)
box('Rear plaster wall',(0,3.5,1.85),(8.1,.16,3.7),plaster,.015)
box('Front plaster wall',(0,-4,1.85),(8.1,.16,3.7),plaster)
box('Right plaster wall',(4,-.25,1.85),(.16,7.6,3.7),plaster)
box('Plaster ceiling',(0,-.25,3.72),(8.1,7.6,.16),plaster)
box('Right skirting',(3.90,-.25,.055),(.05,7.3,.11),ivory,.007)
box('Front skirting',(0,-3.90,.055),(7.85,.05,.11),ivory,.007)
# Distant Tokyo panorama behind actual exterior geometry; every camera path ray stays covered.
nightimage=bpy.data.images.load(os.path.join(ROOT,'japan-night.png'),check_existing=True);nightimage.scale(1024,683);nightimage.filepath_raw=os.path.join(ROOT,'japan-night-web.jpg');nightimage.file_format='JPEG';nightimage.save()
nightmat=mat('Tokyo residential night',(.015,.02,.025),1);nightbsdf=nightmat.node_tree.nodes.get('Principled BSDF');nt=nightmat.node_tree.nodes.new('ShaderNodeTexImage');nt.image=nightimage;nightmat.node_tree.links.new(nt.outputs['Color'],nightbsdf.inputs['Emission Color']);nightbsdf.inputs['Emission Strength'].default_value=.9
me=bpy.data.meshes.new('Tokyo panorama plane');me.from_pydata([(-22,-16,-15),(-22,23,-15),(-22,23,11),(-22,-16,11)],[],[(0,1,2,3)]);me.update();uv=me.uv_layers.new(name='Tokyo UV')
for li,co in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[li].uv=co
ob=bpy.data.objects.new('WindowJapanNight',me);bpy.context.collection.objects.link(ob);ob.data.materials.append(nightmat)

# Real exterior foreground and midground give the window view motion parallax.
# The room is an upper-floor apartment; neighboring street level is below it.
extwall=mat('Exterior weathered blue-gray plaster',(.10,.115,.13),.95)
extwarm=mat('Exterior warm gray plaster',(.14,.125,.105),.95)
extroof=mat('Exterior charcoal roof tile',(.035,.045,.055),.9)
extmetal=mat('Exterior dark balcony metal',(.023,.028,.032),.7)
extglass=mat('Exterior unlit glass',(.012,.024,.036),.32)
extlit=mat('Exterior warm lived-in windows',(.28,.17,.07),.7)
ep=extlit.node_tree.nodes.get('Principled BSDF');ep.inputs['Emission Color'].default_value=(1,.48,.15,1);ep.inputs['Emission Strength'].default_value=.28
for m,c in [(extwall,(.025,.031,.04)),(extwarm,(.033,.029,.023)),(extroof,(.009,.014,.020))]:
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=.28
def exterior_window(label,x,y,z,w=.60,h=.92,lit=False):
 # Front-facing facade at +X: glass behind frame, sill protrudes toward viewer.
 box('ExteriorFrame_'+label,(x+.017,y,z),(.045,w+.11,h+.10),extmetal)
 box('ExteriorGlass_'+label,(x+.044,y,z),(.015,w,h),extlit if lit else extglass)
 box('ExteriorMullion_'+label,(x+.057,y,z),(.018,.022,h),extmetal)
 box('ExteriorSill_'+label,(x+.08,y,z-h/2-.035),(.18,w+.15,.045),extwarm)
def roof_house(label,x,y,w,d,top,material):
 base=-5.5;box('ExteriorHouse_'+label,(x,y,(base+top)/2),(d,w,top-base),material,.025)
 # Pitched roof with true ridge volume, eaves and dark edge fascia.
 ridge=top+.60;front=x+d/2+.20;back=x-d/2-.20;yl=y-w/2-.20;yr=y+w/2+.20
 vs=[(front,yl,top),(front,yr,top),(front,y,ridge),(back,yl,top),(back,yr,top),(back,y,ridge)]
 fs=[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)]
 me=bpy.data.meshes.new(label+' pitched roof');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('ExteriorRoof_'+label,me);bpy.context.collection.objects.link(o);o.data.materials.append(extroof)
 for j in range(7):
  yy=yl+(yr-yl)*j/6;zz=top+.60*(1-abs(yy-y)/((yr-yl)/2))+.012
  box('ExteriorRoofSeam_'+label,(x,yy,zz),(d+.40,.018,.018),extmetal)
 for row,z in enumerate([top-.85,top-3.0]):
  for col,yy in enumerate([y-w*.25,y+w*.25]):exterior_window(label+str(row)+str(col),x+d/2,yy,z,.65,1.0,lit=(row+col)%3==0)
 box('ExteriorVent_'+label,(x+d/2+.10,y+w*.32,top-.32),(.22,.36,.23),extwarm,.015)
roof_house('NearResidence',-7.15,-2.1,3.15,2.45,.45,extwarm)
roof_house('SideResidence',-8.5,5.8,3.7,2.8,1.10,extwall)
# A narrow apartment building beyond the roofs; imperfect lit-window rhythm.
ax,ay=-12.1,2.0;aw,ad=3.0,3.2;ab,at=-5.5,2.15
box('ExteriorApartment',(ax,ay,(ab+at)/2),(ad,aw,at-ab),extwall,.035)
box('ExteriorApartmentParapet',(ax,ay,at+.08),(ad+.12,aw+.12,.16),extwarm,.015)
for row,z in enumerate([-4.0,-1.7,.6]):
 for col,yy in enumerate([ay-.80,ay+.78]):
  exterior_window('Apartment'+str(row)+str(col),ax+ad/2,yy,z,.71,1.25,lit=(row,col) in [(1,1),(2,0)])
  bx=ax+ad/2+.32
  box('ExteriorBalconyFloor',(bx,yy,z-.70),(.70,1.10,.08),extwarm)
  box('ExteriorBalconyRail',(bx+.34,yy,z-.20),(.028,1.10,.035),extmetal)
  for j in range(6):box('ExteriorBalconyBar',(bx+.34,yy-.50+j*.20,z-.43),(.025,.018,.47),extmetal)
  for side in [-1,1]:box('ExteriorBalconySide',(bx,yy+side*.54,z-.20),(.70,.025,.035),extmetal)
# Utility lines sit close to the opening, visibly shifting relative to roofs.
def exterior_cable(name,points,radius=.009):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=radius;cu.bevel_resolution=1;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for pp,co in zip(sp.points,points):pp.co=(*co,1)
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(extmetal)
for line in range(3):
 pts=[]
 for i in range(33):
  t=i/32;pts.append((-6.15-line*.13,-5+t*14,2.08+line*.12-.33*math.sin(math.pi*t)))
 exterior_cable('ExteriorUtilityCable'+str(line),pts,.007 if line else .010)
cyl('ExteriorUtilityPole',(-6.15,7.8,-1.0),.075,8.8,extmetal,verts=12)
# Join repeated static architecture by material to constrain draw calls.
exterior_objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Exterior')]
for material in [extwall,extwarm,extroof,extmetal,extglass,extlit]:
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Exterior') and len(o.data.materials)==1 and o.data.materials[0]==material]
 if len(objs)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name='ExteriorGeometry_'+material.name

# Left wall is split around an architectural window.
box('Window wall lower',(-4,-.25,.47),(.16,7.5,.94),plaster)
box('Window wall upper',(-4,-.25,3.46),(.16,7.5,.48),plaster)
box('Window wall front pier',(-4,-2.70,2.08),(.16,2.6,2.3),plaster)
box('Window wall back pier',(-4,2.60,2.08),(.16,1.8,2.3),plaster)
box('Window sill',(-3.88,.05,.98),(.42,3.25,.12),paper,.015)
for y in [-1.35,.15,1.65]:box('Window vertical mullion',(-4,y,2.08),(.19,.045,2.2),black,.008)
for z in [1.02,2.2,3.15]:box('Window horizontal mullion',(-4,.15,z),(.19,3.06,.045),black,.008)
# Window Venetian timber slats.
for i in range(3):
 slat=box('Window blind %02d'%i,(-4.02,.15,3.12-i*.065),(.20,3.10,.025),edge,.004);slat.rotation_euler.y=-.16
box('Rear skirting',(0,3.39,.055),(7.95,.055,.11),ivory,.007)
# Stone floor joints, subtle geometric detail.
seam=mat('Stone joints',(.40,.36,.29),1)
for x in [-3,-2,-1,0,1,2,3]:box('Floor grout',(x,-.25,.002),(.004,7.45,.002),seam)
for y in [-3.5,-2.5,-1.5,-.5,.5,1.5,2.5]:box('Floor grout',(0,y,.003),(7.95,.004,.002),seam)
# Gallery display with thick off-white mounts.
def frame(name,x,z,w,h,photomat):
 box(name+' walnut frame',(x,3.32,z),(w,.10,h),oak,.012)
 box(name+' ivory mount',(x,3.255,z),(w-.06,.015,h-.06),paper)
 photo_plane(name+' print',(x,3.242,z),w-.20,h-.21,photomat)
frame('Landscape edition',.55,2.25,1.30,.96,lake)
frame('Mountain edition',1.72,2.20,.66,.9,mountain)
# Long walnut table, sculptural plank legs.
box('Desk top',(0,.22,1.02),(2.85,1.24,.10),oak,.028)
for x in [-1.08,1.08]:box('Desk slab leg',(x,.25,.5),(.15,.94,.95),oak,.015)
box('Desk stretcher',(0,.57,.46),(2.1,.11,.13),oak,.014)
# Laptop with distinctly identifiable screen and screen content.
box('LaptopBase',(0,.00,1.10),(1.03,.68,.045),silver,.018)
box('Laptop keyboard well',(0,.095,1.126),(.91,.32,.006),black,.008)
for row in range(4):
 for col in range(12):box('Key_%d_%d'%(row,col),(-.413+col*.075,.22-row*.075,1.133),(.059,.054,.009),black,.005)
box('Laptop trackpad',(0,-.22,1.127),(.35,.19,.004),silver,.01)
box('LaptopDisplay',(0,.33,1.48),(1.07,.045,.69),black,.016)
photo_plane('LaptopScreen',(0,.305,1.485),.99,.595,mountain)
cyl('Laptop camera',(0,.303,1.808),.006,.003,glass,(math.pi/2,0,0),12)
# Open publication and a stack of photography books.
bookcols=[ivory,olive,black]
for i,m in enumerate(bookcols):
 b=box('Photography book %d'%i,(-.94,.14,1.105+i*.065),(.48,.55,.055),paper,.004)
 box('Book cover %d'%i,(-.94,.14,1.136+i*.065),(.49,.56,.009),m,.003)
 box('Book spine %d'%i,(-1.182,.14,1.105+i*.065),(.012,.56,.06),m,.002)
# Small mirrorless camera.
box('Camera body',(.91,.22,1.20),(.30,.15,.20),black,.025)
box('Camera silver top',(.91,.22,1.308),(.30,.15,.025),silver,.006)
cyl('Camera lens',(.91,.095,1.20),.085,.14,black,(math.pi/2,0,0))
cyl('Camera lens glass',(.91,.021,1.20),.065,.008,glass,(math.pi/2,0,0))
cyl('Camera dial',(1.005,.22,1.334),.036,.025,black)
# Espresso cup and saucer.
cyl('Cup saucer',(.80,-.26,1.083),.13,.015,paper)
cyl('Ceramic espresso cup',(.80,-.26,1.14),.077,.11,clay)
cyl('Coffee surface',(.80,-.26,1.197),.062,.003,black)
bpy.ops.mesh.primitive_torus_add(major_radius=.046,minor_radius=.012,major_segments=20,minor_segments=8,location=(.887,-.26,1.15),rotation=(math.pi/2,0,0));bpy.context.object.name='Cup handle';bpy.context.object.data.materials.append(clay)
# Photographer stool tucked near table.
cyl('Stool seat',(-.78,-.93,.62),.34,.10,oak)
for a in [0,2.094,4.189]:
 x=-.78+math.cos(a)*.22;y=-.93+math.sin(a)*.22;cyl('Stool leg',(x,y,.30),.035,.56,black,verts=16)
# Linen bed follows the right wall; the central aisle remains unobstructed.
linen=mat('Natural undyed linen',(.76,.73,.65),.95)
# Fine woven image maps survive export and make the duvet read as fabric.
fy,fx=np.mgrid[0:256,0:256];weave=1+.022*np.sin(fx*math.pi*.75)+.022*np.sin(fy*math.pi*.75)+np.random.default_rng(32).normal(0,.012,(256,256));tex=np.ones((256,256,4),dtype=np.float32)
for k,c in enumerate((.87,.85,.80)):tex[:,:,k]=np.clip(weave*c,0,1)
linimg=bpy.data.images.new('Natural linen weave',width=256,height=256);linimg.pixels.foreach_set(tex.ravel());linimg.filepath_raw=os.path.join(ROOT,'linen-weave.png');linimg.file_format='PNG';linimg.save();nd=linen.node_tree.nodes.new('ShaderNodeTexImage');nd.image=linimg;linen.node_tree.links.new(nd.outputs['Color'],linen.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
linenlight=mat('Washed linen pillows',(.87,.84,.76),.95)
throw=mat('Tobacco woven throw',(.35,.29,.21),.98)
# Refined upholstered bed in final world coordinates (no later bed transform).
def plush_box(name,loc,dim,material,rounding):
 o=box(name,loc,dim,material)
 mod=o.modifiers.new('Soft upholstered corners','BEVEL');mod.width=rounding;mod.segments=6
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for poly in o.data.polygons:poly.use_smooth=True
 o.modifiers.new('Soft surface normals','WEIGHTED_NORMAL')
 return o
def seam_path(name,points,material,radius=.003):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=radius;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(material);return ob
upholstery=mat('Oatmeal upholstered bed',(.37,.30,.23),.98)
plush_box('Bed recessed oak base',(3.0,-2.72,.12),(1.43,1.98,.16),oak,.045)
plush_box('Bed soft upholstered platform',(3.0,-2.72,.30),(1.70,2.21,.28),upholstery,.11)
plush_box('Bed thick linen mattress',(3.0,-2.72,.54),(1.58,2.12,.28),linenlight,.10)
plush_box('Bed padded headboard',(3.0,-3.84,.79),(1.72,.18,1.34),upholstery,.085)
# Mattress piping follows a rounded rectangle rather than sharp corners.
pts=[]
for cx,cy,ang in [(3.65,-1.79,0),(2.35,-1.79,90),(2.35,-3.65,180),(3.65,-3.65,270)]:
 for k in range(13):
  aa=math.radians(ang+k*90/12);pts.append((cx+.11*math.cos(aa),cy+.11*math.sin(aa),.58))
# Duvet is one continuous soft surface, with smooth side and foot drape.
def smooth01(t):t=max(0,min(1,t));return t*t*(3-2*t)
def duvet_point(u,v):
 x=2.13+u*1.74;y=-3.22+v*1.67
 side=smooth01((abs(u-.5)-.43)/.07);foot=smooth01((v-.93)/.07)
 broad=.008*math.sin(u*math.pi*5+v*3)+.006*math.sin(v*math.pi*7+u*8)
 diagonal=.010*math.exp(-((v-.50-.18*math.sin(u*5))/.12)**2)
 z=.747+broad+diagonal-.20*side-.24*foot
 return (x,y,z)
nx,ny=56,64;verts=[duvet_point(i/nx,j/ny) for j in range(ny+1) for i in range(nx+1)];faces=[]
for j in range(ny):
 for i in range(nx):
  k=j*(nx+1)+i;faces.append((k,k+1,k+nx+2,k+nx+1))
mesh=bpy.data.meshes.new('Continuous soft duvet');mesh.from_pydata(verts,[],faces);mesh.update();uv=mesh.uv_layers.new(name='Fabric UV')
for poly in mesh.polygons:
 for li in poly.loop_indices:
  idx=mesh.loops[li].vertex_index;uv.data[li].uv=(idx%(nx+1)/nx,idx//(nx+1)/ny)
ob=bpy.data.objects.new('Linen duvet',mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(linen)
for poly in mesh.polygons:poly.use_smooth=True
bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('Duvet padded thickness','SOLIDIFY');mod.thickness=.032;mod.offset=-1;bpy.ops.object.modifier_apply(modifier=mod.name)
# Fine piping on the visible hems, matching the warm ivory fabric.
seam_path('Duvet left piping',[duvet_point(0,j/64) for j in range(65)],linenlight,.0018)
seam_path('Duvet foot piping',[duvet_point(i/56,1) for i in range(57)],linenlight,.0018)
seam_path('Duvet right piping',[duvet_point(1,j/64) for j in range(65)],linenlight,.0018)
# Rounded rectangular pillows, with full plush centres and defined sewn edges.
for idx,x in enumerate([2.61,3.37]):
 ob=plush_box('Linen pillow '+str(idx),(x,-3.48,.80),(.68,.48,.19),linenlight,.085);ob.rotation_euler=(.10,(-.04 if idx==0 else .035),(-.035 if idx==0 else .04))
 # A second flatter pillow beneath adds believable layered volume.
 ob=plush_box('Linen under-pillow '+str(idx),(x,-3.51,.705),(.70,.49,.10),linen,.045);ob.rotation_euler.z=(-.025 if idx==0 else .025)
# Tobacco throw rests across the foot of the duvet with rounded layered folds.
throw=mat('Soft tobacco wool',(.32,.235,.165),.98);tv=[];tf=[];tx,ty=48,20
for j in range(ty+1):
 for i in range(tx+1):
  u=i/tx;v=j/ty;y=-2.09+v*.46;base=duvet_point(u,(y+3.22)/1.67)
  fold=.004*math.sin(u*15+v*3)+.004*math.sin(v*math.pi)**2
  tv.append((base[0],y,base[2]+.012+fold))
for j in range(ty):
 for i in range(tx):
  k=j*(tx+1)+i;tf.append((k,k+1,k+tx+2,k+tx+1))
me=bpy.data.meshes.new('Soft folded throw');me.from_pydata(tv,[],tf);me.update();ob=bpy.data.objects.new('Folded linen throw',me);bpy.context.collection.objects.link(ob);ob.data.materials.append(throw)
for poly in ob.data.polygons:poly.use_smooth=True
bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('Throw thickness','SOLIDIFY');mod.thickness=.010;mod.offset=-1;bpy.ops.object.modifier_apply(modifier=mod.name)
seam_path('Throw stitched hem',[tv[i] for i in range(tx+1)],upholstery,.0014)
# Bedside shelf and a small soft reading lamp, clear of the walking path.
box('Bedside floating shelf',(2.72,.10,.58),(.43,.42,.065),oak,.014)
cyl('Bedside lamp foot',(2.72,.10,.64),.10,.035,brass)
cyl('Bedside lamp stem',(2.72,.10,.83),.012,.34,brass,verts=16)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.16,radius2=.095,depth=.22,location=(2.72,.10,1.02));o=bpy.context.object;o.name='Bedside linen lampshade';o.data.materials.append(linenlight)
# A quiet doorway and ceiling rail establish the room around the viewer.
box('Flush oak door',(3.90,1.58,1.10),(.045,.90,2.18),ivory,.008)
box('Door handle',(3.855,1.30,1.04),(.035,.15,.027),brass,.01)
# Two independently deformable translucent curtains, top row pinned by the browser.
curtain=mat('Sheer flax curtain',(.47,.40,.31),.98);cp=curtain.node_tree.nodes.get('Principled BSDF');cp.inputs['Alpha'].default_value=.76;curtain.surface_render_method='DITHERED';curtain.use_backface_culling=False
for name,ya,yb,phase in [('BreezeCurtainLeft',-1.45,-.85,0),('BreezeCurtainRight',1.20,1.77,1.4)]:
 verts=[];faces=[];cw,ch=24,36
 for j in range(ch+1):
  t=j/ch;z=.82+t*2.48
  for i in range(cw+1):
   u=i/cw;y=ya+u*(yb-ya);x=-3.66+.06*math.sin(u*math.pi*10+phase)+.10*(1-t)**1.7*math.sin(u*4+phase)
   verts.append((x,y,z))
 for j in range(ch):
  for i in range(cw):
   k=j*(cw+1)+i;faces.append((k,k+1,k+cw+2,k+cw+1))
 me=bpy.data.meshes.new(name+'Grid');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(curtain)
 for poly in ob.data.polygons:poly.use_smooth=True
cyl('Curtain rail',(-3.66,.15,3.34),.017,3.55,brass,(math.pi/2,0,0),verts=16)
# The bed and bedside pieces sit farther back, leaving a generous open aisle.
for ob in list(bpy.context.scene.objects):
 if ob.name.startswith(('Bedside ',)):
  ob.location.x+=.85;ob.location.y-=1.65
# Warm reading lamps, with visible open shades and softly glowing bulbs.
shade=mat('Warm illuminated linen shade',(.46,.30,.15),.85);sp=shade.node_tree.nodes.get('Principled BSDF');sp.inputs['Emission Color'].default_value=(1,.42,.12,1);sp.inputs['Emission Strength'].default_value=.32
bulb=mat('Warm frosted bulb',(.9,.62,.27),.4);bp=bulb.node_tree.nodes.get('Principled BSDF');bp.inputs['Emission Color'].default_value=(1,.46,.15,1);bp.inputs['Emission Strength'].default_value=3
old=bpy.data.objects.get('Bedside linen lampshade')
if old:bpy.data.objects.remove(old,do_unlink=True)
for name,x,y,basez in [('DeskLamp',-1.18,.59,1.075),('BedsideLamp',3.57,-1.55,.60)]:
 if name=='DeskLamp':
  cyl(name+'Base',(x,y,basez+.025),.12,.035,brass);cyl(name+'Stem',(x,y,basez+.28),.012,.49,brass,verts=16)
 bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=.20,radius2=.105,depth=.25,end_fill_type='NOTHING',location=(x,y,basez+.54));o=bpy.context.object;o.name=name+'Shade';o.data.materials.append(shade)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=.065,location=(x,y,basez+.51));o=bpy.context.object;o.name=name+'Bulb';o.data.materials.append(bulb)
 for poly in o.data.polygons:poly.use_smooth=True
 bpy.ops.object.light_add(type='POINT',location=(x,y,basez+.43));o=bpy.context.object;o.name=name+'WarmLight';o.data.energy=26 if name=='DeskLamp' else 34;o.data.color=(1,.51,.22);o.data.shadow_soft_size=.14
# Large unglazed ceramic vase with olive branches on low side plinth.
box('Side plinth',(-2.10,1.68,.36),(.64,.64,.72),ivory,.012)
cyl('Ceramic vase',(-2.1,1.68,.92),.19,.40,clay)
cyl('Vase neck',(-2.1,1.68,1.14),.105,.13,clay)
for branch in range(5):
 start=Vector((-2.1,1.68,1.12));end=Vector((-2.1+random.uniform(-.38,.38),1.68+random.uniform(-.30,.3),1.8+random.uniform(-.1,.5)))
 d=end-start;o=cyl('Olive branch',(start+end)/2,.009,d.length,oak,verts=8);o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 for i in range(5):
  pos=start.lerp(end,.35+i*.14)
  for side in [-1,1]:
   bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=pos+Vector((side*.075,0,.01)));o=bpy.context.object;o.name='Olive leaf';o.scale=(.10,.027,.015);o.rotation_euler=(0,side*.4,random.uniform(-.8,.8));o.data.materials.append(green)
# A soft contact shadow texture preserves grounding on lower-powered browsers.
sy,sx=np.mgrid[-1:1:128j,-1:1:128j];sp=np.ones((128,128,4),dtype=np.float32);sp[:,:,:3]=.13;sp[:,:,3]=np.exp(-3.8*(sx*sx+sy*sy))*.32
shimg=bpy.data.images.new('Soft desk contact shadow',width=128,height=128,alpha=True);shimg.pixels.foreach_set(sp.ravel());shimg.filepath_raw=os.path.join(ROOT,'contact-shadow.png');shimg.file_format='PNG';shimg.save()
shadow=mat('Soft contact shadow',(.13,.13,.13));shadow.surface_render_method='DITHERED';p=shadow.node_tree.nodes.get('Principled BSDF');tn=shadow.node_tree.nodes.new('ShaderNodeTexImage');tn.image=shimg;shadow.node_tree.links.new(tn.outputs['Alpha'],p.inputs['Alpha'])
bpy.ops.mesh.primitive_plane_add(size=1,location=(.12,.20,.006));o=bpy.context.object;o.name='Desk soft floor shadow';o.scale=(3.9,2.6,1);o.data.materials.append(shadow)
# Merge repeated details to keep browser draw calls low.
for prefix,label in [('Key_','LaptopKeys'),('Olive leaf','OliveLeaves'),('Olive branch','OliveBranches'),('Window blind','WindowBlinds'),('Floor grout','FloorJoints'),('Stool leg','StoolLegs'),('Throw fringe','ThrowFringe')]:
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
 if len(objs)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name=label
# Camera and lighting for the preview (excluded from web GLB lights).
def point_at(o,pt):o.rotation_euler=(Vector(pt)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.35,-3.48,1.28));cam=bpy.context.object;cam.name='EntranceCamera';point_at(cam,(.75,.30,.97));cam.data.lens=24/(2*math.tan(math.radians(64)/2));cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-3.60,.15,2.45));light=bpy.context.object;light.name='Window key';light.data.energy=85;light.data.shape='RECTANGLE';light.data.size=2.3;light.data.size_y=1.8;light.data.color=(.63,.72,.85);point_at(light,(0,.3,1.0))
bpy.ops.object.light_add(type='AREA',location=(1,-1.4,3.35));light=bpy.context.object;light.name='Soft ambient';light.data.energy=18;light.data.size=3;light.data.color=(1,.70,.43);point_at(light,(0,.5,1))
bpy.ops.object.light_add(type='SUN',location=(-5,-3,6));light=bpy.context.object;light.name='Afternoon sun';light.data.energy=.03;light.data.angle=.12;light.data.color=(1,.88,.68);point_at(light,(1,2,0))
world=bpy.context.scene.world or bpy.data.worlds.new('Studio world');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.42,.46,.50,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.08
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
if os.environ.get('STUDIO_PREVIEW_ONLY') != '1':
 # Export transforms in glTF's Y-up coordinates. Images are embedded.
 bpy.ops.file.pack_all()
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'quiet-studio.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'quiet-studio.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_apply=True,export_yup=True,export_image_format='AUTO',export_jpeg_quality=85)
 meta={'camera':[2.35,1.28,3.48],'target':[.75,.97,-.30],'fov':64,'standCamera':[1.88,1.65,3.10],'walkCamera':[.7,1.65,1.45],'zoomCamera':[0,1.49,.35],'zoomTarget':[0,1.485,-.305],'laptopScreen':[0,1.485,-.305],'screenMeshName':'LaptopScreen','units':'metres','coordinates':'glTF / Three.js Y up','interiorKeyLight':[-3.60,2.45,-.15],'deskLampLight':[-1.18,1.505,-.59],'bedsideLampLight':[3.57,1.03,1.55],'curtains':{'names':['BreezeCurtainLeft','BreezeCurtainRight'],'localUpAxis':'y','minY':.82,'maxY':3.30,'normalAxis':'x','grid':[24,36],'pinFormula':'weight = pow(clamp((3.30 - localY) / 2.48, 0, 1), 1.7); offsetX = weight * (0.07*sin(time*1.2 + localZ*2.5) + 0.025*sin(time*2.0 + localY*3.0)); top row fixed. Start from cached base positions every frame.'},'bedBounds':{'min':[2.13,.04,1.55],'max':[3.87,1.46,3.93]},'roomBounds':{'min':[-3.92,0,-3.42],'max':[3.92,3.64,3.92]},'blenderVersion':bpy.app.version_string,'photoSources':['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b','https://images.unsplash.com/photo-1470770841072-f978cf4d019e'],'nightBackdrop':{'mesh':'WindowJapanNight','source':'AI-generated Tokyo residential night scene','texture':'japan-night-web.jpg','planeX':-22,'planeYBounds':[-16,23],'planeHeightBounds':[-15,11],'depthLayers':{'utilityCablesX':[-6.15,-6.41],'nearHouseX':-7.15,'sideHouseX':-8.5,'apartmentX':-12.1},'geometry':'Pitched rooftops, actual building volumes, layered window frames and sills, balcony rails and utility cables.'},'notes':'Fully enclosed room. The viewer sits on the bed, steps left into the clear aisle, stands, and approaches laptop. Keep light inside the room so ceiling does not block it. WindowJapanNight should disable castShadow. Demonstration photographs are placeholders.'}
 with open(os.path.join(OUT,'scene-metadata.json'),'w') as f:json.dump(meta,f,indent=2)
scene.render.filepath=os.path.join(ROOT,'bed-preview.jpg') if os.environ.get('STUDIO_PREVIEW_ONLY') == '1' else os.path.join(OUT,'studio-preview.jpg');scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=90
bpy.ops.render.render(write_still=True)
print('STUDIO_COMPLETE',os.path.getsize(os.path.join(OUT,'quiet-studio.glb')))
