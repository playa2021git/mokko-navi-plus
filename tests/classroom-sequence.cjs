const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  await page.addScriptTag({content:'window.checkEditedDesign='+require('./check-edited-design.js').toString()});
  const counts=await page.evaluate(()=>{
   let seed=31337;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
   const history=[],counts=Array(8).fill(0);
   for(let i=0;i<2400;i++){
    const op=random(8),before=JSON.stringify(parts());counts[op]++;
    history.push([i,state.work,op,seed]);if(history.length>12)history.shift();
    try{
     if(op===0){chooseWork('ABCDEFGHIJKL'[random(12)],true);if(Object.keys(state.off).length||state.hole||Object.keys(state.dims).length)throw Error('state leak');}
     if(op===1){const t=WORKS[state.work].dims[random(WORKS[state.work].dims.length)],l=dimLim(t,dimsOf());trySetDim(t.k,[l[0],l[1],t.def][random(3)],true);}
     if(op===2)state.corner=state.corner?null:round_(10);
     if(op===3){const p=holeParts()[0];if(p)state.hole=state.hole?null:{id:p.id,x:p.w/2};}
     if(op===4){const prev=state.gap;state.gap=prev===5?10:5;if(nest(parts()).left.length)state.gap=prev;}
     if(op===5){document.querySelectorAll('[data-v]')[random(4)].click();}
     if(op===6){$('fourViews').click();$('fourViews').click();}
     if(op===7){state.showNails=!state.showNails;markDirty();}
     if([2,3,4].includes(op))refresh();
     checkEditedDesign([2,3,5,10][i%4]);
     const ps=parts(),layout=nest(ps),nails=nailSpots(ps,true);
     if(op>=5&&JSON.stringify(ps)!==before)throw Error('view changed geometry');
     if(layout.left.length||overlappingParts(ps).length)throw Error('layout or overlap');
     for(const b of layout.boards){let end=-state.gap;for(const q of b.placed){if(q.x<end+state.gap-1e-6||q.x+q.len>b.w+1e-6)throw Error('gap');end=q.x+q.len;}}
     if(nails.some(n=>!n.pos.every(Number.isFinite))||ps.some(p=>![p.w,p.h].every(x=>x>0&&Number.isFinite(x))))throw Error('number');
    }catch(e){throw Error(e.message+' seed=31337 trace='+JSON.stringify(history));}
   }return counts;
  });
  console.log('PASS 2400 state transitions',counts);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
