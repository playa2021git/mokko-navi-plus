const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const script=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({console});vm.runInContext(script.slice(script.indexOf('const T=12'),script.indexOf('const stage=')),ctx);
const run=s=>vm.runInContext(s,ctx);
for(const k of 'ABCDEFGHIJKL'){
 run(`state.work='${k}';state.dims={};state.corners={};state.off={};state.nestX={};state.flip={};state.hole=null;state.handle=false;LBLKEY='';`);
 assert(run(`nest(parts()).boards.every(b=>b.placed.every((q,i)=>q.x>=0&&q.x+q.len<=600&&(!i||q.x>=b.placed[i-1].x+b.placed[i-1].len+KERF)))`),k+' cutting gaps');
 assert(run(`nest(parts()).boards.filter(b=>b.placed.length>1).every(b=>b.placed.at(-1).endE)`),k+' second stock end');
 assert(run(`endReport(parts()).every(r=>!r.fair)`),k+' no alignment approval');
 assert(run(`endReport(parts()).filter(r=>r.ok).every(r=>{const p=parts().find(p=>p.id===r.id),a=endAxis(p);return supportedEnd(p,r.which==='s'?a.s:-a.s,parts());})`));
}
run("state.work='A';state.dims={};state.flip={R:true};state.nestX={};LBLKEY='';");
assert(run("endReport(parts()).some(r=>r.id==='R'&&r.where==='上'&&!r.ok&&!r.fair)"),'screenshot: exposed top rejected');
run("state.flip={};");assert(run("endReport(parts()).some(r=>r.id==='R'&&r.where==='下'&&r.ok)"),'right side automatically uses bottom');
run("state.off.R=[0,20,0]");assert(!run("supportedEnd(parts().find(p=>p.id==='R'),-1,parts())"),'floating end rejected');
console.log('PASS: A–L stock boundaries, cutting allowance, automatic end orientation, exposed/flush top and floating end rejection');
