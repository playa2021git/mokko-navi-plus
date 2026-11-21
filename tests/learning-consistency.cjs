const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const output=process.env.AUDIT_OUTPUT||path.join(require('node:os').tmpdir(),'mokko-learning-consistency');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
  const report=[];
  for(const key of 'ABCDEFGHIJKL'){
   await page.evaluate(k=>chooseWork(k,true),key);
   await page.locator('#dimStep5').uncheck();
   const dimensions=await page.locator('#size3 input[data-d]').evaluateAll(es=>es.map(e=>({k:e.dataset.d,min:+e.min,max:+e.max,initial:+e.value,step:+e.step})));
   for(const dim of dimensions)for(const requested of [dim.min,dim.max,dim.initial-(dim.initial-dim.min)/2]){
    await page.evaluate(k=>chooseWork(k,true),key);
   await page.locator('#dimStep5').uncheck();
    const slider=page.locator(`#size3 input[data-d="${dim.k}"]`);
    const attempted=await slider.evaluate((e,v)=>{e.value=v;const attempted=+e.value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return attempted;},requested);
    const model=await page.evaluate(()=>{
     const ps=parts(),dim=dimsOf(),box=ps.map(bbox);
     return {dim,geometry:JSON.stringify(ps),table:[...new Set(ps.map(p=>`12×${p.bw}×${mm(p.la==='h'?p.h:p.w)}`))].sort(),
      sizes:ps.map(p=>({id:p.id,w:p.w,h:p.h,nails:nailCoordinates(p).map(r=>({number:r.number,x:r.x,y:r.y}))})),
      bounds:[0,2,1].map(i=>Math.max(...box.map(b=>b.max[i]))-Math.min(...box.map(b=>b.min[i]))),
      outer:outer(),valid:fitsNow()&&!nailSpots(ps,true).some(n=>!n.valid)&&!constructionIssues(ps).length,design:designFingerprint()};
    });
    assert(model.dim[dim.k]===attempted||model.dim[dim.k]===dim.initial,key+' input is applied or rejected atomically');
    if(!model.valid){
     await page.evaluate(()=>goScreen('sheet',true));
     assert(await page.locator('#modal').isVisible(),key+' invalid manufacturing design is blocked');
     assert.equal(await page.evaluate(()=>state.screen),'main');
     await page.locator('#mYes').click();report.push({key,dimension:dim.k,attempted,outcome:'blocked-invalid'});continue;
    }
    // Compare visible printed values against the current model, including substantial changes and limits.
    await page.evaluate(()=>goScreen('sheet',true));assert.equal(await page.evaluate(()=>state.screen),'sheet');
    const actualTable=await page.locator('#sBody svg.a4').first().locator('text').allTextContents();
    assert.deepEqual([...new Set(actualTable.filter(t=>/^12×\d+×/.test(t)))].sort(),model.table,key+' current lengths in manual parts table');
    const manualText=await page.locator('#sBody').textContent();
    assert(manualText.includes(`外はば${model.outer.W}×おくゆき${model.outer.D}×高さ${model.outer.H}mm`),key+' current manual outer dimensions');
    for(const p of model.sizes.filter(p=>p.nails.length)){
     const diagram=page.locator(`[data-nail-part="${p.id}"]`);
     assert.equal(await diagram.locator('[data-nail-number]').count(),p.nails.length);
     assert(((await diagram.allTextContents()).join(' ')).includes(`幅 ${p.w}mm`),key+' current nail diagram width '+p.id);
     assert(((await diagram.allTextContents()).join(' ')).includes(`高さ ${p.h}mm`),key+' current nail diagram height '+p.id);
    }
    await page.evaluate(()=>goScreen('view',true));
    assert((await page.locator('#vBody').textContent()).includes(`外はば ${model.outer.W}mm ・ おくゆき ${model.outer.D}mm ・ 高さ ${model.outer.H}mm`));
    await page.evaluate(()=>{goScreen('draw',true);drawSheet();});
    const markedLengths=await page.evaluate(()=>nest(parts()).boards.flatMap(b=>b.placed.flatMap(q=>stockMembers(parts(),q).map(p=>({id:p.id,w:p.w,h:p.h})))));
    assert.equal(markedLengths.length,model.sizes.length,key+' all current parts in marking layout');
    for(const p of markedLengths){const expected=model.sizes.find(q=>q.id===p.id);assert.equal(p.w,expected.w);assert.equal(p.h,expected.h);}
    const stl=await page.evaluate(()=>[2,3,5,10].map(scale=>{
     const d=new DataView(buildSTL(scale)),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
     for(let i=0;i<d.getUint32(80,true);i++)for(let v=0;v<3;v++)for(let a=0;a<3;a++){
      const value=d.getFloat32(84+i*50+12+v*12+a*4,true);if(!Number.isFinite(value))throw Error('STL nonfinite');min[a]=Math.min(min[a],value);max[a]=Math.max(max[a],value);
     }return {scale,size:max.map((v,i)=>v-min[i])};
    }));
    for(const s of stl)s.size.forEach((n,i)=>assert(Math.abs(n-model.bounds[i]/s.scale)<.01,key+' STL reflects current size'));
    assert.equal(await page.evaluate(()=>designFingerprint()),model.design,'rendering does not change design');
    report.push({key,dimension:dim.k,attempted,actual:model.dim[dim.k],outcome:'current-values-verified'});
   }
   // Save a combined width/height change and compare all document content after reopening.
   await page.evaluate(k=>{chooseWork(k,true);if(k==='I')trySetDim('sh',145,true);for(const t of WORKS[k].dims){if(['W','H'].includes(t.k))trySetDim(t.k,Math.max(t.min,dimsOf()[t.k]-(t.k==='H'?1:t.step*3)),true);}state.comment='置き場所に合わせて幅と高さを変更しました。';goScreen('sheet',true);},key);
   const savedManual=await page.locator('#sBody').innerHTML(),savedGeometry=await page.evaluate(()=>JSON.stringify(parts()));
   const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();const download=await downloadPromise;
   const file=path.join(output,key+'.json');await download.saveAs(file);
   await page.evaluate(()=>chooseWork('A',true));await page.locator('#openFile').setInputFiles(file);
   await page.waitForFunction(k=>!designReading&&state.work===k,key);await page.evaluate(()=>goScreen('sheet',true));
   assert.equal(await page.locator('#sBody').innerHTML(),savedManual,key+' changed-dimension manual restored from JSON');
   assert.equal(await page.evaluate(()=>JSON.stringify(parts())),savedGeometry);
   console.log('PASS',key,'dimension limits, current printed dimensions, four STL scales, combined JSON');
  }
  // Visible documents refresh on changes and on print, even if a stale page has been left open.
  await page.evaluate(()=>{chooseWork('A',true);goScreen('sheet',true);trySetDim('H',290,true);});
  assert((await page.locator('#sBody').textContent()).includes('高さ290mm'));
  await page.evaluate(()=>{state.dims.H=285;window.dispatchEvent(new Event('beforeprint'));});
  assert((await page.locator('#sBody').textContent()).includes('高さ285mm'));
  // Verify end-to-nail guides are presentation only and can be replayed by keyboard.
  const beforeGuide=await page.evaluate(()=>designFingerprint());
  const nail=page.locator('[data-nail-part="L"] [data-nail-trigger="1"]');await nail.click();
  assert.equal(await page.locator('.measure-cue path').count(),2);assert.match(await page.locator('#measureReadout').textContent(),/隣の釘からではなく/);
  await nail.focus();await nail.press('Enter');assert.equal(await page.locator('.measure-cue').count(),1);
  assert.equal(await page.evaluate(()=>designFingerprint()),beforeGuide);
  await page.emulateMedia({reducedMotion:'reduce'});await nail.click();
  assert.equal(await page.locator('.measure-cue path').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.measure-cue').evaluate(e=>getComputedStyle(e).display),'none');
  await page.emulateMedia({media:'screen',reducedMotion:'no-preference'});
  await page.evaluate(()=>{goScreen('main',true);state.dims={};refresh();});
  const beforeFocus=await page.evaluate(()=>designFingerprint());await page.locator('#parts [data-part-id="R"]').click();
  assert.equal(await page.evaluate(()=>state.sel),'R');assert(await page.locator('#parts [data-part-id="R"]').evaluate(e=>e.classList.contains('learn-cue')));
  assert.equal(await page.evaluate(()=>designFingerprint()),beforeFocus);
  assert(await page.locator('#learningStatus').isVisible());
  assert(await page.locator('#stage canvas:not(#dimCv)').isVisible());
  await page.evaluate(()=>{chooseWork('A',true);goScreen('sheet',true);state.off.R=[-(dimsOf().W-T),0,0];refresh();});
  assert.equal(await page.locator('#sBody svg').count(),0,'invalid changes cannot leave a stale printable manual');
  assert(await page.locator('#sBody [role="alert"]').isVisible());
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('#sBody svg').count(),0);
  await page.evaluate(()=>goScreen('main',true));
  await page.locator('[data-find-issue]').first().click();
  assert.match(await page.locator('#learningStatus').textContent(),/確認が必要な板/);
  // Delay real FileReader completion to reproduce a student switching works or editing while loading.
  await page.evaluate(()=>{chooseWork('A',true);window.NativeDesignReader=window.FileReader;window.finishedDesignReads=0;window.FileReader=class extends NativeDesignReader{constructor(){super();this.addEventListener('loadend',()=>finishedDesignReads++);}readAsText(...args){setTimeout(()=>super.readAsText(...args),120);}};});
  const pendingFile={name:'pending.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:11,work:'B'}))};
  await page.locator('#openFile').setInputFiles(pendingFile);await page.evaluate(()=>chooseWork('L',true));
  await page.waitForFunction(()=>finishedDesignReads===1);
  assert.equal(await page.evaluate(()=>state.work),'L','late import cannot overwrite a new work selection');
  await page.evaluate(()=>chooseWork('A',true));await page.locator('#openFile').setInputFiles(pendingFile);
  await page.evaluate(()=>trySetDim('H',290,true));await page.waitForFunction(()=>finishedDesignReads===2&&!designReading);
  assert.deepEqual(await page.evaluate(()=>({work:state.work,H:dimsOf().H})),{work:'A',H:290},'late import cannot overwrite an edit');
  assert.match(await page.locator('#learningStatus').textContent(),/現在の設計を保持/);
  await page.evaluate(()=>{window.FileReader=NativeDesignReader;});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
  console.log('PASS:',report.length,'dimension scenarios; live/print refresh, nail guide, reduced motion, unchanged design');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
