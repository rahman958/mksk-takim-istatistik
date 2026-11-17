const types={
  run:['Koşu','#79e1f7'],press:['Pres','#ffabb8'],pass:['Pas','#fff'],
  shot:['Şut','#ffdb8b'],dribble:['Top sürme','#a8f4bd']
};

export function readTacticDuty(value){
  let data=value;
  if(typeof value==='string'&&value.startsWith('{')){
    try{data=JSON.parse(value);}catch{}
  }
  if(data?.kind==='mksk-tactic-v1'){
    const moves=Array.isArray(data.moves)?data.moves.slice(0,7).filter(move=>
      typeof move?.phase==='string'&&typeof move.title==='string'&&Object.hasOwn(types,move.type)&&
      Array.isArray(move.points)&&move.points.length===4&&
      move.points.every(n=>Number.isFinite(n)&&n>=0&&n<=100)
    ):[];
    return {note:typeof data.note==='string'?data.note:'',moves};
  }
  return {note:typeof value==='string'?value:'',moves:[]};
}

export function renderTacticDuty(container,moves){
  if(!moves.length)return;
  const card=document.createElement('details');
  card.className='self-tactic-duty';
  card.innerHTML='<summary>Sahada göster</summary><label>Oyun durumu<select></select></label><canvas width="420" height="300" role="img"></canvas><p aria-live="polite"></p><button type="button">▶ Hareketi oynat</button>';
  container.appendChild(card);
  const select=card.querySelector('select');
  const canvas=card.querySelector('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx){card.remove();return;}
  moves.forEach((move,i)=>select.add(new Option(move.phase,String(i))));
  let animation=0;
  function draw(progress){
    const move=moves[Number(select.value)];
    const [type,color]=types[move.type];
    const [fx,fy,tx,ty]=move.points;
    const ax=18+fx*3.84,ay=16+fy*2.68,bx=18+tx*3.84,by=16+ty*2.68;
    ctx.fillStyle='#12365a';ctx.fillRect(0,0,420,300);
    ctx.strokeStyle='#a3bfdc';ctx.lineWidth=1.5;ctx.strokeRect(18,16,384,268);
    ctx.strokeRect(131,16,158,43);ctx.strokeRect(131,241,158,43);
    ctx.beginPath();ctx.moveTo(18,150);ctx.lineTo(402,150);ctx.stroke();
    ctx.beginPath();ctx.arc(210,150,34,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    const angle=Math.atan2(by-ay,bx-ax);
    ctx.beginPath();ctx.moveTo(bx,by);
    ctx.lineTo(bx-14*Math.cos(angle-.5),by-14*Math.sin(angle-.5));
    ctx.lineTo(bx-14*Math.cos(angle+.5),by-14*Math.sin(angle+.5));ctx.fill();
    const ball=move.type==='pass'||move.type==='shot';
    ctx.fillStyle='#fff';ctx.strokeStyle='#102944';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(ax+(bx-ax)*progress,ay+(by-ay)*progress,ball?6:11,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(progress===0)canvas.setAttribute('aria-label',move.phase+' · '+type);
  }
  function reset(){
    cancelAnimationFrame(animation);
    const move=moves[Number(select.value)];
    card.querySelector('p').textContent=move.title||types[move.type][0];
    draw(0);
  }
  select.onchange=reset;
  card.addEventListener('toggle',()=>{if(card.open)reset();else cancelAnimationFrame(animation);});
  card.querySelector('button').onclick=()=>{
    cancelAnimationFrame(animation);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){draw(1);return;}
    const start=performance.now();
    function tick(now){
      if(!card.isConnected||!card.open)return;
      const progress=Math.min(1,(now-start)/1050);
      draw(progress);
      if(progress<1)animation=requestAnimationFrame(tick);
    }
    animation=requestAnimationFrame(tick);
  };
  reset();
}
