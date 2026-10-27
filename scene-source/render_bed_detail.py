import bpy,os,math
from mathutils import Vector
s=bpy.context.scene;c=s.camera;c.location=(.72,-.65,2.15);c.rotation_euler=(Vector((3.0,-2.70,.64))-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=26;c.data.sensor_fit='VERTICAL';c.data.sensor_height=24;s.cycles.samples=48;s.render.resolution_x=1200;s.render.resolution_y=1000;s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=93;s.render.filepath=os.path.join(os.path.dirname(__file__),'bed-detail.jpg');bpy.ops.render.render(write_still=True)
