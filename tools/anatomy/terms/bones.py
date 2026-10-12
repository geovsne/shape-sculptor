"""Bones and cartilages. Latin/ids: FIPAT TA2 Part 2 (and Part 1 for teeth names).
Serial bones (vertebrae, ribs, phalanges...) share the TA2 term of their class; the number goes
in the Portuguese name.
Columns: English name | Portuguese | Latin | TA2 id | description | source | note
"""
W = "https://en.wikipedia.org/wiki/"
ROWS = [
 ("Frontal bone", "Osso frontal", "Os frontale", 520, "Osso da fronte. Forma a parte anterior do crânio e o teto das órbitas.", W+"Frontal_bone", ""),
 ("Sinus of frontal bone", "Seio frontal", "Sinus ossis frontalis", 549, "Cavidade cheia de ar dentro do osso frontal, atrás dos supercílios. É um dos seios paranasais e drena para o nariz.", W+"Frontal_sinus", ""),
 ("Parietal bone", "Osso parietal", "Os parietale", 504, "Osso par que forma os lados e o teto do crânio, unido ao do outro lado na sutura sagital.", W+"Parietal_bone", ""),
 ("Occipital bone", "Osso occipital", "Os occipitale", 552, "Osso da parte posterior e inferior do crânio. Tem o forame magno, por onde passa a medula, e se articula com o atlas.", W+"Occipital_bone", ""),
 ("Temporal bone", "Osso temporal", "Os temporale", 641, "Osso da lateral e da base do crânio. Contém a orelha média e a interna e se articula com a mandíbula.", W+"Temporal_bone", ""),
 ("Sphenoid bone", "Osso esfenoide", "Os sphenoideum", 584, "Osso ímpar no centro da base do crânio, em forma de borboleta. Abriga a hipófise na sela turca.", W+"Sphenoid_bone", ""),
 ("Sinus of sphenoid bone", "Seio esfenoidal", "Sinus ossis sphenoidei", 600, "Cavidade cheia de ar no corpo do esfenoide. É um dos seios paranasais.", W+"Sphenoid_sinus", ""),
 ("Ethmoid bone", "Osso etmoide", "Os ethmoideum", 721, "Osso ímpar e leve entre as órbitas. Separa a cavidade nasal do encéfalo e forma parte do septo nasal.", W+"Ethmoid_bone", ""),
 ("Anterior cells of ethmoid bone", "Células etmoidais anteriores", "Cellulae anteriores ossis ethmoidei", 729, "Pequenas cavidades com ar na parte anterior do etmoide. Fazem parte dos seios paranasais.", W+"Ethmoid_sinus", ""),
 ("Middle cells of ethmoid bone", "Células etmoidais médias", "Cellulae mediae ossis ethmoidei", 730, "Pequenas cavidades com ar na parte média do etmoide. Fazem parte dos seios paranasais.", W+"Ethmoid_sinus", ""),
 ("Posterior cells of ethmoid bone", "Células etmoidais posteriores", "Cellulae posteriores ossis ethmoidei", 731, "Pequenas cavidades com ar na parte posterior do etmoide. Fazem parte dos seios paranasais.", W+"Ethmoid_sinus", ""),
 ("Inferior nasal concha bone", "Concha nasal inferior", "Concha nasalis inferior", 740, "Lâmina óssea curva na parede lateral da cavidade nasal. Aumenta a superfície que aquece e umidifica o ar.", W+"Inferior_nasal_concha", ""),
 ("Lacrimal bone", "Osso lacrimal", "Os lacrimale", 744, "Menor e mais frágil osso da face, na parede medial da órbita. Aloja o saco lacrimal.", W+"Lacrimal_bone", ""),
 ("Nasal bone", "Osso nasal", "Os nasale", 748, "Osso par pequeno e alongado que forma o dorso do nariz.", W+"Nasal_bone", ""),
 ("Vomer", "Vômer", "Vomer", 751, "Osso ímpar e fino que forma a parte posterior e inferior do septo nasal.", W+"Vomer", ""),
 ("Maxilla", "Maxila", "Maxilla", 756, "Osso par que forma o maxilar superior, o assoalho da órbita e parte do palato. Aloja os dentes superiores e o seio maxilar.", W+"Maxilla", ""),
 ("Palatine bone", "Osso palatino", "Os palatinum", 798, "Osso par em forma de L que forma a parte posterior do palato duro e parte da cavidade nasal.", W+"Palatine_bone", ""),
 ("Zygomatic bone", "Osso zigomático", "Os zygomaticum", 818, "Osso da maçã do rosto. Forma a parede lateral da órbita e parte do arco zigomático.", W+"Zygomatic_bone", ""),
 ("Mandible", "Mandíbula", "Mandibula", 835, "Maior e mais forte osso da face, o maxilar inferior. É o único osso móvel do crânio e aloja os dentes inferiores.", W+"Mandible", ""),
 ("Hyoid bone", "Osso hioide", "Os hyoideum", 876, "Osso em forma de ferradura no pescoço, abaixo da mandíbula. Não se articula com outro osso e sustenta a língua.", W+"Hyoid_bone", ""),
 ("Malleus", "Martelo", "Malleus", 881, "Primeiro ossículo da orelha média, preso à membrana timpânica. Transmite a vibração do som à bigorna.", W+"Malleus", ""),
 ("Incus", "Bigorna", "Incus", 888, "Ossículo do meio da orelha média, entre o martelo e o estribo.", W+"Incus", ""),
 ("Stapes", "Estribo", "Stapes", 895, "Menor osso do corpo. Último ossículo da orelha média, encaixado na janela do vestíbulo da orelha interna.", W+"Stapes", ""),
 ("Thyroid cartilage", "Cartilagem tireóidea", "Cartilago thyreoidea", 967, "Maior cartilagem da laringe. Sua saliência anterior forma o pomo de adão.", W+"Thyroid_cartilage", ""),
 ("Cricoid cartilage", "Cartilagem cricóidea", "Cartilago cricoidea", 978, "Cartilagem em forma de anel na base da laringe, logo acima da traqueia. É o único anel completo das vias aéreas.", W+"Cricoid_cartilage", ""),
 ("Arytenoid cartilage", "Cartilagem aritenóidea", "Cartilago arytenoidea", 983, "Par de pequenas cartilagens piramidais da laringe. Nelas se prendem as pregas vocais.", W+"Arytenoid_cartilage", ""),
 ("Corniculate cartilage", "Cartilagem corniculada", "Cartilago corniculata", 997, "Pequeno nódulo de cartilagem elástica sobre o ápice de cada aritenóidea.", W+"Corniculate_cartilages", ""),
 ("Nasal septal cartilage", "Cartilagem do septo nasal", "Cartilago septi nasi", 946, "Lâmina de cartilagem que forma a parte anterior do septo nasal.", W+"Nasal_cartilages", ""),
 ("Lateral process of nasal septal cartilage", "Processo lateral da cartilagem do septo nasal", "Processus lateralis cartilaginis septi nasi", 947, "Expansão lateral da cartilagem do septo, abaixo do osso nasal. Também chamada cartilagem lateral do nariz.", W+"Lateral_nasal_cartilage", ""),
 ("Major alar cartilage", "Cartilagem alar maior", "Cartilago alaris major", 940, "Cartilagem curva de cada lado da ponta do nariz. Dá forma à asa e à narina.", W+"Nasal_cartilages", ""),
 ("Atlas (C1)", "Atlas (C1)", "Atlas", 1038, "Primeira vértebra cervical. Não tem corpo, tem forma de anel e sustenta o crânio. Permite o movimento de dizer sim.", W+"Atlas_(anatomy)", ""),
 ("Axis (C2)", "Áxis (C2)", "Axis", 1050, "Segunda vértebra cervical. Seu dente serve de pivô para o atlas girar, permitindo o movimento de dizer não.", W+"Axis_(anatomy)", ""),
 ("Vertebra C7", "Vértebra C7 (vértebra proeminente)", "Vertebra prominens", 1057, "Sétima vértebra cervical. Seu processo espinhoso longo é a saliência que se palpa na base do pescoço.", W+"Cervical_vertebrae", ""),
 ("Vertebra T1", "Vértebra T1", "Vertebra thoracica prima", 1063, "Primeira vértebra torácica. Articula-se com a primeira costela por uma face articular inteira.", W+"Thoracic_vertebrae", ""),
 ("Sacrum", "Sacro", "Os sacrum", 1071, "Osso triangular formado pela fusão de cinco vértebras sacrais. Liga a coluna aos ossos do quadril.", W+"Sacrum", ""),
 ("Coccyx", "Cóccix", "Os coccygis", 1092, "Último segmento da coluna, formado por 3 a 5 vértebras rudimentares fundidas. Serve de inserção para músculos e ligamentos do assoalho pélvico.", W+"Coccyx", ""),
 ("Manubrium of sternum", "Manúbrio do esterno", "Manubrium sterni", 1130, "Parte superior e larga do esterno. Articula-se com as clavículas e com as primeiras costelas.", W+"Sternum", ""),
 ("Body of sternum", "Corpo do esterno", "Corpus sterni", 1134, "Parte mais longa do esterno, onde se prendem as cartilagens da 2ª à 7ª costela.", W+"Sternum", ""),
 ("Xiphoid process", "Processo xifoide", "Processus xiphoideus", 1135, "Extremidade inferior e pontuda do esterno, cartilaginosa no jovem e ossificada no adulto.", W+"Sternum", ""),
 ("First rib", "Primeira costela", "Costa prima", 1107, "Costela mais curta, larga e curva. Fica sob a clavícula e por cima dela passam a artéria e a veia subclávias.", W+"Rib_cage", ""),
 ("Second rib", "Segunda costela", "Costa secunda", 1111, "Segunda costela verdadeira. Tem uma rugosidade onde se insere o músculo serrátil anterior.", W+"Rib_cage", ""),
 ("Scapula", "Escápula", "Scapula", 1143, "Osso triangular e plano no dorso. Forma o ombro com o úmero e a clavícula e serve de inserção para 17 músculos.", W+"Scapula", ""),
 ("Clavicle", "Clavícula", "Clavicula", 1168, "Osso longo em forma de S entre o esterno e a escápula. Mantém o ombro afastado do tórax.", W+"Clavicle", ""),
 ("Humerus", "Úmero", "Humerus", 1180, "Osso do braço, do ombro ao cotovelo. Articula-se com a escápula, o rádio e a ulna.", W+"Humerus", ""),
 ("Radius", "Rádio", "Radius", 1210, "Osso lateral do antebraço, do lado do polegar. Gira sobre a ulna nos movimentos de pronação e supinação.", W+"Radius_(bone)", ""),
 ("Ulna", "Ulna", "Ulna", 1230, "Osso medial do antebraço, do lado do dedo mínimo. Seu olécrano forma a ponta do cotovelo.", W+"Ulna", ""),
 ("Scaphoid bone", "Escafoide", "Os scaphoideum", 1250, "Osso do carpo do lado do polegar. É o osso do punho que mais fratura em quedas com a mão estendida.", W+"Scaphoid_bone", ""),
 ("Lunate bone", "Semilunar", "Os lunatum", 1252, "Osso do carpo em forma de meia-lua, no centro da fileira proximal.", W+"Lunate_bone", ""),
 ("Triquetrum bone", "Piramidal", "Os triquetrum", 1253, "Osso do carpo da fileira proximal, do lado do dedo mínimo, sob o pisiforme.", W+"Triquetral_bone", ""),
 ("Pisiform bone", "Pisiforme", "Os pisiforme", 1254, "Pequeno osso do carpo em forma de ervilha, dentro do tendão do flexor ulnar do carpo.", W+"Pisiform_bone", ""),
 ("Trapezium bone", "Trapézio", "Os trapezium", 1255, "Osso do carpo da fileira distal na base do polegar. Sua articulação em sela permite a oposição do polegar.", W+"Trapezium_(bone)", ""),
 ("Trapezoid bone", "Trapezoide", "Os trapezoideum", 1257, "Menor osso da fileira distal do carpo, na base do segundo metacarpal.", W+"Trapezoid_bone", ""),
 ("Capitate bone", "Capitato", "Os capitatum", 1258, "Maior osso do carpo, no centro do punho, na base do terceiro metacarpal.", W+"Capitate_bone", ""),
 ("Hamate bone", "Hamato", "Os hamatum", 1259, "Osso do carpo do lado do dedo mínimo, com um gancho (hâmulo) na face palmar.", W+"Hamate_bone", ""),
 ("Hip bone", "Osso do quadril", "Os coxae", 1307, "Osso grande e plano formado pela fusão de ílio, ísquio e púbis. Forma a pelve e o acetábulo, onde encaixa o fêmur.", W+"Hip_bone", ""),
 ("Femur", "Fêmur", "Os femoris", 1360, "Osso da coxa, o mais longo e forte do corpo. Articula-se com o quadril e com a tíbia e a patela no joelho.", W+"Femur", ""),
 ("Patella", "Patela", "Patella", 1390, "Osso sesamoide triangular no tendão do quadríceps, à frente do joelho. Aumenta a alavanca da extensão do joelho.", W+"Patella", ""),
 ("Tibia", "Tíbia", "Tibia", 1397, "Osso maior e medial da perna, que recebe o peso do corpo. Sua extremidade inferior forma o maléolo medial.", W+"Tibia", ""),
 ("Fibula", "Fíbula", "Fibula", 1427, "Osso fino e lateral da perna. Serve de inserção muscular e forma o maléolo lateral.", W+"Fibula", ""),
 ("Talus", "Tálus", "Os tali", 1448, "Osso do tarso entre a tíbia, a fíbula e o calcâneo. Transmite o peso da perna para o pé.", W+"Talus_bone", ""),
 ("Calcaneus", "Calcâneo", "Calcaneus", 1468, "Maior osso do pé, que forma o calcanhar. Nele se insere o tendão do calcâneo (de Aquiles).", W+"Calcaneus", ""),
 ("Navicular bone", "Navicular", "Os naviculare", 1484, "Osso do tarso no lado medial do pé, entre o tálus e os cuneiformes.", W+"Navicular_bone", ""),
 ("Medial cuneiform bone", "Cuneiforme medial", "Os cuneiforme mediale", 1486, "Maior dos três cuneiformes, na base do primeiro metatarsal.", W+"Cuneiform_bones", ""),
 ("Intermediate cuneiform bone", "Cuneiforme intermédio", "Os cuneiforme intermedium", 1487, "Menor dos três cuneiformes, na base do segundo metatarsal.", W+"Cuneiform_bones", ""),
 ("Lateral cuneiform bone", "Cuneiforme lateral", "Os cuneiforme laterale", 1488, "Cuneiforme na base do terceiro metatarsal, ao lado do cuboide.", W+"Cuneiform_bones", ""),
 ("Cuboid bone", "Cuboide", "Os cuboideum", 1489, "Osso do tarso no lado lateral do pé, na base do quarto e do quinto metatarsais.", W+"Cuboid_bone", ""),
 ("Sesamoid bones of foot", "Ossos sesamoides do pé", "Ossa sesamoidea pedis", 1514, "Pequenos ossos dentro de tendões. No pé, dois ficam sob a cabeça do primeiro metatarsal, no tendão do flexor curto do hálux.", W+"Sesamoid_bone", ""),
]

ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"]
PT_ORD = ["primeira", "segunda", "terceira", "quarta", "quinta", "sexta", "sétima", "oitava", "nona", "décima", "décima primeira", "décima segunda"]
PT_ORDM = ["primeiro", "segundo", "terceiro", "quarto", "quinto"]

