/* Genuine model frames rendered in Blender. No image warping or inferred depth. */
window.createModelCharacter=async function(canvas){
  const images=await Promise.all(Array.from({length:72},async(_,i)=>{
    const image=new Image();image.src=`assets/model-v3-views/${String(i).padStart(3,'0')}.webp`;await image.decode();return image;
  }));
  const ctx=canvas.getContext('2d');
  return function(t){
    const frame=((Math.round(t*72)%72)+72)%72;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(images[frame],138,0,924,1201.2);
  };
};
