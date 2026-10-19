import test from 'node:test';
import assert from 'node:assert/strict';
import { geometry, randomDie, dot, sub, settledOrientation, rotate, supportHeight, rollMotion, bounceContacts, cameraUp } from '../dist/dice.js';

test('Each standard solid has the right number of outward-facing, planar faces',()=>{
  for(const sides of [4,6,8,10,12,20]){
    const faces=geometry(sides).faces.filter(f=>!f.bevel);
    assert.equal(faces.length,sides,`D${sides} face count`);
    assert.deepEqual(faces.map(f=>f.value).sort((a,b)=>a-b),Array.from({length:sides},(_,i)=>i+1));
    for(const f of faces){assert.ok(dot(f.center,f.normal)>0);for(const p of f.vs)assert.ok(Math.abs(dot(sub(p,f.center),f.normal))<1e-6);}
  }
});
test('Rejection sampling skips the biased tail of the 32-bit range',()=>{
  const sequence=[4294967295,4294967294,4294967292,5];let calls=0;
  const random={getRandomValues(buffer){buffer[0]=sequence[calls++];return buffer;}};
  assert.equal(randomDie(6,random),6);assert.equal(calls,4);
});
test('Every valid face value is reachable exactly once in a complete cycle',()=>{
  for(const sides of [4,6,8,10,12,20,100,999,1000]){
    let current=0;const random={getRandomValues(buffer){buffer[0]=current++;return buffer;}};
    assert.deepEqual(Array.from({length:sides},()=>randomDie(sides,random)),Array.from({length:sides},(_,i)=>i+1));
  }
});
test('Invalid side counts cannot produce a roll',()=>{for(const value of [0,1,1001,NaN,2.5])assert.throws(()=>randomDie(value),RangeError);});

test('Every result lands level on top, with readable text and a camera angle that reveals depth',()=>{
  for(const sides of [4,6,8,10,12,20,100,17,1000])for(let value=1;value<=sides;value++){
    const faces=geometry(sides).faces.filter(f=>!f.bevel);
    const selected=faces.find(f=>f.value===([4,6,8,10,12,20].includes(sides)?value:1));
    const q=settledOrientation(sides,value),normal=rotate(selected.normal,q),right=rotate(selected.u,q);
    assert.ok(Math.abs(normal[2]-1)<1e-9,`D${sides}, ${value} must face straight up`);
    assert.ok(right[0]>.9&&Math.abs(right[2])<1e-9,`D${sides}, ${value} text stays upright on the table`);
    assert.equal(faces.filter(f=>rotate(f.normal,q)[2]>.999).length,1);
  }
  assert.ok(cameraUp[1]>.5&&cameraUp[2]>.75&&cameraUp[2]<.9);
});

test('The cube rests on a full bottom face, and no vertex penetrates the table',()=>{
  const shape=geometry(6);
  for(let value=1;value<=6;value++){
    const q=settledOrientation(6,value),height=supportHeight(shape,q);
    const points=shape.faces.flatMap(f=>f.vs.map(p=>rotate(p,q)[2]+height));
    assert.ok(points.every(z=>z>=-1e-9));
    assert.ok(points.filter(z=>Math.abs(z)<1e-9).length>=4);
  }
});

test('Bounces touch the table, lose height, and finish without a rotational snap',()=>{
  const peaks=[rollMotion(.23).height,rollMotion(.585).height,rollMotion(.785).height];
  assert.ok(peaks[0]>peaks[1]&&peaks[1]>peaks[2]);
  for(const contact of [0,...bounceContacts,1])assert.ok(Math.abs(rollMotion(contact).height)<1e-9);
  for(const contact of bounceContacts){
    const before=rollMotion(contact-1e-7),after=rollMotion(contact+1e-7);
    assert.ok(Math.abs(before.turn-after.turn)<1e-5);
    assert.ok(Math.abs(before.rock-after.rock)<1e-5);
  }
  assert.deepEqual(rollMotion(1),{height:0,turn:1,rock:0});
});
