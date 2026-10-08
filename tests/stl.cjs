const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const slice=(a,b)=>script.slice(script.indexOf(a),script.indexOf(b));
const ctx=vm.createContext({THREE:require('../three.min.js'),console});
vm.runInContext(slice('const T=12','const stage=')+'\nlet buildSTL;\n'+slice('  function holePath(', '  /* 穴をつかんで動かすための玉。'),ctx);
const run=s=>vm.runInContext(s,ctx);
function inspect(divisor){
 const data=run(`buildSTL(${divisor})`),v=new DataView(data),count=v.getUint32(80,true);
 assert(count>0);assert.equal(data.byteLength,84+count*50);
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let n=0;n<count;n++){
  const offset=84+n*50;
  for(let j=0;j<12;j++)assert(Number.isFinite(v.getFloat32(offset+j*4,true)));
  for(let j=0;j<3;j++)for(let axis=0;axis<3;axis++){
   const value=v.getFloat32(offset+12+j*12+axis*4,true);
   lo[axis]=Math.min(lo[axis],value);hi[axis]=Math.max(hi[axis],value);
  }
 }
 const expected=run(`(()=>{const bs=parts().map(bbox);return [0,2,1].map(i=>(Math.max(...bs.map(b=>b.max[i]))-Math.min(...bs.map(b=>b.min[i])))/${divisor});})()`);
 expected.forEach((value,i)=>assert(Math.abs(hi[i]-lo[i]-value)<0.001));
 assert(Math.abs(lo[2])<0.001);assert(Math.abs(lo[0]+hi[0])<0.001);
 return count;
}
for(const k of 'ABCDEFGHIJ'){
 run(`state.work='${k}';state.dims={};state.corners={};state.off={};state.hole=null;state.handle=false;state.refs=[];`);
 for(const d of [2,3,5,10])inspect(d);
}
run("state.work='A';state.corners={};state.hole=null;state.handle=false");
const plain=inspect(2);
run("state.hole={id:'bo',x:100}");assert(inspect(2)>plain);
run("state.hole=null;state.handle=true");assert(inspect(2)>plain);
run("state.handle=false;state.corners.L=[{type:'round',size:40},none,none,none]");assert(inspect(3)>plain);
const before=run('buildSTL(5)');
run("state.refs=[{kind:'book',w:100,h:100,d:100,pos:[999,999,999]}]");
assert.deepEqual(Buffer.from(run('buildSTL(5)')),Buffer.from(before));
assert.throws(()=>run('buildSTL(4)'));
assert(html.includes('#stage canvas{display:block;width:100%;height:100%}'));
console.log('PASS: A–J at all four scales, binary STL dimensions, Z-up/ground, rounded corners, cable/hand holes, reference exclusion');
