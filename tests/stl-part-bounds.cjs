const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  for(const key of 'ABCDEFGHIJKL'){
   console.log(key,await page.evaluate(key=>{
    chooseWork(key,true);
    const ps=parts(),getParts=parts;
    const triangleCounts=ps.map(p=>{
     try{parts=()=>[p];return new DataView(buildSTL(2)).getUint32(80,true);}
     finally{parts=getParts;}
    });
    const bs=ps.map(bbox),min=[0,1,2].map(i=>Math.min(...bs.map(b=>b.min[i]))),max=[0,1,2].map(i=>Math.max(...bs.map(b=>b.max[i])));
    const origin=[(min[0]+max[0])/2,min[1],(min[2]+max[2])/2];
    for(const scale of [2,3,5,10]){
     const file=new DataView(buildSTL(scale));let offset=84;
     for(const [i,p] of ps.entries()){
      const lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);
      for(let t=0;t<triangleCounts[i];t++,offset+=50)for(let j=0;j<3;j++){
       const v=[0,1,2].map(a=>file.getFloat32(offset+12+j*12+a*4,true)*scale);
       const world=[v[0]+origin[0],v[2]+origin[1],-v[1]+origin[2]];
       world.forEach((x,a)=>{lo[a]=Math.min(lo[a],x);hi[a]=Math.max(hi[a],x);});
      }
      for(let a=0;a<3;a++)if(!(Math.abs(lo[a]-bs[i].min[a])<.001&&Math.abs(hi[a]-bs[i].max[a])<.001))throw Error(key+'/'+p.id+' scale '+scale+' axis '+a);
     }
     if(offset!==file.byteLength)throw Error('extra/missing triangles');
    }
    return ps.length+' parts × 4 scales';
   },key));
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
