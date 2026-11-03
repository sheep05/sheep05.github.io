import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Collapse fixed geometry sharing materials into a small number of draw calls.
// Interactive objects and their descendants retain their identity for raycasting.
export function batchStatic(scene: THREE.Scene, movable: THREE.Object3D[]) {
  scene.updateMatrixWorld(true);
  const excluded=new Set<THREE.Object3D>();movable.forEach(o=>o.traverse(child=>excluded.add(child)));
  const groups=new Map<string,THREE.Mesh[]>();
  scene.traverse(o=>{
    const mesh=o as THREE.Mesh;
    if(!mesh.isMesh||(mesh as THREE.InstancedMesh).isInstancedMesh||excluded.has(mesh)||Array.isArray(mesh.material)||mesh.children.length)return;
    const key=`${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
    const list=groups.get(key)||[];list.push(mesh);groups.set(key,list);
  });
  for(const meshes of groups.values()){
    if(meshes.length<2)continue;
    const geometries=meshes.map(mesh=>{
      const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);return g;
    });
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;
    const batch=new THREE.Mesh(merged,meshes[0].material);batch.name='Static study details';batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;scene.add(batch);
    // Geometry instances may be shared, so dispose only after the complete scene's life.
    meshes.forEach(mesh=>{mesh.removeFromParent();mesh.geometry.dispose();});
  }
}