# vertebrae
for k in (3, 4, 5, 6):
    ROWS.append((f"Vertebra C{k}", f"Vértebra C{k}", "Vertebra cervicalis", 1032,
                 f"{PT_ORD[k-1].capitalize()} vértebra cervical. As vértebras cervicais têm corpo pequeno e forames nos processos transversos, por onde passa a artéria vertebral.", W+"Cervical_vertebrae", ""))
for k in range(2, 13):
    extra = " Tem uma face articular inteira de cada lado para a costela." if k >= 10 else " Tem fóveas costais no corpo e no processo transverso para as costelas."
    ROWS.append((f"Vertebra T{k}", f"Vértebra T{k}", "Vertebra thoracica", 1059,
                 f"{PT_ORD[k-1].capitalize()} vértebra torácica.{extra}", W+"Thoracic_vertebrae", ""))
for k in range(1, 6):
    ROWS.append((f"Vertebra L{k}", f"Vértebra L{k}", "Vertebra lumbalis", 1068,
                 f"{PT_ORD[k-1].capitalize()} vértebra lombar. As lombares têm o corpo mais largo da coluna, pois sustentam o maior peso.", W+"Lumbar_vertebrae", ""))
# ribs
for k in range(3, 13):
    kind = ("verdadeira: liga-se ao esterno pela própria cartilagem" if k <= 7 else
            "falsa: sua cartilagem se une à da costela de cima" if k <= 10 else
            "flutuante: não chega ao esterno e termina livre na parede do abdome")
    la, tid = ("Costae verae", 1106) if k <= 7 else ("Costae spuriae", 1113) if k <= 10 else ("Costae fluctuantes", 1114)
    ROWS.append((f"{ORD[k-1].capitalize()} rib", f"{PT_ORD[k-1].capitalize()} costela", la, tid,
                 f"{PT_ORD[k-1].capitalize()} costela, do tipo {kind}.", W+"Rib_cage", ""))
