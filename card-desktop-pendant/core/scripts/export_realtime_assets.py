"""Freeze the actual posed mesh; bake the FF14 node graphs for web delivery."""
import bpy, bmesh, math, json, sys
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def option(name,default):return Path(sys.argv[sys.argv.index(name)+1]) if name in sys.argv else default
O=option('--out',R/'assets/realtime');O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(option('--source-blend',R/'output/anime-v8/toon-card.blend')))
s=bpy.context.scene;bpy.context.window.view_layer=s.view_layers['Character']
p=bpy.data.objects['Card and character — shared rigid pivot'];p.rotation_euler=(0,0,0);bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get();sources=[o for o in bpy.data.collections['ThinCard_Character'].objects if o.type=='MESH' and not o.hide_render]
col=bpy.data.collections.new('Web posed geometry');s.collection.children.link(col)
copies=[]
for source in sources:
    ev=source.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps)
    # Bake and glTF must use the identical tessellation, especially at the mouth.
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='FIXED',ngon_method='EAR_CLIP');bm.to_mesh(me);bm.free();me.update()
    ob=bpy.data.objects.new(source.name,me);col.objects.link(ob);ob.matrix_world=ev.matrix_world.copy();copies.append(ob)
    assert all(len(face.vertices)==3 for face in me.polygons), 'Web baking requires fixed triangle topology'
