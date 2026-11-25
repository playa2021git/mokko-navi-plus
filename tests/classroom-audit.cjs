const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
 const page=await browser.newPage();await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
 const rows=await page.evaluate(()=>Object.keys(WORKS).flatMap(key=>{
  chooseWork(key,true);
  return parts().map(p=>[key,p.id,p.label,T,p.w,p.h,cutLen(p),1,drivingFaces(p,parts()).flatMap(f=>f.rows.map(r=>[f.label,r.number,r.f[0]<=p.w/2?"左端":"右端",mm(Math.min(r.f[0],p.w-r.f[0])),r.datum.yLabel,mm(r.y),r.nail.into].join(' '))).join(' / ')||'この面から打つ釘なし']);
 }));
 fs.writeFileSync('docs/CLASSROOM_PARTS.tsv','作品\tID\t部品\t厚mm\t板面幅mm\t板面高さmm\t切断長mm\t数量\t打つ面・番号・端からの距離mm・相手ID\n'+rows.map(r=>r.join('\t')).join('\n')+'\n');
 await page.evaluate(()=>{
  let seed=20261122;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};
  for(let i=0;i<3000;i++){
   const key='ABCDEFGHIJKL'[rand(12)],w=WORKS[key];state.work=key;state.off={};state.nestX={};state.nestBoard={};state.flip={};state.corner=null;state.hole=null;state.handle=false;state.dims={};state.gap=rand(2)?5:10;
   const t=w.dims[rand(w.dims.length)],lim=dimLim(t,dimsOf());state.dims[t.k]=[lim[0],lim[1],t.def,lim[0]+rand(1+lim[1]-lim[0])][rand(4)];
   const ps=parts(),layout=nest(ps),fail=m=>{throw Error(JSON.stringify({i,key,dims:state.dims,gap:state.gap,m}));};
   if(ps.some(p=>![p.w,p.h,cutLen(p)].every(v=>Number.isFinite(v)&&v>0)))fail('size');
   let ids=layout.left.map(q=>q.members||[q.id]).flat();
   for(const b of layout.boards){let end=-state.gap;for(const q of b.placed){if(q.x<end+state.gap-1e-6||q.x+q.len>b.w+.000001)fail('stock');end=q.x+q.len;ids.push(...q.members);}}
   if(ids.sort().join()!==ps.map(p=>p.id).sort().join())fail('membership');
  }
 });
 await page.evaluate(()=>{state.quiz={ans:[1,1,1,1,3,3],done:true,code:'111133'};goScreen('quiz')});
 for(const key of 'ABCDEFGHIJKL'){
 const actual=await page.locator('.qcard').filter({has:page.locator('[data-go="'+key+'"]')}).locator('.mm').innerText();
 const expected=await page.evaluate(k=>{const o=outer(k,true);return [o.W,o.D,o.H].join('×')+'mm'},key);
 assert.equal(actual,expected,key);
 }
 const split=await page.evaluate(()=>{chooseWork('K',true);state.kSplit=true;return {steps:assemblySteps(parts()),note:processNotes(parts())[0]};});
 assert.ok(split.steps.includes(split.note),'K split assembly must use its actual cutting layout');
 console.log('PASS 3000 seeded geometry/layout cases, 12 default quiz bounds;',rows.length,'parts');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