for k in range(1, 11):
    ROWS.append((f"Costal cartilage of {ORD[k-1]} rib", f"Cartilagem costal da {PT_ORD[k-1]} costela", "Cartilago costalis", 1140,
                 "Cartilagem hialina que prolonga a costela para a frente. Dá elasticidade à caixa torácica na respiração.", W+"Costal_cartilage", ""))
# metacarpals / metatarsals
LA_ORD = ["primum", "secundum", "tertium", "quartum", "quintum"]
for k in range(1, 6):
    if k != 3:
        ROWS.append((f"{ORD[k-1].capitalize()} metacarpal bone", f"{PT_ORDM[k-1].capitalize()} metacarpal", f"Os {LA_ORD[k-1]} metacarpi", 1265,
                     f"Osso longo da palma da mão, na linha do {['polegar','indicador','dedo médio','anelar','dedo mínimo'][k-1]}.", W+"Metacarpal_bones", ""))
    else:
        ROWS.append(("Third metacarpal bone", "Terceiro metacarpal", "Os tertium metacarpi", 1269,
                     "Osso longo da palma da mão, na linha do dedo médio. Tem um processo estiloide na base.", W+"Metacarpal_bones", ""))
    if k not in (1, 5):
        ROWS.append((f"{ORD[k-1].capitalize()} metatarsal bone", f"{PT_ORDM[k-1].capitalize()} metatarsal", f"Os {LA_ORD[k-1]} metatarsi", 1496,
                     f"Osso longo do pé, na linha do {['hálux','segundo dedo','terceiro dedo','quarto dedo','dedo mínimo'][k-1]}.", W+"Metatarsal_bones", ""))
