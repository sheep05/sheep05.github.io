import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createWindowView } from './window-view';
import { createXT5 } from './fujifilm-xt5';
import { screenPosition, screenSize } from './study-state';

type Material = THREE.Material;
export function buildStudy(scene: THREE.Scene) {
  const textures: THREE.Texture[] = [];
  const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t); return t;
  };
  const mat = (color: string, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const walnut = mat('#72503b'), plaster = mat('#b1aaa0'), charcoal = mat('#24282a'), brass = mat('#b9a17a', .32, .72), paper = mat('#d6cdbb'), black = mat('#151719', .45), fabric = mat('#686156');
  let seed = 173;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  walnut.map = canvasTexture(512, 256, ctx => {
    ctx.fillStyle = '#967454'; ctx.fillRect(0, 0, 512, 256);
    for (let i=0;i<1500;i++) { ctx.strokeStyle = `rgba(36,18,8,${random()*.16})`; const y=random()*256; ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(180,y+random()*12,340,y-random()*12,512,y+random()*3);ctx.stroke(); }
  });
  walnut.map.wrapS = walnut.map.wrapT = THREE.RepeatWrapping;
  const box = (name:string, size:number[], pos:number[], material:Material, radius=0, parent:THREE.Object3D=scene) => {
    const g = radius ? new RoundedBoxGeometry(size[0],size[1],size[2],2,radius) : new THREE.BoxGeometry(...size as [number,number,number]);
    const m = new THREE.Mesh(g,material); m.name=name; m.position.fromArray(pos); m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const cyl = (name:string,r:number,h:number,pos:number[],material:Material,parent:THREE.Object3D=scene) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),material);m.name=name;m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const line = (points:number[][],radius:number,material:Material,parent:THREE.Object3D=scene) => {
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,32,radius,6,false),material);parent.add(mesh);return mesh;
  };
  const label = (text:string,w:number,h:number,pos:number[],color='#dfd7c6', bg='#202527', parent:THREE.Object3D=scene) => {
    const tex=canvasTexture(512,128,ctx=>{ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='28px monospace';ctx.textAlign='center';ctx.fillText(text,256,76);});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));mesh.position.fromArray(pos);parent.add(mesh);return mesh;
  };
  // Six enclosing surfaces; the right wall has a real window aperture.
  box('Floor',[6.2,.16,5.8],[0,-.08,0],walnut);
  const seam=mat('#483b30');
  for(let z=-2.8;z<2.9;z+=.24) box('Floorboard seam',[6,.003,.006],[0,.003,z],seam);
  box('Back wall',[6.2,3.3,.16],[0,1.65,-2.9],plaster);
  box('Left wall',[.16,3.3,5.8],[-3.08,1.65,0],plaster);
  box('Front wall',[6.2,3.3,.16],[0,1.65,2.9],plaster);
  box('Ceiling',[6.2,.12,5.8],[0,3.3,0],mat('#c3bcb1'));
  box('Window wall below',[.16,.95,5.8],[3.08,.475,0],plaster);
  box('Window wall above',[.16,.6,5.8],[3.08,3,0],plaster);
  box('Window wall front',[.16,1.75,1.75],[3.08,1.825,2.025],plaster);
  box('Window wall rear',[.16,1.75,.7],[3.08,1.825,-2.55],plaster);
  for(const x of [-2.98,2.98])box('Skirting',[.04,.13,5.6],[x,.065,0],walnut);
  box('Back skirting',[6,.13,.04],[0,.065,-2.8],walnut);
  const rug=box('Woven rug',[3.1,.018,2.6],[-.35,.018,.35],fabric,.01);
  rug.material = mat('#716957');
  const stitch=mat('#91856e');
  for(let i=0;i<24;i++)box('Rug stitching',[3,.002,.008],[-.35,.029,-.9+i*.1],stitch);
  // Window joinery and a layered Japanese neighbourhood, built in depth.
  for(const y of [.96,2.69])box('Window frame',[.18,.065,3.3],[3,y,-.5],walnut);
  for(const z of [-2.16,-.5,1.16])box('Window mullion',[.16,1.8,.055],[3,1.83,z],walnut);
  box('Window sill',[.35,.07,3.5],[2.93,.95,-.5],walnut,.02);
  const windowView=createWindowView(scene);
  const windowTarget=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.75),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  windowTarget.name='Window day and night control';windowTarget.position.set(2.99,1.825,-.5);windowTarget.rotation.y=-Math.PI/2;windowTarget.visible=false;scene.add(windowTarget);
  // Pleated curtains remain inside the enclosure and move only at their free ends.
  const curtains: {mesh:THREE.Mesh,base:Float32Array}[]=[];
  for(const z of [-1.99,.98]) {
    const g=new THREE.PlaneGeometry(.52,1.86,14,24); const a=g.attributes.position;
    for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getX(i)*46)*.045);
    g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#c2b5a0',roughness:1,side:THREE.DoubleSide}));
    mesh.name='Curtain';mesh.rotation.y=-Math.PI/2;mesh.position.set(2.82,1.86,z);scene.add(mesh);curtains.push({mesh,base:new Float32Array(a.array)});
  }
  line([[2.8,2.84,-2.35],[2.8,2.84,1.35]],.02,brass);
  // Desk, monitor, workstation, and separate mechanical keys.
  box('Solid walnut desktop',[2.9,.095,1.25],[0,.86,-1.93],walnut,.025);
  for(const x of [-1.27,1.27])for(const z of [-2.43,-1.44])box('Desk leg',[.065,.81,.065],[x,.405,z],charcoal,.01);
  box('Desk mat',[1.85,.012,.63],[0,.916,-1.69],mat('#343b39'),.015);
  box('Monitor base',[.48,.025,.28],[0,.934,-2.2],black,.02);
  box('Monitor stem',[.06,.28,.055],[0,1.08,-2.23],charcoal,.015);
  box('Monitor frame',[1.36,.88,.07],[0,1.47,-2.16],black,.025);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(...screenSize),new THREE.MeshBasicMaterial({color:'#0b1116',toneMapped:false}));
  screen.name='Interactive monitor';screen.position.fromArray(screenPosition);scene.add(screen);
  const power=new THREE.Mesh(new THREE.SphereGeometry(.008,8,8),new THREE.MeshBasicMaterial({color:'#bbcfad'}));power.position.set(.6,1.06,-2.11);scene.add(power);
  box('Keyboard case',[1.03,.045,.35],[0,.947,-1.58],mat('#b3ada1',.36,.25),.025);
  const keys:THREE.Mesh[]=[];
  const keycap=mat('#d6cdbb',.5), accent=mat('#ad6e43',.5);
  const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  rows.forEach((row,r)=>{[...row].forEach((key,c)=>{
    const x=(c-(row.length-1)/2)*.088,z=-1.695+r*.081;
    const m=box(`Key ${key}`,[.076,.033,.069],[x,.986,z],keycap,.007);
    m.userData.key=key.toLowerCase();m.userData.restY=m.position.y;keys.push(m);
    const glyph=label(key,.048,.026,[x,1.004,z],'#343630','#d6cdbb',m);
    glyph.position.set(0,.018,0);glyph.rotation.x=-Math.PI/2;
  });});
  for(const [key,text,x,w] of [['Backspace','⌫',-.34,.23],['Enter','ENTER',.25,.42]] as const){
    const m=box(`Key ${key}`,[w,.033,.067],[x,.986,-1.45],key==='Enter'?accent:keycap,.007);m.userData.key=key;m.userData.restY=m.position.y;keys.push(m);
    const glyph=label(text,w*.8,.032,[0,.018,0],'#343630',key==='Enter'?'#ad6e43':'#d6cdbb',m);glyph.rotation.x=-Math.PI/2;
  }
  box('Mouse',[.09,.035,.14],[.68,.95,-1.58],paper,.03);
  line([[.47,.93,-1.74],[.62,.93,-1.9],[.55,.93,-2.47],[.12,.91,-2.52]],.006,black);
  box('Workstation tower',[.28,.57,.48],[1.2,.3,-2.05],charcoal,.025);
  for(let i=0;i<14;i++)box('Tower ventilation',[.18,.008,.005],[1.2,.2+i*.023,-1.805],black);
  // The chair is pulled to the left so the walking route stays clear.
  const chair=new THREE.Group();chair.name='Desk chair';chair.position.set(-1.1,0,-.65);chair.rotation.y=Math.atan2(chair.position.x-screenPosition[0],chair.position.z-screenPosition[2]);scene.add(chair);
  box('Chair cushion',[.51,.09,.47],[0,.47,0],mat('#5c5143'),.06,chair);
  box('Chair back',[.52,.5,.09],[0,.8,.2],walnut,.055,chair);
  for(const x of [-.2,.2])for(const z of [-.17,.17])box('Chair leg',[.035,.44,.035],[x,.22,z],charcoal,.005,chair);
  // A broad enamel dome and slender stem, with its crown level with the monitor.
  // Every visible part remains clickable.
  const lampTarget=new THREE.Group();lampTarget.name='Desk lamp';scene.add(lampTarget);
  const lampBronze=mat('#665849',.4,.65),lampEnamel=mat('#e3d8c3',.38,.08);
  lampEnamel.side=THREE.DoubleSide;
  const lampX=-1.07,lampZ=-2.12,shadeY=1.91-.31*.72;
  const baseProfile=[[0,0],[.175,0],[.194,.008],[.2,.02],[.194,.033],[.17,.044],[.06,.049],[0,.049]].map(([r,y])=>new THREE.Vector2(r,y));
  const lampBase=new THREE.Mesh(new THREE.LatheGeometry(baseProfile,48),lampBronze);lampBase.name='Lamp base';lampBase.position.set(lampX,.91,lampZ);lampBase.castShadow=lampBase.receiveShadow=true;lampTarget.add(lampBase);
  cyl('Lamp stem',.013,shadeY-.95,[lampX,(shadeY+.95)/2,lampZ],lampBronze,lampTarget);
  cyl('Lamp stem collar',.025,.03,[lampX,.969,lampZ],lampBronze,lampTarget);
  const shade=new THREE.Mesh(new THREE.SphereGeometry(.31,48,20,0,Math.PI*2,0,Math.PI/2),lampEnamel);shade.name='Lamp shade';shade.scale.y=.72;shade.position.set(lampX,shadeY,lampZ);shade.castShadow=shade.receiveShadow=true;lampTarget.add(shade);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.306,.006,8,64),lampEnamel);rim.name='Rounded shade edge';rim.rotation.x=Math.PI/2;rim.position.set(lampX,shadeY,lampZ);rim.castShadow=true;lampTarget.add(rim);
  const bulbMaterial=new THREE.MeshStandardMaterial({color:'#fff0d3',emissive:'#ffd49a',emissiveIntensity:2});
  cyl('Lamp diffuser',.294,.008,[lampX,shadeY,lampZ],bulbMaterial,lampTarget);
  cyl('Lamp switch',.016,.009,[lampX+.105,.96,lampZ+.075],lampBronze,lampTarget);
  line([[lampX,.92,lampZ-.12],[lampX-.08,.92,-2.45],[lampX-.08,.85,-2.6],[lampX-.08,.15,-2.65]],.004,black,lampTarget);
  const lamp=new THREE.PointLight('#ffcd94',9,4,2);lamp.position.set(lampX,shadeY-.025,lampZ);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.normalBias=.015;lamp.shadow.bias=-.0005;lamp.shadow.radius=3;scene.add(lamp);
  const hemi=new THREE.HemisphereLight('#819cbe','#55412e',.6);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#b4c6df',.65);sun.position.set(5,3.9,.4);sun.target.position.set(-1,.5,-1.7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:18});sun.shadow.normalBias=.025;sun.shadow.bias=-.0003;scene.add(sun,sun.target);
  const monitorLight=new THREE.PointLight('#b1cacc',.5,2.5,2);monitorLight.position.set(0,1.4,-1.95);scene.add(monitorLight);
  const fill=new THREE.PointLight('#edc99c',1.1,6,2);fill.position.set(-1.5,2,1.4);scene.add(fill);
  const windowFill=new THREE.PointLight('#beced7',.07,7,2);windowFill.position.set(2.65,2,-.5);scene.add(windowFill);
  // Photography equipment and printed work.
  const camera=createXT5(THREE);camera.name='Fujifilm X-T5 study model';camera.position.set(.97,.915,-1.96);camera.rotation.y=-.35;scene.add(camera);
  // Keep a forgiving hit area after the detailed camera is batched into the desk scene.
  const cameraBounds = new THREE.Box3().setFromObject(camera);
  const hitSize = cameraBounds.getSize(new THREE.Vector3()).addScalar(.09);
  const cameraTarget = new THREE.Mesh(new THREE.BoxGeometry(hitSize.x, hitSize.y, hitSize.z));
  cameraBounds.getCenter(cameraTarget.position);
  cameraTarget.name = 'Inspect Fujifilm X-T5';
  cameraTarget.visible = false;
  scene.add(cameraTarget);
  const lens=cyl('Spare lens',.075,.14,[1.23,.99,-2.25],black);for(let i=0;i<9;i++)cyl('Lens focus ring',.078,.004,[1.23,.94+i*.009,-2.25],charcoal);
  line([[.83,.922,-1.78],[1.1,.922,-1.55],[1.35,.922,-1.65],[1.17,.922,-1.92]],.013,mat('#7a5540'));
  label('X-T5 / FIELD NOTES',.29,.045,[.99,.921,-1.55],'#b4aa93','#343b39').rotation.x=-Math.PI/2;
  const prints:THREE.Mesh[]=[];
  const frame=(x:number,y:number,z:number,w:number,h:number,rot=0)=>{
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rot;scene.add(group);
    box('Photograph frame',[w+.08,h+.08,.045],[0,0,0],walnut,.008,group);
    box('Photograph mount',[w,h,.006],[0,0,.026],paper,0,group);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w*.83,h*.8),new THREE.MeshStandardMaterial({color:'#b4ac98',roughness:1}));p.position.z=.031;group.add(p);prints.push(p);return group;
  };
  frame(-1.92,1.96,-2.79,.82,1.04);
  frame(1.88,2.01,-2.79,.73,.98);
  frame(-2.97,1.92,-.73,.85,.64,Math.PI/2);
  frame(-2.97,1.92,.45,.85,.64,Math.PI/2);
  // Floating shelves, book spines, lens cases and archive boxes.
  for(const y of [.76,1.27,2.68])box('Archive shelf',[.35,.055,2.45],[-2.79,y,-.1],walnut,.008);
  for(let i=0;i<18;i++){
    const h=.24+random()*.15,z=-1.15+i*.11;
    box('Photo book',[.24,h,.07],[-2.78,.79+h/2,z],mat(['#5b6159','#b2a58c','#754f3c','#424e55'][i%4]),.003);
  }
  for(let i=0;i<3;i++)box('Archive box',[.3,.24,.43],[-2.79,1.42,-.85+i*.65],mat('#b4a48b'),.012);
  for(let i=0;i<3;i++){const book=box('Desk photo book',[.34,.035,.25],[-.91,.95+i*.04,-1.59],mat(['#857961','#d1c5ac','#5b6563'][i]),.004);book.rotation.y=.12-i*.07;}
  const contactSheet=canvasTexture(512,512,ctx=>{ctx.fillStyle='#d8ceba';ctx.fillRect(0,0,512,512);ctx.fillStyle='#454d49';ctx.font='20px monospace';ctx.fillText('CONTACT SHEET / 001',25,35);for(let i=0;i<12;i++){ctx.fillStyle=['#747a70','#454f51','#aba18a'][i%3];ctx.fillRect(25+(i%3)*160,65+Math.floor(i/3)*105,145,85);}});
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(.28,.34),new THREE.MeshStandardMaterial({map:contactSheet,roughness:1}));sheet.position.set(-.75,.92,-1.45);sheet.rotation.set(-Math.PI/2,0,-.15);scene.add(sheet);
  // A small sofa and closed door complete the lived-in enclosure.
  box('Reading sofa base',[1.75,.34,.72],[-1.73,.27,1.95],mat('#635c50'),.09);
  box('Reading sofa back',[1.75,.55,.18],[-1.73,.66,2.25],fabric,.07);
  for(const x of [-2.3,-1.2])box('Linen cushion',[.45,.22,.43],[x,.55,1.94],paper,.07);
  box('Closed door',[.92,2.3,.055],[.5,1.15,2.79],walnut,.014);
  cyl('Door handle',.025,.13,[.84,1.05,2.72],brass).rotation.z=Math.PI/2;
  return {screen,keys,cameraTarget,lampTarget,windowTarget,lamp,bulbMaterial,hemi,sun,fill,windowFill,windowView,curtains,prints,textures};
}
