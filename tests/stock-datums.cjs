const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
  const summary=await page.evaluate(()=>{
   const same=(a,b)=>Math.abs(a-b)<1e-6;
   const labels=lines=>lines.map(l=>(l.origin?'右から ':'左から ')+mm(l.distance)+' mm');
   let boardsChecked=0,threePieceRows=0;
   function checkBoard(b,gap){
    const lines=stockMeasureLines(b);
    if(b.placed.length===3){
     const [a,c,d]=b.placed;
     if(a.x!==0||!same(c.x,a.len+gap)||!same(d.x+d.len,b.w))throw Error('three-piece placement');
     if(lines.length!==4||lines.filter(l=>l.origin!==0).length!==1)throw Error('three-piece datums');
     threePieceRows++;
    }
    if(lines.some(l=>l.mark<=0||l.mark>=b.w||l.distance!==Math.abs(l.origin-l.mark)))throw Error('invalid measurement');
    for(const [i,p] of b.placed.entries()){
     if(i&&p.x<b.placed[i-1].x+b.placed[i-1].len+gap-1e-6)throw Error('kerf overlap');
     for(const mark of [p.x,p.x+p.len]){
      if(same(mark,0)||same(mark,b.w))continue;
      if(!lines.some(l=>same(l.mark,mark)&&l.origin===(p.endE?b.w:0)))throw Error('missing finish line');
     }
    }
    boardsChecked++;
   }
   function checkViews(ps){
    const expected=nest(ps).boards.flatMap(b=>labels(stockMeasureLines(b)));
    const stock=document.createElement('div');
    stock.innerHTML=manufacturingSheet(ps);
    const all=[...stock.querySelectorAll('text')];
    const printed=all.map(t=>t.textContent).filter(t=>/^(左|右)から [\d.]+ mm$/.test(t));
    if(JSON.stringify(printed)!==JSON.stringify(expected))throw Error('printed measurements differ');
    if(all.some(t=>t.textContent==='600'||Number(t.getAttribute('y'))>290))throw Error('print total or overflow');
    const drawn=[],fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){
     if(this.canvas.id==='drawCv')drawn.push(text);
     return fill.call(this,text,...args);
    };
    try{
     goScreen('draw',true);
     if(state.screen!=='draw')throw Error('default geometry blocked');
     drawSheet();
    }finally{CanvasRenderingContext2D.prototype.fillText=fill;}
    if(drawn.includes('600'))throw Error('screen total');
    const screen=drawn.filter(t=>/^(左|右)から [\d.]+ mm$/.test(t));
    if(JSON.stringify(screen)!==JSON.stringify(expected))throw Error('screen measurements differ');
   }
   let worksChecked=0;
   for(const key of Object.keys(WORKS))for(const gap of [5,10]){
    chooseWork(key,true,gap);
    const ps=parts(),layout=nest(ps);
    if(layout.left.length){
     if(gap===5)throw Error(key+' default stock does not fit');
     continue;
    }
    layout.boards.forEach(b=>checkBoard(b,gap));
    checkViews(ps);
    worksChecked++;
    for(const d of WORKS[key].dims){
     for(const value of [d.min,d.max]){
      state.dims={[d.k]:value};
      const edited=nest(parts());
      if(!edited.left.length)edited.boards.forEach(b=>checkBoard(b,gap));
     }
    }
   }
   chooseWork('K',true);state.kSplit=true;state.bookend=true;
   nest(parts()).boards.forEach(b=>checkBoard(b,state.gap));
   checkViews(parts());

   // The uploaded example had four finish lines, including two sides of a 10 mm kerf.
   chooseWork('I',true,10);
   state.dims={H:230};
   state.nestBoard={bo:'A',L:'A',R:'B',dv:'B',sh:'B',b1:'C',b2:'C'};
   state.nestX={bo:0,L:370,R:0,dv:240,sh:468};
   const ps=parts(),sample=nest(ps).boards.find(b=>b.id==='B');
   checkBoard(sample,10);
   checkViews(ps);
   return {worksChecked,boardsChecked,threePieceRows,sample:labels(stockMeasureLines(sample))};
  });
  assert.deepEqual(summary.sample,['左から 230 mm','左から 240 mm','左から 458 mm','右から 125 mm']);
  assert(summary.worksChecked>=12);
  assert(summary.threePieceRows>10);
  assert.deepEqual(errors,[]);
  console.log('PASS stock datums and screen/print agreement',summary);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
