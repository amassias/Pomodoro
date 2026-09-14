# Product

<!-- impeccable:product-schema 1 -->

> Provenance : aucun brief produit durable n’était présent dans le projet. Les éléments ci-dessous sont déduits du `README.md` et de l’implémentation actuelle ; ils constituent la base opérationnelle à valider si le positionnement ou les publics évoluent.

## Platform

web

## Users

Déduit du README et des parcours présents : des personnes qui souhaitent travailler ou étudier par sessions de concentration chronométrées, avec une atmosphère visuelle et sonore choisie pour soutenir leur attention.

## Product Purpose

Déduit du README et du code : World Focus transforme une session Pomodoro en espace de travail immersif. Le produit combine un minuteur Focus / Short break / Long break, des flux vidéo d’ambiance, une source audio, une liste de tâches et un suivi de progression. Le succès opérationnel est une session lancée, menée à son terme et retrouvable dans l’historique de l’utilisateur.

## Positioning

Déduit de l’implémentation : le mécanisme distinctif est l’association d’un minuteur de productivité classique à des flux YouTube live sélectionnables et persistants, afin que le contexte d’attention fasse partie de la session plutôt que d’être un réglage extérieur.

## Operating Context

- Application web monopage pensée pour rester ouverte pendant une session de travail, avec une scène vidéo plein écran en arrière-plan.
- Utilisation invité avec persistance locale ; connexion Supabase facultative pour synchroniser tâches, historique, réglages, favoris et lieu entre appareils.
- Sélection d’une atmosphère parmi des lieux urbains, des environnements naturels et des ambiances de concentration ; ajout possible d’un flux YouTube personnalisé.
- Source audio Lofi intégrée ou Spotify optionnel ; l’intégration Spotify dépend de l’authentification et d’un compte Premium pour la lecture Web Playback.
- Usage individuel ou session partagée temporaire avec participants, état du minuteur, réactions et messages.
- Interface actuelle en anglais, avec support des environnements desktop et mobile web.

## Capabilities and Constraints

- Minuteur à durées configurables pour Focus, Short break et Long break ; préréglages Classic, Deep 50, Flow 90 et préréglages personnalisés.
- Transitions automatiques optionnelles, sons de fin et de tic, répétition d’alarme, vibration, notifications navigateur et raccourcis clavier configurables.
- Flux d’ambiance YouTube validés côté API quand l’environnement le permet, lus en boucle et muets par défaut ; un flux défaillant peut être temporairement mis en quarantaine et relancé avec Retry video.
- Gestion de tâches avec échéance, estimation de sessions, tâche active, sous-tâches, édition, achèvement et archivage en lot.
- Insights avec heures totales, sessions terminées, série de jours, comparaison hebdomadaire, heatmap de 28 jours, graphique par période, tendances par tâche, achievements et export/import CSV/JSON.
- Feedback avec signalement de flux, suggestion de flux ou sujet libre.
- Authentification email, GitHub et Google via Supabase ; les callbacks sont servis par `/auth-callback` et `/spotify-callback`.
- Les flux, tokens Spotify et disponibilité des fournisseurs sont des dépendances externes et peuvent varier dans le temps ; ne pas considérer un identifiant de flux comme une garantie permanente.
- Aucune métrique cible, règle éditoriale ou exigence de conformité d’accessibilité distincte n’est documentée dans le projet à ce stade.

## Brand Commitments

- Nom affiché : `World Focus`.
- Signature affichée : `Make this session count`.
- Icône et manifeste : `public/world-focus-icon.svg` et `public/manifest.webmanifest`.
- Le ton produit actuellement observé est court, direct et orienté vers l’action de concentration ; les textes existants sont en anglais.

## Evidence on Hand

- `README.md` : description, fonctionnalités, stack, configuration et raccourcis.
- `src/app/App.jsx` : shell applicatif, lieux, rail d’actions, responsive et orchestration des surfaces.
- `src/index.css` et styles locaux des composants : implémentation visuelle actuelle documentée dans `DESIGN.md`.
- `src/features/` : minuteur, tâches, atmosphères, audio, réglages, Insights, onboarding, feedback et session partagée.
- `public/world-focus-icon.svg`, `public/logos/`, `src/assets/lofi-girl.jpg` et `public/sounds/` : assets utilisés par l’interface.
- `supabase/user_state.sql`, `api/youtube/validate.js` et `vercel.json` : persistance, validation des flux et déploiement.

## Product Principles

- Protéger une seule chose à la fois pendant une session.
- Faire de l’atmosphère un support de concentration choisi par l’utilisateur.
- Préserver l’intention de l’utilisateur lors de la persistance et des erreurs de fournisseurs.
- Rendre la progression concrète par les tâches, l’historique et les jalons.
- Garder les sorties de données exportables et la connexion facultative.

## Accessibility & Inclusion

Observé dans l’implémentation : boutons et contrôles sémantiques, labels et attributs ARIA sur les surfaces importantes, dialogues modaux avec gestion du focus, états `:focus-visible`, cibles tactiles renforcées pour certains contrôles, zones scrollables internes et prise en compte de `prefers-reduced-motion`. Aucun niveau WCAG formel n’est actuellement déclaré.
