# Roulette Soirée

Application de soirée entre amis, en français, pour **téléphone Android (APK)** et pour **grand écran dans le navigateur** (TV, projecteur) : une roulette de **10 thèmes**, **20 cartes** par thème
(questions ou actions), un tirage du numéro ludique (dé, secousse, cartes face cachée, machine à sous),
un barème de points, des boissons, des jokers, un mode équipes et un podium final.

- **100 % hors-ligne** : aucun serveur, aucun compte, aucune requête réseau. L'APK n'a même pas la permission `INTERNET`.
- Joueurs, parties et réglages sont stockés **sur le téléphone** (IndexedDB).
- Application web (Vite + React + TypeScript) empaquetée en APK avec **Capacitor**, ou en **un seul fichier HTML** pour le navigateur.
- Design « nuit violette, or, magenta, cyan » : fond animé, verre dépoli, polices embarquées (Bungee, Outfit).
- Les **200 cartes du PDF « jeux script »** (10 thèmes × 20 : vérités, actions, dilemmes, énigmes, chaos…) sont intégrées.

> État : toute l'application est développée et testée (tests unitaires et e2e). Les parties **natives**
> (sons, vibrations, écran allumé, bouton retour, partage de fichier) n'ont pas pu être testées sur un
> téléphone pendant le développement : voir [Ce qui reste à vérifier](#ce-qui-reste-à-vérifier).

---

## Sommaire

1. [Installer l'APK sur un téléphone](#installer-lapk-sur-un-téléphone)
2. [Jouer sur grand écran (navigateur, TV, projecteur)](#jouer-sur-grand-écran-navigateur-tv-projecteur)
3. [Obtenir l'APK (compilation dans le cloud)](#obtenir-lapk-compilation-dans-le-cloud)
4. [Signer l'application (keystore)](#signer-lapplication-keystore)
5. [Mettre vos vraies cartes](#mettre-vos-vraies-cartes)
6. [Règles du jeu](#règles-du-jeu)
7. [Données et sauvegarde](#données-et-sauvegarde)
8. [Développer](#développer)
9. [Parcours de recette manuel](#parcours-de-recette-manuel)
10. [Choix d'implémentation](#choix-dimplémentation)
11. [Ce qui reste à vérifier](#ce-qui-reste-à-vérifier)

---

## Installer l'APK sur un téléphone

1. Récupérez le fichier `.apk` (voir la section suivante) sur le téléphone : téléchargement direct,
   WhatsApp, Google Drive, câble USB…
2. Ouvrez-le. Android demande d'**autoriser l'installation depuis cette source** (« sources inconnues ») :
   acceptez pour l'application utilisée (Fichiers, Chrome, WhatsApp…). Ce réglage se trouve aussi dans
   _Paramètres → Applications → Accès spécial → Installer des applis inconnues_.
3. **Google Play Protect** peut afficher un avertissement (« application non reconnue ») : c'est normal pour
   une application qui ne vient pas du Play Store. Choisissez _Installer quand même_.
4. Lancez _Roulette Soirée_. Tout fonctionne dès le premier lancement, **même en mode avion**.

### Partager l'application aux amis

Envoyez simplement le fichier `.apk` (WhatsApp, Drive, e-mail…). Chaque ami suit les étapes ci-dessus.

### Mettre à jour

Installez le nouvel APK **par-dessus** l'ancien : les données (joueurs, historique, réglages) sont conservées.
Cela ne fonctionne que si le nouvel APK est **signé avec la même clé** et a un `versionCode` plus élevé
(c'est automatique avec le workflow, voir plus bas). Si la signature diffère, Android refuse la mise à jour :
il faudrait désinstaller (et **perdre les données**, pensez à les exporter avant).

### Installer avec `adb` ou un émulateur

```bash
adb devices                                  # le téléphone (débogage USB activé) ou l'émulateur doit apparaître
adb install -r roulette-soiree-1.0.0.apk     # -r : réinstalle en conservant les données
adb shell am start -n fr.soiree.roulette/.MainActivity
```

Pour tester le mode avion : `adb shell cmd connectivity airplane-mode enable` (ou réglage manuel).

---

## Jouer sur grand écran (navigateur, TV, projecteur)

L'application existe aussi en **un seul fichier HTML** qui s'ouvre d'un double-clic dans le navigateur
d'un ordinateur (Chrome, Edge, Firefox…). Aucun serveur, aucune installation, aucun réseau : tout
(code, polices, cartes) est dans le fichier, et la partie est enregistrée dans le navigateur.

**Obtenir le fichier**

- _Sur GitHub_ : onglet **Actions** → dernier run → artefact `roulette-soiree-web` (ou joint à la Release d'un tag).
- _Sur votre machine_ : `npm run build:web` → `dist-web/roulette-soiree.html`.

**Projeter sur la TV**

1. Reliez l'ordinateur à la TV ou au projecteur (câble HDMI, ou « recopie / diffusion d'écran » : Chromecast, AirPlay, Miracast).
2. Ouvrez `roulette-soiree.html`. Sur un grand écran en paysage, le **mode écran** s'active tout seul
   (sinon : _Accueil → 📺 Mode écran_, ou _Réglages → Affichage_).
3. Appuyez sur **F** (ou sur le bouton ⛶) pour passer en plein écran.

**Le principe** : un seul appareil pilote la partie, **tout le monde regarde l'écran** et personne n'a
besoin de son téléphone. En mode écran :

- la roue, la carte, le numéro de boisson et le joueur actif s'affichent **en très grand** ;
- les **scores en direct** restent visibles à droite (le joueur dont c'est le tour est mis en évidence) ;
- le tirage est **« Direct »** : après la roue, la carte (et la boisson) se tirent toutes seules, sans rien toucher ;
- tout se joue au clavier :

| Touche   | Action                                                                            |
| -------- | --------------------------------------------------------------------------------- |
| `Espace` | Action principale : lancer la roue → carte faite → tirer la boisson → « J'ai bu » |
| `R`      | Refuser la carte (étape boisson)                                                  |
| `P`      | Joker Passe                                                                       |
| `N`      | « Je ne bois pas » (étape boisson)                                                |
| `B`      | « J'ai bu » (étape boisson)                                                       |
| `F`      | Plein écran                                                                       |

Les raccourcis sont suspendus pendant la saisie de texte et quand un panneau (scores) est ouvert.

> Les parties jouées dans le navigateur sont enregistrées **dans ce navigateur** (sur cet ordinateur) ;
> elles sont distinctes de celles de l'APK. L'export / import de sauvegarde permet de les déplacer.

---

## Obtenir l'APK (compilation dans le cloud)

Pas besoin d'installer Android Studio : GitHub Actions compile l'APK (`.github/workflows/android.yml`,
JDK 21 + Node 22). Le workflow lance le lint et les tests avant de compiler.

### Compiler à la demande

1. Dépôt GitHub → onglet **Actions** → **Android APK** → **Run workflow** (branche `master`).
2. Quand l'exécution est verte, ouvrez-la : la section **Artifacts** en bas de page contient
   - `roulette-soiree-debug` : `roulette-soiree-<version>-debug.apk` (toujours produit, signé avec la clé de debug) ;
   - `roulette-soiree-release` : `roulette-soiree-<version>.apk`, **signé avec votre clé**, seulement si les
     [secrets de signature](#signer-lapplication-keystore) sont configurés.
3. Téléchargez l'artefact (un `.zip` contenant l'APK), dézippez, installez.

### Publier une version (tag)

```bash
# 1. changer "version" dans package.json (ex. 1.1.0), commit
# 2. créer et pousser le tag
git tag v1.1.0
git push origin v1.1.0
```

Le workflow compile, puis crée une **Release GitHub** « Roulette Soirée v1.1.0 » avec l'APK joint
(signé si les secrets existent, sinon l'APK debug).

### Versions

- `versionName` = champ `version` de `package.json` (affiché dans _À propos_).
- `versionCode` = numéro d'exécution du workflow (`github.run_number`) : il augmente à chaque compilation,
  ce qui permet les mises à jour par-dessus.

### Compiler sur sa machine (facultatif)

Nécessite le **JDK 21** et le SDK Android (Android Studio ou outils en ligne de commande).

```bash
npm ci
npm run android:apk:debug     # → android/app/build/outputs/apk/debug/app-debug.apk
npm run android:apk:release   # → android/app/build/outputs/apk/release/app-release.apk (signé si les variables ci-dessous sont définies)
```

Variables de signature locales (PowerShell) :

```powershell
$env:KEYSTORE_PATH="C:\chemin\roulette-soiree.keystore"; $env:KEY_ALIAS="roulette"
$env:KEYSTORE_PASSWORD="…"; $env:KEY_PASSWORD="…"
```

---

## Signer l'application (keystore)

Un APK de production doit être signé. **Sans la même clé, impossible de mettre à jour l'application sur
les téléphones où elle est déjà installée.**

### 1. Générer le keystore (une seule fois)

Nécessite `keytool` (fourni avec le JDK) :

```bash
keytool -genkeypair -v -keystore roulette-soiree.keystore -alias roulette \
  -keyalg RSA -keysize 2048 -validity 10000
```

Répondez aux questions et **notez les mots de passe**.

### 2. ⚠️ Sauvegarder le keystore

> **Ne perdez jamais ce fichier ni ses mots de passe.** Copiez-le dans un endroit sûr (gestionnaire de
> mots de passe, disque chiffré, plusieurs copies). S'il est perdu, les applications déjà installées ne
> pourront plus jamais être mises à jour : il faudra désinstaller puis réinstaller (données perdues).
>
> **Ne le commitez jamais** : `*.keystore` et `*.jks` sont dans `.gitignore`.

### 3. L'enregistrer en secrets GitHub

Dépôt → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret              | Valeur                                                 |
| ------------------- | ------------------------------------------------------ |
| `KEYSTORE_BASE64`   | le fichier keystore encodé en base64 (voir ci-dessous) |
| `KEY_ALIAS`         | l'alias (`roulette` dans l'exemple)                    |
| `KEYSTORE_PASSWORD` | le mot de passe du keystore                            |
| `KEY_PASSWORD`      | le mot de passe de la clé                              |

Encoder le keystore :

```powershell
# Windows PowerShell : copie le texte base64 dans le presse-papiers
[Convert]::ToBase64String([IO.File]::ReadAllBytes("roulette-soiree.keystore")) | Set-Clipboard
```

```bash
# Linux / macOS
base64 -w0 roulette-soiree.keystore
```

Au prochain run, l'étape « APK release signé » produit l'APK signé et **vérifie sa signature**
(`apksigner verify --print-certs`). Notez l'empreinte SHA-256 du certificat affichée dans le journal :
elle doit rester **identique** d'une version à l'autre.

---

## Mettre vos vraies cartes

Le contenu tient dans **un seul fichier** : [`src/content/content.json`](src/content/content.json)
(10 thèmes × 20 cartes : les 200 cartes du PDF « jeux script »).

```jsonc
{
  "version": 1,
  "themes": [
    {
      "id": "theme-1", // identifiant unique
      "name": "Cul sec", // nom affiché
      "emoji": "🍻",
      "color": "#ff2fb3", // #rrggbb (couleur du secteur de la roue)
      "description": "Ambiance du thème (facultatif)",
      "cards": [
        { "number": 1, "type": "question", "text": "…", "points": null, "timer": null },
        { "number": 2, "type": "action", "text": "…", "points": null, "timer": 30 },
        // … jusqu'à 20, numérotées de 1 à 20 sans doublon
      ],
    },
  ],
}
```

- `type` : `"question"` ou `"action"` ; `timer` : durée en **secondes** (chronomètre proposé) ou `null` ;
  `points` : réservé (ignoré en v1, `null`) ; `answer` (facultatif) : réponse cachée d'une énigme, affichée par le bouton
  « Voir la réponse » ; `short` (thème, facultatif) : libellé court sur la roue.
- Exactement **10 thèmes** (autre nombre : avertissement, non bloquant) et **20 cartes par thème** (obligatoire).
- Aucun filtrage du contenu : texte libre.

### Procédure en 3 étapes

**A. Sans recompiler (sur le téléphone)** — le plus simple :

1. Écrivez vos cartes dans le format ci-dessus (modèle : _Accueil → Importer des cartes → Exporter le contenu actuel_).
2. _Accueil → Importer des cartes_ : collez le JSON ou chargez le fichier `.json`, puis **Vérifier**.
   Les erreurs indiquent le thème, la carte et le champ à corriger.
3. **Enregistrer ce contenu**. Il remplace le contenu intégré pour les prochaines parties
   (impossible tant qu'une partie est en cours). _Revenir au contenu par défaut_ restaure le contenu intégré.

**B. Dans l'APK (pour tout le monde)** :

1. Remplacez `src/content/content.json` par votre fichier (même format).
2. `npm test` : un test vérifie le fichier (10 thèmes × 20 cartes ; adaptez `src/content/content.test.ts` si vous en voulez un autre nombre). L'application refuse aussi de démarrer si le fichier est invalide.
3. Commit, puis nouveau build (workflow GitHub) et redistribution de l'APK.

---

## Règles du jeu

**Un tour** : le joueur actif lance la roulette (thème), choisit son mode de tirage et tire un numéro de 1 à 20
(la carte correspondante, jamais déjà jouée), puis :

- **« Je le fais / Je réponds »** → **+3** points ;
- **« Je refuse »** → étape boisson : tirage d'un numéro de 1 à N (la boisson correspondante, avec remise ; N = nombre de boissons de la soirée, de 1 à 20, réglable dans _Accueil → Boissons_),
  puis **« J'ai bu »** (**+1**) ou **« Je ne bois pas »** (**−2**).

Dans tous les cas la carte est consommée. Le barème, les jokers et les conditions de fin se règlent
**avant** la partie, puis sont verrouillés. Contrainte : points « boisson bue » < points de carte.

**Jokers** (1 de chaque par défaut, 0 à 3, désactivables) : **Passe** (saute la carte, sans points ni boisson),
**Double** (points de carte ×2 si réalisée), **Transfert** (un autre joueur joue la carte et ses conséquences).

**Boissons** : _Accueil → Boissons_ (ou le bloc repliable de _Nouvelle partie_) permet de choisir le **nombre de boissons** (1 à 20), de les nommer et de marquer chacune _alcoolisée_ ou _sans alcool_. Le nombre est figé au lancement de la partie ; les boissons au-delà du nombre choisi restent mémorisées.

**Sans alcool** : case par joueur (« Version sans alcool : un verre d'eau ou un soft », mêmes points) et par boisson.

**Fin de partie** : à tout moment (bouton _Terminer la partie_ dans le tableau des scores), ou sur condition
réglée (nombre de tours, score cible, durée → _Terminer / Continuer_), ou quand toutes les cartes sont jouées.
Écran de fin : podium, statistiques, _Rejouer avec les mêmes joueurs_.

**Équipes** (2 à 4) : alternance entre équipes, rotation dans l'équipe, score d'équipe = somme des points
individuels. Règles optionnelles (désactivées par défaut) : **L'adversaire décide**, **Duel** (une fois par tour
de table), **Joker partagé**.

**Hasard** : `crypto.getRandomValues` avec échantillonnage par rejet (aucun biais du modulo, jamais
`Math.random()`), mélange de Fisher–Yates, résultat **tiré avant l'animation** (l'animation ne fait que s'arrêter dessus).
Si l'application est fermée pendant une animation, la reprise rejoue le même résultat.

---

## Données et sauvegarde

- Tout est stocké dans la WebView de l'application (IndexedDB) ; l'application demande
  `navigator.storage.persist()` au premier lancement.
- **Désinstaller l'application efface toutes les données.**
- _Réglages → Données → Exporter mes données_ produit un fichier JSON (réglages, boissons, cartes importées,
  partie en cours, historique) ; _Importer des données_ le restaure (remplace tout, avec confirmation).
  Sur Android, l'export ouvre la feuille de partage (Drive, WhatsApp, Fichiers…).
- La partie est sauvegardée **à chaque action** : fermer l'application ou verrouiller le téléphone ne perd rien,
  et _Accueil → Reprendre la partie en cours_ revient exactement à l'étape où l'on était.

---

## Développer

Prérequis : Node 22+.

```bash
npm ci
npm run dev           # serveur de développement (http://localhost:5173)
npm test              # tests unitaires et d'intégration (Vitest + Testing Library)
npm run lint          # ESLint
npm run build         # typage + build web (dist/)
npm run e2e           # tests Playwright (construit l'app, la sert sur :4173)
npm run assets        # régénère icône et splash (assets/ → android/)
npm run android:sync  # build web + cap sync android
```

Première utilisation de l'e2e : `npx playwright install chromium`.

Structure :

```
src/engine/    moteur pur, sans React : hasard, paquets, journal d'événements, scores, undo, équipes, stats
src/content/   content.json + schéma Zod + validation lisible
src/db/        Dexie (IndexedDB), dépôt, sauvegarde/restauration
src/store/     états Zustand (réglages, partie, contenu)
src/pickers/   les 4 modes de tirage (interface NumberPicker commune)
src/screens/   écrans ; src/components/ composants partagés
src/util/      sons/vibrations, bouton retour, fonctions natives, fichiers
e2e/           tests Playwright ; android/ projet Capacitor ; assets/ sources d'icône
```

Le **journal d'événements** de la partie est la source de vérité : scores, jokers, cartes restantes, joueur actif,
statistiques et annulation (plusieurs niveaux) s'en déduisent. Ajouter un mode de tirage : créer un composant
`NumberPickerProps` et l'enregistrer dans `src/pickers/registry.ts`. Ajouter un thème visuel : un bloc de
variables CSS dans `src/theme/themes.css`.

---

## Parcours de recette manuel

À dérouler sur un téléphone avec l'APK (idéalement en **mode avion**) :

1. Créer une partie à **4 joueurs** (noms uniques, un joueur « sans alcool »), _Lancer la partie_.
2. **Tour 1 — fait** : roulette → numéro → _Je réponds_ → +3 ; le joueur suivant s'affiche.
3. **Tour 2 — refus + boisson bue** : _Je refuse_ → tirage de la boisson → _J'ai bu_ → +1.
4. **Tour 3 — refus + boisson refusée** (sur le joueur « sans alcool », vérifier le message _Version sans alcool_) → _Je ne bois pas_ → −2.
5. **Annuler** (🏆 Scores → _Annuler le dernier tour_) : scores, cartes, jokers et joueur actif sont restaurés.
6. **Quitter** : appuyer sur _Retour_ → confirmation « Mettre la partie en pause et quitter ? » ; quitter, fermer l'application.
7. **Reprendre** : rouvrir l'application → _Reprendre la partie en cours_ → même étape qu'avant.
8. **Terminer** → _Terminer la partie_ → podium et statistiques → _Historique_ contient la partie.
9. Vérifier : deux parties successives donnent des tirages différents ; aucune connexion nécessaire ; sons et vibrations réglables.

---

## Choix d'implémentation

Points ambigus du cahier des charges, tranchés ainsi :

- **JDK 21 (et non 17)** : Capacitor 8 et son Gradle compilent en Java 21.
- **Paquet restant** : il n'est pas stocké dans la partie mais **déduit du journal** (plus fiable pour l'annulation).
- **Transfert de joker** : le joueur désigné joue la carte et marque les points ; le tour passe au joueur suivant
  _du joueur actif_ ; son résultat est enregistré normalement avec `jokerUsed: 'transfer'`.
- **Un seul joker par carte** ; _Double_ sans effet (et non consommé) si le joueur refuse.
- **Joker partagé** : la réserve d'équipe vaut _nombre de départ × effectif_ ; tout équipier peut y puiser.
- **L'adversaire décide** : l'adversaire (équipe différente, tiré au hasard au tirage de la carte) choisit
  _Doit le faire_ (points de carte) ou _Doit boire_ (étape boisson, où le joueur peut encore refuser de boire).
- **Duel** : « une fois par tour de table » = une fois par bloc de _nombre de joueurs_ tours ; il consomme le
  tour du joueur actif ; le vainqueur marque les points de carte, aucun refus ni joker en duel.
- **Rang** : classement « compétition » (1, 1, 3…) ; les ex æquo partagent la victoire.
- **Aucune permission `INTERNET`** : Capacitor sert les fichiers locaux sans réseau.
- **Pas de PWA / service worker** (inutile dans Capacitor) ; routage en `HashRouter`.
- **Polices** : embarquées (police pixel du thème Arcade), aucune dépendance à un CDN.
- **CSS Modules** et variables CSS pour les 4 thèmes visuels (néon, arcade, sobre, pastel).
- **Dé à 20 faces** : SVG animé en 2D (pas de 3D), pour garder l'APK léger.

---

## Ce qui reste à vérifier

Le développement s'est fait sans téléphone ni émulateur Android. À contrôler sur un appareil :

- **Compilation de l'APK** par le workflow après l'ajout des plugins `filesystem`, `share` et `keep-awake` :
  lancer le workflow et consulter le résultat.
- **Absence de la permission `INTERNET`** : si l'application restait blanche au démarrage, rétablir
  `<uses-permission android:name="android.permission.INTERNET"/>` dans `android/app/src/main/AndroidManifest.xml`.
- **Fonctions natives** : sons, vibrations, écran allumé, bouton retour, barre d'état, icône, splash.
- **Export de fichier** (cartes, sauvegarde) via la feuille de partage Android.
- **Secousse du téléphone** avec un vrai capteur (le bouton de repli est toujours disponible).
- Le test e2e (`npm run e2e`) n'est pas lancé par le workflow GitHub.
