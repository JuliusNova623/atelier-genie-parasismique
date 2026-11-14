/* =====================================================================
   base.js — DONNÉES DE RÉFÉRENCE (notions, sources, cas)
   Les fichiers ex-*.js, cours.js et qcm.js complètent ces tableaux.
   ===================================================================== */
const THEMES=[
 ['raideur','1 ddl · raideur et modèle'],['libre','1 ddl · vibration libre'],['spectre','Spectres et réponse sismique 1 ddl'],
 ['inel','Comportement inélastique'],['modal','N ddl · analyse modale spectrale'],['ec8','EC8 · bâtiments'],['dim','Dimensionnement et ouvrages']
];
const NOTIONS=[
 {id:'inertie',th:'raideur',nom:'Inertie d\'une section (carrée, rectangulaire, tube)',desc:'I = b·h³/12, a⁴/12, π(D⁴−d⁴)/64 selon la section et le sens de flexion.'},
 {id:'raideur',th:'raideur',nom:'Raideur latérale d\'un poteau ou d\'un voile',desc:'12EI/h³ si la tête ne tourne pas, 3EI/h³ en console ou tête articulée.'},
 {id:'ressorts',th:'raideur',nom:'Ressorts en série et en parallèle',desc:'Parallèle : k = Σkᵢ (même déplacement). Série : 1/k = Σ1/kᵢ (même effort).'},
 {id:'neoprene',th:'raideur',nom:'Raideur d\'un appui en élastomère (néoprène)',desc:'k = G·A/e (cisaillement de l\'appui).'},
 {id:'sdof',th:'raideur',nom:'Modèle à 1 degré de liberté et conditions initiales',desc:'Masse concentrée, raideur unique, u₀ et u̇₀.'},
 {id:'masse-equiv',th:'raideur',nom:'Masse équivalente d\'une console à masse répartie',desc:'Masse en tête donnant la même période : 33/136 ≈ 24 % de la masse répartie.'},
 {id:'unites',th:'raideur',nom:'Cohérence des unités',desc:'MPa, kN, tonnes vers Pa, N, kg ; t/m³ et kN/m³.'},
 {id:'libre-nonamorti',th:'libre',nom:'Pulsation et période propres',desc:'ω₀ = √(k/m), T₀ = 2π/ω₀.'},
 {id:'decrement',th:'libre',nom:'Décrément logarithmique',desc:'δ = ln[u(t)/u(t+nT_D)] = 2πnξ/√(1−ξ²).'},
 {id:'amortissement',th:'libre',nom:'Taux d\'amortissement ξ',desc:'Déduire ξ de la décroissance mesurée sur n oscillations.'},
 {id:'pseudo',th:'libre',nom:'Pseudo-pulsation ω_D et T_D',desc:'ω_D = ω₀√(1−ξ²).'},
 {id:'equation',th:'libre',nom:'Équation du mouvement libre amorti u(t)',desc:'U, φ et forme u(t) = U e^(−ξω₀t) cos(ω_D t ∓ φ).'},
 {id:'evaluation',th:'libre',nom:'Évaluer u(t) à un instant donné',desc:'Remplacer t, travailler en radians, contrôler le signe.'},
 {id:'spectre-reponse',th:'spectre',nom:'Spectre de réponse (principe)',desc:'Réponse maximale d\'oscillateurs 1 ddl en fonction de T ; spectre d\'un séisme et spectre réglementaire lissé.'},
 {id:'spectre-ec8',th:'spectre',nom:'Spectre de calcul EC8 (paramètres, palier, branches)',desc:'ag = γI·agR, S, TB, TC, TD, q ; palier 2,5·S·ag/q ; branche en 1/T.'},
 {id:'force-1ddl',th:'spectre',nom:'Effort sismique et déplacement d\'un 1 ddl',desc:'F = M·Sa(T), x = F/k (× q si structure dissipative).'},
 {id:'q-ductilite',th:'inel',nom:'Coefficient de comportement q et ductilité',desc:'q divise les efforts élastiques ; classes DCL, DCM, DCH ; q selon le système structurel.'},
 {id:'deplacements-egaux',th:'inel',nom:'Règle des déplacements égaux',desc:'Déplacement réel = q × déplacement calculé avec le spectre de calcul.'},
 {id:'matrices',th:'modal',nom:'Matrices de souplesse, rigidité et masse',desc:'S par la RDM (console), K = S⁻¹, M diagonale en modèle brochette.'},
 {id:'modes',th:'modal',nom:'Pulsations et modes propres',desc:'det(K − ω²M) = 0, vecteurs propres, allure des déformées.'},
 {id:'participation',th:'modal',nom:'Facteur de participation et masse modale',desc:'pᵢ = Vᵢᵀ M Δ / Vᵢᵀ M Vᵢ ; masse modale (Vᵢᵀ M Δ)²/(Vᵢᵀ M Vᵢ) ; % de masse modale.'},
 {id:'modes-retenus',th:'modal',nom:'Modes à retenir (règle des 90 % et des 5 %)',desc:'Cumul ≥ 90 % de la masse et tous les modes > 5 %.'},
 {id:'forces-modales',th:'modal',nom:'Accélérations, forces et efforts modaux',desc:'aᵢ = pᵢ·Sa(Tᵢ)·Vᵢ, Fᵢ = M·aᵢ, effort tranchant et moment en pied par mode.'},
 {id:'combinaison-modale',th:'modal',nom:'Combinaison des réponses modales (SRSS, CQC)',desc:'SRSS si Tⱼ/Tᵢ ≤ 0,9 ; sinon CQC.'},
 {id:'masse-sismique',th:'ec8',nom:'Masse sismique (G + ΣψE·Q)',desc:'ψE = φ·ψ2 ; ψ2 = 0 pour vent, neige (< 1000 m), entretien de toiture.'},
 {id:'regularite',th:'ec8',nom:'Régularité en plan et en élévation',desc:'Critères EC8 4.2.3 et conséquences : modèle plan, force latérale, q.'},
 {id:'periode-approchee',th:'ec8',nom:'Période fondamentale approchée (Ct·H^3/4)',desc:'Ct = 0,075/√Ac pour les voiles ; Ac = ΣAᵢ(0,2 + (lw/H)²).'},
 {id:'force-laterale',th:'ec8',nom:'Méthode des forces latérales',desc:'Conditions, Fb = Sd(T1)·m·λ, répartition Fᵢ = Fb·zᵢmᵢ/Σzⱼmⱼ.'},
 {id:'repartition',th:'ec8',nom:'Répartition entre éléments de contreventement',desc:'Au prorata des rigidités ; part négligeable des poteaux devant les voiles.'},
 {id:'torsion',th:'ec8',nom:'Torsion (centre de torsion, excentricités, effets)',desc:'e0, ea = ±0,05 L, Mt = F·e, rigidité de torsion C, facteur δ.'},
 {id:'newmark',th:'ec8',nom:'Combinaison des directions (EX + 0,3 EY)',desc:'Combinaison de Newmark des effets des deux composantes horizontales.'},
 {id:'second-ordre',th:'ec8',nom:'Effets du second ordre (coefficient θ)',desc:'θ = Ptot·dr/(Vtot·h) ≤ 0,10 : effets P-Δ négligeables.'},
 {id:'combinaisons',th:'ec8',nom:'Combinaisons d\'actions en situation sismique',desc:'G + AE + Σψ2·Q ; cumul des réactions d\'appui.'},
 {id:'diaphragme',th:'ec8',nom:'Diaphragme rigide',desc:'Plancher ou tablier indéformable dans son plan : un seul ddl par direction et par niveau.'},
 {id:'ba-sismique',th:'dim',nom:'Béton armé en situation sismique (flexion composée)',desc:'γc = 1,3, γs = 1,0 ; moment réduit, section d\'acier, abaques d\'interaction.'},
 {id:'piles-excentricites',th:'dim',nom:'Excentricités de calcul en pied de pile',desc:'Imperfection l0/400, défaut e0 = max(20 mm ; h/30), déplacement en tête.'},
 {id:'palees-acier',th:'dim',nom:'Palées triangulées et portiques acier',desc:'Effort dans la diagonale tendue, contrainte, effort vertical en pied de palée.'},
 {id:'pont-sismique',th:'dim',nom:'Pont modélisé en 1 ddl',desc:'Tablier diaphragme, piles et culées en parallèle, butées transversales, masse sismique du pont.'}
];
const SOURCES=[
 {id:'TD1',type:'TD',annee:'2025-2026',titre:'TD1 – Vibration libre d\'un silo (1 ddl)',fichier:'Génie Parasismique-SujetsTD-20252026.pdf p. 1 ; TD1_SeismicDesign_Silo_2024-2025_Answers.pdf'},
 {id:'TD2',type:'TD',annee:'2025-2026',titre:'TD2 – Château d\'eau (1 ddl, spectre)',fichier:'SujetsTD p. 2-3 ; TD2-GP-EtudeChateauEau-Correction.pdf (diapos 96-104)'},
 {id:'TD3',type:'TD',annee:'2025-2026',titre:'TD3 – Pont-dalle BA à 3 travées (1 ddl, EC8)',fichier:'SujetsTD p. 4-7 ; TD3-GP-PontDalleBA-EC8-20242025-Correction.pdf'},
 {id:'TD4',type:'TD',annee:'2025-2026',titre:'TD4 – Structure à 3 ddl (analyse modale spectrale)',fichier:'SujetsTD p. 8-14 ; TD4-…-AnalyticalResolution.pdf'},
 {id:'TD5',type:'TD',annee:'2025-2026',titre:'TD5 – Bâtiment BA 5 niveaux (forces latérales, torsion)',fichier:'SujetsTD p. 15-18 ; TD5-SeismicDesign-ForceLatérale+Torsion+effetsVoile-Correction.pdf'},
 {id:'E2021',type:'Examen',annee:'2021',titre:'Examen du 9 novembre 2021 – bâtiment BA R+3',fichier:'Dossier 1 : Examen Novembre 2021 Sismique-CORRECTION.pdf',fiche:'e2021',duree:'2 h',bareme:'28,25 pts ramenés sur 20',docs:'Documents de cours interdits'},
 {id:'E2025',type:'Examen',annee:'2025',titre:'Examen du 18 novembre 2025 – bâtiment BA R+3 (sujet 2021 reconduit)',fichier:'Dossier 2 : Examen Novembre 2025 Sismique.pdf (12 p., avec annexe Robot)',duree:'2 h',bareme:'26 pts ramenés sur 20 (25 pts indiqués)',docs:'Documents de cours interdits, calculatrice en mode examen',fiche:'e2021'},
 {id:'E2022',type:'Examen',annee:'2022',titre:'Examen du 14 novembre 2022 – bâtiment acier R+5 (sens Y)',fichier:'Examen Sismique Nov2022.pdf',duree:'2 h',bareme:'22 pts (somme des points indiqués)',docs:'Documents de cours interdits'},
 {id:'E2024',type:'Examen',annee:'2024',titre:'Examen du 19 novembre 2024 (TD5-bis) – bâtiment acier R+5',fichier:'TD5-Bis-Examen Sismique Nov2024.pdf + Correction',duree:'2 h',bareme:'28 pts ramenés sur 20',docs:'Aucun document, calculatrice en mode examen'}
];
const CAS=[
 {cas:'Colonne dont la tête tourne librement (console, ou tête articulée)',res:'k = 3EI/h³',etat:'TD2 (fût), TD3 (fûts sous néoprène, sens X)',cls:'ok'},
 {cas:'Colonne encastrée en pied et en tête (tête guidée, rotation bloquée)',res:'k = 12EI/h³',etat:'TD1 (silo), TD3 (fûts de culée, sens Y)',cls:'ok'},
 {cas:'Éléments qui subissent le même déplacement',res:'Parallèle : k = Σkᵢ',etat:'TD1, TD3 (piles + culées)',cls:'ok'},
 {cas:'Éléments qui transmettent le même effort (empilés)',res:'Série : 1/k = Σ1/kᵢ',etat:'TD3 (fût + néoprènes)',cls:'ok'},
 {cas:'Amortissement sous-critique (0 < ξ < 1)',res:'ω_D = ω₀√(1−ξ²), enveloppe e^(−ξω₀t)',etat:'TD1',cls:'ok'},
 {cas:'Départ du repos (u̇₀ = 0)',res:'U = u₀/√(1−ξ²), tan φ = ξ/√(1−ξ²)',etat:'TD1',cls:'ok'},
 {cas:'Console à masse répartie + masse en tête',res:'M = Mtête + 24 % Mrépartie',etat:'TD2 ; TD3 (≈ 25 % des piles)',cls:'ok'},
 {cas:'T ≤ TC (palier du spectre)',res:'Sa = 2,5·S·ag/q',etat:'TD3 (sens Y), TD4 mode 2, examens',cls:'ok'},
 {cas:'TC < T ≤ TD (branche descendante)',res:'Sa = 2,5·S·ag/q · TC/T (≥ β·ag)',etat:'TD3 (X), TD4 mode 1, TD5, examens',cls:'ok'},
 {cas:'T < TB (branche montante)',res:'Sa = ag·S·[2/3 + T/TB·(2,5/q − 2/3)]',etat:'TD4 mode 3',cls:'ok'},
 {cas:'Bâtiment régulier en élévation, T1 ≤ min(4TC ; 2 s)',res:'Méthode des forces latérales',etat:'TD5, examens 2021 et 2022',cls:'ok'},
 {cas:'≥ 3 niveaux et T1 ≤ 2TC',res:'λ = 0,85 (sinon 1,0)',etat:'TD5, examens',cls:'ok'},
 {cas:'Périodes modales bien séparées (Tⱼ/Tᵢ ≤ 0,9)',res:'Combinaison SRSS',etat:'TD4, examen 2024',cls:'ok'},
 {cas:'Périodes modales voisines',res:'Combinaison CQC',etat:'Cité dans le TD4, non calculé',cls:'warn'},
 {cas:'Deux composantes horizontales',res:'EX ± 0,3EY et EY ± 0,3EX (Newmark)',etat:'TD5, examen 2024',cls:'ok'},
 {cas:'θ ≤ 0,10',res:'Effets du second ordre négligés',etat:'TD5',cls:'ok'},
 {cas:'Répartition symétrique, méthode simplifiée de torsion',res:'δ = 1 + 0,6·x/Le',etat:'Examen 2022',cls:'ok'},
 {cas:'Torsion avec deux modèles plans (un par direction)',res:'δ = 1 + 1,2·x/Le',etat:'Cours C4 2026-2027 p. 17, C5 p. 51',cls:'warn'},
 {cas:'Amortissement critique ou sur-critique (ξ ≥ 1)',res:'—',etat:'À compléter si vu en TD',cls:''},
 {cas:'Lecture d\'un tableau de modes Robot',res:'Mode fondamental X = plus grand % UX ; T = 1/f',etat:'Examens 2021/2025',cls:'ok'},
 {cas:'Combinaison CQC calculée',res:'—',etat:'À compléter si vu en TD',cls:''}
];
/* Remplis par les fichiers suivants */
const FORMULAS=[], VIG=[], Q=[], EXERCISES=[], COURS={chapitres:[],notions:[],hors:[],extras:{}};
const STAR_DEFAULT={};
