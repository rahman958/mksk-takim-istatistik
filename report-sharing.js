const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function blocks(root){
 const out=[];
 function visit(node){
  if(node.nodeType!==1)return;
  if(node.closest('[hidden],.hidden,[aria-hidden="true"]'))return;
  if(node.matches('button,select,input,nav,[data-share-controls]'))return;
  if(node.tagName==='TABLE'){
   const headers=[...node.querySelectorAll('thead th')].map(n=>n.textContent.trim());
   node.querySelectorAll('tbody tr').forEach(row=>out.push({text:[...row.children].map((cell,i)=>(headers[i]?headers[i]+': ':'')+cell.textContent.trim()).join(' · '),kind:'row'}));return;
  }
  if(node.tagName==='svg'){out.push({svg:node.cloneNode(true)});return;}
  if(node.matches('h2,h3,h4,summary,p,li,dt,dd,.ra-tag,.ra-share,.ra-duo>div,.monthly-metric,.ra-bar-row')){
   const text=(node.innerText||node.textContent).trim().replace(/\s+/g,' ');
   if(text)out.push({text,kind:node.matches('h2,h3,h4,summary')?'heading':'text'});
   return;
  }
  [...node.children].forEach(visit);
 }
 visit(root);return out;
}
export function installReportSharing(host,{content,title,subtitle,status}){
 const toolbar=document.createElement('div');toolbar.className='ra-share-tools';toolbar.dataset.shareControls='';
 toolbar.innerHTML='<button type="button" data-export="share">PAYLAŞ</button><button type="button" data-export="image">GÖRSELİ İNDİR</button><button type="button" data-export="print">PDF / YAZDIR</button>';
 const preview=document.createElement('div');preview.className='ra-export-pages';preview.hidden=true;
 content.before(toolbar);content.after(preview);
 let urls=[],generation=0,disposed=false;
 function clear(){generation++;urls.forEach(u=>URL.revokeObjectURL(u));urls=[];preview.replaceChildren();preview.hidden=true;}
 toolbar.querySelector('[data-export="print"]').onclick=()=>{
  const win=window.open('','_blank');if(!win){status.textContent='Yazdırma penceresi açılamadı. Tarayıcıda açılır pencereye izin ver.';return;}
  const styles=[...document.querySelectorAll('#report-analytics-style,style')].map(n=>n.outerHTML).join('');
  win.document.open();win.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>'+escape(title())+'</title>'+styles+'<style>body{background:white;color:#153957;font:16px Arial;padding:20px}button,select{display:none!important}.ra-card{break-inside:avoid}.ra-scroll{overflow:visible}.ra-scroll table{min-width:0;width:100%}.ra-chart{max-height:250px}details>*{display:block!important}summary{font-weight:bold}svg{width:100%}@page{margin:12mm}</style></head><body><h1>'+escape(title())+'</h1><p>'+escape(subtitle())+'</p>'+content.innerHTML+'</body></html>');win.document.close();win.focus();setTimeout(()=>win.print(),500);
 };
 async function images(){
  const list=blocks(content),pages=[],width=1080,height=1520,margin=56;
  let canvas,ctx,y=0,page=0;
  const newPage=()=>{canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;ctx=canvas.getContext('2d');if(!ctx)throw Error('Görsel çizimi açılamadı.');ctx.fillStyle='#edf4fb';ctx.fillRect(0,0,width,height);ctx.fillStyle='#12365c';ctx.fillRect(0,0,width,155);ctx.fillStyle='white';ctx.font='bold 32px Arial';ctx.fillText('MKSK 2008 · '+title(),margin,58,width-margin*2);ctx.font='24px Arial';ctx.fillText(subtitle(),margin,105,width-margin*2);ctx.fillStyle='#284965';ctx.font='21px Arial';ctx.fillText('Gerçek kayıtlı veriler · Sayfa '+(++page),margin,height-30);y=195;};
  const finish=async()=>{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Rapor görseli oluşturulamadı.');pages.push(new File([blob],'mksk-rapor-'+page+'.png',{type:'image/png'}));};
  newPage();
  for(const block of list){
   if(block.svg){
    if(y+320>height-70){await finish();newPage();}
    const svg=block.svg;svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','960');svg.setAttribute('height','336');
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
    try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});ctx.drawImage(img,margin,y,width-margin*2,300);y+=325;}finally{URL.revokeObjectURL(url);}continue;
   }
   const heading=block.kind==='heading',font=heading?30:25,lineHeight=heading?42:35;
   ctx.font=(heading?'bold ':'')+font+'px Arial';
   const lines=[];let line='';
   for(const word of block.text.split(/\s+/)){if(line&&ctx.measureText(line+' '+word).width>width-margin*2-24){lines.push(line);line=word;}else line=line?line+' '+word:word;}if(line)lines.push(line);
   for(let i=0;i<lines.length;i++){if(y+lineHeight>height-75){await finish();newPage();}if(heading){ctx.fillStyle='#d3e6f7';ctx.fillRect(margin-8,y-30,width-margin*2+16,lineHeight);}ctx.font=(heading?'bold ':'')+font+'px Arial';ctx.fillStyle='#163958';ctx.fillText(lines[i],margin,y,width-margin*2);y+=lineHeight;}
   y+=heading?16:14;
  }
  await finish();return pages;
 }
 async function exportReport(share){
  const buttons=[...toolbar.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);status.textContent='Rapor görselleri hazırlanıyor…';clear();const ticket=generation;
  try{
   const files=await images();
   if(disposed||ticket!==generation)return;
   if(share&&navigator.canShare?.({files})){try{await navigator.share({files,title:title(),text:subtitle()});status.textContent='Paylaşım penceresi açıldı.';return;}catch(err){if(err.name==='AbortError'){status.textContent='Paylaşım iptal edildi.';return;}}}
   preview.hidden=false;
   files.forEach((file,i)=>{const url=URL.createObjectURL(file);urls.push(url);const img=document.createElement('img');img.src=url;img.alt=title()+' sayfa '+(i+1);const link=document.createElement('a');link.href=url;link.download=file.name;link.textContent=(i+1)+'. SAYFAYI İNDİR';preview.append(img,link);});
   if(files.length===1)preview.querySelector('a').click();
   status.textContent=files.length+' rapor görseli hazır. İndirip WhatsApp üzerinden paylaşabilirsin.';
  }catch(err){status.textContent='Paylaşım hazırlanamadı. '+(err.message||'Görseli indirmeyi tekrar dene.');}finally{buttons.forEach(b=>b.disabled=false);}
 }
 toolbar.querySelector('[data-export="share"]').onclick=()=>exportReport(true);
 toolbar.querySelector('[data-export="image"]').onclick=()=>exportReport(false);
 const invalidate=()=>clear();return {invalidate,destroy:()=>{disposed=true;clear();}};
}
