// Lossless model transport. Older web views retain the original GLB path.
// A CDN may already decode Content-Encoding; inspect bytes before decompressing.
export async function loadModelBuffer(url) {
 const read=async target=>{
  const response=await fetch(target);
  if(!response.ok)throw new Error(`Model download failed (${response.status})`);
  return response.arrayBuffer();
 };
 const validate=buffer=>{
  if(buffer.byteLength<20)throw new Error('Truncated model');
  const header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==buffer.byteLength)throw new Error('Invalid model');
  return buffer;
 };
 if(typeof DecompressionStream==='function'){
  try{
   const compressed=new URL(url);compressed.pathname+='.gz';
   let buffer=await read(compressed);
   const bytes=new Uint8Array(buffer);
   if(bytes[0]===0x1f&&bytes[1]===0x8b){
    const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    buffer=await new Response(stream).arrayBuffer();
   }
   return validate(buffer);
  }catch{
   // Missing/stale compressed assets or an unsupported decoder must not break play.
  }
 }
 return validate(await read(url));
}
