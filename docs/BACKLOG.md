# World Focus product backlog

État actuel : [livraison du 15 octobre 2026](DELIVERY_2026-10-15.md). Les sections datées précédentes restent des preuves historiques ; les blocages externes ci-dessous ne sont pas cochés comme terminés.

This backlog separates the cinematic UX refresh from future product work. Value and effort use a relative High / Medium / Low scale.

| Priority | Item | User value | Effort | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| P0 | Timer and task interaction tests | High | Medium | Test DOM setup | Start, pause, reset, add, edit, complete, restore and delete flows are covered. |
| P0 | Modal accessibility foundation | High | Medium | Shared dialog primitive | Every modal traps focus, restores focus, closes with Escape and exposes a title. |
| P0 | Media failure states | High | Medium | YouTube and audio adapters | A failed stream or player shows a useful retry/fallback state without blocking the timer. |
| P0 | Active-session persistence | High | Medium | Existing local storage | Reloading restores mode, remaining time and running/paused status accurately. |
| P0 | Performance budget | High | Medium | Production analytics | Initial JS, image weight and third-party media loading are measured and documented. |
| P1 | Pomodoro estimates per task | High | Medium | Task model extension | Users can set and see estimated versus completed sessions without losing old tasks. |
| P1 | Active task selection | High | Medium | Task model extension | One task can be attached to a running session and appears in session history. |
| P1 | Timer presets | Medium | Low | Settings UI | Users can save and switch named focus/break presets. |
| P1 | Full-screen focus mode | High | Medium | Responsive shell | A distraction-free view retains timer, active task and essential controls. |
| P1 | Shortcut settings | Medium | Medium | Settings persistence | Users can view, disable and remap supported keyboard shortcuts. |
| P1 | Progressive notifications | Medium | Low | Browser Notifications API | Permission is requested only after clear user intent and failures are explained. |
| P1 | Weekly insights | High | Medium | Existing history | Reports compare the current week with the previous week and explain the trend. |
| P2 | Weekly goals | Medium | Medium | Report aggregation | Users can define a weekly target and track progress by day. |
| P2 | Contextual achievements | Medium | Medium | Achievement rules | Progress and the next achievable milestone appear without interrupting focus. |
| P2 | Atmosphere collections | Medium | Medium | Location metadata | Users can save and reorder favorite combinations of location and audio. |
| P2 | Stronger cross-device sync | High | High | Supabase conflict policy | Concurrent edits resolve predictably and sync status is visible. |
| P2 | JSON import/export | Medium | Medium | Versioned export schema | A full backup can be exported, validated and restored without data loss. |
| P2 | PWA and offline timer | High | High | Service worker | Installed app can run the timer and tasks offline, then sync later. |
| P3 | English/French localization | Medium | High | i18n framework | All UI strings, dates and validation messages can switch language. |
| P3 | Calendar integrations | Medium | High | OAuth and provider APIs | Focus blocks can be read from and written to a selected calendar. |
| P3 | Shared focus sessions | Medium | High | Realtime presence | Invited users can join a synchronized session with explicit privacy controls. |

## Implementation status

- [x] P0 — Timer and task logic tests, including session restoration and archive transitions.
- [x] P0 — Shared modal focus trapping, Escape handling and focus restoration for primary dialogs.
- [x] P0 — Visible video and Lofi stream failure states with retry behavior.
- [x] P0 — Versioned active-session persistence using an absolute timer deadline.
- [x] P0 — Automated production asset budget and documented baseline in `PERFORMANCE.md`.
- [x] P1 — Explicit active task, Pomodoro estimates and completed-session tracking.
- [x] P1 — Classic, Deep 50 and Flow 90 timer presets plus full-screen focus mode.
- [x] P1 — User-controlled keyboard shortcut setting and progressive notification request on first start.
- [x] P2 — Weekly goal progress and configurable weekly target.
- [x] P2 — Versioned JSON backup import/export while preserving local Spotify secrets.
- [x] P3 — Anonymous shared focus rooms via link with Supabase Realtime presence and host-synchronized timers.
- [x] P3 — English-only interface retained by product decision.
- [x] P3 — Google Calendar, Outlook and portable ICS focus-block creation without sensitive OAuth access.
- [x] P1 — Custom saved presets and remappable timer shortcuts.
- [x] P1 — Current-versus-previous-week insight cards.
- [x] P2 — Contextual next-achievement guidance.
- [x] P2 — Saved atmosphere collections combining location and music provider.
- [x] P2 — Installable PWA shell with offline timer/task access after first load.
- [x] P3 — Expiring secret room links and automatic host failover for shared sessions.
- [x] P2 — Realtime cross-device state refresh with visible sync status and server-timestamp last-write-wins policy.
- [x] Quality — DOM interaction test coverage for the complete active-task lifecycle.
- [x] Quality — Privacy-preserving third-party resource timing grouped by provider.
- [x] Sessions — Add five minutes, skip a break, restore a running session and confirm before an active tab is closed.
- [x] Sessions — End-of-session reflection records outcome, perceived difficulty, interruptions and optional notes.
- [x] Planning — Drag-to-reorder tasks, subtasks, due dates, reusable routines and estimate-versus-completed tracking.
- [x] Shared sessions — Temporary pseudonym/avatar, ready state, participant roster, host removal, room lock control, quiet chat, reactions and activity events.
- [x] Mobile — Fixed bottom navigation, compact responsive controls, progress notifications and optional completion vibration.
- [x] Reports — Per-task history, 28-day consistency heatmap, best focus window/day, completion rate and abandonment count.
- [x] Quality — Dependency audit remediated, automated accessibility assertion added, and timer/task/report regression suite maintained.

