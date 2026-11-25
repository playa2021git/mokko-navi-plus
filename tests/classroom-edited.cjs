const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  await page.addScriptTag({content:'window.checkEditedDesign='+require('./check-edited-design.js').toString()});
  for(const key of 'ABCDEFGHIJKL')console.log(key,await page.evaluate(key=>{
   const result={checked:0,unavailable:0,rejected:0,blocked:0,reasons:{}};
   for(const gap of [5,10])for(const t of WORKS[key].dims)for(const bound of ['min','default','max']){
    chooseWork(key,true,gap);if(nest(parts()).left.length){result.unavailable++;continue;}
    const limits=dimSpan(t,dimsOf());
    const value=bound==='default'?t.def:limits[bound==='min'?0:1];
    if(!Number.isFinite(value))throw Error('invalid boundary '+JSON.stringify(limits));
    if(!trySetDim(t.k,value,true)){result.rejected++;continue;}
    for(const corner of ['none','round','chamfer'])for(const hole of [false,true]){
     state.corner={type:corner,size:10};
     const candidate=holeParts()[0];state.hole=hole&&candidate?{id:candidate.id,x:candidate.w/2}:null;refresh();
     try{checkEditedDesign([2,3,5,10][result.checked%4]);}catch(e){throw Error(JSON.stringify({key,gap,t:t.k,value,corner,hole})+' '+e.message);}
     const issues=blockingIssues();
     if(issues.length)result.blocked++;
     for(const issue of issues)result.reasons[issue.t]=(result.reasons[issue.t]||0)+1;
     result.checked++;
    }
   }return result;
  },key));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
