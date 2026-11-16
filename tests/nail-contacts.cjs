const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({console,assert});
vm.runInContext(script.slice(script.indexOf('const T=12'),script.indexOf('const stage=')),ctx);
vm.runInContext(`
function selectForNailTest(key,dims={}){
 Object.assign(state,{work:key,dims,corners:{},off:{},nestX:{},nestBoard:{},flip:{},hole:null,handle:false});LBLKEY='';
}
function assertNoSeamNails(key,dims,a,b,count){
 selectForNailTest(key,dims);const ps=parts(),spots=nailSpots(ps,true);
 assert.equal(nest(ps).left.length,0,key+' reproduction fits stock');assert.equal(overlappingParts(ps).length,0);
 assert.equal(constructionIssues(ps).length,0,key+' reproduction remains constructible');
 assert(!spots.some(n=>[a,b].includes(n.driver)&&[a,b].includes(n.into)),key+' no seam nails');
 assert.equal(spots.length,count,key+' only intended nails remain');
}
assertNoSeamNails('B',{W:194,H:390,sh:282},'b2','b3',30);
assertNoSeamNails('H',{W:150,H:300,sh:240},'b2','b3',40);
assertNoSeamNails('C',{W:286,H:150},'b1','b2',21);
console.log('PASS B/H/C: exact backboard edge contact, no extra three nails, manufacturing stays valid');
const initialCounts={A:23,B:30,C:21,D:28,E:32,F:25,G:40,H:40,I:33,J:31,K:10,L:32};
for(const [key,count] of Object.entries(initialCounts)){
 selectForNailTest(key);assert.equal(nailSpots(parts(),true).length,count,key+' default nail count unchanged');
}
selectForNailTest('A');state.off.L=[-.5,0,0];
assert(!nailSpots(parts(),true).some(n=>n.driver==='L'&&['bo','sh'].includes(n.into)),'no nails across 0.5mm side gaps');
assert(constructionIssues().some(i=>i.t.includes('0.5mm')),'gap warning remains available');
console.log('PASS 12 default counts unchanged; 0.5mm gap has a warning and no floating nails');
let cases=0,nails=0;
function inspectNailGeometry(){
 const ps=parts(),spots=nailSpots(ps,true),seen=new Set();cases++;
 for(const n of spots){
  nails++;assert.notEqual(n.driver,n.into,'no self nail');assert(n.pos.every(Number.isFinite),'finite nail coordinates');
  const driver=ps.find(p=>p.id===n.driver),receiver=ps.find(p=>p.id===n.into);
  // Independent physical invariant: a straight nail starts through the broad face of its driver board.
  const normal={side:0,flat:1,front:2}[driver.posture];assert.equal(n.axis,normal,'nail must enter through board thickness');
  const a=bbox(driver),b=bbox(receiver),axis=n.axis;
  const exit=n.dir>0?a.max[axis]:a.min[axis],entry=n.dir>0?b.min[axis]:b.max[axis];
  assert(Math.abs(exit-entry)<1e-6,'no nails across a gap');assert(Math.abs(n.pos[axis]-exit)<1e-6,'nail starts at the actual joint');
  const signature=[n.driver,n.into,n.axis,...n.pos.map(v=>mm(v))].join('|');assert(!seen.has(signature),'no duplicate nails');seen.add(signature);
 }
}
for(const key of Object.keys(WORKS)){
 selectForNailTest(key);const defs=defDims(key);inspectNailGeometry();
 // Every adjustable value in 0.5mm increments, with the other dimensions at their defaults.
 for(const t of WORKS[key].dims)for(let v=t.min;v<=t.max;v+=.5){state.dims={...defs,[t.k]:v};inspectNailGeometry();}
 // Cross-dimension boundary combinations catch width/height-dependent rounding and contact transitions.
 const w=WORKS[key].dims.find(t=>t.k==='W'),h=WORKS[key].dims.find(t=>t.k==='H');
 for(const width of [w.min,w.min+.5,w.def-.5,w.def,w.def+.5,w.max-.5,w.max])
 for(const height of [h.min,h.min+.5,h.def-.5,h.def,h.def+.5,h.max-.5,h.max]){state.dims={...defs,W:width,H:height};inspectNailGeometry();}
}
// Every integer height/shelf combination in B/H's design bounds, including all backboard seams.
for(const key of ['B','H']){
 selectForNailTest(key);const height=WORKS[key].dims.find(t=>t.k==='H'),shelf=WORKS[key].dims.find(t=>t.k==='sh');
 for(let H=height.min;H<=height.max;H++){
  const d={...defDims(key),H},range=shelf.lim(d);
  for(let sh=Math.ceil(Math.max(shelf.min,range[0]));sh<=Math.min(shelf.max,range[1]);sh++){state.dims={...d,sh};inspectNailGeometry();}
 }
}
console.log('PASS contact sweep: '+cases+' dimension cases, '+nails+' candidate nails; correct entry face, exact contact, no duplicates or nonfinite positions');
`,ctx);
