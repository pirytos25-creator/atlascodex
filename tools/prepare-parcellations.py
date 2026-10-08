from pathlib import Path
import urllib.request, json, struct, concurrent.futures
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
base='https://www.freesurfer.net/pub/dist/freesurfer/tutorial_versions_centos6/freesurfer/subjects/fsaverage/label/'
cache=ROOT/'tools'/'source-labels'; cache.mkdir(exist_ok=True)
fields=['1','2','3a','3b','4a','4p','6','44','45']
names=[f'{h}.Yeo2011_7Networks_N1000.annot' for h in ['lh','rh']]+[f'{h}.BA{f}_exvivo.thresh.label' for h in ['lh','rh'] for f in fields]
def fetch(name):
    dest=cache/name
    if not dest.exists(): dest.write_bytes(urllib.request.urlopen(base+name,timeout=45).read())
    return name
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    for name in executor.map(fetch,names): print(name,flush=True)
def annotation(path):
    data=path.read_bytes(); offset=0
    def integer():
        nonlocal offset
        value=struct.unpack_from('>i',data,offset)[0];offset+=4;return value
    def string():
        nonlocal offset
        n=integer();value=data[offset:offset+n].rstrip(b'\0').decode();offset+=n;return value
    n=integer(); pairs=np.frombuffer(data,dtype='>i4',count=n*2,offset=offset).reshape(-1,2);offset+=n*8
    labels=np.zeros(n,dtype=np.uint8); assert integer()==1
    count=integer(); colors={}
    if count>0:
        string()
        for i in range(count):
            name=string();rgba=[integer() for _ in range(4)];colors[rgba[0]+(rgba[1]<<8)+(rgba[2]<<16)]=i
    else:
        assert count==-2
        integer();string(); entries=integer()
        for _ in range(entries):
            i=integer();name=string();rgba=[integer() for _ in range(4)];colors[rgba[0]+(rgba[1]<<8)+(rgba[2]<<16)]=i
    for color,index in colors.items(): labels[pairs[pairs[:,1]==color,0]]=index
    return labels
metaHD=json.loads((ROOT/'dist/assets/brain-hd.json').read_text())
metaSD=json.loads((ROOT/'dist/assets/brain.json').read_text())
hdBytes=(ROOT/'dist/assets/brain-hd.bin').read_bytes(); sdBytes=(ROOT/'dist/assets/brain.bin').read_bytes()
out={ 'source':base,'method':'Yeo 7 networks, fsaverage annotations; selected ex vivo thresholded BA labels. SD mapped by canonical vertex indices verified against geometry.', 'brodmannFields':fields, 'surfaces':{} }
for h in ['lh','rh']:
    network=annotation(cache/f'{h}.Yeo2011_7Networks_N1000.annot')
    ba=np.zeros(len(network),dtype=np.uint8)
    for i,f in enumerate(fields,1):
        lines=(cache/f'{h}.BA{f}_exvivo.thresh.label').read_text().splitlines()[2:]
        for line in lines:
            vertex=int(line.split()[0]);
            if ba[vertex]==0: ba[vertex]=i
    def positions(meta,data):
        s=next(s for s in meta['surfaces'] if s['hemi']==h)['positions']
        return np.frombuffer(data,dtype='<f4',count=s['length'],offset=s['offset']).reshape(-1,3)
    hp=positions(metaHD,hdBytes);sp=positions(metaSD,sdBytes)
    error=float(np.mean(np.linalg.norm(hp[:len(sp)]-sp,axis=1)))
    print(h,'canonical SD displacement mm',error*40,flush=True)
    if error>.12:
        from scipy.spatial import cKDTree
        _, mapping=cKDTree(hp).query(sp)
        method='nearest pial vertex (approximate projection)'
    else: mapping=np.arange(len(sp));method='canonical nested vertex indices'
    for detail,indices in [('high',np.arange(len(hp))),('low',mapping)]:
        name=f'cortical-labels-{detail}-{h}.bin'
        np.column_stack([network[indices],ba[indices]]).astype('uint8').tofile(ROOT/'dist/assets'/name)
        out['surfaces'][f'{detail}-{h}']={'file':name,'vertices':len(indices),'channels':['Yeo7','selectedBA'],'mapping':method}
(ROOT/'dist/assets/cortical-labels.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'dist/licenses/CORTICAL-LABELS-SOURCES.txt').write_text('''FreeSurfer fsaverage annotations and thresholded ex vivo labels\nSource: '''+base+'''\nYeo et al. 2011, J Neurophysiol, doi:10.1152/jn.00338.2011\nBrodmann labels: selected cytoarchitectonic fields supplied with fsaverage, not a complete map. Overlaps use first label in documented order.\nFreeSurfer Software License applies: https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense\nExisting FreeSurfer license in this distribution also applies to these derivative data.\n''',encoding='utf-8')