ROWS += [
 ("First metatarsal bone", "Primeiro metatarsal", "Os primum metatarsi", 1500, "Metatarsal mais curto e grosso, na linha do hálux. Sua cabeça suporta grande parte do peso no apoio do pé.", W+"Metatarsal_bones", ""),
 ("Fifth metatarsal bone", "Quinto metatarsal", "Os quintum metatarsi", 1502, "Metatarsal na linha do dedo mínimo. Tem uma tuberosidade na base onde se insere o fibular curto.", W+"Metatarsal_bones", ""),
]
# phalanges
FINGER = ["polegar", "indicador", "dedo médio", "anelar", "dedo mínimo"]
TOE = ["hálux", "segundo dedo", "terceiro dedo", "quarto dedo", "dedo mínimo"]
PH = {"Proximal": ("proximal", "Phalanx proximalis", (1277, 1510)), "Middle": ("média", "Phalanx media", (1278, 1511)), "Distal": ("distal", "Phalanx distalis", (1279, 1512))}
for where, names, lat, idx in (("hand", FINGER, "manus", 0), ("foot", TOE, "pedis", 1)):
    for k in range(1, 6):
        for pos, (pt, la, ids) in PH.items():
            if pos == "Middle" and k == 1:
                continue
            en = f"{pos} phalanx of {ORD[k-1]} finger of {where}"
            label = names[k-1]
            ROWS.append((en, f"Falange {pt} do {label}" + (" (mão)" if where == "hand" and k == 5 else " (pé)" if where == "foot" and k == 5 else ""),
                         f"{la} {lat}", ids[idx],
                         f"Falange {pt} do {label}. " + {"proximal": "Articula-se com o osso metacarpal." if where == "hand" else "Articula-se com o metatarsal.",
                                                         "média": "Fica entre a falange proximal e a distal.",
                                                         "distal": "É a falange da ponta do dedo, sob a unha."}[pt],
                         W+"Phalanx_bone", ""))
