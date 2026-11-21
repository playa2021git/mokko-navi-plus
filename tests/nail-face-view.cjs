const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  for(const key of 'ABCDEFGHIJKL'){
   const result=await page.evaluate(key=>{
    chooseWork(key,true);
    const ps=parts(),doc=document.createElement('div');
    doc.innerHTML=nailDatumSheet(ps);
    let checked=0;
    for(const p of ps){
     const nails=nailSpots(ps).filter(n=>n.driver===p.id);
     for(const panel of doc.querySelectorAll('[data-nail-part="'+p.id+'"]')){
      const nailsOnFace=[...panel.querySelectorAll('[data-nail-number]')];
      const first=nails[Number(nailsOnFace[0].dataset.nailNumber)-1];
      const outline=panel.querySelector('clipPath polygon').points;
      const points=Array.from(outline),min=Math.min(...points.map(q=>q.x)),max=Math.max(...points.map(q=>q.x));
      const scale=(max-min)/p.w;
      for(const [i,[u]] of partOutline(p).entries()){
       if(Math.abs(points[i].x-(min+scale*(first.dir>0?p.w-u:u)))>.001)throw Error(key+'/'+p.id+' outline');
      }
      for(const dot of nailsOnFace){
       const n=nails[Number(dot.dataset.nailNumber)-1];
       const delta=p.posture==='side'?p.pos[2]-n.pos[2]:n.pos[0]-p.pos[0];
       const expected=p.w/2-n.dir*delta;
       if(n.dir!==first.dir||Math.abs(Number(dot.getAttribute('cx'))-(min+expected*scale))>.001)throw Error(key+'/'+p.id+' nail');
       checked++;
      }
     }
    }
    return [checked,nailSpots(ps).length];
   },key);
   assert.equal(result[0],result[1]);console.log(key,result[0]);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