## Deliberately deferred platform work

- [ ] Calendar activation — Google and Outlook read/write connectors implemented. Google client found and configured, Calendar API activated with approval; personal consent remains required. Microsoft app/client configuration is still required; the Entra console reached a sign-in timeout.
- [x] Enforced shared-room lock and room history — Server RPC checks admission, expiry and host privileges. Messages persist for the four-hour room lifetime. Direct table access is revoked; live negative permission tests pass.
- [ ] iPhone installation — SwiftUI shell, WidgetKit and ActivityKit implemented and checked with the Swift compiler. Full unsigned Xcode build passed on the macOS CI runner. Physical-device signing and App Group provisioning remain required; the local Xcode runtime is still missing.

## Reliability batch — 2026-10-14

Scope: preserve the current product and repair observed session-control failures. These items refine earlier delivery claims; logic-only tests did not verify the full pause/resume interaction.

| ID | Priority | Status | Problem | Acceptance criteria |
| --- | --- | --- | --- | --- |
| REL-01 | P0 | Done | Pausing or changing audio settings resets remaining time. | Start at 25:00, run 65 seconds, pause at 23:55, change audio settings, reload, resume at 23:55; Reset still returns to 25:00. |
| REL-02 | P0 | Done | Global shortcuts interfere with controls, dialogs and modified/repeated keystrokes. | Space activates a focused button normally; inputs, selects, editable regions, open modal dialogs, modifier combinations and held keys never operate the global timer. Default Space works without a custom mapping. |
| REL-03 | P1 | Done | Malformed running sessions can restore invalid deadlines. | Invalid/non-finite deadlines and remaining time are rejected; valid running and paused sessions still restore; unavailable storage never prevents rendering. |

Engineering approach: behavior tests through the existing timer UI, keyboard hook and persistence interface; reproduce each failure before fixing it; keep changes local and avoid speculative abstractions. Sources: Matt Pocock's [TDD](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md) and [codebase design](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md), inspected at commit `49dd158d1076134a641b33efb035946536778336`. No plugin installation is required for this batch.

Validation: each reported failure reproduced by a failing regression test before the fix. Timer UI tests also cover changed idle/running durations and guest controls remaining locked against global timer events. The changes preserve existing layouts and integrations.

Release checks: 39 tests pass across 13 files, including the pause/reload flow under React StrictMode; lint and the production build/performance budget pass. Browser validation confirms paused time survives reload. Guest timer event handlers now enforce the same lock as the visible buttons.

## Audit complet — 2026-10-14

La [matrice de contrôle](QA_2026-10-14.md) remplace les anciennes coches comme preuve de vérification. Les fonctions optionnelles et les fonctions différées y sont distinguées.

| ID | Priorité | État | Critère / preuve |
| --- | --- | --- | --- |
| QA-01 | P0 | Fait | Session échue récupérée une fois, cycle de pause conservé, durée/extension exactes et transition annulable. Tests Timer sous StrictMode. |
| QA-02 | P0 | Fait | Aucun double comptage ; bilan enregistré après minuit à la bonne date. Tests Report UI. |
| QA-03 | P0 | Fait | Réglages invité persistés ; création pendant un archivage conserve la nouvelle tâche ; sous-tâches et routines contrôlées. |
| QA-04 | P0 | Fait | Sauvegarde sans jetons ; validation avant remplacement ; lieux/favoris inclus ; CSV résilient. |
| QA-05 | P0 | Fait | Supabase restauré ; feedback non public ; droits client minimaux ; RLS et Realtime vérifiés sur le service réel. |
| QA-06 | P0 | Fait | Zéro alerte npm ; audit ajouté en CI ; installation propre du lockfile réussie. |
| QA-07 | P1 | Fait | Dialogues imbriqués, labels, switch audio, favoris clavier, visite guidée et graphique interactif corrigés. Tests DOM et axe. |
| QA-08 | P1 | Fait | PWA précharge écrans et sons ; rechargement, tâche, réglages et Insights vérifiés hors ligne sur ordinateur et mobile. |
| QA-09 | P1 | Fait | Lecteur compact Lofi Girl restauré : pochette, lecture/pause et volume, sans vidéo affichée ; direct actif et pluie locale conservés. |
| QA-10 | P1 | Fait | OAuth code seul, erreur explicite ; polling Spotify continu ; PKCE sûr ; callback sans double échange. |
| QA-11 | P1 | Fait | Mode sans configuration Supabase vérifié dans un navigateur ; timer/tâches utilisables et partage indisponible expliqué. |
| QA-12 | P1 | Fait | API YouTube bornée et validée ; succès/rejets testés. |
| QA-13 | P1 | À valider avec le compte | Connexion interactive personnelle Google/GitHub/email. Le service actif et les tests ne prouvent pas ces consentements. |
| QA-14 | P2 | Fait | File locale par compte, reprise après rechargement offline, sauvegarde atomique avec contrôle de révision et fusion à trois versions ; conflits de même champ résolus en faveur du changement local en attente. |
| QA-15 | P2 | Bloqué par le forfait | Protection contre les mots de passe compromis réservée au forfait Pro, confirmé dans Supabase. Projet Free ; aucun achat effectué. |
| QA-16 | P2 | Optionnel — décision actée | Spotify reste une intégration optionnelle. Aucun test de lecture Spotify Premium n’est attendu pour clôturer la livraison, conformément à la décision utilisateur du 15 octobre 2026. |

