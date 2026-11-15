const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const output=process.env.AUDIT_OUTPUT||path.join(require('node:os').tmpdir(),'mokko-material-editing');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
  // Capture every screen's generated content and the actual STL bytes for save/load comparisons.
  async function snapshot(){return page.evaluate(()=>{
   const ps=parts();state.sel=ps[0].id;state.selKind='part';const geometry=JSON.stringify(ps),nails=JSON.stringify(nailSpots(ps));
   const stl=Array.from(new Uint8Array(buildSTL(5)));
   const layout=JSON.stringify(nest(ps)),ends=JSON.stringify([...factoryEnds(ps)]);
   goScreen('main',true);state.showDim=true;$('dimCv').hidden=false;document.body.classList.add('dim');resize();refresh();
   const dimension=dimCv.toDataURL();
   goScreen('draw',true);drawSheet();const marking=drawCv.toDataURL(),markingText=$('dfoot').textContent;
   goScreen('view',true);const drawing=$('vBody').innerHTML;
   goScreen('sheet',true);const manual=$('sBody').innerHTML;
   state.showDim=false;$('dimCv').hidden=true;document.body.classList.remove('dim');goScreen('main',true);
   return {geometry,nails,stl,layout,ends,dimension,marking,markingText,drawing,manual};
  });}
  async function roundtrip(key){
   const before=await snapshot();
   const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();
   const download=await downloadPromise,file=path.join(output,key+'.json');await download.saveAs(file);
   const saved=JSON.parse(fs.readFileSync(file));assert.equal(saved.version,11);assert(saved.nestBoard);
   await page.evaluate(()=>chooseWork('B',true));await page.locator('#openFile').setInputFiles(file);
   await page.waitForFunction(work=>!designReading&&state.work===work,key);
   const after=await snapshot();
   for(const field of Object.keys(before))assert.deepEqual(after[field],before[field],key+' JSON restores '+field);
  }
  async function dragTo(id,boardId,targetId){
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const points=await page.evaluate(({id,boardId,targetId})=>{
    const r=nestCv.getBoundingClientRect(),s=nestHit.find(t=>!t.hole&&t.id===id),t=targetId&&nestHit.find(t=>!t.hole&&t.id===targetId),b=nestRows.find(b=>b.id===boardId);
    return {sx:r.left+(s.x0+s.x1)/2,sy:r.top+(s.y0+s.y1)/2,tx:r.left+(t?(t.x0+t.x1)/2:b.x1-2),ty:r.top+(b.y0+b.y1)/2};
   },{id,boardId,targetId});
   await page.mouse.move(points.sx,points.sy);await page.mouse.down();
   await page.mouse.move(points.sx,points.ty,{steps:4});await page.mouse.move(points.tx,points.ty,{steps:4});await page.mouse.up();
  }
  await page.evaluate(()=>chooseWork('A',true));
  const initial=await snapshot();
  // At 315 mm two sides plus kerf cannot fit in A; reject the real drag without losing state.
  await dragTo('R','A','bo');assert.equal(await page.evaluate(()=>JSON.stringify(nest(parts()))),initial.layout);
  assert.match(await page.locator('#nestNote').innerText(),/収まりません/);
  // Establish an explicit assignment via an actual valid exchange and return exchange.
  await dragTo('bo','B','sh');await dragTo('bo','A','sh');
  assert.equal(await page.evaluate(()=>nestRange(parts(),'bo').bd.id),'A');
  assert(await page.evaluate(()=>trySetDim('H',280,true)));
  const small=await snapshot();
  await dragTo('R','A','bo');
  assert.deepEqual(await page.evaluate(()=>nest(parts()).boards.map(b=>b.placed.map(q=>q.id))),[['L','R'],['bo','sh'],['b1','b2']]);
  const exchanged=await snapshot();assert.equal(exchanged.geometry,small.geometry);assert.deepEqual(exchanged.stl,small.stl);assert.equal(exchanged.nails,small.nails);assert.equal(exchanged.drawing,small.drawing);
  assert.notEqual(exchanged.marking,small.marking);assert.notEqual(exchanged.manual,small.manual);
  assert(await page.evaluate(()=>hasUnsavedChanges()));
  // The two sides continue to share H, and assigned stock capacity constrains later dimensions.
  assert(await page.evaluate(()=>trySetDim('H',290,true)));
  assert.deepEqual(await page.evaluate(()=>parts().filter(p=>['L','R'].includes(p.id)).map(p=>p.h)),[290,290]);
  assert.equal(await page.evaluate(()=>trySetDim('H',315,true)),false);
  const beforeReset=await page.evaluate(()=>designFingerprint());
  await page.locator('#dimReset').click();assert.match(await page.locator('#mTtl').textContent(),/初期寸法に戻せません/);
  assert.equal(await page.evaluate(()=>designFingerprint()),beforeReset);await page.locator('#mYes').click();
  await page.evaluate(()=>{state.nestX.R=600-parts().find(p=>p.id==='R').h;state.showEnds=true;state.showNames=false;refresh();});
  assert(await page.locator('[data-floor-flip="R"]').isVisible());
  const beforeFlip=await snapshot();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const modelBefore=await page.locator('#stage canvas:not(#dimCv)').screenshot({path:path.join(output,'floor-before.png')});
  await page.locator('[data-floor-flip="R"]').click();
  assert.equal(await page.locator('[data-floor-flip="R"]').count(),0);
  assert(await page.evaluate(()=>endReport(parts()).some(r=>r.id==='R'&&r.where==='下'&&r.ok)));
  const afterFlip=await snapshot();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const modelAfter=await page.locator('#stage canvas:not(#dimCv)').screenshot({path:path.join(output,'floor-after.png')});
  assert(!modelBefore.equals(modelAfter),'3D factory-end overlay changes after floor correction');
  assert.equal(afterFlip.geometry,beforeFlip.geometry);assert.deepEqual(afterFlip.stl,beforeFlip.stl);assert.notEqual(afterFlip.marking,beforeFlip.marking);
  const beforeInvalid=await page.evaluate(()=>designFingerprint());await dragTo('R','C','b1');
  assert.equal(await page.evaluate(()=>designFingerprint()),beforeInvalid);
  assert.match(await page.locator('#nestNote').innerText(),/交換できません/);
  await page.evaluate(()=>{
   state.hole={id:'bo',x:130};state.corners.bo=[round_(5),none,none,none];
   state.comment='材料の端を接地に使うため高さを調整しました。';state.who='検証';refresh();
  });
  await roundtrip('A');
  // A malformed uploaded design must leave the current design intact, including assignments.
  const fingerprint=await page.evaluate(()=>designFingerprint());
  const invalidFile=path.join(output,'invalid.json');fs.writeFileSync(invalidFile,JSON.stringify({version:11,work:'A',nestBoard:{L:'C'}}));
  const rejected=page.waitForEvent('dialog').then(async d=>{assert.match(d.message(),/読み込めません/);await d.dismiss();});
  await page.locator('#openFile').setInputFiles(invalidFile);await rejected;
  assert.equal(await page.evaluate(()=>designFingerprint()),fingerprint);
  // Moving into free space (rather than onto another part) is a distinct operation.
  await page.evaluate(()=>{chooseWork('A',true);trySetDim('H',250,true);trySetDim('W',180,true);refresh();});
  const beforeMove=await snapshot();await dragTo('L','B',null);
  assert.equal(await page.evaluate(()=>nestRange(parts(),'L').bd.id),'B');
  const afterMove=await snapshot();assert.equal(afterMove.geometry,beforeMove.geometry);assert.deepEqual(afterMove.stl,beforeMove.stl);
  await roundtrip('A');
  // Incoming malformed board assignments must be rejected before applying any state.
  assert(await page.evaluate(()=>{
   for(const d of [{work:'A',nestBoard:{L:'C'}},{work:'A',nestBoard:{missing:'A'}},{work:'A',nestBoard:{L:'D'}}]){
    try{validateDesign(d);return false;}catch(e){}
   }return validateDesign({version:10,work:'A'}).work==='A';
  }));
  for(const key of 'BCDEFGHIJKL'){
   await page.evaluate(k=>{chooseWork(k,true);for(const [name,delta] of [['W',40],['H',20]]){const t=WORKS[k].dims.find(t=>t.k===name);if(t)trySetDim(name,Math.max(t.min,dimsOf()[name]-delta),true);}},key);
   const before=await snapshot();
   const moved=await page.evaluate(()=>{
    const boards=nest(parts()).boards,a=boards[0],b=boards[1];
    for(const q of a.placed)for(const r of b.placed)if(moveStockPart(q.id,b.id,r.x,r.id)){refresh();return true;}
    return false;
   });
   assert(moved,key+' has a valid A/B exchange');
   const after=await snapshot();assert.equal(after.geometry,before.geometry);assert.deepEqual(after.stl,before.stl);assert.equal(after.nails,before.nails);
   assert.equal(after.drawing,before.drawing);
   assert(await page.evaluate(()=>{
    const ps=parts(),l=ps.find(p=>p.id==='L'),r=ps.find(p=>p.id==='R');
    return (!l||!r||cutLen(l)===cutLen(r))&&nest(ps).left.length===0;
   }));
   await roundtrip(key);console.log('PASS',key,'A/B exchange, all-screen consistency, JSON roundtrip');
  }
  // Each driver board gets an actual shape and one marker for every nail it drives.
  await page.evaluate(()=>{chooseWork('A',true);goScreen('sheet',true);});
  const diagrams=await page.evaluate(()=>parts().map(p=>({id:p.id,count:nailCoordinates(p).length,shown:document.querySelector(`[data-nail-part="${p.id}"]`)?.querySelectorAll('[data-nail-number]').length||0})));
  for(const d of diagrams)assert.equal(d.shown,d.count,d.id+' nail diagram markers');
  assert.match(await page.locator('[data-nail-part="L"]').textContent(),/左右から75（中心）/);
  // Right-end 6 and middle coordinates are absolute board-end distances, not nail-to-nail distances.
  const center=await page.evaluate(()=>{const p=parts().find(p=>p.id==='b1');return nailCoordinates(p).map(r=>({x:r.x,fx:r.f[0],width:p.w}));});
  assert(center.some(r=>r.x===6));assert(center.some(r=>r.fx===r.width/2&&r.x===r.width/2));
  const oldFile=path.join(output,'legacy-v10.json');fs.writeFileSync(oldFile,JSON.stringify({version:10,work:'A',dims:{},refs:[]}));
  await page.evaluate(()=>chooseWork('B',true));await page.locator('#openFile').setInputFiles(oldFile);
  await page.waitForFunction(()=>!designReading&&state.work==='A');
  assert.deepEqual(await page.evaluate(()=>state.nestBoard),{});
  assert.equal((await snapshot()).geometry,initial.geometry,'legacy v10 design restores the original geometry');
  assert.deepEqual(errors,[]);console.log('PASS A: real cross-row drag, rejection, same side lengths, floor correction; all A–L JSON and diagrams');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
