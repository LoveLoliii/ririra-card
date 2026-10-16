"""Restore exported FF14 shader metadata, then create a web-bakeable scene."""
import bpy,sys,json,math,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];args=sys.argv[sys.argv.index('--')+1:];source=Path(args[args.index('--input')+1]);out=Path(args[args.index('--out')+1]);out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(R/'tools/MeddleTools-main'))
from MeddleTools import blend_import,version
from MeddleTools.node_setup import node_configs

def progress(stage,message):
    (out/'progress.json').write_text(json.dumps({'stage':stage,'message':message},ensure_ascii=False),encoding='utf8');print(message,flush=True)

cache=source.parent/'cache'
if not cache.is_dir():raise RuntimeError('缺少 cache 文件夹。请重新选择完整的 FF14 导出文件夹。')
if source.suffix.lower()=='.glb':
    binary=source.read_bytes();document=json.loads(binary[20:20+struct.unpack_from('<I',binary,12)[0]])
else:document=json.loads(source.read_text(encoding='utf8'))
missing=[]
for mat in document.get('materials',[]):
    for key,value in mat.get('extras',{}).items():
        if key.endswith('_PngCachePath') and isinstance(value,str) and value:
            relative=value.replace('\\','/')
            if ':' in relative or relative.startswith('/') or '..' in relative.split('/'):raise RuntimeError('材质贴图路径超出导出文件夹。')
            path=cache/relative
            if not path.is_file():missing.append(value)
if missing:raise RuntimeError('缺少材质贴图：'+missing[0]+'。请提供完整 cache 文件夹。')
progress('materials','正在还原 FF14 材质与染色…')
bpy.ops.wm.read_factory_settings(use_empty=True);version.updateCurrentRelease();blend_import.import_shaders()
bpy.ops.import_scene.gltf(filepath=str(source),bone_heuristic='TEMPERANCE')
s=bpy.context.scene;s.frame_set(0);s.view_layers[0].name='Character'
collection=bpy.data.collections.new('ThinCard_Character');s.collection.children.link(collection)
objects=list(s.objects)
for obj in objects:
    for c in list(obj.users_collection):c.objects.unlink(obj)
    collection.objects.link(obj)
subject=bpy.data.objects.new('Character fixed inside card',None);collection.objects.link(subject)
pivot=bpy.data.objects.new('Card and character — shared rigid pivot',None);collection.objects.link(pivot);subject.parent=pivot
for obj in objects:
    if obj.parent is None:world=obj.matrix_world.copy();obj.parent=subject;obj.matrix_world=world
slots={}
for obj in objects:
    if obj.type=='MESH':
        for slot in obj.material_slots:
            if slot.material:slots.setdefault(slot.material,[]).append(slot)
for index,(mat,material_slots) in enumerate(slots.items()):
    if 'ShaderPackage' in mat:
        node_configs.map_mesh(mat,material_slots,str(cache))
        mapped=material_slots[0].material
        if not mapped.name.startswith('Meddle '):raise RuntimeError('暂不支持此游戏材质：'+str(mat.get('ShaderPackage','unknown')))
    print(f'MATERIAL_RESTORED {index+1}/{len(slots)}',flush=True)

# Convert every Principled branch, preserving the material's skin/cloth masks.
for mat in list(bpy.data.materials):
    if not mat.users or not mat.use_nodes:continue
    ns=mat.node_tree.nodes;ls=mat.node_tree.links
    for bs in list(ns):
        if bs.type!='BSDF_PRINCIPLED':continue
        targets=[l.to_socket for l in bs.outputs[0].links]
        if not targets:continue
        skin='skin' in mat.name or any(l.from_node.type=='GROUP' and 'skin' in l.from_node.node_tree.name for l in bs.inputs['Base Color'].links)
        geo=ns.new('ShaderNodeNewGeometry');dot=ns.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(-.35,-.8,.45);ls.new(geo.outputs['Normal'],dot.inputs[0])
        ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.05;ramp.color_ramp.elements[0].color=(.83,.74,.78,1) if skin else (.62,.57,.72,1);ramp.color_ramp.elements[1].position=.4;ramp.color_ramp.elements[1].color=(1,.98,.97,1);ls.new(dot.outputs['Value'],ramp.inputs[0])
        color=ns.new('ShaderNodeMixRGB');color.blend_type='MULTIPLY';color.inputs[0].default_value=1;color.inputs[1].default_value=bs.inputs['Base Color'].default_value
        if bs.inputs['Base Color'].is_linked:ls.new(bs.inputs['Base Color'].links[0].from_socket,color.inputs[1])
        ls.new(ramp.outputs[0],color.inputs[2]);hybrid=ns.new('ShaderNodeMixRGB');hybrid.inputs[0].default_value=0;ls.new(color.outputs[0],hybrid.inputs[1])
        em=ns.new('ShaderNodeEmission');em.label='Cel painted albedo';ls.new(hybrid.outputs[0],em.inputs['Color']);trans=ns.new('ShaderNodeBsdfTransparent');mix=ns.new('ShaderNodeMixShader');mix.inputs[0].default_value=bs.inputs['Alpha'].default_value
        if bs.inputs['Alpha'].is_linked:ls.new(bs.inputs['Alpha'].links[0].from_socket,mix.inputs[0])
        ls.new(trans.outputs[0],mix.inputs[1]);ls.new(em.outputs[0],mix.inputs[2])
        for target in targets:ls.new(mix.outputs[0],target)

bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();points=[o.matrix_world@Vector(c) for obj in objects if obj.type=='MESH' for o in [obj.evaluated_get(deps)] for c in o.bound_box]
if not points:raise RuntimeError('模型没有可转换的网格。')
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);center=(lo+hi)/2;height=hi.z-lo.z
cam=bpy.data.objects.new('Conversion camera',bpy.data.cameras.new('Conversion camera'));collection.objects.link(cam);cam.data.type='ORTHO';cam.data.ortho_scale=max(height*1.15,.1);cam.location=center+Vector((0,-max(height*3,3),0));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();s.camera=cam
engines={e.identifier for e in s.render.bl_rna.properties['engine'].enum_items}
s.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
if hasattr(s,'eevee'):s.eevee.taa_render_samples=64
s.render.film_transparent=True;s.render.resolution_x=600;s.render.resolution_y=840;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'prepared.blend'))
progress('baking','材质已还原，正在烘焙网页贴图…')
sys.path.insert(0,str(R/'scripts'));sys.argv=['export_realtime_assets.py','--source-blend',str(out/'prepared.blend'),'--out',str(out),'--rebake']
exec(compile((R/'scripts/export_realtime_assets.py').read_text(encoding='utf-8-sig'),str(R/'scripts/export_realtime_assets.py'),'exec'),{'__file__':str(R/'scripts/export_realtime_assets.py'),'__name__':'__main__'})
progress('complete','材质转换完成')
