// Executed inside the actual application page by the matrix and sequence runners.
module.exports=function checkEditedDesign(scale){
 const ps=parts(),bs=ps.map(bbox),lo=[0,1,2].map(i=>Math.min(...bs.map(b=>b.min[i]))),hi=[0,1,2].map(i=>Math.max(...bs.map(b=>b.max[i])));
 const eq=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label+': '+JSON.stringify([a,b]));};
 const size=hi.map((v,i)=>Number(mm(v-lo[i])));
 const shown=[...$('size3').querySelectorAll('.bar b')].slice(0,3).map(n=>Number(n.textContent));
 eq(shown,[size[0],size[2],size[1]],'finished W/D/H');
 const expected=ps.map(p=>[T,p.bw,cutLen(p)].map(mm).join('×')).sort();
 const actual=[...$('ptbl').rows||$('ptbl').querySelectorAll('tr')].flatMap(r=>Array(Number(r.cells[2].textContent)).fill(r.cells[1].textContent));
 eq(actual.sort(),expected,'parts table');
 const board=nest(ps),ids=[];
 if(board.left.length)throw Error('stock shortage');
 for(const b of board.boards){let end=-state.gap;for(const q of b.placed){
  if(q.x<end+state.gap-.00001||q.x+q.len>b.w+.00001)throw Error('stock spacing');
  ids.push(...q.members);end=q.x+q.len;
 }}
 eq(ids.sort(),ps.map(p=>p.id).sort(),'stock members');
 const doc=document.createElement('div');doc.innerHTML=nailDatumSheet(ps);
 for(const p of ps){
  const nails=nailCoordinates(p,ps);
  const dots=[...doc.querySelectorAll('[data-nail-part="'+p.id+'"] [data-nail-number]')];
  eq(dots.map(d=>+d.dataset.nailNumber).sort((a,b)=>a-b),nails.map(r=>r.number),'nails '+p.id);
  for(const group of doc.querySelectorAll('[data-nail-part="'+p.id+'"]')){
   const points=group.querySelector('polygon').getAttribute('points').split(' ').map(pair=>pair.split(',').map(Number));
   const left=Math.min(...points.map(q=>q[0])),right=Math.max(...points.map(q=>q[0])),bottom=Math.max(...points.map(q=>q[1]));
   const units=(right-left)/p.w;
   for(const dot of group.querySelectorAll('[data-nail-number]')){
    const r=nails.find(r=>r.number===+dot.dataset.nailNumber);
    const x=r.nail.dir>0?p.w-r.f[0]:r.f[0];
    if(Math.abs((+dot.getAttribute('cx')-left)/units-x)>.001||
       Math.abs((bottom-dot.getAttribute('cy'))/units-r.f[1])>.001)throw Error('nail point '+p.id+'/'+r.number);
   }
  }
 }
 const file=new DataView(buildSTL(scale)),min=[Infinity,Infinity,Infinity],max=min.map(()=>-Infinity);
 for(let i=84;i<file.byteLength;i+=50)for(let j=0;j<3;j++)for(let k=0;k<3;k++){const v=file.getFloat32(i+12+j*12+k*4,true)*scale;min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}
 if(![0,2,1].every((axis,k)=>Math.abs(max[k]-min[k]-size[axis])<.001))throw Error('STL vs model');
}
