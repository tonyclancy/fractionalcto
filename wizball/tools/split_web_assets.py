from pathlib import Path
import hashlib,json,argparse
parser=argparse.ArgumentParser();parser.add_argument('--directory',default='work/wizball-browser/dist');args=parser.parse_args();root=Path(args.directory);data=(root/'wizball.data').read_bytes();parts=[]
for i,start in enumerate(range(0,len(data),16*1024*1024)):
 chunk=data[start:start+16*1024*1024];name=f'assets-{hashlib.sha256(chunk).hexdigest()[:12]}-{i}.bin';(root/name).write_bytes(chunk);parts.append({'file':name,'bytes':len(chunk)})
wasm=(root/'wizball.wasm').read_bytes();name=f'engine-{hashlib.sha256(wasm).hexdigest()[:12]}.wasm';(root/name).write_bytes(wasm)
(root/'build.json').write_text(json.dumps({'wasm':name,'data':parts,'bytes':len(data),'version':'2026.10.22.3',**json.loads((root/'staged-assets.json').read_text())},indent=2)+'\n')
print('Packaged',len(parts),'asset parts; maximum file size 16 MiB')
