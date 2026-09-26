const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
function between(a,b){return script.slice(script.indexOf(a),script.indexOf(b));}
const code=between('const T=12','const stage=')+between('function checkAll(', 'const nestCv=')+between('function partTable(', 'function showTable(')+between('function validateDesign(', "$('openFile').onchange")+between('const SQ2=', 'const QUIZ=')+between('const QUIZ=', 'const QSCENE=');
const context=vm.createContext({console});vm.runInContext(code,context);
const run=s=>vm.runInContext(s,context);
function select(k){run(`state.work='${k}';state.dims={};state.corners={};state.hole=null;state.handle=false;state.off={};state.nestX={};state.refs=[];LBLKEY='';`);}
for(const k of 'ABCDEFGHIJ'){
 select(k);
 assert.equal(run('nest(parts()).left.length'),0,k+' stock');
 assert(run('nailSpots(parts()).every(n=>n.valid)'),k+' nails');
 const svg=run('manualSheet()');
 assert(!/NaN|undefined/.test(svg),k+' sheet values');
 const ys=[...svg.matchAll(/<text[^>]* y="([\d.]+)"/g)].map(m=>+m[1]);
 console.log(k, 'nails',run('nailSpots(parts()).length'),'maxTextY',Math.max(...ys));
 assert(Math.max(...ys)<=297,k+' print overflow');
}
select('I');assert(run("assemblySteps(parts()).join('').includes('仕切板から棚板へ')"));
select('G');assert(run("assemblySteps(parts()).join('').includes('取っ手①')"));
select('J');assert(!run("assemblySteps(parts()).join('').includes('仕切板②を前に当て')"));
select('A');run("state.corners.L=[{type:'chamfer',size:50},none,none,none]");
assert(run('nailSpots(parts(),true).some(n=>!n.valid)'));
assert(run("checkAll(parts(),[]).msgs.some(m=>m.lv==='bad')"));
assert.equal(run('partTable(parts(),true).filter(r=>r.bw===150&&r.len===315).length'),2);
select('A');assert.equal(run('workload(state.work).cuts'),6);
run("state.nestX.sh=340;state.nestX.bo=340;state.nestX.b2=316");
assert.equal(run('workload(state.work).cuts'),6);
run("state.nestX.sh=330");assert.equal(run('workload(state.work).cuts'),7);
for(const json of ['{"work":"A","corners":{"L":[]}}','{"work":"A","refs":{}}','{"work":"A","dims":{"W":-1}}','{"work":"A","comment":5}']){
 assert.throws(()=>run(`validateDesign(${json})`));
}
assert(run("validateDesign({version:10,work:'A',dims:{},refs:[],quiz:{ans:[],step:0,done:false}}).work==='A'"));
console.log('PASS: syntax, A–J geometry/sheets, assembly, nails, table, cuts, input validation');

// Manufacturing regressions: source functions and actual canvas text output.
run(between('function partsFor(', 'function limitDialog('));
run('var refresh=()=>{};');
select('B');assert.equal(run("trySetDim('sh',302,true)"),false);
select('H');assert.equal(run("trySetDim('sh',244,true)"),false);
let accepted=0;
for(const k of 'ABCDEFGHIJ'){
 select(k);const defs=run('WORKS[state.work].dims');
 for(const t of defs){
  select(k);const lim=run(`dimLim(WORKS[state.work].dims.find(t=>t.k==='${t.k}'),dimsOf())`);
  for(let v=lim[0];v<=lim[1];v+=t.step){
   select(k);
   if(run(`trySetDim('${t.k}',${v},true)`)){
    accepted++;assert.equal(run('overlappingParts(parts()).length'),0,`${k} ${t.k}=${v}`);
   }
  }
 }
}
select('A');run("state.hole={id:'bo',x:25}");
assert(run("nailSpots(parts(),true).some(n=>n.driver==='L'&&n.into==='bo'&&!n.valid)"));
assert(run("checkAll(parts(),[]).msgs.some(m=>m.lv==='bad')"));
run('state.hole.x=100');assert(run('nailSpots(parts(),true).every(n=>n.valid)'));
const canvasText=[];
context.devicePixelRatio=1;
context.document={getElementById:()=>({clientWidth:1400,clientHeight:1000,getContext:()=>new Proxy({measureText:t=>({width:String(t).length*6}),fillText:t=>canvasText.push(String(t))},{get:(o,k)=>k in o?o[k]:(()=>{})})})};
run(between('const dimCv=', 'const drawCv='));
select('F');run("trySetDim('W',458,true);state.showDim=true;state.sel='bo';state.selKind='part';drawDim()");
assert(canvasText.includes('105.5'));assert(canvasText.includes('111.5'));assert(canvasText.includes('434'));
assert(!canvasText.includes('112'));
canvasText.length=0;select('I');run("state.showDim=true;state.sel='b1';drawDim()");
assert(canvasText.some(t=>t.includes('左143 下27')));
for(const k of 'ABCDEFGHIJ'){
 select(k);
 const ids=run('parts().map(p=>p.id)');
 for(const id of ids){
  canvasText.length=0;run(`state.sel='${id}';state.showDim=true;drawDim()`);
  assert.equal(canvasText.filter(t=>/^\d+: 左/.test(t)).length,run(`nailSpots(parts()).filter(n=>n.driver==='${id}').length`),`${k}/${id}: all nail coordinates`);
 }
}
console.log(`PASS: manufacturing sweep (${accepted} accepted), overlap rejection, nail paths, fractional dimensions, coordinates for every default nail`);
