const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),path=require('path'),fs=require('fs'),assert=require('assert');
const out=process.env.AUDIT_OUTPUT||path.join(require('os').tmpdir(),'mokko-left-pack');fs.mkdirSync(out,{recursive:true});
(async()=>{for(const channel of ['chrome','msedge']){const b=await chromium.launch({channel,headless:true}),p=await b.newPage({acceptDownloads:true,viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
for(const key of 'ABCDEFGHIJKL'){
 await p.evaluate(k=>{chooseWork(k,true);state.showEnds=false;state.showNames=false;refresh();},key);
 assert(await p.evaluate(()=>nest(parts()).boards.every(b=>b.placed.every((q,i)=>q.x===(i?b.placed[i-1].x+b.placed[i-1].len+KERF:0)))));
 if(key==='A')await p.screenshot({path:path.join(out,channel+'-initial.png'),fullPage:true});
 const target=await p.evaluate(()=>{const bd=nest(parts()).boards.find(b=>b.placed.length&&b.placed.at(-1).x+b.placed.at(-1).len<b.w-1),q=bd.placed.at(-1),h=nestHit.find(h=>h.id===q.id&&!h.hole),r=nestCv.getBoundingClientRect();return {id:q.id,x:r.left+(h.x0+h.x1)/2,y:r.top+(h.y0+h.y1)/2,delta:(bd.w-q.len-q.x-4)*h.sc,end:bd.w-q.len};});
 await p.mouse.move(target.x,target.y);await p.mouse.down();await p.mouse.move(target.x+target.delta,target.y,{steps:5});await p.mouse.up();
 assert.equal(await p.evaluate(id=>state.nestX[id],target.id),target.end,'actual drag snap '+key);
 assert(await p.evaluate(id=>nestRange(parts(),id).q.endE,target.id));
 if(key==='A')await p.screenshot({path:path.join(out,channel+'-moved.png'),fullPage:true});
 await p.evaluate(()=>{state.showEnds=true;refresh();});
 if(key==='A')await p.screenshot({path:path.join(out,channel+'-transparent.png'),fullPage:true});
 const before=await p.evaluate(()=>JSON.stringify(nest(parts())));
 await p.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=function(blob){window.__savedBlob=blob;return original.call(this,blob);};});await p.locator('#save').click();const json=await p.evaluate(()=>__savedBlob.text());const saved=path.join(out,channel+'-'+key+'.json');fs.writeFileSync(saved,json);
 await p.evaluate(()=>chooseWork('B',true));await p.locator('#openFile').setInputFiles(saved);await p.waitForTimeout(100);
 assert.equal(await p.evaluate(()=>JSON.stringify(nest(parts()))),before,'JSON load '+key);
 console.log('PASS',channel,key,'drag, snap, end state, JSON roundtrip');
}assert.deepEqual(errors,[]);await b.close();}})().catch(e=>{console.error(e);process.exit(1)});

