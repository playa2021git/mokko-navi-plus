const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768},colorScheme:'dark',acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.APP_URL||'http://127.0.0.1:8765/');
    await page.evaluate(()=>chooseWork('D',true));
    const type=page.locator('#workCornerType'),size=page.locator('#workCornerSize');
    assert.deepEqual(await type.locator('option').evaluateAll(options=>options.map(o=>o.value)),['none','round','chamfer']);
    assert.deepEqual(await size.locator('option').evaluateAll(options=>options.map(o=>+o.value)),[10,15,20,25,30,35,40,45,50]);
    assert.equal(await type.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
    assert.equal(await size.evaluate(e=>getComputedStyle(e).color),'rgb(37, 31, 25)');
    const files=new Map();
    for(const [shape,amount,label] of [['none',null,null],['round',50,'R50'],['chamfer',30,'30']]){
      await type.selectOption(shape);
      if(amount)await size.selectOption(String(amount));
      else assert(!await size.isVisible());
      await page.locator('[data-part-id="R"]').click();
      assert.equal(await type.inputValue(),shape);
      const result=await page.evaluate(({shape,amount,label})=>{
        const ps=parts(),targets=ps.filter(cornerTarget);
        if(targets.map(p=>p.id).sort().join()!=='L,R,dv')throw Error('D corner targets');
        const print=nailDatumSheet(ps),stock=manufacturingSheet(ps);
        for(const p of ps){
          const [mark]=cornerMarks(p),active=cornerTarget(p)&&shape!=='none';
          if(Boolean(mark)!==active)throw Error(p.id+' cut assignment');
          if(!active)continue;
          if(p.corners[3].type!==shape||mark.size!==amount)throw Error(p.id+' cut dimension');
          const outline=partOutline(p);
          for(const [x,y] of [mark.cut[0],mark.cut.at(-1)]){
            if(!outline.some(([a,b])=>Math.hypot(a-x,b-y)<1e-6))throw Error(p.id+' outline tangency');
          }
          for(const svg of [print,stock]){
            const panels=document.createElement('div');panels.innerHTML=svg;
            const cut=panels.querySelector('[data-corner-part="'+p.id+'"]');
            if(!cut||cut.querySelector('polygon')?.getAttribute('fill')!==OFFCUT)throw Error(p.id+' offcut fill');
            const dimensions=[...cut.querySelectorAll('text')];
            if(dimensions.length!==(shape==='round'?1:2)||dimensions.some(t=>t.textContent!==label))
              throw Error(p.id+' printed cut dimensions');
            if(shape==='chamfer'&&(!dimensions[0].getAttribute('transform').startsWith('rotate(0 ')||
              !dimensions[1].getAttribute('transform').startsWith('rotate(-90 ')))throw Error(p.id+' orthogonal cut dimensions');
          }
        }
        const texts=[],fills=[];
        const fill=CanvasRenderingContext2D.prototype.fillText;
        const fillPath=CanvasRenderingContext2D.prototype.fill;
        CanvasRenderingContext2D.prototype.fill=function(...args){
          if(this.canvas.id==='drawCv')fills.push(this.fillStyle);
          return fillPath.apply(this,args);
        };
        CanvasRenderingContext2D.prototype.fillText=function(text,...args){
          if(['drawCv','dimCv'].includes(this.canvas.id))texts.push([this.canvas.id,text]);
          return fill.call(this,text,...args);
        };
        try{
          goScreen('draw',true);
          drawSheet();
          goScreen('main',true);
          state.showDim=true;$('dimCv').hidden=false;drawDim();
        }finally{
          CanvasRenderingContext2D.prototype.fillText=fill;
          CanvasRenderingContext2D.prototype.fill=fillPath;
          state.showDim=false;$('dimCv').hidden=true;
        }
        const labelsOn=id=>texts.filter(([canvas,t])=>canvas===id&&t===label).length;
        const dimensionsPerCut=shape==='round'?1:2;
        if(label&&labelsOn('drawCv')<3*dimensionsPerCut)throw Error('marking labels');
        if(label&&labelsOn('dimCv')!==dimensionsPerCut)throw Error('nail diagram labels');
        if(label&&fills.filter(color=>color===OFFCUT).length<3)throw Error('marking offcut fill');
        for(const length of ['150','280','600'])
          if(!texts.some(([id,t])=>id==='drawCv'&&t===length))throw Error('stock dimension '+length);
        return Array.from(new Uint8Array(buildSTL(5)));
      },{shape,amount,label});
      for(const bytes of files.values())assert.notDeepEqual(result,bytes,'distinct STL geometry');
      files.set(shape,result);
    }
    const protectedCases=await page.evaluate(()=>{
      let count=0;
      for(const key of Object.keys(WORKS))for(const shape of ['round','chamfer']){
        chooseWork(key,true);
        state.corner={type:shape,size:50};
        for(const p of parts().filter(cornerTarget)){
          for(const end of ['left','right'])for(const flip of [false,true]){
            chooseWork(key,true);
            state.corner={type:shape,size:50};
            state.flip[p.id]=flip;
            const start=nestRange(parts(),p.id);
            // Choose either extreme of the row, displacing the other blanks only within that row.
            for(const q of start.bd.placed)state.nestX[q.id]=end==='left'?start.bd.w:0;
            state.nestX[p.id]=end==='left'?0:start.bd.w-p.h;
            const ps=parts(),part=ps.find(q=>q.id===p.id),{q}=nestRange(ps,p.id);
            if(end==='left'?!q.endS:!q.endE)throw Error(key+'/'+p.id+' fixture '+end);
            const [cutEnd]=stockPoint(part,q,0,part.h);
            if(cutEnd!==(q.endS?q.len:0)||factoryEnds(ps).get(p.id).e||!q.cornerLocked)
              throw Error(key+'/'+p.id+' factory end touches cut');
            count++;
          }
        }
      }
      return count;
    });
    assert(protectedCases>100);
    const shortDivider=await page.evaluate(()=>{
      chooseWork('D',true);
      state.dims={H:150,sh:98};state.corner=round_(50);
      const divider=parts().find(p=>p.id==='dv');
      return [divider.h,cornerMarks(divider)[0].size];
    });
    assert.deepEqual(shortDivider,[52,50],'short divider keeps the selected radius');
    assert.equal(await page.locator('#workCornerBoth').count(),0);
    await page.evaluate(()=>chooseWork('G',true));
    const both=page.locator('#workCornerBoth');
    assert(!await both.isChecked());
    const defaultSTL=await page.evaluate(()=>Array.from(new Uint8Array(buildSTL(5))));
    await both.check();
    const doubleSTL=await page.evaluate(()=>{
      const ps=parts();
      if(ps.some(p=>cornerMarks(p).length!==(cornerTarget(p)?2:0)))throw Error('G corner targets');
      if(ps.filter(cornerTarget).some(p=>factoryEnds(ps).get(p.id)?.e))throw Error('G factory edge');
      if(blockingIssues(ps).length)throw Error('R30 should fit default G joints');
      return Array.from(new Uint8Array(buildSTL(5)));
    });
    assert.notDeepEqual(doubleSTL,defaultSTL);
    await type.selectOption('chamfer');
    const diagrams=await page.evaluate(()=>{
      const ps=parts(),dom=document.createElement('div');
      dom.innerHTML=manufacturingSheet(ps)+nailDatumSheet(ps);
      const shaped=[...dom.querySelectorAll('[data-corner-part]')];
      const columns=nest(ps).boards.filter(b=>stockCornerBottomMargin(b,ps,1)>0);
      return {
        multipleFaces:['L','R','dv'].every(id=>shaped.filter(e=>e.dataset.cornerPart===id).length>=4),
        bevelSizes:shaped.every(e=>[...e.querySelectorAll('text')].map(t=>t.textContent).join()=='30,30'),
        bottomDimensions:columns.length>=1
      };
    });
    assert.deepEqual(diagrams,{multipleFaces:true,bevelSizes:true,bottomDimensions:true});
    const save=page.waitForEvent('download');
    await page.locator('#save').click();
    const saved=await (await save).path();
    await page.evaluate(()=>chooseWork('D',true));
    await page.locator('#openFile').setInputFiles(saved);
    await page.waitForFunction(()=>!designReading&&state.work==='G');
    assert(await both.isChecked());
    assert.equal(await type.inputValue(),'chamfer');
    await both.uncheck();
    assert.deepEqual(await page.evaluate(()=>parts().filter(cornerTarget).map(p=>cornerMarks(p).length)),[1,1,1]);
    assert(await page.evaluate(()=>{
      const tile=laminatedCanvas(false),gray=laminatedCanvas(false,true);
      const colors=canvas=>{
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        const sample=new Set();
        for(let i=0;i<pixels.length;i+=68)sample.add(pixels.slice(i,i+3).join());
        return sample;
      };
      const warm=colors(tile),neutral=colors(gray);
      return warm.size>=6&&neutral.size>=5&&tile!==gray&&tile.width===2*tile.height&&laminatedCanvas(true).height===tile.width;
    }));
    assert(await page.evaluate(()=>{
      const doc=document.createElement('div');doc.innerHTML=manualSheet();
      const ids=[...doc.querySelectorAll('pattern')].map(p=>p.id);
      if(new Set(ids).size!==ids.length)return false;
      const material=doc.querySelector('pattern[id^="material-wood-"]');
      const manual=doc.querySelector('pattern[id^="manual-wood-"]');
      const nail=doc.querySelector('pattern[id^="nail-face-"]');
      return [material,manual,nail].every(pattern=>pattern&&doc.querySelector(`[fill="url(#${pattern.id})"]`));
    }), 'all three printed drawing types apply the wood grain to the part faces');
    const legacy=await page.evaluate(()=>readWorkCorner(validateDesign({
      version:11,work:'D',corners:{L:topFront(round_(42)),R:topFront(chamfer(25))}
    })));
    assert.deepEqual(legacy,{type:'round',size:40});
    assert(await page.evaluate(()=>{
      try{validateDesign({version:13,work:'D',cornerBoth:true});return false;}
      catch{return validateDesign({version:12,work:'G'}).cornerBoth===undefined;}
    }));
    assert.deepEqual(errors,[]);
    console.log('PASS D/G work controls, two-sided G cuts, laminate, dimensions, STL and JSON;',protectedCases,'factory-end cases');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