# teeth (TA2 Part 3, not in the PDFs read)
TEETH = [
 ("Upper medial incisor", "Incisivo central superior", "Dens incisivus", "Dente da frente da arcada superior, com borda cortante para cortar o alimento."),
 ("Upper lateral incisor", "Incisivo lateral superior", "Dens incisivus", "Dente cortante ao lado do incisivo central superior."),
 ("Lower medial incisor", "Incisivo central inferior", "Dens incisivus", "Dente da frente da arcada inferior, o menor dente permanente."),
 ("Lower lateral incisor", "Incisivo lateral inferior", "Dens incisivus", "Dente cortante ao lado do incisivo central inferior."),
 ("Upper canine", "Canino superior", "Dens caninus", "Dente pontudo com a raiz mais longa da boca, usado para rasgar o alimento."),
 ("Lower canine", "Canino inferior", "Dens caninus", "Dente pontudo da arcada inferior, usado para rasgar o alimento."),
 ("Upper first premolar", "Primeiro pré-molar superior", "Dens premolaris", "Dente com duas cúspides entre o canino e os molares. Ajuda a triturar o alimento."),
 ("Upper second premolar", "Segundo pré-molar superior", "Dens premolaris", "Dente com duas cúspides à frente do primeiro molar superior."),
 ("Lower first premolar", "Primeiro pré-molar inferior", "Dens premolaris", "Dente de transição entre o canino e os molares inferiores."),
 ("Lower second premolar", "Segundo pré-molar inferior", "Dens premolaris", "Dente com cúspides à frente do primeiro molar inferior."),
 ("Upper first molar tooth", "Primeiro molar superior", "Dens molaris", "Dente largo com várias cúspides, o principal na mastigação da arcada superior."),
 ("Upper second molar tooth", "Segundo molar superior", "Dens molaris", "Dente largo de trituração atrás do primeiro molar superior."),
 ("Lower first molar tooth", "Primeiro molar inferior", "Dens molaris", "Dente largo com várias cúspides, o primeiro permanente a nascer, por volta dos 6 anos."),
 ("Lower second molar tooth", "Segundo molar inferior", "Dens molaris", "Dente largo de trituração atrás do primeiro molar inferior."),
]
for en, pt, la, d in TEETH:
    src = W + ("Incisor" if "incis" in la else "Canine_tooth" if "canin" in la else "Premolar" if "premol" in la else "Molar_(tooth)")
    ROWS.append((en, pt, la, None, d, src, "ID da TA2 a conferir (dentes estão na Parte 3)."))

