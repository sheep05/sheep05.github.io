import json,urllib.request,pathlib,hashlib,concurrent.futures
root=pathlib.Path(__file__).parent
assets=json.load(open(root/'assets.json'))
manifest={'license':'CC0-1.0','license_url':'https://polyhaven.com/license','assets':[]}
jobs=[]
for name in ('oak_veneer_02','rough_linen','white_plaster_02','hessian_230'):
 source=json.load(open(root/(name+'.json')))
 entry={'id':name,'url':'https://polyhaven.com/a/'+name,'authors':assets[name]['authors'],'tile_dimensions_mm':assets[name].get('dimensions'),'maps':{}}
 (root/name).mkdir(exist_ok=True)
 for key,out in [('Diffuse','color'),('nor_gl','normal'),('Rough','roughness')]:
  item=source[key]['1k']['jpg']
  dest=root/name/(out+'.jpg')
  entry['maps'][out]={'path':str(dest.resolve()),'source':item['url'],'md5':item['md5']}
  jobs.append((item,dest))
 manifest['assets'].append(entry)
def dl(job):
 item,dest=job
 req=urllib.request.Request(item['url'],headers={'User-Agent':'QuietStudioTexturePreparation/1.0'})
 with urllib.request.urlopen(req,timeout=60) as r:data=r.read()
 assert hashlib.md5(data).hexdigest()==item['md5'],dest
 dest.write_bytes(data)
 return dest.name,len(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for r in pool.map(dl,jobs):print(r)
(root/'provenance.json').write_text(json.dumps(manifest,indent=2))
print('Total',sum(p.stat().st_size for p in root.glob('*/*.jpg')))
