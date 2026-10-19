// Small, cached paintings shared by the dice and their picker previews.
// Texture decoration is deterministic and never consumes roll randomness.
const textures = new Map();
const size = 256;

function star(ctx,x,y,r,color) {
  ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4-Math.PI/2,d=i%2?r*.24:r;
    const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
    if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();ctx.fill();
}

function unicorn(ctx) {
  const base=ctx.createLinearGradient(0,0,256,256);
  base.addColorStop(0,'#fff0ee');base.addColorStop(.42,'#efdcff');base.addColorStop(.72,'#ccecf5');base.addColorStop(1,'#fff3d9');
  ctx.fillStyle=base;ctx.fillRect(0,0,size,size);
  // A ribbon of candy-colored enamel wraps around a corner.
  ['#ed94bc','#ffc5a3','#ffe6a4','#ace5d0','#aacbf3','#c5a6e6'].forEach((color,i)=>{
    ctx.strokeStyle=color;ctx.lineWidth=9;ctx.beginPath();ctx.arc(258,8,112-i*9,0,Math.PI*2);ctx.stroke();
  });
  // An original little unicorn cameo, kept away from the central number.
  ctx.save();ctx.translate(88,164);ctx.scale(.8,.8);
  ctx.fillStyle='#bc93df';ctx.beginPath();ctx.moveTo(24,91);ctx.bezierCurveTo(1,64,10,27,38,19);ctx.bezierCurveTo(67,7,83,43,75,70);ctx.lineTo(56,92);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ef9abe';ctx.beginPath();ctx.moveTo(19,83);ctx.bezierCurveTo(37,67,19,48,43,25);ctx.bezierCurveTo(23,32,8,55,19,83);ctx.fill();
  ctx.fillStyle='#fffaf1';ctx.beginPath();ctx.moveTo(39,91);ctx.lineTo(69,91);ctx.lineTo(59,62);ctx.lineTo(79,64);ctx.quadraticCurveTo(89,62,85,53);ctx.lineTo(63,28);ctx.lineTo(59,9);ctx.lineTo(46,24);ctx.bezierCurveTo(24,31,36,54,39,91);ctx.fill();
  ctx.fillStyle='#d6a355';ctx.beginPath();ctx.moveTo(62,27);ctx.lineTo(79,0);ctx.lineTo(73,37);ctx.fill();
  ctx.strokeStyle='#725785';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(58,44);ctx.quadraticCurveTo(63,48,67,44);ctx.stroke();
  ctx.fillStyle='#f3b6cd';ctx.beginPath();ctx.arc(69,53,4,0,Math.PI*2);ctx.fill();ctx.restore();
  [[24,30,8],[98,22,5],[227,162,8],[186,228,7],[24,112,4],[148,245,4]].forEach(([x,y,r])=>star(ctx,x,y,r,'#fffdf2'));
  [[75,20],[221,111],[236,219],[108,235],[16,74]].forEach(([x,y])=>{ctx.fillStyle='#b091ca';ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();});
}

function blockcraft(ctx) {
  const earth=['#896043','#9a6e4e','#80563e','#aa7a55','#76513d'];
  const grass=['#69a540','#7db34b','#8fbd53','#5d9638','#72aa43'];
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const hash=(x*37+y*53+x*y*13)%101;
    const grassDepth=4+((x*7)%3);
    ctx.fillStyle=y<grassDepth?grass[hash%grass.length]:earth[hash%earth.length];
    ctx.fillRect(x*16,y*16,16,16);
    if(y>=grassDepth&&hash%7===0){ctx.fillStyle='#b49978';ctx.fillRect(x*16,y*16,8,8);}
  }
  ctx.fillStyle='#b3d67d';ctx.fillRect(0,0,256,6);
  ctx.fillStyle='#3e612736';ctx.fillRect(0,80,256,4);
}

function galaxy(ctx) {
  ctx.fillStyle='#171c41';ctx.fillRect(0,0,size,size);
  [[42,190,150,'#773fb1'],[182,75,124,'#9b4a9c'],[218,202,130,'#256a96'],[70,37,92,'#344889']].forEach(([x,y,r,color])=>{
    const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,color);glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,size,size);
  });
  for(let i=0;i<68;i++){
    const x=(i*73+13)%256,y=(i*i*19+23)%256,r=i%5===0?1.25:.65;
    ctx.fillStyle=i%3?'#dfe8ff99':'#ffe6cf';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  [[27,39,8],[225,202,8],[199,37,4],[46,220,5]].forEach(([x,y,r])=>star(ctx,x,y,r,'#fff4d6'));
  // A fine constellation at the edge leaves the result uncluttered.
  ctx.strokeStyle='#b6d6ff55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(27,39);ctx.lineTo(77,24);ctx.lineTo(96,55);ctx.lineTo(142,22);ctx.stroke();
}

export function skinTexture(theme) {
  if(textures.has(theme))return textures.get(theme);
  const paint={unicorn,blockcraft,galaxy}[theme];
  if(!paint)return null;
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  paint(canvas.getContext('2d'));textures.set(theme,canvas);return canvas;
}

export function paintFace(ctx,theme,bounds,brightness) {
  const texture=skinTexture(theme);if(!texture)return;
  const {left,top,width,height}=bounds;
  ctx.save();ctx.imageSmoothingEnabled=theme!=='blockcraft';
  ctx.drawImage(texture,left,top,width,height);
  // Keep directional lighting on the artwork so every theme remains solid 3D.
  const shade=ctx.createLinearGradient(left,top,left+width,top+height);
  shade.addColorStop(0,`rgba(8,6,20,${Math.max(0,1-brightness-.08)})`);
  shade.addColorStop(1,`rgba(8,6,20,${Math.max(0,1-brightness+.08)})`);
  ctx.fillStyle=shade;ctx.fillRect(left,top,width,height);ctx.restore();
}
