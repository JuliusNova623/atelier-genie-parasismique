/* =====================================================================
   prov.js — PROVENANCES des exercices (dossier 1 = GénieParasismique-5GC-2025-2026,
   dossier 2 = « parasismique 2 DS »), versions de documents et exercices voisins.
   ===================================================================== */
const PROV={
 td1:[{d:'1 et 2',f:'TD1_SeismicDesign_Silo_2024-2025_Answers.pdf',st:'corrigé officiel',n:'Fichier identique dans les deux dossiers (même empreinte).'},{d:'1',f:'Génie Parasismique-SujetsTD-20252026.pdf p. 1',st:'énoncé',n:'En-tête « 2022-2023 ».'}],
 td2:[{d:'1',f:'Génie Parasismique-SujetsTD-20252026.pdf p. 2-3',st:'énoncé'},{d:'1',f:'TD2-GP-EtudeChateauEau-Correction.pdf',st:'corrigé officiel',n:'Diapositives 96 à 104 du cours C1 2025-2026.'},{d:'2',f:'TD2-GP-Chateau-deau-Correction.pdf',st:'corrigé officiel (autre version)',n:'Même contenu, diapositives renumérotées 101 à 109 (cours C1 2026-2027).'}],
 td3:[{d:'1',f:'Génie Parasismique-SujetsTD-20252026.pdf p. 4-7',st:'énoncé'},{d:'1 et 2',f:'TD3-GP-PontDalleBA-EC8-20242025-Correction.pdf',st:'corrigé officiel',n:'Fichier identique dans les deux dossiers.'}],
 td4:[{d:'1',f:'Génie Parasismique-SujetsTD-20252026.pdf p. 8-14',st:'énoncé (TP Robot)',n:'Contient la coquille « Ecm/2 soit 12 400 MPa ».'},{d:'2',f:'TD4-GénieParasismique-AnalyseSismique-Structure3ddl-5GC20262027-Sujet.pdf',st:'énoncé 2026-2027 (autre version)',n:'Identique, coquille corrigée (16 400 MPa), en-tête « ENISE / 3GC ».'},{d:'1',f:'TD4-…-5GC20252026-AnalyticalResolution.pdf',st:'corrigé officiel (résolution analytique)'},{d:'2',f:'TD4-GP-ModélisationStructure3DDL-5GC20262027-ResolutionAnalytique.pdf',st:'corrigé officiel (autre version)',n:'Coquilles corrigées (« mode tertiaire » pour ω₃) et une phrase ajoutée : les vecteurs propres représentent la déformée de la console dans chaque mode, à un coefficient près. Résultats identiques.'}],
 td5:[{d:'1',f:'Génie Parasismique-SujetsTD-20252026.pdf p. 15-18',st:'énoncé'},{d:'1',f:'TD5-SeismicDesign-ForceLatérale+Torsion+effetsVoile-Correction.pdf',st:'corrigé officiel'}],
 e2021:[{d:'1',f:'Examen Novembre 2021 Sismique-CORRECTION.pdf',st:'énoncé 2021 + corrigé officiel partiel (1.1, 1.2b)'},{d:'2',f:'Examen Novembre 2025 Sismique.pdf',st:'énoncé 2025 + annexe Robot',n:'Sujet reconduit : voir les versions de chaque question.'}],
 e2022:[{d:'1',f:'Examen Sismique Nov2022.pdf',st:'énoncé seul',n:'Aucun corrigé : correction entièrement reconstituée.'}],
 e2024:[{d:'1',f:'TD5-Bis-Examen Sismique Nov2024.pdf',st:'énoncé + annexe Robot'},{d:'1',f:'TD5-Bis-Examen Sismique Nov2024-Correction.pdf',st:'corrigé officiel'},{d:'2',f:'TD5-Génie Parasismique-Etude Batiment Métallique-Correction.pdf',st:'corrigé officiel (fichier identique, autre nom)',n:'Dans le dossier 2, ce sujet est rangé comme « TD5 – étude bâtiment métallique » : il semble servir de TD5 en 2026-2027 (à confirmer).'}]
};
const LIENS={
 e2022:[{ex:'e2024',n:'Même bâtiment acier R+5 (palées en files 1 et 6 en 2022, 1 et 5 en 2024). 2022 traite le sens Y par forces latérales ; 2024 le sens X par analyse modale, les réactions et la torsion.'}],
 e2024:[{ex:'e2022',n:'Même bâtiment ; 2022 traite la masse niveau par niveau, la régularité et les forces latérales suivant Y.'},{ex:'td4',n:'Même démarche modale spectrale (périodes, % de masse modale, SRSS) mais à partir de résultats Robot.'}],
 td5:[{ex:'e2021',n:'Même famille de problème (bâtiment BA à voiles, période EC8, forces latérales, torsion), configuration différente.'}],
 e2021:[{ex:'td5',n:'Même méthode qu\'au TD5 : rigidité poteaux/voiles, Ct·H^3/4, répartition sur les voiles, torsion.'}],
 td2:[{ex:'td3',n:'Même modélisation 1 ddl + spectre ; le TD3 ajoute les associations de ressorts.'}],
 td3:[{ex:'td2',n:'Masse des piles prise à 25 % par analogie avec la masse équivalente (24 %) du TD2.'}]
};
EXERCISES.forEach(e=>{e.prov=PROV[e.id]||[]; e.liens=LIENS[e.id]||[];});
