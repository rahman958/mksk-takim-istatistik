
export function installDialogScrollGuards(){
 if(document.documentElement.dataset.mkskScrollGuards)return;document.documentElement.dataset.mkskScrollGuards='1';
 let saved=null;
 const properties=['position','top','left','right','width','overflow'];
 function sync(){
  const open=!!document.querySelector('dialog[open]');
  if(open&&!saved){
   saved={y:window.scrollY,x:window.scrollX,styles:properties.map(key=>[key,document.body.style.getPropertyValue(key),document.body.style.getPropertyPriority(key)])};
   const body=document.body;body.classList.add('mksk-dialog-locked');document.documentElement.classList.add('mksk-dialog-locked');
   for(const [key,value]of [['position','fixed'],['top',-saved.y+'px'],['left','0'],['right','0'],['width','100%'],['overflow','hidden']])body.style.setProperty(key,value,'important');
  }else if(!open&&saved){
   const old=saved;saved=null;for(const [key,value,priority]of old.styles){if(value)document.body.style.setProperty(key,value,priority);else document.body.style.removeProperty(key);}
   document.body.classList.remove('mksk-dialog-locked');document.documentElement.classList.remove('mksk-dialog-locked');window.scrollTo({top:old.y,left:old.x,behavior:'instant'});
  }
 }
 new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 const style=document.createElement('style');style.textContent='html.mksk-dialog-locked{overflow:hidden!important;overscroll-behavior:none!important}body.mksk-dialog-locked{overscroll-behavior:none!important}dialog[open]{overscroll-behavior:contain;box-sizing:border-box;max-width:calc(100vw - 16px)}dialog[open] .hub-content,dialog[open] .visual-scroll-body,dialog[open] .monthly-body{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}';document.head.append(style);sync();
}
