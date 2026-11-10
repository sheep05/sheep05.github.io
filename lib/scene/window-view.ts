import * as THREE from 'three';

// An original, compact Kyoto-inspired streetscape. All scenery ships with the code;
// no external image service, panorama download, or extra shadow maps are required.
export function createWindowView(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = 'Lantern street beyond the window'; scene.add(group);
  const palettes: {material: THREE.MeshStandardMaterial; night: THREE.Color; day: THREE.Color}[] = [];
  const material = (night: string, day: string) => {
    const m = new THREE.MeshStandardMaterial({color: night, roughness: .9});
    palettes.push({material: m, night: new THREE.Color(night), day: new THREE.Color(day)}); return m;
  };
  const timber = material('#29272b', '#63584b'), plaster = material('#43474a', '#b9b3a4');
  const roof = material('#202b36', '#555f61'), roofEdge = material('#39424a', '#7b8280');
  const glass = material('#a48159', '#768785'), lantern = material('#d3a165', '#caa177');
  glass.emissive.set('#b68c59'); lantern.emissive.set('#e5ac69');
  const darkGlass = material('#24333d', '#6f7c7c');
  const stone = material('#1a242b', '#606b65'), foliage = material('#253638', '#4f6650');
  const box = (name: string, size: [number,number,number], at: [number,number,number], mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.name = name; mesh.position.set(...at); mesh.receiveShadow=true; group.add(mesh); return mesh;
  };
  // A vertical sky gradient and two separate ridgelines give real depth/parallax.
  const sky = new THREE.ShaderMaterial({
    uniforms: {daylight: {value: 0}}, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv; uniform float daylight;
      void main(){float h=smoothstep(.05,.85,vUv.y);
        vec3 night=mix(vec3(.085,.11,.16),vec3(.009,.021,.055),h);
        vec3 day=mix(vec3(.61,.65,.63),vec3(.21,.36,.48),h);
        gl_FragColor=vec4(mix(night,day,daylight),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(90,44),sky);
  skyPlane.position.set(42,10,-12); skyPlane.rotation.y=-Math.PI/2; group.add(skyPlane);
  for (let layer=0;layer<2;layer++) {
    const shape=new THREE.Shape(); shape.moveTo(-38,-8);
    for(let i=0;i<=60;i++){const z=-38+i*1.2;const h=2.5+Math.sin(i*.17+layer)*2.1+Math.sin(i*.43)*.7;shape.lineTo(z,h);}
    shape.lineTo(34,-8);shape.closePath();
    const ridge=new THREE.Mesh(new THREE.ShapeGeometry(shape),material(layer?'#263845':'#344957',layer?'#758983':'#97a8a1'));
    ridge.rotation.y=-Math.PI/2;ridge.position.set(34-layer*5,0,-12);group.add(ridge);
  }
  box('Stone lane',[23,.15,44],[16,-1.3,-10],stone);
  // Machiya facades, recessed lattice windows, tiled pitched roofs and warm lanterns.
  for(let i=0;i<9;i++) {
    const x=8.8+(i%3)*4.8, z=-19+Math.floor(i/3)*8.4+(i%3)*1.15, h=2.5+(i%3)*.26;
    box('Machiya plaster',[3.3,h,3.5],[x,h/2-1.2,z],plaster);
    const front=x-1.68;
    box('Dark timber frontage',[.07,h*.7,3.54],[front,h*.35-1.2,z],timber);
    for(const offset of [-.91,.91]) {
      box('Recessed shoji',[.025,.83,1.25],[front-.045,h-1.9,z+offset],(i+offset>4?darkGlass:glass));
      for(let bar=0;bar<8;bar++)box('Shoji lattice',[.045,.86,.022],[front-.07,h-1.9,z+offset-.57+bar*.16],timber);
      box('Shoji cross rail',[.05,.025,1.25],[front-.075,h-1.91,z+offset],timber);
    }
    // The room sees the side elevations too: wrap the joinery around the corner.
    box('Dark timber frontage',[3.32,h*.65,.06],[x,h*.325-1.2,z+1.77],timber);
    for(const offset of [-.83,.83]) {
      box('Recessed shoji',[1.15,.72,.025],[x+offset,h-1.9,z+1.81],i%2?darkGlass:glass);
      for(let bar=0;bar<8;bar++)box('Shoji lattice',[.022,.75,.045],[x+offset-.53+bar*.15,h-1.9,z+1.83],timber);
      box('Shoji cross rail',[1.16,.025,.05],[x+offset,h-1.91,z+1.835],timber);
    }
    // Ridge follows the lane; gently overhanging eaves frame each house.
    for(const side of [-1,1]) {
      const panel=box('Sloping ceramic roof',[2.05,.11,3.98],[x+side*.91,h-.95,z],roof);panel.rotation.z=-side*.3;
      box('Roof eave',[.09,.1,4.05],[x+side*1.91,h-1.24,z],roofEdge);
      for(let tile=0;tile<18;tile++) {
        const seam=box('Tile ridge',[2.05,.025,.025],[x+side*.91,h-.88,z-1.86+tile*.22],roofEdge);seam.rotation.z=-side*.3;
      }
    }
    box('Roof crown',[.16,.12,4.1],[x,h-.62,z],roofEdge);
    const light=new THREE.Mesh(new THREE.SphereGeometry(.17,12,10),lantern);light.scale.y=1.45;light.position.set(front-.27,.85,z+1.35);group.add(light);
    for(const y of [.62,1.08])box('Lantern cap',[.19,.025,.19],[front-.27,y,z+1.35],timber);
    box('Lantern bracket',[.36,.03,.03],[front-.15,1.15,z+1.35],timber);
  }
  // A distant pagoda above the roofline, deliberately a quiet silhouette.
  for(let level=0;level<5;level++) {
    const width=3.3-level*.43,y=level*.87+1.5;
    box('Pagoda storey',[width*.64,.65,width*.64],[22,y,-17],timber);
    box('Pagoda lit opening',[.02,.27,width*.45],[22-width*.325,y,-17],glass);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(width*.8,.64,4),roof);cap.rotation.y=Math.PI/4;cap.position.set(22,y+.59,-17);group.add(cap);
    box('Pagoda eave',[width*1.14,.07,width*1.14],[22,y+.28,-17],roofEdge);
  }
  box('Pagoda finial',[.055,1.6,.055],[22,6.64,-17],roofEdge);
  // Garden canopies soften the nearest roofline, without filling the window.
  for(let tree=0;tree<3;tree++) {
    const x=6.8+tree*6,z=-8-tree*6;
    box('Garden trunk',[.12,2.7,.12],[x,.15,z],timber);
    for(let j=0;j<9;j++) {
      const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1),foliage);
      leaves.scale.set(1.5,.45,1);leaves.position.set(x+Math.sin(j*2.4)*.8,1.5+Math.sin(j*.8)*.35,z+Math.cos(j*2.4)*.9);group.add(leaves);
    }
  }
  const moonMaterial=material('#c4c9ba','#c5d2cf');moonMaterial.emissive.set('#9aafbf');moonMaterial.emissiveIntensity=.4;
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.48,20,12),moonMaterial);moon.position.set(36,9,-26);group.add(moon);
  return {update(daylight: number) {
    sky.uniforms.daylight.value=daylight;
    glass.emissiveIntensity=(1-daylight)*.45; lantern.emissiveIntensity=(1-daylight)*.8;
    for(const p of palettes)p.material.color.copy(p.night).lerp(p.day,daylight);
  }};
}
