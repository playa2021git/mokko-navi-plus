const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
  // Inspect the actual 3D nail groups as well as the document markers, without adding product test hooks.
  await page.evaluate(()=>{
   const add=THREE.Group.prototype.add;
   THREE.Group.prototype.add=function(...objects){
    if(objects.some(o=>o.children?.length===2&&o.children.every(c=>c.geometry?.type==='CylinderGeometry')))window.qaNailRoot=this;
    return add.apply(this,objects);
   };
  });
  for(const scenario of [
   {key:'B',dims:{W:194,H:390,sh:282},count:30,seam:330,back:'b2'},
   {key:'H',dims:{W:150,H:300,sh:240},count:40,seam:240,back:'b2'},
   {key:'C',dims:{W:286,H:150},count:21,seam:90,back:'b1'}
  ]){
   await page.evaluate(k=>chooseWork(k,true),scenario.key);await page.locator('#dimStep5').uncheck();
   for(const [key,value] of Object.entries(scenario.dims)){
    await page.locator(`[data-d="${key}"]`).evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);
   }
   await page.evaluate(()=>{state.showNails=true;refresh();});
   const nails=await page.evaluate(()=>({spots:nailSpots(parts()),groups:window.qaNailRoot.children.map(g=>({pos:g.position.toArray(),rotation:g.rotation.toArray().slice(0,3)})),issues:constructionIssues().length}));
   assert.equal(nails.issues,0);assert.equal(nails.spots.length,scenario.count);assert.equal(nails.groups.length,scenario.count,'rendered nail count');
   assert(!nails.groups.some(g=>Math.abs(g.pos[1]-scenario.seam)<1e-6&&Math.abs(g.pos[2]+81)<1e-6),'no 3D nail along the backboard seam');
   assert((await page.locator('#workTags').textContent()).replaceAll(' ','').includes('釘約'+scenario.count+'本'));
   const before=await page.evaluate(()=>JSON.stringify(nailSpots(parts())));
   await page.evaluate(()=>{state.warned=true;state.comment='棚板の位置と高さを合わせて変更しました。';goScreen('sheet',true);});
   assert.equal(await page.evaluate(()=>state.screen),'sheet');assert.equal(await page.locator('#sBody [data-nail-number]').count(),scenario.count,'manual marker count');
   assert(!await page.locator(`[data-nail-part="${scenario.back}"]`).textContent().then(t=>/→ 背板/.test(t)),'backboards have no nail destinations in another backboard');
   const download=page.waitForEvent('download');await page.locator('#save').click();const file=await download;
   const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mokko-seam-')),saved=path.join(dir,scenario.key+'.json');await file.saveAs(saved);
   await page.evaluate(()=>chooseWork('A',true));await page.locator('#openFile').setInputFiles(saved);await page.waitForFunction(k=>!designReading&&state.work===k,scenario.key);
   assert.equal(await page.evaluate(()=>JSON.stringify(nailSpots(parts()))),before,'JSON reload retains only intended nails');
   console.log('PASS',scenario.key,'real slider input, rendered nails, work count, manual, JSON; no seam nails');
  }
  await page.evaluate(()=>{chooseWork('A',true);state.off.L=[-.5,0,0];state.showNails=true;refresh();});
  assert.match(await page.locator('#msgs').textContent(),/0\.5mmの隙間/);
  assert(!await page.evaluate(()=>nailSpots(parts()).some(n=>n.driver==='L'&&['bo','sh'].includes(n.into))));
  await page.locator('#mSteps [data-s="sheet"]').click();assert(await page.locator('#modal').isVisible());assert.equal(await page.evaluate(()=>state.screen),'main');
  assert.deepEqual(errors,[]);console.log('PASS gap warning and document gate retained; no JavaScript errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
