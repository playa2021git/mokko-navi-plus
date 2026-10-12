const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const script=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({console});vm.runInContext(script.slice(script.indexOf('const T=12'),script.indexOf('const stage=')),ctx);const run=s=>vm.runInContext(s,ctx);
for(const k of 'ABCDEFGHIJKL'){
 run(`state.work='${k}';state.dims={};state.corners={};state.off={};state.nestX={};state.flip={};state.hole=null;state.handle=false;LBLKEY='';`);
 assert.equal(run('nest(parts()).left.length'),0,k+' fits');
 assert(run(`nest(parts()).boards.every(b=>b.placed.every((q,i)=>q.x===(i?b.placed[i-1].x+b.placed[i-1].len+KERF:0)&&q.x+q.len<=b.w&&!stockFlip(q)))`),k+' left packed / no autoflip');
 const ps=run('JSON.stringify(parts())'),nails=run('JSON.stringify(nailSpots(parts()))');
 run(`for(const b of nest(parts()).boards){const q=b.placed.at(-1);if(q)state.nestX[q.id]=b.w-q.len;}`);
 assert(run('nest(parts()).boards.every(b=>!b.placed.length||b.placed.at(-1).endE)'),k+' right end');
 const saved=run('JSON.stringify({nestX:state.nestX,flip:state.flip})'),positions=run('JSON.stringify(nest(parts()))');
 run('state.nestX={};state.flip={}');run(`Object.assign(state,JSON.parse(${JSON.stringify(saved)}))`);assert.equal(run('JSON.stringify(nest(parts()))'),positions,k+' saved positions');
 run(`for(const b of nest(parts()).boards){const q=b.placed.at(-1);if(q&&q.x>1)state.nestX[q.id]=q.x-1;}`);
 assert(run('nest(parts()).boards.every(b=>!b.placed.length||b.placed.at(-1).x===0||!b.placed.at(-1).endE)'),k+' right end released');
 assert(run('nest(parts()).boards.every(b=>b.placed.every((q,i)=>q.x>=0&&q.x+q.len<=b.w&&(!i||q.x>=b.placed[i-1].x+b.placed[i-1].len+KERF)))'));
 assert.equal(run('JSON.stringify(parts())'),ps);assert.equal(run('JSON.stringify(nailSpots(parts()))'),nails);
 console.log('PASS',k,'left packed, manual positions, ends, gaps, unchanged parts/nails');
}
assert(!script.includes('q.autoFlip='));assert(script.includes('Math.abs(x-target)<SNAP'));console.log('PASS: no automatic end optimization; existing drag snap retained');
