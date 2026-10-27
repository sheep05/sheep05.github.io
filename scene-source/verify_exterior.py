import bpy,math,json,os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
root=os.path.dirname(__file__);s=bpy.context.scene;c=s.camera
# Every ray through the window opening stays on the distant panorama throughout the path.
path=[Vector((2.35,-3.48,1.28)),Vector((1.88,-3.10,1.65)),Vector((.7,-1.45,1.65)),Vector((0,-.35,1.49))]
mins=[1e9,1e9];maxs=[-1e9,-1e9];maxdist=0;tested=0
for a,b in zip(path,path[1:]):
 for j in range(21):
  eye=a.lerp(b,j/20)
  for wy in [-1.35,1.65]:
   for wz in [1.02,3.15]:
    corner=Vector((-4,wy,wz));t=(-22-eye.x)/(corner.x-eye.x);hit=eye+(corner-eye)*t
    mins=[min(mins[0],hit.y),min(mins[1],hit.z)];maxs=[max(maxs[0],hit.y),max(maxs[1],hit.z)];maxdist=max(maxdist,(hit-eye).length);tested+=1
assert mins[0]>=-16 and maxs[0]<=23 and mins[1]>=-15 and maxs[1]<=11,(mins,maxs)
# Two matching field-of-view views aimed through the window expose true parallax.
views=[('exterior-entry',(2.35,-3.48,1.28)),('exterior-approach',(.7,-1.45,1.65))]
projection={}
for name,eye in views:
 c.location=eye;c.rotation_euler=(Vector((-4,.15,2.05))-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=38;c.data.sensor_fit='VERTICAL';c.data.sensor_height=24;s.render.resolution_x=1200;s.render.resolution_y=900;s.cycles.samples=40;bpy.context.view_layer.update()
 projection[name]={}
 for key,co in [('nearRoof',(-5.725,-2.1,1.05)),('apartment',(-10.5,2,2.15)),('farReference',(-22,4,4))]:
  v=world_to_camera_view(s,c,Vector(co));projection[name][key]=[round(v.x,5),round(v.y,5)]
 s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=92;s.render.filepath=os.path.join(root,name+'.jpg');bpy.ops.render.render(write_still=True)
report={'panoramaCoverage':{'testedWindowCornerRays':tested,'minYZ':mins,'maxYZ':maxs,'panoramaBoundsYZ':[[-16,23],[-15,11]],'maxRayDistance':maxdist,'cameraFar':80,'pass':True},'projectedLandmarks':projection,'geometryLayersX':[-6.15,-7.15,-8.5,-12.1,-22]}
json.dump(report,open(os.path.join(root,'exterior-qa.json'),'w'),indent=2);print('EXTERIOR_QA',json.dumps(report))
