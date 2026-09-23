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
