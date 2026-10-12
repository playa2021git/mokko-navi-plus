const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),s=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({console});vm.runInContext(s.slice(s.indexOf('const T=12'),s.indexOf('const stage=')),ctx);const run=x=>vm.runInContext(x,ctx);
let checked=0,nearTop=0,nearGround=0;
for(const key of 'ABCDEFGHIJKL')for(const mode of ['default','dimensions','flip','position','corner','hole']){
 run(`state.work='${key}';state.dims={};state.corners={};state.off={};state.nestX={};state.flip={};state.hole=null;state.handle=false;LBLKEY='';`);
 if(mode==='dimensions')run('state.dims.W=defDims(state.work).W-2;state.dims.H=defDims(state.work).H-5');
 if(mode==='flip')run('for(const p of parts())state.flip[p.id]=true');
 if(mode==='position')run('for(const p of parts())state.nestX[p.id]=5');
 if(mode==='corner')run("state.corners.L=[{type:'round',size:5},none,none,none]");
 if(mode==='hole')run("{const candidate=parts().find(p=>p.posture==='flat');if(candidate)state.hole={id:candidate.id,x:candidate.w/2};}");
 const ps=run('parts()');
 for(const p of ps){
  const rows=run(`nailCoordinates(parts().find(p=>p.id==='${p.id}'))`);
  for(const r of rows){
   const f=run(`toFace(parts().find(p=>p.id==='${p.id}'),${JSON.stringify(r.nail.pos)})`);
   assert(Math.abs(r.y-f[1])<1e-9);assert.equal(r.datum.y,0);assert(Math.abs(r.x-Math.abs(f[0]-r.datum.x))<1e-9);
   if(r.datum.nearest)assert(Math.abs(r.x-Math.min(f[0],p.w-f[0]))<1e-9);
   if(p.posture==='side'||(p.posture==='front'&&p.la==='h')){assert.equal(r.datum.yLabel,'地');assert.equal(r.datum.nearest,false);}
   assert.equal(r.number,rows.indexOf(r)+1);if(r.y>p.h*.7)nearTop++;if(r.y<p.h*.3)nearGround++;checked++;
  }
 }
}
assert(nearTop>0&&nearGround>0);assert(!s.includes('const fromBottom'));assert(!s.includes('const fromLeft'));
assert(s.includes('dimV(Y(0),Y(fy)'));assert(s.includes('dimH(X(origin),X(fx)'));
assert(s.includes('地（寸法の基準）'));assert(s.includes('nailDatumSheet(ps)'));
console.log(`PASS: ${checked} nails A–L, default/dimensions/flips/stock positioning/corners/holes; ground and designated horizontal datum; no nearest top edge`);
