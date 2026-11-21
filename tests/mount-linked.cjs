const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  async function snapshot(id){
   return page.evaluate(id=>{
    const ps=parts(),p=ps.find(p=>p.id===id);
    goScreen('draw',true);drawSheet();
    const marks=$('drawCv').toDataURL();
    goScreen('view',true);const drawing=$('vBody').innerHTML;
    goScreen('sheet',true);const manual=$('sBody').innerHTML;
    goScreen('main',true);
    return {pos:p.pos,stock:nest(ps).boards.map(b=>b.placed.map(q=>[q.id,q.x,q.len])),marks,drawing,manual,
     stl:Array.from(new Uint8Array(buildSTL(5))),
     nails:nailSpots(ps).filter(n=>n.driver===id||n.into===id).map(n=>n.pos)};
   },id);
  }
  for(const [key,id,axis] of [['F','d1',0],['F','d2',0],['F','d3',0],['J','dB',2],['C','b1',1]]){
   await page.evaluate(k=>{chooseWork(k,true);state.showNails=true;refresh()},key);
   await page.click('[data-part-id="'+id+'"]');
   const before=await snapshot(id);
   const start=Number(await page.locator('#mountRange').inputValue());
   await page.locator('#mountRange').evaluate(e=>{e.value=Number(e.value)+5;e.dispatchEvent(new Event('input'));});
   const after=await snapshot(id);
   assert.equal(after.pos[axis]-before.pos[axis],axis===2?-5:5);
   assert.deepEqual(before.stock,after.stock);
   // Raising this back board carries its nails with it; their marks on the loose board stay put.
   assert.equal(before.marks===after.marks,key==='C',key+'/'+id+' marking diagram');
   for(const field of ['drawing','manual','nails','stl'])assert.notDeepEqual(before[field],after[field],key+'/'+id+' '+field);
   assert.equal(await page.evaluate(id=>{
    const ps=parts(),p=ps.find(p=>p.id===id);
    return p.role==='back'?bbox(p).min[1]:dividerAssemblyDims(ps).find(d=>d.part.id===id).distance;
   },id),start+5);
   const downloading=page.waitForEvent('download');await page.click('#save');
   const file=await downloading;
   await page.evaluate(()=>chooseWork('A',true));
   await page.locator('#openFile').setInputFiles(await file.path());
   await page.waitForFunction(k=>!designReading&&state.work===k,key);
   assert.deepEqual(await snapshot(id),after,'JSON round trip');
   console.log('PASS',key,id);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
