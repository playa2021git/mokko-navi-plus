const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert'),path=require('path'),fs=require('fs');
const output=process.env.AUDIT_OUTPUT||path.join(require('os').tmpdir(),'mokko-v3-audit');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[],report=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('file:///'+path.join(__dirname,'../index.html').replace(/\\/g,'/'));
 for(const key of 'ABCDEFGHIJKL'){
  await page.evaluate(k=>chooseWork(k),key);
  const sliders=await page.locator('#size3 input[data-d]').evaluateAll(es=>es.map(e=>({k:e.dataset.d,min:+e.min,max:+e.max,step:+e.step,value:+e.value})));
  for(const t of sliders){
   await page.evaluate(k=>chooseWork(k),key);
   const before=await page.evaluate(()=>JSON.stringify(parts().map(p=>[p.id,p.w,p.h,p.pos])));
   const target=t.value-t.step>=t.min?t.value-t.step:t.value+t.step;
   await page.locator(`#size3 input[data-d="${t.k}"]`).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},target);
   const snapshot=await page.evaluate(()=>({dims:dimsOf(),geom:JSON.stringify(parts().map(p=>[p.id,p.w,p.h,p.pos])),bad:nailSpots(parts(),true).filter(n=>!n.valid).length,left:nest(parts()).left.length,outer:outer()}));
   assert.equal(snapshot.dims[t.k],target,key+' slider '+t.k);assert.notEqual(snapshot.geom,before);assert.equal(snapshot.bad,0);assert.equal(snapshot.left,0);
   for(const screen of ['draw','view','sheet']){
    await page.evaluate(k=>goScreen(k,true),screen);
    const content=await page.locator(screen==='draw'?'#dfoot':screen==='view'?'#vBody':'#sBody').textContent();assert(!/NaN|undefined/.test(content));
    if(screen!=='draw'){
     const overflow=await page.locator(screen==='view'?'#vBody svg.a4':'#sBody svg.a4').evaluateAll(es=>es.flatMap(svg=>[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<-.5||b.y<-.5||b.x+b.width>211||b.y+b.height>298;}).map(t=>t.textContent)));
     if(overflow.length)console.log(key,screen,overflow);assert.deepEqual(overflow,[],key+' '+screen+' overflow');
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(parts().map(p=>[p.id,p.w,p.h,p.pos]))),snapshot.geom,key+' geometry on '+screen);
   }
   const sizes=await page.evaluate(()=>[2,3,5,10].map(scale=>{
    const d=new DataView(buildSTL(scale)),mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<d.getUint32(80,true);i++)for(let v=0;v<3;v++)for(let j=0;j<3;j++){const n=d.getFloat32(84+i*50+12+v*12+j*4,true);if(!Number.isFinite(n))throw Error('STL nonfinite');mn[j]=Math.min(mn[j],n);mx[j]=Math.max(mx[j],n);}
    const ps=parts(),boxes=ps.map(bbox),extent=[0,2,1].map(k=>Math.max(...boxes.map(b=>b.max[k]))-Math.min(...boxes.map(b=>b.min[k])));
    return {scale,mn,size:mx.map((v,i)=>v-mn[i]),extent};
   }));
   for(const s of sizes){assert(Math.abs(s.mn[2])<.001);s.size.forEach((v,i)=>assert(Math.abs(v-s.extent[i]/s.scale)<.01,key+' STL dimension'));}
   report.push({key,dimension:t.k,value:target,checks:'slider, nails, stock, marking, drawing, manual, STL four scales'});
  }
  console.log('PASS',key);
 }
 await page.evaluate(()=>{chooseWork('A');state.showEnds=true;state.showNames=false;refresh();});await page.screenshot({path:path.join(output,'A-ends.png'),fullPage:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2));await browser.close();console.log('PASS: '+report.length+' changed dimensions across A–L; no page errors');
})().catch(e=>{console.error(e);process.exit(1)});
