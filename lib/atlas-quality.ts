// Keep fine coastlines on capable GPUs without forcing a 128MB texture on phones.
// Perspective silhouette of a sphere centred on the camera's viewing axis.
export function globeDiameter(height:number, fov:number, distance:number, radius:number) {
  return height * radius / (Math.tan(fov * Math.PI / 360) * Math.sqrt(distance * distance - radius * radius));
}

export function atlasTextureFile(maxTextureSize:number, viewportWidth:number, deviceMemory?:number){
  if(maxTextureSize<4096)return 'earth-day.jpg';
  return maxTextureSize>=8192&&viewportWidth>=1000&&(deviceMemory===undefined||deviceMemory>=6)
    ?'earth-day-8k.jpg':'earth-day-4k.jpg';
}
export function atlasPixelRatio(width:number,height:number,dpr:number){
  return Math.max(1,Math.min(dpr,2.5,Math.sqrt(6000000/Math.max(1,width*height))));
}
