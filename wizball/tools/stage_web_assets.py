from pathlib import Path
import zipfile,io,hashlib,json,struct,argparse
parser=argparse.ArgumentParser();parser.add_argument('--source',default='work/wizball-browser/full-data.zip');parser.add_argument('--output',default='work/wizball-browser/dist');args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True);source=zipfile.ZipFile(args.source)
# Everything used by the title/menu, plus core definitions and sound effects.
initial={'big_font','font','font_small','system_font','intro_logos','title_screen_and_large_bits','title_screen_elements','wiz_and_nifta','clouds','misc_stuff','rainbow_stars','particle_effects','panel_icons','blank_tileset','editor_icons'}
packs=[];sizes={};boot=[]
for info in source.infolist():
 name=info.filename;data=source.read(info);stem=Path(name).name.split('[')[0]
 deferred=(name.startswith('wizball/streams/') and not name.endswith('wizball_title.mp3')) or (name.endswith('.bmp') and stem not in initial)
 if deferred:
  stream=io.BytesIO()
  with zipfile.ZipFile(stream,'w') as z:z.writestr(info,data)
  b=stream.getvalue();filename='pack-'+hashlib.sha256(b).hexdigest()[:12]+'.zip';(out/filename).write_bytes(b)
  pack={'id':len(packs)+1,'file':filename,'bytes':len(b),'paths':[name]};packs.append(pack)
  if name.endswith('.bmp'):
   w,h=struct.unpack_from('<ii',data,18);sizes[name]=[w,abs(h)]
 else:boot.append((info,data))
with zipfile.ZipFile(out/'data.zip','w') as z:
 for info,data in boot:z.writestr(info,data)
# Prioritize the first level's visuals, then its music, then remaining content.
packs.sort(key=lambda p:(0 if any('background_level_1' in n or 'level_1_tiles' in n for n in p['paths']) else 1 if any('wizball_in_game.mp3' in n for n in p['paths']) else 2 if any('/sprites/' in n for n in p['paths']) else 3))
(out/'staged-assets.json').write_text(json.dumps({'packs':packs,'spriteSizes':sizes,'backgroundBytes':sum(p['bytes'] for p in packs)},indent=2))
print('Startup:',(out/'data.zip').stat().st_size,'bytes; deferred:',sum(p['bytes'] for p in packs),'bytes in',len(packs),'packs')
