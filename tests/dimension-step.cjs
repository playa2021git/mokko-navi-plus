const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8765');
  for(const key of 'ABCDEFGHIJKL'){
   await page.evaluate(k=>chooseWork(k,true),key);
   assert(await page.locator('#dimStep5').isChecked());
   const defs=await page.evaluate(()=>defDims(state.work));
   for(const [k,v] of Object.entries(defs)){
    const slider=page.locator(`[data-d="${k}"]`);
    await slider.focus();await slider.press('ArrowLeft');
    const changed=await page.evaluate(k=>dimsOf()[k],k);
    assert(changed===v-5||changed===v,key+' 5mm keyboard');
    if(changed!==v){await slider.press('ArrowRight');assert.equal(await page.evaluate(k=>dimsOf()[k],k),v);}
    await page.locator('#dimStep5').uncheck();
    const before=await page.evaluate(()=>JSON.stringify(parts()));
    await page.locator('#dimStep5').check();
    assert.equal(await page.evaluate(()=>JSON.stringify(parts())),before,'toggle preserves geometry');
    await page.locator('#dimStep5').uncheck();await slider.focus();await slider.press('ArrowLeft');
    assert.equal(await page.evaluate(k=>dimsOf()[k],k),v-1,key+' 1mm keyboard');
    await page.locator('#dimStep5').check();
    assert.equal(await page.evaluate(k=>dimsOf()[k],k),v-1,'off-grid value preserved');
    await page.locator('#dimReset').click();
    assert.deepEqual(await page.evaluate(()=>dimsOf()),defs,key+' exact reset');
   }
   const overview=await page.evaluate(()=>{const el=document.createElement('div');el.innerHTML=manualSheet();return {text:el.querySelector('.dimension-overview').textContent,parts:parts().map(p=>p.label)};});
   for(const label of overview.parts)assert(overview.text.includes(label),key+' all parts listed');
   console.log('PASS',key,'5mm/1mm, unchanged toggle, exact defaults, overview');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