GROUPS = {
    "Anterior teeth": "Dentes anteriores", "Posterior teeth": "Dentes posteriores",
    "Auditory ossicles": "Ossículos da audição", "Bones of cranium": "Ossos do crânio",
    "Bones of foot": "Ossos do pé", "Bones of free part of lower limb": "Ossos da parte livre do membro inferior",
    "Bones of free part of upper limb": "Ossos da parte livre do membro superior",
    "Bones of pectoral girdle": "Ossos do cíngulo do membro superior",
    "Bones of pelvic girdle": "Ossos do cíngulo do membro inferior",
    "Cervical vertebrae": "Vértebras cervicais", "Thoracic vertebrae": "Vértebras torácicas",
    "Lumbar vertebrae": "Vértebras lombares", "Vertebral column": "Coluna vertebral",
    "Costal cartilages": "Cartilagens costais", "True ribs": "Costelas verdadeiras",
    "False ribs": "Costelas falsas", "Floating ribs": "Costelas flutuantes",
    "Extracranial bones of head": "Ossos extracranianos da cabeça",
    "Laryngeal cartilages": "Cartilagens da laringe", "Nasal cartilages": "Cartilagens do nariz",
    "Metatarsal bones": "Ossos metatarsais", "Phalanges of foot": "Falanges do pé",
    "Sternum": "Esterno", "Tarsal bones": "Ossos do tarso",
}
