# Atelier Génie parasismique

Application de révision de génie parasismique : exercices corrigés pas à pas (TD et examens), cours, QCM, formules.
Site statique (HTML, CSS, JavaScript, sans framework ni build), installable sur téléphone et utilisable **100 % hors ligne**.

La progression est enregistrée dans le navigateur (`localStorage`, clés préfixées `apq:`), rien n'est envoyé nulle part.

## Installer sur téléphone

Ouvrir l'adresse du site une première fois **avec du réseau**, puis :

- **Android (Chrome)** : menu ⋮ → _Installer l'application_ (ou _Ajouter à l'écran d'accueil_).
- **iPhone (Safari)** : bouton Partager → _Sur l'écran d'accueil_ → _Ajouter_.

Après ce premier chargement, l'application s'ouvre et fonctionne sans connexion.

## Lancer en local

Le service worker exige `http://localhost` (ou HTTPS) ; un simple serveur statique suffit :

```bash
python -m http.server 8080
```

Puis ouvrir <http://localhost:8080/>. Ouvrir `index.html` directement (`file://`) fonctionne aussi, sans le mode hors ligne.

## Structure

| Chemin | Rôle |
| --- | --- |
| `index.html` | Page, styles et mise en page |
| `js/calc.js` | Calculs (une fonction par exercice) |
| `js/base.js`, `ex-*.js`, `prov.js`, `compl.js`, `cours.js`, `qcm.js` | Données : exercices, cours, QCM |
| `js/app.js` | Rendu et routage par hash (`#…`) |
| `katex/`, `fonts/` | KaTeX 0.16.9 et polices Fira, auto-hébergés |
| `manifest.webmanifest`, `sw.js`, `pwa.js`, `icons/` | Application installable et cache hors ligne |

## Déploiement

Chaque push sur `master` déploie le site sur GitHub Pages (`.github/workflows/pages.yml`). Le workflow vérifie que la liste
de pré-cache de `sw.js` correspond aux fichiers du site et remplace `__VERSION__` par le commit : à chaque déploiement le cache
change, et l'ancien est supprimé. **Si vous ajoutez ou renommez un fichier, mettez à jour la liste `FILES` de `sw.js`.**

Polices Fira : licence SIL OFL 1.1. KaTeX : licence MIT.
