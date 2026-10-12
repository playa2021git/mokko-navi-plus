const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const path=require('path'),fs=require('fs'),assert=require('assert');
const output=process.env.AUDIT_OUTPUT||path.join(require('os').tmpdir(),'mokko-ends-audit');fs.mkdirSync(output,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
 await p.evaluate(()=>{window.__meshes=[];const Original=THREE.Mesh;THREE.Mesh=class extends Original{constructor(...a){super(...a);window.__meshes.push(this);}};window.inspectModes=()=>{const active=__meshes.filter(m=>{let o=m;while(o.parent)o=o.parent;return o.type==='Scene';});return {woods:active.filter(m=>m.geometry.type==='ExtrudeGeometry').map(m=>({opacity:m.material.opacity,transparent:m.material.transparent})),ends:active.filter(m=>m.userData.kind==='factory-end').map(m=>({part:m.userData.part,pos:m.position.toArray(),depth:m.material.depthTest,order:m.renderOrder})),nails:active.filter(m=>m.renderOrder===9999).length};};});
 const results=[];
 for(const key of 'ABCDEFGHIJKL'){
  await p.evaluate(k=>{chooseWork(k,true);state.showNames=false;state.showNails=false;state.showEnds=false;refresh();},key);
  const original=await p.evaluate(()=>({nails:JSON.stringify(nailSpots(parts())),nest:JSON.stringify(nest(parts())),ps:JSON.stringify(parts())}));
  for(const [nails,ends] of [[false,false],[false,true],[false,false],[true,false],[true,true],[false,true],[false,false]]){
   await p.evaluate(([n,e])=>{state.showNails=n;state.showEnds=e;refresh();},[nails,ends]);await p.waitForTimeout(100);
   const info=await p.evaluate(()=>inspectModes());assert(info.woods.length>0);
   if(ends){assert(info.woods.every(m=>m.transparent&&Math.abs(m.opacity-.38)<1e-9));assert(info.ends.length>0);assert(info.ends.every(m=>!m.depth&&m.order===9990));
    const expected=await p.evaluate(()=>parts().flatMap(p=>{const f=factoryEnds(parts()).get(p.id),axis=lenAxis(p)==='h'?1:0,half=(axis===1?p.h:p.w)/2;return f?['s','e'].filter(which=>f[which]).map(which=>({part:p.id,axis,value:which==='s'?-half:half})):[];}));
    assert.equal(info.ends.length,expected.length);for(const e of expected)assert(info.ends.some(m=>m.part===e.part&&Math.abs(m.pos[e.axis]-e.value)<1e-9),'end is on actual plane');
   }else{assert.equal(info.ends.length,0);if(!nails)assert(info.woods.every(m=>!m.transparent&&m.opacity===1));}
   assert.equal(info.nails>0,nails);assert.deepEqual(await p.evaluate(()=>({nails:JSON.stringify(nailSpots(parts())),nest:JSON.stringify(nest(parts())),ps:JSON.stringify(parts())})),original);
  }
  await p.evaluate(()=>{state.showEnds=true;state.showNails=true;refresh();});const opacity=await p.evaluate(()=>inspectModes().woods.map(m=>m.opacity));await p.waitForTimeout(200);assert.deepEqual(await p.evaluate(()=>inspectModes().woods.map(m=>m.opacity)),opacity);
  await p.evaluate(()=>{state.showEnds=false;refresh();});const pulse=await p.evaluate(()=>inspectModes().woods.map(m=>m.opacity));await p.waitForTimeout(200);assert.notDeepEqual(await p.evaluate(()=>inspectModes().woods.map(m=>m.opacity)),pulse);
  for(const change of ['flip','nest','dims']){
   await p.evaluate(mode=>{if(mode==='flip')for(const q of parts())state.flip[q.id]=true;if(mode==='nest')for(const q of parts())state.nestX[q.id]=5;if(mode==='dims')trySetDim('W',dimsOf().W-2,true);state.showEnds=true;refresh();},change);
   assert((await p.evaluate(()=>inspectModes().ends)).every(m=>!m.depth));
  }
  await p.screenshot({path:path.join(output,`ends-${key}-1366.png`),fullPage:true});
  const timing=await p.evaluate(()=>{const t=performance.now();for(let i=0;i<10;i++){state.showEnds=!!(i%2);refresh();}return (performance.now()-t)/10;});results.push({key,averageRefreshMs:timing});console.log('PASS',key,timing.toFixed(1)+' ms');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'ends-test-results.json'),JSON.stringify(results,null,2));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
