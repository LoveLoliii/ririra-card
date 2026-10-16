"""Declare baked cel colors as standard glTF unlit + alpha mask materials."""
import json,struct
from pathlib import Path

def mark_baked_gltf(path):
    path=Path(path);data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];document=json.loads(data[20:20+length]);tail=data[20+length:]
    used=document.setdefault('extensionsUsed',[])
    if 'KHR_materials_unlit' not in used:used.append('KHR_materials_unlit')
    for material in document.get('materials',[]):
        material.setdefault('extensions',{})['KHR_materials_unlit']={}
        material['alphaMode']='MASK';material['alphaCutoff']=.33;material['doubleSided']=True
    document.setdefault('asset',{}).setdefault('extras',{})['cardBakedColors']=True
    encoded=json.dumps(document,ensure_ascii=False,separators=(',',':')).encode('utf8');encoded+=b' '*((-len(encoded))%4)
    result=struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail
    temp=path.with_suffix('.pending');temp.write_bytes(result);temp.replace(path)

if __name__=='__main__':mark_baked_gltf(Path(__file__).resolve().parents[1]/'assets/realtime/character.glb')
