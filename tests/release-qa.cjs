const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
  async function select(k){await page.evaluate(k=>chooseWork(k,true),k);}
  async function assertPaperFits(){
   const bad=await page.locator('#sBody svg.a4').evaluateAll(es=>es.flatMap((svg,page)=>[...svg.querySelectorAll('text')].filter(t=>{
    const b=t.getBBox(),m=svg.getScreenCTM().inverse().multiply(t.getScreenCTM());
    return [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].some(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(m);return q.x<-.1||q.y<-.1||q.x>210.1||q.y>297.1;});
   }).map(t=>({page,text:t.textContent}))));assert.deepEqual(bad,[],'all printable text remains on its page');
  }
  async function assertBlocked(){
   for(const screen of ['draw','view','sheet']){
    await page.locator(`#mSteps [data-s="${screen}"]`).click();
    assert(await page.locator('#modal').isVisible());assert.equal(await page.evaluate(()=>state.screen),'main');
    assert.match(await page.locator('#mBody').textContent(),/接合/);await page.locator('#mYes').click();
   }
   await page.locator('#stlBtn').click();assert(await page.locator('#modal').isVisible());assert(!await page.locator('#stlDialog').isVisible());await page.locator('#mYes').click();
  }
  for(const key of 'ABCDEFGHIJKL'){
   await select(key);assert.equal(await page.evaluate(()=>constructionIssues().length),0,key+' default contacts');
   await page.evaluate(()=>goScreen('sheet',true));assert.equal(await page.evaluate(()=>state.screen),'sheet');await assertPaperFits();
  }
  console.log('PASS all 12 defaults: contact surfaces, document access, printable bounds');
  // The odd outer width creates a half-millimetre shelf without entering a fractional number.
  await select('I');await page.locator('#dimStep5').uncheck();await page.locator('[data-d="W"]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>parts().find(p=>p.id==='sh').w),125.5);
  assert.equal(await page.evaluate(()=>nest(parts()).boards.flatMap(b=>b.placed).find(q=>q.id==='sh').len),125.5);
  assert.match(await page.locator('#ptbl').textContent(),/12×150×125\.5/);
  await page.locator('#cbox input[data-s="3"]').fill('30.5');await page.locator('#cbox input[data-s="3"]').press('Tab');
  assert.match(await page.evaluate(()=>cornerText(parts().find(p=>p.id==='L'))),/30\.5/);
  await page.evaluate(()=>{state.comment='置く場所に合わせて幅を変更しました。';state.warned=true;goScreen('sheet',true);});
  assert.equal(await page.locator('#sBody svg.a4').first().locator('text').filter({hasText:'12×150×125.5'}).count(),1);
  assert.match(await page.locator('#sBody .dimension-overview').textContent(),/125\.5 × 150/);await assertPaperFits();
  const geometry=await page.evaluate(()=>JSON.stringify(parts()));
  const download=page.waitForEvent('download');await page.locator('#save').click();const file=await download;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mokko-release-qa-')),saved=path.join(dir,'fractional.json');await file.saveAs(saved);
  const json=JSON.parse(fs.readFileSync(saved,'utf8'));assert.equal(json.dims.W,287);assert.equal(json.corners.L[3].size,30.5);
  await select('A');await page.locator('#openFile').setInputFiles(saved);await page.waitForFunction(()=>!designReading&&state.work==='I');
  assert.equal(await page.evaluate(()=>JSON.stringify(parts())),geometry);
  console.log('PASS 125.5mm shelf, 30.5mm corner: model, material layout, table, paper, JSON');
  // Reproduce the original QA bug through actual right-drag input.
  await select('A');await page.locator('[data-part-id="L"]').click();await page.waitForTimeout(150);
  const cv=await page.locator('#stage canvas:not(#dimCv)').boundingBox(),x=cv.x+cv.width-80,y=cv.y+150;
  await page.keyboard.down('Shift');await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x,y-100,{steps:10});await page.mouse.up({button:'right'});await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(()=>state.off.L),undefined);
  // Previously saved offsets still receive full construction validation.
  await page.evaluate(()=>{state.off.L=[0,100,0];refresh();});assert.match(await page.locator('#msgs').textContent(),/接合が外れ/);
  assert.equal(await page.evaluate(()=>outer().H),await page.evaluate(()=>{const bs=parts().map(bbox);return Math.max(...bs.map(b=>b.max[1]))-Math.min(...bs.map(b=>b.min[1]));}));await assertBlocked();
  // A 0.5mm gap must not be accepted merely because the nail-contact search has a tolerance.
  await select('A');await page.evaluate(()=>{state.off.L=[-.5,0,0];refresh();});assert.match(await page.locator('#msgs').textContent(),/0\.5mmの隙間/);
  console.log('PASS detached board and 0.5mm gap: warning, true outer extent, all document/STL gates');
  // Both corner types must block even when all selected nail paths are still valid.
  for(const type of ['chamfer','round']){
   await select('A');await page.locator('#cbox select[data-t="3"]').selectOption(type);
   await page.locator('#dimStep5').uncheck();
   await page.locator('[data-d="sh"]').evaluate(e=>{e.value=280;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
   assert.equal(await page.evaluate(()=>dimsOf().sh),280);assert.equal(await page.evaluate(()=>nailSpots(parts(),true).filter(n=>!n.valid).length),0);
   assert.match(await page.locator('#msgs').textContent(),/接合面が角加工/);await assertBlocked();
   // Exact tangent boundary is valid; half a millimetre past it is not.
   await page.evaluate(()=>{state.corners.R[3].type=state.corners.L[3].type;state.dims.sh=265;refresh();});
   assert.equal(await page.evaluate(()=>constructionIssues().length),0);
   await page.evaluate(()=>{state.dims.sh=265.5;refresh();});assert((await page.evaluate(()=>constructionIssues().length))>0);
   await page.evaluate(()=>{state.dims.sh=265;state.comment='棚板の位置を加工範囲から下げました。';state.warned=true;refresh();goScreen('sheet',true);});assert.equal(await page.evaluate(()=>state.screen),'sheet');
  }
  console.log('PASS chamfer/round: missing support with valid nails, 265/265.5mm boundary, correction releases gate');
  await select('C');await page.locator('[data-d="H"]').focus();for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
  await page.evaluate(()=>{state.comment='置き場所に合わせて高さを変更しました。';state.warned=true;goScreen('sheet',true);});
  assert.match(await page.locator('#sBody').textContent(),/背板①：地（設置面）から下端 130mm ／ 上端 190mm/);
  console.log('PASS resized C: ground-to-backboard mounting heights 130/190mm');
  // Long legitimate text is preserved, wrapped and continued onto additional pages.
  const comment='置きたい本の大きさに合わせて幅を変えました。'.repeat(150),name='あ'.repeat(40);
  await select('A');await page.evaluate(comment=>{state.comment=comment;goScreen('sheet',true);},comment);await page.locator('#whoIn').fill(name);
  assert((await page.locator('#sBody svg.a4').filter({hasText:'作業メモ（続き）'}).count())>=2);await assertPaperFits();
  const printed=(await page.locator('#sBody svg.a4 text').allTextContents()).join('');const noteText=(await page.locator('#sBody svg.a4 text[fill="#4b423a"]').allTextContents()).filter(t=>t!=='作業メモの続きは次ページへ').join('');assert(noteText.includes(comment));assert(printed.includes(name));
  await page.emulateMedia({media:'print'});await assertPaperFits();await page.emulateMedia({media:'screen'});
  // Stale documents are removed before browser print; the UI print button cannot bypass the block.
  await page.evaluate(()=>{state.off.L=[0,135,0];window.dispatchEvent(new Event('beforeprint'));});assert.equal(await page.locator('#sBody svg.a4').count(),0);assert(await page.locator('#sBody [role="alert"]').isVisible());
  await page.locator('#sPrint').click();assert(await page.locator('#modal').isVisible());await page.locator('#mYes').click();
  assert.deepEqual(errors,[]);console.log('PASS long name/comment: all text preserved, screen/print bounds, stale print blocked; no JS errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
