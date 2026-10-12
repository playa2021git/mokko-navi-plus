const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const script=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const between=(a,b)=>script.slice(script.indexOf(a),script.indexOf(b));
const ctx=vm.createContext({console});
vm.runInContext(between('const T=12','const stage=')+between('function stockMembers(','function nestHole(')+between('function compartments(', 'const UNIT=')+
 between('function checkAll(','const nestCv=')+between('function validateDesign(',"$('openFile').onchange"),ctx);
const run=s=>vm.runInContext(s,ctx);
function select(key){run(`state.work='${key}';state.dims={};state.corners={};state.off={};state.nestX={};state.flip={};state.refs=[];state.hole=null;state.handle=false;LBLKEY='';`);}
assert.equal(run('STOCK.map(b=>b.h+"×"+b.w).join(",")'),'150×600,150×600,60×600');
for(const key of ['K','L']){
 select(key);assert.equal(run('nest(parts()).left.length'),0);assert.equal(run('overlappingParts(parts()).length'),0);
 assert.equal(run('nailSpots(parts(),true).filter(n=>!n.valid).length'),0);
 const counts=key==='K'?4:8;assert.equal(run('parts().length'),counts);
 assert.equal(run(`validateDesign({version:10,work:'${key}',dims:{},refs:[]}).work`),key);
 if(key==='L'){assert(run('parts().every(p=>!p.process && !p.nestKey)'));continue;}
 const group=run('nest(parts()).boards.flatMap(b=>b.placed).find(q=>q.process)');assert.equal(group.members.length,2);
 // Every shared profile stays within its stock blank and the two pieces never overlap.
 assert(run(`(()=>{const ps=parts(),q=nest(ps).boards.flatMap(b=>b.placed).find(q=>q.process);
   const polys=stockMembers(ps,q).map(p=>partOutline(p).map(v=>stockPoint(p,q,...v)));
   if(polys.flat().some(([x,y])=>x<-.001||y<-.001||x>q.len+.001||y>q.bw+.001))return false;
   for(let x=.4;x<q.len;x+=2)for(let y=.4;y<q.bw;y+=2)
     if(polys.every(poly=>insidePolygon([x,y],poly)))return false;
   return true;})()`));
 const member=group.members[1];assert(run(`nestRange(parts(),'${member}').q.id==='${group.id}'`));
 run(`state.nestX['${group.id}']=5;state.flip['${group.id}']=true`);
 assert.equal(run('nest(parts()).left.length'),0);
 assert(run(`(()=>{const ps=parts(),q=nest(ps).boards.flatMap(b=>b.placed).find(q=>q.process);
   return stockMembers(ps,q).flatMap(p=>partOutline(p).map(v=>stockPoint(p,q,...v))).every(([x,y])=>x>=-.001&&y>=-.001&&x<=q.len+.001&&y<=q.bw+.001);})()`));
}
select('K');assert.equal(run('parts().find(p=>p.id==="sh").bw'),60);
assert(run('compartments(parts()).some(c=>c.y===30&&c.h===null&&c.d===90)'));
assert(run('compartments(parts()).some(c=>c.y===30&&c.h===108&&c.d===60)'));
assert(!run('pointOnWood(parts()[0],[-244,150,40])'));assert(run('pointOnWood(parts()[0],[-244,150,-40])'));
assert(!run('woodOverlapsBox(parts()[0],{min:[-250,130,20],max:[-238,160,60]})'));
assert(run('woodOverlapsBox(parts()[0],{min:[-250,130,-60],max:[-238,160,-20]})'));
assert.equal(run('processLines(parts(),nest(parts()).boards.flatMap(b=>b.placed).find(q=>q.process))[0].length'),4);
select('L');assert(run('parts().filter(p=>p.role==="foot").every(p=>p.w===100&&p.h===150&&p.la==="w")'));assert.equal(run('parts().find(p=>p.id==="L").h'),211);assert.equal(run('outer().H'),235);assert.equal(run('outer().W'),338);assert.equal(run('outer().D'),150);
assert(run('compartments(parts()).some(c=>c.y===48&&c.h===115&&c.d===126)'));
assert(!run('compartments(parts()).some(c=>c.y===12)'));
assert(run('parts().find(p=>p.id==="footL").pos[0]===parts().find(p=>p.id==="L").pos[0]'));
assert(run('parts().find(p=>p.id==="footR").pos[0]===parts().find(p=>p.id==="R").pos[0]'));
assert(run('parts().filter(p=>p.role==="brace").every(p=>Math.abs(bbox(p).max[1]-bbox(parts().find(p=>p.id==="tp")).min[1])<.001)'));
assert(run('nest(parts()).boards.every(b=>b.placed.length>0)'));
assert(run('nest(parts()).boards.find(b=>b.id==="C").placed.every(q=>q.bw===60)'));
assert(run('checkAll(parts(),[]).msgs.some(m=>m.t.includes("耐荷重は未確認"))'));
console.log('PASS: K/L stock grouping, non-overlapping shared cuts, stepped wood/collision tests, grouped drag/flip, save validation, centered feet, braces contact seat, load label');
