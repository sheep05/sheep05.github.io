import type * as THREE from 'three';
import type {buildStudy} from './study-room';

// Values interpolate continuously; night removes hard moonlight and lets warm
// reflected light lift the shadows without raising the overall exposure.
export function updateStudyLighting(scene: THREE.Scene, room: ReturnType<typeof buildStudy>, day: number, lamp: number) {
  scene.environmentIntensity=.19+day*.19+lamp*.025;
  room.hemi.intensity=.24+day*.18;
  room.hemi.color.setRGB(.47+day*.2,.53+day*.2,.65+day*.15);
  room.sun.intensity=.065+day*3.1;
  room.sun.color.setRGB(.62+day*.38,.72+day*.19,.92-day*.16);
  room.sun.shadow.intensity=.22+day*.73;
  room.sun.shadow.radius=day*2.4+(1-day)*4;
  room.lamp.intensity=5.2*lamp;
  room.lamp.shadow.intensity=.28+day*.27;
  room.bulbMaterial.emissiveIntensity=1.4*lamp;
  room.fill.intensity=.12+lamp*.52+day*.12;
  room.windowFill.intensity=.07+day*.65;
  room.windowView.update(day);
}
