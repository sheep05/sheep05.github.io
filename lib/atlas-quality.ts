// Perspective silhouette of a sphere centred on the camera's viewing axis.
export function globeDiameter(height:number, fov:number, distance:number, radius:number) {
  return height * radius / (Math.tan(fov * Math.PI / 360) * Math.sqrt(distance * distance - radius * radius));
}

export function atlasPixelRatio(width:number,height:number,dpr:number){
  return Math.max(1,Math.min(dpr,2.5,Math.sqrt(6000000/Math.max(1,width*height))));
}
