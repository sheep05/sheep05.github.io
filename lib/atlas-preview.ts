type Rect = { x: number; y: number; width: number; height: number };
// Prefer beside the label; narrow screens use the nearest clear space below/above.
export function atlasPreviewPosition(label: Rect, card: {width:number;height:number}, bounds: {width:number;height:number}) {
  const gap=10, edge=8;
  const maxX=Math.max(edge,bounds.width-card.width-edge);
  const maxY=Math.max(edge,bounds.height-card.height-edge);
  let x=label.x+label.width+gap, y=label.y;
  if(x>maxX) {
    x=label.x-card.width-gap;
    if(x<edge) {
      x=label.x+(label.width-card.width)/2;
      y=label.y+label.height+gap;
      if(y>maxY)y=label.y-card.height-gap;
    }
  }
  return {x:Math.max(edge,Math.min(x,maxX)),y:Math.max(edge,Math.min(y,maxY))};
}
