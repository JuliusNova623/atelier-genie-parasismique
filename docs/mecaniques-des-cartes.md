# Mécaniques des cartes

Analyse du PDF « jeux script » : ce que chaque famille de cartes demande réellement à l'application, et comment c'est géré.
108 cartes sur 200 ont un effet (champ `flow` dans `src/content/content.json`) ; les 92 autres (questions à répondre,
dilemmes, énigmes, actions simples) se jouent à voix haute : « Je le fais » ou « Je bois ».

## Principes communs

- **Boire est obligatoire.** « Je bois » remplace « Je refuse » ; l'étape boisson n'a qu'un bouton « J'ai bu ».
- **Malus** = la boisson tirée au sort (numéro 1 à N) × un multiplicateur (½ pour un pacte partagé, ×2 « double », ×3 « maximum »).
  Un joueur « sans alcool » reçoit la version sans alcool.
- **Voisins** : « gauche » = joueur suivant dans l'ordre de passage, « droite » = précédent, « en face » = à la moitié de la table,
  « le joueur d'avant » = celui qui vient de jouer.
- **Règle en cours** : texte + joueurs concernés + durée (en tours de jeu : un tour = une carte jouée par quelqu'un).
  Bouton **⚠️ Faute** (désigne le fautif et lui applique le malus), **Terminer** à la main, **résolution** automatique à l'échéance.
- **Bouclier** : le protecteur boit à la place de son protégé, une fois. **Alliance** : les malus des deux alliés sont partagés 50/50.
- Tout est enregistré dans le journal de partie : reprise après fermeture et « Annuler le dernier tour » restaurent les règles.

## Par thème

| Thème                     | Cartes à effet       | Mécanique                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Secrets & Dossiers    | 4 (n°13, 16, 18, 20) | Choisir un joueur dans la liste ; règles de défi sur ce joueur.                                                                                                                                                                                                                                                                                                                                            |
| 2 · Défis & Alliances     | 20                   | **Choisir un adversaire / partenaire** dans la liste, puis le perdant (moi ou lui) prend le malus : bataille de regards, pacte du diable (accepté = ½ chacun, refusé = je prends tout), trahison éclair, mission secrète (règle puis « le dernier prend un malus » à mon prochain tour), un bouclier humain, etc. Durées jusqu'à 5 minutes (chrono).                                                       |
| 5 · Impro & Théâtre       | 10 (n°11 à 20)       | Contraintes de communication : règle de 3 tours sur le joueur (« {joueur} : … »), visible sous la roue, bouton Faute.                                                                                                                                                                                                                                                                                      |
| 7 · Chance & Chaos        | 20                   | Malus au hasard : le Roi / la Reine (2 portions à répartir), retour de karma (×3), communisme (tout le monde), inversion du temps (le joueur d'avant), roulette russe (pair = voisin, impair = ×2 pour moi), épreuve d'adresse (réussi = je distribue, raté = ×2), tirage d'un numéro, verre d'eau, annulation d'une règle en cours, décalage des règles d'un cran (« tout le monde passe à son voisin »). |
| 8 · Le Tribunal du Groupe | 20                   | Le groupe vote à voix haute, on **désigne le joueur** dans la liste et il prend le malus ; n°11 + compliment ; n°20 la plus séduisante **distribue** le malus.                                                                                                                                                                                                                                             |
| 9 · Je n'ai jamais…       | 20                   | On **coche tous ceux qui l'ont déjà fait** (ou « Personne ») : chacun boit la même boisson.                                                                                                                                                                                                                                                                                                                |
| 10 · Tyrannie des Règles  | 14                   | Règles durables : alliance ultime (lien 50/50 jusqu'à la fin), pardon général (efface toutes les règles), quitte ou double (> 5 : je distribue le double, ≤ 5 : je prends le triple), effacement de toutes les règles.                                                                                                                                                                                     |
| 3, 4, 6                   | 0                    | Vérités, dilemmes, énigmes : réponse à voix haute (la solution des énigmes se révèle d'un bouton).                                                                                                                                                                                                                                                                                                         |

## Hypothèses retenues (à confirmer à l'usage)

- Malus « maximum » = ×3 ; « moitié » = ½ portion ; « double » = ×2.
- « Pendant N tours » = N cartes jouées par la table, créateur compris à partir du tour suivant.
- Les votes du groupe (thème 8) ne sont pas décomptés par l'application : le groupe se met d'accord et le joueur actif désigne le résultat.
- La faute d'une règle peut se déclarer par n'importe quel joueur depuis la roue.

## Ajouter un effet à une carte

Dans `content.json`, une carte peut avoir `"flow": [ étapes ]`. Étapes : `pick` (choisir des joueurs), `ask` (question à choix),
`number`, `draw` (tirer un numéro), `malus`, `distribute`, `water`, `rule`, `shield`, `cancel-rule`, `clear-rules`, `rotate-rules`, `info`,
avec une condition `when` optionnelle. Références de joueurs : `me`, `left`, `right`, `opposite`, `prev`, `all`, `others` ou le nom
d'une variable définie plus haut. Les définitions sont dans `src/engine/steps.ts` ; l'application vérifie les références au démarrage.