for source in sources:source.hide_render=True
s.render.engine='CYCLES';s.cycles.samples=1;s.cycles.use_denoising=False;s.cycles.device='CPU';s.render.bake.margin=6;s.render.bake.use_clear=True
s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1
report=[]
for index,ob in enumerate(copies):
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    sourceuv=ob.data.uv_layers[0].name if ob.data.uv_layers else None
    cloned=[]
    for slot in ob.material_slots:
        mat=slot.material.copy();slot.material=mat;cloned.append(mat)
        ns=mat.node_tree.nodes;ls=mat.node_tree.links
        uv=ns.new('ShaderNodeUVMap');uv.uv_map=sourceuv or ''
        for n in list(ns):
            if n.type=='TEX_IMAGE' and not n.inputs['Vector'].is_linked:ls.new(uv.outputs[0],n.inputs['Vector'])
            if n.type=='UVMAP' and not n.uv_map:n.uv_map=sourceuv or ''
            if n.type=='TEX_COORD':
                for link in list(n.outputs['UV'].links):ls.new(uv.outputs[0],link.to_socket)
            if n.type=='EMISSION' and n.label=='Cel painted albedo':
                # ShaderToRGB is Eevee-only; use the cel base and its texture normals.
                hybrid=n.inputs['Color'].links[0].from_node
                ls.new(hybrid.inputs[1].links[0].from_socket,n.inputs['Color'])
            if n.type=='BSDF_TRANSPARENT':
                black=ns.new('ShaderNodeEmission');black.label='Baked transparency zero';black.inputs[0].default_value=(0,0,0,1)
                for link in list(n.outputs[0].links):ls.new(black.outputs[0],link.to_socket)
        # Do not bake a camera-dependent ink effect onto the surface.
        for n in ns:
            if n.type=='MIX_RGB' and n.blend_type=='MULTIPLY' and abs(n.inputs[0].default_value-.65)<.001:n.inputs[0].default_value=0
    uv=ob.data.uv_layers.new(name='WebAtlas');ob.data.uv_layers.active=uv
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.015,correct_aspect=False,scale_to_bounds=True);bpy.ops.object.mode_set(mode='OBJECT')
    size=1024 if any(x in ob.name for x in ['fac_0','hir_0','e6016_top','e6016_dwn','m6001']) else 512
    file=O/f'{index:02d}.png'
    if not file.exists() or '--rebake' in sys.argv:
        color=bpy.data.images.new('Web color',width=size,height=size,alpha=True)
        alpha=bpy.data.images.new('Web alpha',width=size,height=size,alpha=True);alpha.colorspace_settings.name='Non-Color'
        targets=[]
        for mat in cloned:
            n=mat.node_tree.nodes.new('ShaderNodeTexImage');n.image=color;mat.node_tree.nodes.active=n;targets.append(n)
        bpy.ops.object.bake(type='EMIT',uv_layer='WebAtlas')
        rgb=np.empty(size*size*4,dtype=np.float32);color.pixels.foreach_get(rgb);rgb=rgb.reshape(-1,4)
        for mat,target in zip(cloned,targets):
            target.image=alpha;mat.node_tree.nodes.active=target
            for n in mat.node_tree.nodes:
                if n.type=='EMISSION' and n.label!='Baked transparency zero':
                    for link in list(n.inputs['Color'].links):mat.node_tree.links.remove(link)
                    n.inputs['Color'].default_value=(1,1,1,1);n.inputs['Strength'].default_value=1
        bpy.ops.object.bake(type='EMIT',uv_layer='WebAtlas')
        a=np.empty(size*size*4,dtype=np.float32);alpha.pixels.foreach_get(a);a=a.reshape(-1,4)[:,0].clip(0,1)
        rgb[:,:3]=np.where(a[:,None]>.001,rgb[:,:3]/np.maximum(a[:,None],.001),0).clip(0,1);rgb[:,3]=a
        color.pixels.foreach_set(rgb.ravel());color.filepath_raw=str(file);color.file_format='PNG';color.save()
        print('BAKED',index,ob.name,'alpha',float(a.min()),float(a.max()),flush=True)
        bpy.data.images.remove(color);bpy.data.images.remove(alpha)
    image=bpy.data.images.load(str(file),check_existing=True)
    web=bpy.data.materials.new('Web '+ob.name);web.use_nodes=True;web.diffuse_color=(1,1,1,1)
    ns=web.node_tree.nodes;ls=web.node_tree.links;bs=ns.get('Principled BSDF');tex=ns.new('ShaderNodeTexImage');tex.image=image;uvnode=ns.new('ShaderNodeUVMap');uvnode.uv_map='WebAtlas';ls.new(uvnode.outputs[0],tex.inputs['Vector']);ls.new(tex.outputs['Color'],bs.inputs['Base Color']);ls.new(tex.outputs['Alpha'],bs.inputs['Alpha']);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=1
    web.surface_render_method='DITHERED';web.use_backface_culling=False
    ob.data.materials.clear();ob.data.materials.append(web)
    for poly in ob.data.polygons:poly.material_index=0
    ob.data.uv_layers.active=ob.data.uv_layers['WebAtlas'];ob.data.uv_layers['WebAtlas'].active_render=True
    before_uv=np.array([loop.uv[:] for loop in ob.data.uv_layers['WebAtlas'].data])
    # Keep only the atlas UV layer so GLTFLoader exposes the right set as map.uv.
    for old in list(ob.data.uv_layers):
        if old.name!='WebAtlas':ob.data.uv_layers.remove(old)
    if '--diagnose' in sys.argv:
        after_uv=np.array([loop.uv[:] for loop in ob.data.uv_layers['WebAtlas'].data]);print('UV_REMOVAL_DELTA',ob.name,float(np.max(np.abs(before_uv-after_uv))),flush=True)
    report.append({'mesh':ob.name,'vertices':len(ob.data.vertices),'triangles':sum(len(f.vertices)-2 for f in ob.data.polygons),'atlas':file.name,'size':size})
    for mat in cloned:bpy.data.materials.remove(mat)
    print(f'WEB_MESH_READY {index+1}/{len(copies)}',flush=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in copies:ob.hide_render=False;ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(O/'character.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_yup=True,export_cameras=False,export_lights=False)
sys.path.insert(0,str(R/'scripts'))
from mark_baked_gltf import mark_baked_gltf
mark_baked_gltf(O/'character.glb')
(O/'asset-report.json').write_text(json.dumps({'meshes':report,'lighting':'baked cel colors, real geometry, freely orbitable','pose':'original exported pose, applied armatures','bakeTopology':'triangulated before UV unwrap and baking; same triangles exported','triangleCount':sum(o['triangles'] for o in report)},ensure_ascii=False,indent=2),encoding='utf8')
print('REALTIME_ASSET_READY',flush=True)
if '--diagnose' in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=str(R/'output/realtime-diagnosis.blend'))
    for ob in copies:
        mat=ob.active_material;nt=mat.node_tree;bs=nt.nodes.get('Principled BSDF');tex=next(n for n in nt.nodes if n.type=='TEX_IMAGE');out=nt.nodes.get('Material Output');em=nt.nodes.new('ShaderNodeEmission');nt.links.new(tex.outputs['Color'],em.inputs['Color']);transparent=nt.nodes.new('ShaderNodeBsdfTransparent');mix=nt.nodes.new('ShaderNodeMixShader');nt.links.new(tex.outputs['Alpha'],mix.inputs[0]);nt.links.new(transparent.outputs[0],mix.inputs[1]);nt.links.new(em.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],out.inputs['Surface'])
    s.render.engine='BLENDER_EEVEE';s.render.use_compositing=False;s.camera.data.ortho_scale=.4;s.camera.location=(.03,-5.35,.55);s.render.resolution_x=700;s.render.resolution_y=850;s.render.filepath=str(R/'output/realtime-face-blender.png');bpy.ops.render.render(write_still=True)
