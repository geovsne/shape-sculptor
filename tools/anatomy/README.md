# Pipeline do modelo anatômico

Gera `public/models/body-m.*` e `body-f.*` a partir do Z-Anatomy (CC BY-SA 4.0) e MakeHuman (CC0).

1. `za_export.py` (roda com o módulo `bpy` do Blender): lê `Startup.blend` do Z-Anatomy e exporta
   músculos, pele, ossos, olhos e cabelo para `za_raw.npz/json`. `mapping.py` diz quais músculos
   entram e a que grupo pertencem.
2. `warp_female.py prepare`: alinha o MakeHuman ao modelo e gera o campo de deformação homem→mulher.
3. `build_model.py <dir> <saida> m|f [warp.npz]`: reduz polígonos, calcula espessura e perfil de
   crescimento de cada músculo, liga a pele aos músculos, regiões de gordura e roupa, e grava o binário.

Dependências: bpy, numpy, scipy, trimesh, fast-simplification, embreex, networkx.
