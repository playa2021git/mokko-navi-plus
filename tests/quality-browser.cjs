const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('path'),fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const output=process.env.AUDIT_OUTPUT||path.join(require('os').tmpdir(),'mokko-quality-audit');fs.mkdirSync(output,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const report=[];
 for(const channel of ['chrome','msedge']){
  const browser=await chromium.launch({channel,headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
  await page.evaluate(()=>{chooseWork('A',true);state.dims.W=282;state.corners.L=[{type:'round',size:5},none,none,none];state.hole={id:'bo',x:100};state.comment='授業用の保存と寸法検証です';refresh();window.showSaveFilePicker=undefined;});
  const expected=await page.evaluate(()=>Array.from(new Uint8Array(buildSTL(5))));
  for(const [width,height] of [[1280,720],[1366,768],[1920,1080]]){
   await page.setViewportSize({width,height});
   for(const screen of ['main','draw','view','sheet']){
    await page.evaluate(s=>goScreen(s,true),screen);await page.waitForTimeout(40);
    for(const id of ['save','stlBtn','openBtn']){
     const q=page.locator('#'+id);assert(await q.isVisible(),channel+' '+screen+' '+id);
     const box=await q.boundingBox();assert(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height);
     assert(await q.evaluate(e=>{const b=e.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===e;}),'covered '+id);
    }
    assert(await page.locator('#mSteps').textContent().then(t=>t.includes('②3Dで確認')));
    const jsonDownload=page.waitForEvent('download');await page.click('#save');const json=await jsonDownload;const saved=JSON.parse(fs.readFileSync(await json.path(),'utf8'));assert.equal(saved.dims.W,282);assert.equal(saved.corners.L[0].size,5);assert.equal(saved.hole.x,100);
    await page.click('#stlBtn');await page.selectOption('#stlScale','5');const download=page.waitForEvent('download');await page.click('#stlForm button[type=submit]');const stl=await download;
    assert(stl.suggestedFilename().endsWith('_5分の1.stl'));assert.equal(hash(fs.readFileSync(await stl.path())),hash(Buffer.from(expected)),screen+' same STL');
    await page.screenshot({path:path.join(output,`quality-${channel}-${width}-${screen}.png`),fullPage:true});
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#save').isVisible(),false);await page.emulateMedia({media:'screen'});
    const chooser=page.waitForEvent('filechooser');await page.click('#openBtn');await (await chooser).setFiles({name:'same-design.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await page.waitForFunction(()=>state.screen==='main');assert.equal(await page.evaluate(()=>dimsOf().W),282);
    report.push({channel,width,height,screen,save:true,stl:true,open:true,printButtonsHidden:true});
   }
  }
  // Unedited selection, cancel, discard, save-before-switch, reload, native unload warning.
  await page.evaluate(()=>chooseWork('L',true));assert.equal(await page.evaluate(()=>hasUnsavedChanges()),false);
  await page.evaluate(()=>{trySetDim('W',248,true);chooseWork('B');});assert(await page.locator('#modal').isVisible());await page.click('#mNo');assert.equal(await page.evaluate(()=>state.work),'L');
  const warned=await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});assert(warned);
  const nativeWarning=page.waitForEvent('dialog');const reloading=page.reload().catch(()=>null);const warning=await nativeWarning;assert.equal(warning.type(),'beforeunload');await warning.dismiss();await reloading;assert.equal(await page.evaluate(()=>state.work),'L');
  await page.evaluate(()=>chooseWork('B'));const saveBefore=page.waitForEvent('download');await page.click('#mYes');const saved=await saveBefore;const file=await saved.path();assert.equal(await page.evaluate(()=>state.work),'B');
  const parsed=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(parsed.work,'L');assert.equal(parsed.dims.W,248);
  await page.locator('#openFile').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(parsed))});await page.waitForFunction(()=>state.work==='L');assert.equal(await page.evaluate(()=>dimsOf().W),248);assert.equal(await page.evaluate(()=>hasUnsavedChanges()),false);
  await page.evaluate(()=>{trySetDim('W',246,true);chooseWork('A');});await page.click('#discardDesign');assert.equal(await page.evaluate(()=>state.work),'A');
  const acc=page.locator('.acc>h2').first();const before=await acc.getAttribute('aria-expanded');await acc.focus();await page.keyboard.press('Space');assert.notEqual(await acc.getAttribute('aria-expanded'),before);await page.keyboard.press('Enter');assert.equal(await acc.getAttribute('aria-expanded'),before);
  await page.evaluate(()=>{addRef('text');addRef('bunko');buildRefs();});assert(await page.locator('#refAdd').textContent().then(t=>t.includes('現在')&&t.includes('単独最大')));
  assert.deepEqual(errors,[]);await browser.close();console.log('PASS',channel,'12 stage/resolution checks, downloads, dirty protection, reload, keyboard, mixed references');
 }
 fs.writeFileSync(path.join(output,'quality-browser-results.json'),JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