Les implémentations calendrier, verrou serveur et widget iPhone ont été reprises le 15 octobre. Leurs critères de fonctionnement et leurs prérequis externes sont distingués dans la matrice de livraison actuelle.

Contrôle local final : lint sans erreur ni warning, suite de régression, build de production, budget de performance, audit npm sans vulnérabilité et installation propre du lockfile. La publication et la CI sont vérifiées après le push.

- [x] QA — 68 tests dans 30 fichiers ; événements tardifs d’un ancien compte ignorés et transfert de durée/cycle entre hôtes couvert.
- [x] Livraison — commit de correctifs `2eaa8a8` relu sur main distant ; [CI 38645900267 verte](https://github.com/amassias/Pomodoro/actions/runs/38645900267), Vercel production READY pour ce commit, API YouTube HTTP 200, 39 ressources offline HTTP 200 et zéro alerte Dependabot ouverte.

- [x] QA — Profils/messages de salle normalisés ; les données mal formées ne font plus planter le workspace. Suite finale : 78 tests dans 33 fichiers.

- [x] QA — Séries au-delà de 100 jours correctes ; export des anciens flags de fin inconnus sans les transformer en échec.
- [x] QA — Semaine de référence vide : pas de hausse fictive de 100 %, message explicite de base absente.

- [x] QA — Stockage bloqué/quota plein : fallback temporaire explicite, export disponible, reprise testée.
- [x] QA — Calendrier daté au clic, ICS Unicode conforme au pliage ; sourdine réversible ; phases successives invité corrigées.
- [x] QA — Dernier lot : 78 tests / 33 fichiers, lint, build, performance et audit npm réussis.

- [x] Livraison — `7851d68` sur main, [CI verte](https://github.com/amassias/Pomodoro/actions/runs/38651479288), Vercel READY au même commit ; page publique et 39 ressources offline contrôlées.


## Livraison du 15 octobre 2026

- [x] Radio Lofi Girl officielle : remplacement du relais défaillant, vérification du direct actif et lecture réelle dans le navigateur.
- [x] Synchronisation : file offline et contrôle atomique de révision, fusion des changements indépendants, tests de reprise après rechargement.
- [x] Salles : admission, verrou, privilèges hôte, exclusion et messages contrôlés par le serveur ; sondes réelles annulées après test.
- [x] Connecteurs Google et Outlook : lecture d’événements, choix d’un calendrier et création de blocs ; tokens limités à l’onglet.
- [x] Client OAuth Google retrouvé dans le projet existant ; domaine de production déjà autorisé ; identifiant public configuré sur Vercel ; Calendar API activée après accord.
- [x] Code iPhone : application SwiftUI, WidgetKit et Live Activity reliés au minuteur web ; vérification et édition de liens avec le compilateur Swift.
- [ ] Connexion personnelle calendrier : consentement à effectuer ; API Google activée, application Microsoft à finaliser.
- [ ] Widget sur appareil : compilation Xcode complète validée en CI ; signature Apple, App Group et installation sur iPhone restent requis.
- [ ] Protection des mots de passe compromis : forfait Pro nécessaire.
- [x] Spotify reste optionnel, sans test Premium attendu.

- [x] Vérification locale du lot : 88 tests / 38 fichiers, lint, build, performance, audit npm sans vulnérabilité et vérification Swift réussis.

- [x] Livraison : `fbf98e6` poussé sur main ; [CI web + compilation iPhone verte](https://github.com/amassias/Pomodoro/actions/runs/38701468104), Vercel READY au même commit ; radio HTTP 200, callback calendrier HTTP 200, ancienne route de test HTTP 404 et 39 ressources offline HTTP 200.

### Correction du lecteur — 15 octobre 2026

- [x] Retour à la carte compacte d’origine et à sa position en bas à gauche sur ordinateur.
- [x] Suppression du panneau vidéo visible et des commandes YouTube dans l’interface ; lecture de la radio pilotée par les commandes compactes.
- [x] Pochette, déplacement de la carte, lecture/pause, volume et pause pendant l’alarme conservés.
- [x] Vérification navigateur : lecture puis pause de la radio ; présentation ordinateur et mobile. Tests : 88 réussis, lint et build réussis.
