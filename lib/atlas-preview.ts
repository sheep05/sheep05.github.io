export type AtlasRect = { x: number; y: number; width: number; height: number };
// Search adjacent free spaces, including the edges of every visible obstacle.
// Never trade an overlap for a shorter distance to the selected country.
export function atlasPreviewPosition(label: AtlasRect, card: {width:number;height:number}, bounds: {width:number;height:number}, obstacles: AtlasRect[] = []) {
  const gap=10, edge=8;
  const maxX=bounds.width-card.width-edge, maxY=bounds.height-card.height-edge;
  if(maxX<edge || maxY<edge)return null;
  const blocked=[label,...obstacles];
  const xs=new Set([edge,maxX,label.x,label.x+(label.width-card.width)/2]);
  const ys=new Set([edge,maxY,label.y,label.y+(label.height-card.height)/2]);
  for(const r of blocked) {
    xs.add(r.x-card.width-gap);xs.add(r.x+r.width+gap);
    ys.add(r.y-card.height-gap);ys.add(r.y+r.height+gap);
  }
  let best: {x:number;y:number} | null=null, bestScore=Infinity;
  for(const x of xs)for(const y of ys) {
    if(x<edge || y<edge || x>maxX || y>maxY)continue;
    if(blocked.some(r=>x<r.x+r.width+gap && x+card.width+gap>r.x && y<r.y+r.height+gap && y+card.height+gap>r.y))continue;
    const dx=Math.max(label.x-x-card.width,x-label.x-label.width,0);
    const dy=Math.max(label.y-y-card.height,y-label.y-label.height,0);
    const centers=Math.hypot(x+card.width/2-label.x-label.width/2,y+card.height/2-label.y-label.height/2);
    const score=Math.hypot(dx,dy)*10+centers;
    if(score<bestScore){bestScore=score;best={x,y};}
  }
  return best;
}
