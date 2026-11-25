const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
  await page.evaluate(()=>{chooseWork('D',true);state.corner={...none};refresh();});
  for(const [key,value] of [['H',175],['sh',95]])await page.locator(`[data-d="${key}"]`).evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);
  await page.locator('#endBtn').click();
  const drag=await page.evaluate(()=>{const g=nestRange(parts(),'dv'),hit=nestHit.find(h=>h.id==='dv'&&!h.hole),r=nestCv.getBoundingClientRect();return {x:r.left+(hit.x0+hit.x1)/2,y:r.top+(hit.y0+hit.y1)/2,delta:(g.bd.w-g.q.len-g.q.x)*hit.sc};});
  await page.mouse.move(drag.x,drag.y);await page.mouse.down();await page.mouse.move(drag.x+drag.delta,drag.y,{steps:8});await page.mouse.up();
  assert(await page.evaluate(()=>nestRange(parts(),'dv').q.endE),'divider actually dragged to the stock end');
  assert(await page.evaluate(()=>endReport(parts()).some(r=>r.id==='dv'&&r.where==='上'&&!r.ok)));
  assert.equal(await page.evaluate(()=>floorFlipCandidate(parts(),'dv')),null,'old floor shortcut excludes this raised divider');
  assert(await page.locator('#msgs [data-end-repair="dv"]').isVisible());
  await page.locator('[data-part-id="dv"]').click();
  assert(await page.locator('#endBox').evaluate(e=>e.closest('.acc').classList.contains('open')),'selecting the problem part reveals its end controls');
  assert.equal(await page.locator('#flipBtn').textContent(),'下の接合側に反転');
  const before=await page.evaluate(()=>({geometry:JSON.stringify(parts()),nails:JSON.stringify(nailSpots(parts())),stl:Array.from(new Uint8Array(buildSTL(5))),positions:JSON.stringify(nest(parts()).boards.map(b=>b.placed.map(q=>[q.id,q.x,q.len])))}));
  await page.locator('#msgs [data-end-repair="dv"]').click();
  assert(await page.evaluate(()=>endReport(parts()).some(r=>r.id==='dv'&&r.where==='下'&&r.ok)));
  assert.equal(await page.locator('#msgs [data-end-repair="dv"]').count(),0);
  const after=await page.evaluate(()=>({geometry:JSON.stringify(parts()),nails:JSON.stringify(nailSpots(parts())),stl:Array.from(new Uint8Array(buildSTL(5))),positions:JSON.stringify(nest(parts()).boards.map(b=>b.placed.map(q=>[q.id,q.x,q.len])))}));assert.deepEqual(after,before,'only the mapping of the factory end changes');
  assert(await page.locator('#endBox').isVisible());assert.match(await page.locator('#endBox').textContent(),/下側/);
  // The regular reverse control remains usable, and the material-layout shortcut repairs it again.
  await page.locator('#flipBtn').click();assert(await page.locator('#nestNote [data-end-flip="dv"]').isVisible());await page.locator('#nestNote [data-end-flip="dv"]').click();
  assert(await page.evaluate(()=>endReport(parts()).some(r=>r.id==='dv'&&r.where==='下'&&r.ok)));
  const download=page.waitForEvent('download');await page.locator('#save').click();const file=await download,dir=fs.mkdtempSync(path.join(os.tmpdir(),'mokko-end-repair-')),saved=path.join(dir,'divider.json');await file.saveAs(saved);
  await page.evaluate(()=>chooseWork('A',true));await page.locator('#openFile').setInputFiles(saved);await page.waitForFunction(()=>!designReading&&state.work==='D');
  assert(await page.evaluate(()=>endReport(parts()).some(r=>r.id==='dv'&&r.where==='下'&&r.ok)),'factory-end mapping restored from JSON');
  // Existing ground-contact shortcut remains present for a side board.
  await page.evaluate(()=>{chooseWork('A',true);state.corner={...none};trySetDim('H',290,true);state.nestX.R=600-290;state.showEnds=true;refresh();});
  assert(await page.locator('[data-floor-flip="R"]').isVisible());await page.locator('[data-floor-flip="R"]').click();
  assert(await page.evaluate(()=>endReport(parts()).some(r=>r.id==='R'&&r.where==='下'&&r.ok)));
  assert.deepEqual(errors,[]);console.log('PASS D 254/175/95: real material drag, raised-divider repair in warning/layout/right controls, unchanged geometry/nails/STL/layout, JSON restore; ground shortcut retained');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
