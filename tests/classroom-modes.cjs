const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  for(const key of 'ABCDEFGHIJKL'){
   const result=await page.evaluate(key=>{
    const result=[];
    for(const gap of [5,10]){
     chooseWork(key,true,gap);
     if(nest(parts()).left.length){result.push(gap+'mm: unavailable');continue;}
     const ps=parts(),rows=partTable(ps),expected=JSON.stringify(ps);
     if(rows.reduce((s,r)=>s+r.n,0)!==ps.length)throw Error('BOM count');
     function check(){if(JSON.stringify(parts())!==expected)throw Error(key+' geometry changed');}
     for(const v of ['iso','front','side','top']){document.querySelector('[data-v="'+v+'"]').click();check();}
     for(const id of ['fourViews','viewSizes','viewSizes','fourViews','cutStudy','cutStudy','nailStudy','nailStudy','dimBtn','dimBtn','roomBtn','roomBtn','nameBtn','nameBtn','nailBtn','nailBtn','endBtn','endBtn']){
      $(id).click();check();
     }
     for(const screen of ['draw','view','sheet','main']){
      goScreen(screen,true);if(state.screen!==screen)throw Error(key+' blocked '+screen);
      check();
     }
     for(const kind of Object.keys(REF_KINDS)){const slots=insideSlots(refItem(kind));if(!slots.flat().every(Number.isFinite))throw Error('slot coordinate');check();}
     if(nailSpots(ps,true).some(n=>!n.valid)||constructionIssues(ps).length)throw Error('default construction');
     result.push(gap+'mm: PASS');
    }
    return result;
   },key);
   console.log(key,...result);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
