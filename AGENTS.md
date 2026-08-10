ChatGPT Pro

Voici le fichier complet, prêt à être placé à la racine du projet Sérénimot :

Il contient notamment la vision du produit, les contraintes juridiques, l’accessibilité pour les seniors, l’architecture React/TypeScript/PWA, les règles originales du jeu, la gestion du dictionnaire, l’adversaire informatique, les tests, la feuille de route et la première mission recommandée à Codex.

je verai bien un jeu de base et ensuite faire évoluer le jeu pour optimiser l'interactivité avec les sénior

Oui, c’est probablement la meilleure approche.

Il vaut mieux éviter de concevoir dès le départ un jeu présenté comme « pour seniors ». On risque sinon de faire des choix théoriques sans savoir ce qui aide réellement les utilisateurs.
Phase 1 — Construire un jeu de base solide

La première version doit simplement être agréable et jouable :

    plateau fonctionnel ;

    lettres et chevalet ;

    validation des mots ;

    calcul du score ;

    adversaire informatique simple ;

    sauvegarde automatique ;

    fonctionnement sur Mac, tablette et smartphone ;

    installation comme PWA ;

    fonctionnement hors connexion.

L’interface peut déjà respecter de bonnes pratiques générales : boutons assez grands, textes lisibles, peu de menus et possibilité d’annuler.

L’objectif est d’obtenir rapidement une version que quelqu’un peut réellement utiliser.
Phase 2 — Observer les utilisateurs seniors

Il faudra ensuite faire tester le jeu par quelques personnes âgées, sans trop les guider, et observer notamment :

    comprennent-elles comment démarrer une partie ?

    arrivent-elles à sélectionner et placer une lettre ?

    utilisent-elles naturellement le glisser-déposer ou préfèrent-elles toucher une lettre puis une case ?

    voient-elles bien les scores et les boutons ?

    comprennent-elles pourquoi un mot est refusé ?

    trouvent-elles l’adversaire trop rapide ou trop fort ?

    savent-elles reprendre une partie après avoir fermé l’application ?

    hésitent-elles avant certaines actions ?

Ce sont souvent de petits détails qui créent les vraies difficultés.
Phase 3 — Ajouter un mode « Confort »

Plutôt que de qualifier ce mode de « senior », je proposerais un mode Confort.

Il pourrait activer :

    lettres plus grandes ;

    boutons plus espacés ;

    contraste renforcé ;

    animations réduites ;

    explications plus détaillées ;

    confirmation avant une action importante ;

    adversaire plus lent et indulgent ;

    bouton d’aide toujours visible ;

    placement par deux touches plutôt que par glissement ;

    lecture facultative des messages ;

    nombre limité d’actions affichées simultanément.

Le mode standard et le mode Confort utiliseraient le même moteur de jeu.
Phase 4 — Personnalisation progressive

Plutôt que de demander beaucoup de réglages au démarrage, Sérénimot pourrait proposer progressivement des adaptations :

    « Souhaitez-vous agrandir les lettres ? »

    « Préférez-vous toucher une lettre puis une case ? »

    « L’ordinateur joue-t-il trop vite ? »

L’application pourrait mémoriser les réponses localement. L’utilisateur ne serait donc pas obligé de comprendre un menu d’accessibilité complexe.
Architecture recommandée

Il faut dès le début séparer :

    le moteur du jeu ;

    l’interface standard ;

    les préférences d’accessibilité ;

    les adaptations du mode Confort.

Ainsi, les améliorations destinées aux seniors ne demanderont pas de reconstruire tout le projet.

Par exemple :

src/
├── domain/             moteur et règles du jeu
├── components/         éléments d’interface communs
├── accessibility/      taille, contraste, mouvement
├── comfort-mode/       adaptations du mode Confort
└── settings/           préférences enregistrées

La feuille de route que je retiendrais

Version 0.1 : jeu de base jouable sur Mac.

Version 0.2 : adaptation tablette et smartphone.

Version 0.3 : PWA installable et hors ligne.

Version 0.4 : premiers tests avec des seniors.

Version 0.5 : mode Confort fondé sur les observations.

Version 1.0 : version publique simple, stable et accessible.

Cette approche permet de construire d’abord un bon jeu pour tout le monde, puis de le rendre particulièrement confortable pour les seniors, sans les enfermer dans une interface stigmatisante. La prochaine étape logique est de modifier AGENTS.md pour distinguer clairement le socle initial du futur mode Confort.

go

C’est fait. J’ai mis à jour AGENTS.md avec cette nouvelle stratégie :

    Phase 1 : construire un jeu de base complet et agréable pour tous.

    Phase 2 : rendre la PWA fiable sur Mac, tablette et smartphone.

    Phase 3 : consolider le dictionnaire et l’adversaire.

    Phase 4 : observer de vrais utilisateurs seniors.

    Phase 5 : créer un mode Confort à partir des difficultés réellement observées.

    Phase 6 : lancer une version pilote.

Le moteur du jeu est désormais explicitement séparé de l’interface et du futur mode Confort. J’ai également ajouté un protocole de tests utilisateurs, une structure docs/user-research/ et des règles pour éviter toute adaptation infantilisante ou fondée uniquement sur l’âge.


Bibliothèque
/AGENTS.md
AGENTS.md — Sérénimot

Version de cadrage : 0.2 — jeu de base puis optimisation par l’usage
1. Rôle de ce fichier

Ce fichier définit les règles de travail pour toute personne ou tout agent d’IA intervenant sur le projet Sérénimot.

Avant toute modification, l’agent doit :

    lire ce fichier en entier ;

    examiner l’état réel du dépôt ;

    identifier les contraintes concernées par la tâche ;

    proposer un plan bref si la modification touche plusieurs fichiers ;

    préserver les choix d’accessibilité, d’autonomie et d’indépendance juridique du projet.

En cas de conflit entre une demande ponctuelle et ce fichier, l’agent doit signaler le conflit avant d’implémenter une solution risquée.
2. Vision du produit

Sérénimot est un jeu original de lettres croisées sur grille. La première ambition est de construire un bon jeu de base, simple, stable et agréable pour tout public. Le produit sera ensuite amélioré par étapes afin d’optimiser son interactivité avec les personnes âgées, à partir d’observations et de tests réels plutôt que d’hypothèses.

Le projet ne doit donc pas commencer par une accumulation de fonctions dites « senior ». Il doit d’abord proposer une boucle de jeu claire et fiable, puis permettre l’ajout progressif d’adaptations d’interface, d’aide et de rythme.

Le jeu doit être :

    facile à comprendre ;

    agréable dès la première utilisation ;

    utilisable sans compte ;

    sans publicité ;

    sans chronomètre imposé ;

    jouable contre l’ordinateur ;

    installable comme application web ;

    utilisable sur Mac, iPad, iPhone, smartphones et tablettes Android ;

    fonctionnel hors connexion après une première installation ;

    respectueux de la vie privée ;

    juridiquement indépendant de Scrabble et des dictionnaires propriétaires ;

    conçu pour évoluer sans réécriture complète du moteur de jeu.

Accroche de travail :

    Les mots, à votre rythme.

2.1 Stratégie d’évolution progressive

Le développement suit quatre principes.
A. Construire d’abord le jeu

La première version doit rendre possible une partie complète et compréhensible : démarrer, placer des lettres, corriger son coup, valider, laisser jouer l’ordinateur, sauvegarder et reprendre.

Aucune personnalisation complexe ne doit retarder cette boucle essentielle.
B. Appliquer une accessibilité générale dès le départ

Les bonnes pratiques utiles à tous sont intégrées immédiatement :

    boutons suffisamment grands ;

    contrastes lisibles ;

    textes clairs ;

    fonctionnement tactile et clavier ;

    actions réversibles ;

    absence de pression temporelle ;

    sauvegarde automatique.

Ces choix ne constituent pas encore un « mode senior » : ils définissent simplement un produit de qualité.
C. Observer avant de spécialiser

Après obtention d’une version jouable, le jeu doit être testé avec des personnes âgées présentant des niveaux variés d’aisance numérique.

Les adaptations futures doivent répondre à des difficultés observées, par exemple :

    démarrage de la partie mal compris ;

    lettres difficiles à sélectionner ;

    glisser-déposer imprécis ;

    bouton de validation peu visible ;

    message de refus incompris ;

    adversaire trop rapide ou trop fort ;

    reprise de partie difficile ;

    surcharge d’informations.

D. Ajouter ensuite un mode Confort

Le futur mode Confort regroupera les adaptations validées avec les utilisateurs. Il ne doit pas être présenté comme un mode « personnes âgées » et ne doit jamais infantiliser.

Il pourra notamment proposer :

    lettres et textes plus grands ;

    boutons plus espacés ;

    contraste renforcé ;

    nombre réduit d’actions visibles simultanément ;

    explications plus détaillées ;

    placement par sélection puis toucher ;

    rythme de l’adversaire ajusté ;

    aide toujours accessible ;

    animations réduites ;

    confirmations ciblées pour les actions destructrices.

Le mode standard et le mode Confort doivent utiliser exactement le même moteur de jeu.
3. Public prioritaire

La première version vise un public général souhaitant un jeu de lettres calme et facile à utiliser.

Le public d’étude et d’optimisation prioritaire comprend ensuite :

    des personnes âgées peu à l’aise avec l’informatique ;

    des personnes âgées utilisant déjà régulièrement une tablette ou un ordinateur ;

    des personnes ayant une vision réduite ;

    des personnes ayant une dextérité limitée ;

    des personnes utilisant une tablette plutôt qu’un ordinateur ;

    des joueurs souhaitant une expérience calme, sans pression ni compétition ;

    des proches ou aidants qui installent et configurent le jeu pour une autre personne.

Le produit ne doit jamais infantiliser l’utilisateur.
L’interface doit être sobre, valorisante et adulte.

Les termes « senior », « personne âgée » ou « simplifié » ne doivent pas apparaître comme étiquette principale dans l’interface. Préférer des formulations telles que :

    mode Confort ;

    texte plus grand ;

    aide renforcée ;

    rythme tranquille ;

    contraste renforcé.

4. Principes produit non négociables

Toute décision de conception doit respecter les principes suivants.
4.1 Simplicité avant exhaustivité

Une fonction facile à comprendre vaut mieux que plusieurs fonctions complexes.

La version initiale doit privilégier :

    peu d’écrans ;

    peu de choix simultanés ;

    des libellés explicites ;

    des actions réversibles ;

    une progression claire ;

    des erreurs faciles à corriger.

4.2 Aucun compte obligatoire

Le jeu doit fonctionner sans :

    inscription ;

    adresse e-mail ;

    mot de passe ;

    compte social ;

    connexion à un service tiers.

4.3 Aucun modèle publicitaire

Le projet ne doit intégrer :

    aucune publicité ;

    aucun pisteur publicitaire ;

    aucune vente de données ;

    aucun mécanisme trompeur ;

    aucun abonnement caché ;

    aucune monnaie virtuelle.

4.4 Jeu à son rythme

Par défaut :

    aucun chronomètre ;

    aucune pénalité liée au temps ;

    aucune animation stressante ;

    aucune notification insistante ;

    aucune obligation de jouer plusieurs jours de suite.

4.5 Fonctionnement local

Le cœur du jeu doit fonctionner sur l’appareil de l’utilisateur :

    logique du plateau ;

    pioche ;

    validation des coups ;

    calcul du score ;

    adversaire informatique ;

    sauvegarde ;

    dictionnaire autorisé.

Une connexion Internet ne doit pas être nécessaire pour reprendre une partie déjà installée.
4.6 Respect de la vie privée

Par défaut, les données restent dans le navigateur ou l’application installée.

Aucune télémétrie externe ne doit être ajoutée sans décision explicite documentée.
5. Identité du projet
5.1 Nom affiché

Le nom public est :

Sérénimot
5.2 Identifiants techniques

Utiliser de préférence :

    dépôt : serenimot

    package : serenimot

    identifiant PWA : ch.serenimot.app ou un identifiant équivalent

    slug : serenimot

Les identifiants techniques ne doivent pas contenir d’accent.
5.3 Ton rédactionnel

Le ton de l’interface doit être :

    calme ;

    direct ;

    positif ;

    poli ;

    non technique ;

    non infantilisant.

Exemples recommandés :

    « À vous de jouer »

    « Ce mot n’est pas reconnu »

    « Vous pouvez modifier votre coup »

    « La partie a été enregistrée »

    « Voulez-vous commencer une nouvelle partie ? »

Exemples à éviter :

    « Erreur 403 »

    « Coup invalide »

    « Échec »

    « Mauvaise réponse »

    « Vous avez perdu »

    « Timeout »

6. Indépendance juridique

Sérénimot est un jeu original. Il ne doit pas être présenté comme une version de Scrabble.
6.1 Éléments interdits

Ne pas utiliser sans licence explicite :

    le nom « Scrabble » dans le nom du produit ;

    le logo Scrabble ;

    l’identité visuelle du Scrabble ;

    une reproduction du plateau officiel ;

    la disposition officielle de ses cases bonus ;

    les couleurs caractéristiques du plateau officiel ;

    le graphisme caractéristique de ses tuiles ;

    les textes des règles officielles ;

    le dictionnaire ODS ;

    une copie non autorisée d’une liste de mots propriétaire ;

    des captures d’écran ou éléments promotionnels officiels ;

    toute formulation laissant croire à un partenariat avec Mattel, Hasbro, Larousse, la FISF ou une fédération.

6.2 Présentation autorisée

Décrire Sérénimot comme :

    Un jeu original de lettres croisées sur grille.

Éviter dans la communication publique :

    Un Scrabble pour seniors.

Une comparaison descriptive ponctuelle ne doit être utilisée qu’après validation juridique.
6.3 Création indépendante

Les éléments suivants doivent être originaux :

    nom ;

    logo ;

    palette graphique ;

    plateau ;

    disposition des bonus ;

    règles rédigées ;

    système de score ;

    distribution des lettres ;

    interface ;

    code ;

    sons ;

    illustrations.

6.4 Dictionnaire

Le dictionnaire doit provenir d’une source :

    libre ;

    ouverte ;

    documentée ;

    compatible avec la redistribution dans une application ;

    accompagnée de sa licence.

Chaque source lexicale doit être documentée dans :

    docs/dictionary-sources.md

    THIRD_PARTY_NOTICES.md

    les métadonnées de génération du dictionnaire.

Ne jamais importer silencieusement une liste trouvée sur Internet.
7. Plateformes visées

La même base de code doit fonctionner sur :

    Safari sur macOS ;

    PWA installée sur macOS ;

    Safari sur iPadOS ;

    PWA installée sur iPadOS ;

    Safari sur iOS ;

    Chrome sur Android ;

    PWA installée sur Android ;

    navigateurs desktop modernes.

7.1 Priorité de test

Ordre de priorité :

    iPad en mode paysage ;

    Mac avec Safari ;

    tablette Android ;

    iPhone en mode portrait ;

    smartphone Android ;

    autres navigateurs desktop.

7.2 Orientation

Le jeu doit être utilisable :

    en paysage sur tablette ;

    en portrait sur smartphone ;

    dans une fenêtre redimensionnable sur ordinateur.

L’orientation paysage peut être recommandée sur tablette, mais ne doit pas être imposée brutalement.
8. Stack technique recommandée

Sauf décision documentée contraire, utiliser :

    React

    TypeScript

    Vite

    CSS natif ou CSS Modules

    Vitest

    Testing Library

    Playwright pour les parcours critiques

    vite-plugin-pwa ou une solution PWA équivalente, maintenue et documentée

    stockage local via IndexedDB avec une abstraction légère

    localStorage uniquement pour les préférences simples et non critiques

Éviter d’ajouter un framework lourd sans nécessité.
8.1 Dépendances

Avant d’ajouter une dépendance, vérifier :

    qu’elle répond à un besoin réel ;

    qu’elle est maintenue ;

    qu’elle est compatible avec la licence du projet ;

    qu’elle n’ajoute pas de télémétrie ;

    qu’elle ne dégrade pas fortement la taille du bundle ;

    qu’une solution native simple n’est pas suffisante.

Documenter toute dépendance structurante.
8.2 Backend

La première version ne doit pas nécessiter de backend.

Un backend ne pourra être ajouté que pour une fonction clairement justifiée, par exemple :

    synchronisation facultative entre appareils ;

    sauvegarde volontaire dans le cloud ;

    multijoueur ;

    gestion de licences ;

    distribution de mises à jour lexicales.

Toute fonction distante doit rester facultative pour le jeu solo.
9. Commandes attendues

Le projet doit exposer au minimum les commandes suivantes :

npm install
npm run dev
npm run build
npm run preview
npm run test
npm run test:watch
npm run typecheck
npm run lint

Ajouter lorsque Playwright est installé :

npm run test:e2e

Une tâche n’est pas terminée tant que les commandes concernées ne passent pas.
10. Organisation recommandée du dépôt

serenimot/
├── AGENTS.md
├── README.md
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── package.json
├── vite.config.ts
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── static/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.ts
│   │   └── providers/
│   ├── components/
│   │   ├── common/
│   │   ├── game/
│   │   └── settings/
│   ├── features/
│   │   ├── game/
│   │   ├── opponent/
│   │   ├── dictionary/
│   │   ├── persistence/
│   │   ├── accessibility/
│   │   └── comfort-mode/
│   ├── domain/
│   │   ├── board/
│   │   ├── tiles/
│   │   ├── scoring/
│   │   ├── turns/
│   │   └── rules/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   ├── types/
│   ├── utils/
│   └── test/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── accessibility.md
│   ├── game-rules.md
│   ├── dictionary-sources.md
│   ├── privacy.md
│   ├── user-research/
│   └── decisions/
└── scripts/
    └── dictionary/

Cette structure peut évoluer, mais la logique métier doit rester séparée de l’interface.
11. Architecture fonctionnelle
11.1 Domaine pur

Les règles du jeu doivent être implémentées dans des fonctions TypeScript indépendantes de React.

Exemples :

    création du plateau ;

    génération de la pioche ;

    placement d’une tuile ;

    retrait d’une tuile ;

    validation d’un alignement ;

    détection des mots formés ;

    calcul du score ;

    changement de tour ;

    détection de fin de partie.

Ces fonctions doivent pouvoir être testées sans navigateur.
11.2 Interface

React orchestre :

    l’affichage ;

    les interactions ;

    les dialogues ;

    les préférences ;

    les annonces d’accessibilité ;

    la navigation entre les écrans.

React ne doit pas contenir directement les règles complexes du jeu.

Les adaptations d’interface doivent être pilotées par des préférences explicites et non par une duplication des écrans. Une même vue doit pouvoir s’adapter au mode standard ou au mode Confort grâce à des paramètres tels que :

type ComfortPreferences = {
  enabled: boolean;
  textScale: 'standard' | 'large' | 'extra-large';
  contrast: 'standard' | 'enhanced';
  reducedMotion: boolean;
  interactionMode: 'tap' | 'drag-and-drop' | 'both';
  guidanceLevel: 'concise' | 'detailed';
  opponentPace: 'immediate' | 'calm';
};

Le moteur de jeu ne doit pas dépendre de ces préférences.
11.3 Persistance

La sauvegarde doit être :

    automatique ;

    locale ;

    versionnée ;

    tolérante aux évolutions de schéma ;

    récupérable après fermeture du navigateur ;

    protégée contre un état partiellement écrit.

Prévoir une structure du type :

type SavedGame = {
  schemaVersion: number;
  savedAt: string;
  gameId: string;
  state: GameState;
};

11.4 Migrations

Toute modification incompatible de sauvegarde doit ajouter une migration ou réinitialiser proprement la partie avec une explication compréhensible.

Ne jamais laisser l’application planter sur une ancienne sauvegarde.
12. Règles de jeu initiales

Les règles suivantes sont des choix de départ. Elles peuvent évoluer, mais toute modification doit être documentée dans docs/game-rules.md.
12.1 Plateau

    grille originale de 13 × 13 cases ;

    disposition originale des bonus ;

    case centrale identifiable ;

    aucune reproduction du plateau officiel du Scrabble.

12.2 Chevalet

    8 lettres par joueur dans la version initiale ;

    lettres affichées en gros caractères ;

    quantité restante dans la pioche affichable sans surcharge visuelle.

12.3 Placement

L’utilisateur doit pouvoir :

    sélectionner une lettre ;

    toucher ou cliquer sur une case ;

    voir immédiatement la lettre placée ;

    déplacer une lettre déjà posée pendant le tour ;

    reprendre toutes les lettres du tour ;

    valider seulement lorsqu’il le souhaite.

Le glisser-déposer peut être proposé, mais ne doit jamais être la seule méthode.
12.4 Premier coup

Le premier mot doit passer par la case centrale.
12.5 Coups suivants

Les nouveaux mots doivent se connecter au plateau existant.
12.6 Direction

Un coup place les lettres sur une seule ligne ou une seule colonne.
12.7 Score

Le système de score doit être original et documenté.

La première version peut utiliser :

    une valeur par lettre ;

    des cases bonus originales ;

    un bonus lorsque les 8 lettres du chevalet sont utilisées.

Ne pas recopier sans réflexion la distribution et les valeurs officielles du Scrabble.
12.8 Fin de partie

La partie peut se terminer lorsque :

    aucun nouveau mot ne peut être créé par les deux joueurs avec les lettres restantes et le plateau actuel ;

    plusieurs tours consécutifs sont passés ;

    l’utilisateur choisit d’arrêter.

La fin de partie doit être présentée sans dramatisation.
13. Dictionnaire et validation des mots
13.1 Phase prototype

Le prototype peut utiliser une petite liste locale explicitement identifiée comme :

    Dictionnaire de démonstration incomplet.

L’interface ne doit pas laisser croire que cette liste constitue une référence linguistique officielle.
13.2 Phase de production

Le pipeline lexical doit permettre :

    import d’une source autorisée ;

    normalisation Unicode ;

    gestion des accents ;

    filtrage documenté ;

    génération d’un format compact ;

    recherche rapide hors ligne ;

    traçabilité de la licence ;

    tests de non-régression.

13.3 Règles lexicales à décider

Documenter explicitement :

    gestion des accents ;

    pluriels ;

    conjugaisons ;

    mots composés ;

    traits d’union ;

    apostrophes ;

    abréviations ;

    noms propres ;

    variantes orthographiques ;

    mots sensibles ou offensants.

Ne pas inventer silencieusement ces règles dans le code.
13.4 Accents

Les tuiles peuvent être affichées sans accents si le modèle de jeu le décide, mais le dictionnaire et la normalisation doivent gérer correctement le français.

Toute simplification doit être expliquée dans l’aide.
14. Adversaire informatique

L’adversaire doit jouer localement.
14.1 Objectif

L’objectif n’est pas de créer immédiatement le meilleur joueur possible, mais un adversaire :

    prévisible ;

    rapide ;

    réglable ;

    agréable ;

    adapté aux débutants.

14.2 Niveaux initiaux
Facile

    joue des mots courts ;

    ignore volontairement certains meilleurs coups ;

    privilégie une réponse rapide ;

    évite d’écraser systématiquement le joueur ;

    laisse régulièrement des opportunités.

Normal

    explore davantage de coups ;

    choisit parmi plusieurs coups raisonnables ;

    reste battable.

Difficile

    cherche un score plus élevé ;

    peut utiliser des mots plus rares ;

    ne doit pas tricher.

14.3 Interdictions

L’adversaire ne doit jamais :

    connaître les lettres du joueur pour prendre sa décision ;

    modifier la pioche ;

    utiliser un dictionnaire différent ;

    jouer un mot non autorisé ;

    calculer si longtemps que l’interface semble bloquée.

14.4 Explicabilité

En mode aide, l’utilisateur peut demander :

    quel mot l’ordinateur vient de jouer ;

    sa définition si disponible ;

    comment le score a été calculé.

15. Accessibilité

L’accessibilité est une exigence centrale, pas une amélioration future.
15.1 Référentiel

Viser au minimum WCAG 2.2 niveau AA lorsque cela est applicable.
15.2 Taille des cibles

Les zones interactives doivent mesurer au minimum :

    48 × 48 px pour les actions principales ;

    davantage lorsque l’espace le permet.

15.3 Texte

Prévoir plusieurs tailles :

    normale ;

    grande ;

    très grande.

Éviter les textes importants en dessous de 18 px sur tablette.

Le zoom du navigateur ne doit pas casser l’interface.
15.4 Contraste

Prévoir :

    un mode standard à contraste élevé ;

    un mode contraste renforcé ;

    aucune information transmise uniquement par la couleur.

Les cases bonus doivent aussi être identifiables par :

    un symbole ;

    une abréviation ;

    un motif ;

    ou un libellé accessible.

15.5 Navigation clavier

Sur Mac et ordinateur :

    toutes les actions doivent être accessibles au clavier ;

    le focus doit être clairement visible ;

    l’ordre de tabulation doit être logique ;

    les raccourcis ne doivent pas entrer en conflit avec le navigateur.

15.6 Lecteurs d’écran

Prévoir :

    des noms accessibles explicites ;

    des annonces aria-live pour les actions importantes ;

    une représentation compréhensible du plateau ;

    une alternative à la seule lecture visuelle des coordonnées ;

    des messages d’erreur associés à l’action concernée.

15.7 Mouvement

Respecter prefers-reduced-motion.

Éviter :

    clignotements ;

    animations rapides ;

    déplacements inutiles ;

    compteurs animés stressants.

15.8 Sons

Les sons doivent être :

    facultatifs ;

    désactivables ;

    discrets ;

    jamais indispensables à la compréhension.

15.9 Dextérité

Ne pas exiger :

    un double-clic ;

    un appui long ;

    un glissement précis ;

    un geste complexe ;

    une vitesse d’exécution.

16. Expérience utilisateur
16.1 Écran d’accueil

L’écran d’accueil initial doit rester très simple :

    Continuer

    Nouvelle partie

    Réglages

Le bouton « Continuer » est masqué ou désactivé s’il n’existe aucune partie sauvegardée.
16.2 Écran de jeu

L’écran de jeu doit montrer en priorité :

    le plateau ;

    le chevalet ;

    le score ;

    le joueur actif ;

    les actions du tour.

Actions principales :

    Valider

    Annuler mon coup

    Mélanger les lettres

    Indice

    Passer

Les fonctions secondaires doivent être regroupées sans masquer le jeu.
16.3 Confirmation

Une confirmation est nécessaire pour les actions destructrices :

    nouvelle partie ;

    abandon ;

    suppression de sauvegarde ;

    réinitialisation des réglages.

Ne pas demander une confirmation pour les actions facilement réversibles.
16.4 Messages

Les messages doivent expliquer :

    ce qui s’est passé ;

    pourquoi ;

    ce que l’utilisateur peut faire ensuite.

Exemple :

    « Le mot “XXXXX” n’est pas reconnu dans le dictionnaire actuel. Vous pouvez modifier les lettres ou reprendre votre coup. »

16.5 Aide

L’aide doit être disponible sans quitter définitivement la partie.

Prévoir :

    une explication courte ;

    des illustrations simples ;

    une démonstration facultative ;

    un rappel du fonctionnement du tour ;

    un glossaire minimal.

16.6 Mode Confort

Le mode Confort est une évolution du produit, pas un prérequis au premier prototype.

Lorsqu’il sera implémenté :

    il devra pouvoir être activé ou désactivé à tout moment ;

    il ne devra pas modifier les règles ni avantager artificiellement le joueur ;

    il devra conserver la partie en cours lors d’un changement de mode ;

    il devra regrouper des adaptations validées par des tests utilisateurs ;

    il devra permettre des réglages individuels plutôt qu’un profil unique imposé ;

    son activation ne devra pas afficher de vocabulaire lié à l’âge.

Le mode Confort ne doit pas devenir une seconde application parallèle.
16.7 Adaptation progressive

Après quelques parties, l’application pourra proposer ponctuellement une adaptation lorsqu’un besoin semble probable, sans imposer de changement.

Exemples :

    « Souhaitez-vous agrandir les lettres ? »

    « Préférez-vous toucher une lettre puis une case ? »

    « Voulez-vous des explications plus détaillées ? »

Ces propositions doivent respecter les règles suivantes :

    ne pas interrompre un coup ;

    ne pas apparaître trop fréquemment ;

    toujours proposer « Pas maintenant » ;

    expliquer clairement le changement ;

    pouvoir être annulées dans les réglages ;

    rester stockées localement ;

    ne pas établir de profil médical ou cognitif.

17. Responsive design
17.1 Smartphone

Priorités :

    plateau aussi grand que possible ;

    chevalet toujours accessible ;

    contrôles principaux visibles ;

    panneaux secondaires repliables ;

    utilisation possible en portrait ;

    aucun texte minuscule.

17.2 Tablette

Disposition recommandée en paysage :

    plateau à gauche ;

    chevalet, score et actions à droite ;

    boutons larges ;

    zones aérées.

17.3 Ordinateur

Prévoir :

    une largeur maximale confortable ;

    le support souris, trackpad et clavier ;

    le plein écran ;

    une fenêtre redimensionnable ;

    aucune dépendance au survol pour comprendre une action.

18. PWA et fonctionnement hors ligne
18.1 Installation

L’application doit être installable lorsque la plateforme le permet.

Le manifeste doit inclure :

    nom ;

    nom court ;

    description ;

    icônes adaptées ;

    couleur de thème ;

    couleur d’arrière-plan ;

    mode standalone ;

    URL de démarrage ;

    orientation non bloquante.

18.2 Service worker

Le service worker doit :

    mettre en cache l’interface ;

    permettre de reprendre une partie hors ligne ;

    gérer proprement les mises à jour ;

    éviter de servir indéfiniment une version cassée ;

    ne jamais perdre une sauvegarde locale.

18.3 Mise à jour

Lorsqu’une nouvelle version est disponible :

    ne pas interrompre une partie ;

    afficher un message simple ;

    proposer de mettre à jour après sauvegarde ;

    permettre de continuer temporairement.

18.4 Test hors ligne

Toute version candidate doit être testée :

    en ligne ;

    après installation ;

    après fermeture ;

    en mode avion ou réseau désactivé ;

    après redémarrage du navigateur.

19. Sécurité et confidentialité
19.1 Données locales

Les données locales peuvent inclure :

    partie en cours ;

    préférences ;

    historique local facultatif ;

    statistiques personnelles locales.

Ne pas stocker :

    données sensibles inutiles ;

    identifiants personnels ;

    informations de santé ;

    contacts ;

    localisation précise.

19.2 Services tiers

Aucun service tiers ne doit être ajouté par défaut pour :

    analytics ;

    publicité ;

    polices distantes ;

    crash reporting ;

    authentification ;

    stockage.

Préférer des polices système pour limiter les dépendances et améliorer la confidentialité.
19.3 Contenu externe

Ne pas charger de scripts depuis un CDN en production sans justification.
19.4 Entrées utilisateur

Même sans backend :

    valider les données restaurées ;

    protéger les imports futurs ;

    éviter l’exécution de contenu arbitraire ;

    ne pas utiliser eval.

20. Performance

L’application doit rester fluide sur une tablette ou un ordinateur ancien encore utilisable.

Objectifs indicatifs :

    démarrage rapide ;

    interaction immédiate ;

    aucun blocage visible pendant le tour de l’ordinateur ;

    bundle initial raisonnable ;

    dictionnaire chargé efficacement ;

    pas de recalcul complet inutile du plateau.

Pour les calculs lourds de l’adversaire, envisager un Web Worker.

Ne pas optimiser prématurément, mais mesurer avant d’ajouter une complexité importante.
21. Qualité du code
21.1 TypeScript

    activer un mode strict ;

    éviter any ;

    utiliser des types de domaine explicites ;

    valider les données persistées ;

    préférer les unions discriminées pour les états complexes.

21.2 Fonctions

    fonctions courtes ;

    noms explicites ;

    effets de bord limités ;

    logique métier testable ;

    commentaires réservés aux décisions non évidentes.

21.3 Composants React

    composants ciblés ;

    éviter les composants géants ;

    séparer logique et présentation ;

    ne pas dupliquer l’état ;

    privilégier les propriétés explicites.

21.4 CSS

    variables CSS pour les tailles, espacements et contrastes ;

    aucune taille critique dispersée arbitrairement ;

    prise en charge des tailles de texte ;

    prise en charge de prefers-reduced-motion;

    éviter les dépendances à une taille fixe d’écran.

21.5 Erreurs

Les erreurs techniques doivent :

    être capturées ;

    ne pas détruire la sauvegarde ;

    être traduites en messages compréhensibles ;

    être journalisées localement seulement si cela aide au diagnostic.

22. Tests
22.1 Tests unitaires prioritaires

Couvrir au minimum :

    génération du plateau ;

    placement d’une lettre ;

    déplacement d’une lettre pendant le tour ;

    annulation d’un coup ;

    validation d’un alignement ;

    premier mot passant par le centre ;

    connexion aux mots existants ;

    détection des mots croisés ;

    calcul du score ;

    consommation et renouvellement du chevalet ;

    fin de partie ;

    sérialisation et restauration ;

    migration de sauvegarde ;

    comportement des niveaux de l’ordinateur.

22.2 Tests d’intégration

Couvrir :

    nouvelle partie ;

    coup complet du joueur ;

    réponse de l’ordinateur ;

    sauvegarde automatique ;

    fermeture et reprise ;

    changement de taille du texte ;

    utilisation hors ligne.

22.3 Tests de bout en bout

Parcours critiques :

    ouvrir l’application ;

    lancer une partie ;

    placer des lettres ;

    annuler ;

    replacer ;

    valider ;

    laisser jouer l’ordinateur ;

    fermer ;

    rouvrir ;

    reprendre la partie.

22.4 Accessibilité automatisée

Ajouter des vérifications automatisées lorsque possible, mais ne jamais considérer qu’elles remplacent un test humain.
22.5 Tests manuels

Tester régulièrement :

    avec zoom à 200 % ;

    avec clavier uniquement ;

    avec VoiceOver sur Mac ou iPad ;

    en mode contraste renforcé ;

    avec réduction des animations ;

    sur écran tactile ;

    hors ligne.

22.6 Tests utilisateurs avec des seniors

Les tests utilisateurs ne doivent commencer qu’une fois la boucle principale suffisamment stable pour être jouée sans intervention constante du développeur.

Privilégier de petites sessions individuelles avec des profils variés. Observer sans expliquer trop vite.

Pour chaque session, relever notamment :

    le temps nécessaire pour démarrer une partie ;

    les hésitations et retours en arrière ;

    les éléments touchés ou cliqués par erreur ;

    la compréhension du placement des lettres ;

    la compréhension de « Valider » et « Annuler mon coup » ;

    la lisibilité du plateau et du chevalet ;

    la compréhension des messages ;

    la réaction au tour de l’ordinateur ;

    la capacité à fermer puis reprendre la partie ;

    les demandes spontanées d’aide.

Ne pas se limiter à demander si l’utilisateur « aime » le jeu. Les comportements observés ont plus de valeur que les réponses générales de satisfaction.

Les comptes rendus anonymisés peuvent être conservés dans :

docs/user-research/

Ne jamais y stocker de données de santé, de coordonnées personnelles ou d’informations permettant d’identifier inutilement les participants.

Toute modification importante issue d’un test doit indiquer :

    le problème observé ;

    le nombre de personnes concernées ;

    l’hypothèse de correction ;

    la manière de vérifier l’amélioration.

23. Documentation

Les fichiers suivants doivent rester à jour :
README.md

Doit expliquer :

    objectif du projet ;

    installation ;

    lancement local ;

    tests ;

    build ;

    installation PWA ;

    structure du dépôt ;

    état du prototype.

docs/game-rules.md

Doit décrire les règles exactes implémentées.
docs/accessibility.md

Doit documenter :

    choix d’accessibilité ;

    tests réalisés ;

    limites connues ;

    procédures de vérification.

docs/dictionary-sources.md

Doit détailler :

    sources ;

    licences ;

    transformations ;

    exclusions ;

    version ;

    date de génération.

docs/architecture.md

Doit expliquer :

    modules ;

    flux de données ;

    stockage ;

    moteur du jeu ;

    moteur de l’adversaire.

docs/decisions/

Utiliser des ADR courts pour les décisions structurantes.

Exemple :

docs/decisions/0001-use-indexeddb.md

24. Git et gestion des changements
24.1 Avant modification

L’agent doit :

    lire git status ;

    comprendre les changements existants ;

    ne pas écraser le travail non lié ;

    identifier les fichiers concernés.

24.2 Commits

Les commits doivent être :

    petits ;

    cohérents ;

    descriptifs ;

    réversibles.

Exemples :

feat(game): add reversible tile placement
fix(pwa): preserve saved game during update
test(scoring): cover cross-word bonuses
docs(accessibility): document keyboard navigation

24.3 Historique des versions

Tout changement notable destiné à être poussé ou publié doit mettre à jour `CHANGELOG.md`.

La mise à jour doit rester courte et compréhensible par un utilisateur non technique. Elle doit indiquer, selon le cas :

    ajouts ;

    améliorations ;

    corrections ;

    changements techniques importants.

Les corrections mineures internes peuvent être regroupées dans la version en cours.

24.4 Interdictions

Ne pas :

    réécrire l’historique sans demande ;

    supprimer des fichiers non liés ;

    exécuter un reset destructeur ;

    modifier massivement le formatage sans nécessité ;

    mélanger refonte et nouvelle fonctionnalité dans le même changement.

25. Méthode de travail attendue pour un agent

Pour chaque tâche importante :

    lire la demande ;

    lire les fichiers pertinents ;

    vérifier l’état du dépôt ;

    reformuler l’objectif en une phrase ;

    établir un plan court ;

    implémenter par petites étapes ;

    lancer les tests ciblés ;

    lancer les vérifications globales pertinentes ;

    corriger les erreurs ;

    résumer précisément le résultat.

Le résumé final doit indiquer :

    ce qui a été modifié ;

    les fichiers principaux ;

    les tests exécutés ;

    les limites restantes ;

    les éventuelles décisions à prendre.

Ne pas déclarer qu’une fonctionnalité fonctionne sans l’avoir vérifiée.
26. Définition de « terminé »

Une tâche n’est terminée que si :

    le comportement demandé est réellement présent ;

    l’interface reste accessible ;

    les règles juridiques sont respectées ;

    la sauvegarde n’est pas compromise ;

    TypeScript compile ;

    les tests concernés passent ;

    le build passe ;

    la documentation est mise à jour si nécessaire ;

    aucun nouveau message d’erreur évident n’apparaît ;

    le fonctionnement tactile et clavier reste cohérent.

27. Hors périmètre initial

Ne pas ajouter dans la première version sans demande explicite :

    multijoueur en ligne ;

    chat ;

    classement mondial ;

    création de compte ;

    réseau social ;

    boutique ;

    publicité ;

    abonnement ;

    monnaie virtuelle ;

    NFT ;

    blockchain ;

    reconnaissance vocale ;

    synthèse vocale avancée ;

    backend complexe ;

    application native séparée ;

    dictionnaire propriétaire ;

    compétition chronométrée ;

    dizaines de thèmes graphiques.

Ces fonctions pourront être étudiées plus tard, mais elles ne doivent pas détourner le prototype de son objectif principal.
28. Feuille de route recommandée
Phase 1 — Jeu de base jouable localement

Objectif principal : valider la boucle de jeu avant toute spécialisation.

Objectifs :

    plateau 13 × 13 ;

    chevalet de 8 lettres ;

    placement par sélection puis clic ;

    annulation ;

    validation de mots simples ;

    score ;

    petite liste de démonstration ;

    ordinateur facile ;

    sauvegarde locale ;

    première interface responsive ;

    tests unitaires essentiels.

Critère de sortie : une personne peut terminer plusieurs tours sans aide technique.
Phase 2 — Jeu complet et PWA fiable

Objectifs :

    installation ;

    mode hors ligne ;

    reprise fiable ;

    partie complète avec fin de partie ;

    fonctionnement Mac, iPad et smartphone ;

    navigation clavier ;

    bases WCAG ;

    tests de bout en bout.

Critère de sortie : le jeu peut être installé, fermé et repris sans perte de partie.
Phase 3 — Dictionnaire ouvert et adversaire stable

Objectifs :

    choisir une source libre ;

    documenter la licence ;

    créer le pipeline d’import ;

    optimiser le stockage ;

    améliorer la validation ;

    proposer des niveaux Facile, Normal et Difficile ;

    garantir un temps de réponse acceptable.

Critère de sortie : le prototype est suffisamment crédible pour des tests prolongés.
Phase 4 — Observation avec des utilisateurs seniors

Objectifs :

    préparer un protocole simple ;

    tester avec plusieurs profils ;

    observer le démarrage, le placement, la validation et la reprise ;

    identifier les obstacles récurrents ;

    distinguer les problèmes généraux des besoins spécifiques ;

    prioriser les corrections selon leur impact ;

    documenter les résultats de manière anonyme.

Critère de sortie : les adaptations à développer sont justifiées par des problèmes observés et reproductibles.
Phase 5 — Mode Confort

Objectifs :

    ajouter les adaptations validées ;

    proposer texte grand et très grand ;

    renforcer le contraste ;

    simplifier progressivement les commandes ;

    proposer une aide plus détaillée ;

    ajuster le rythme de l’ordinateur ;

    permettre une interaction tactile sans glisser-déposer ;

    conserver la compatibilité avec le mode standard ;

    tester à nouveau avec les utilisateurs.

Critère de sortie : le mode Confort améliore les tâches observées sans dégrader l’expérience ni infantiliser.
Phase 6 — Publication pilote

Objectifs :

    hébergement HTTPS ;

    page d’installation simple ;

    groupe pilote ;

    collecte volontaire de retours ;

    corrections d’ergonomie ;

    vérification juridique du nom et des ressources ;

    documentation de confidentialité ;

    procédure de mise à jour sûre.

29. Première mission recommandée à Codex

Lorsqu’un agent commence dans un dépôt vide, sa première mission est de construire le jeu de base, sans implémenter encore le mode Confort complet.

    initialiser React, TypeScript et Vite ;

    configurer les scripts de qualité ;

    créer la structure minimale du dépôt ;

    séparer le moteur du jeu de l’interface ;

    créer un écran d’accueil accessible ;

    créer un plateau statique 13 × 13 ;

    créer un chevalet de démonstration ;

    permettre de sélectionner une lettre puis une case ;

    permettre d’annuler le placement ;

    sauvegarder l’état localement ;

    ajouter les premiers tests ;

    configurer un premier manifeste PWA ;

    prévoir une structure de préférences extensible, sans développer toutes les adaptations ;

    vérifier typecheck, test et build.

Ne pas commencer immédiatement par :

    un moteur d’IA complexe ;

    un dictionnaire complet ;

    des profils seniors automatiques ;

    des adaptations spéculatives non testées ;

    un assistant intrusif ;

    une personnalisation fondée sur l’âge.

30. Checklist avant chaque livraison
Produit

    Le jeu de base fonctionne indépendamment du mode Confort.

    Le jeu reste compréhensible sans mode d’emploi long.

    Le niveau facile est réellement facile.

    L’utilisateur peut corriger son coup.

    Aucun chronomètre n’est imposé.

    Aucun compte n’est nécessaire.

    Aucune publicité n’est présente.

    Une adaptation spécialisée répond à un besoin observé ou documenté.

    Aucun libellé n’infantilise ou ne stigmatise l’utilisateur.

Accessibilité

    Les boutons principaux sont suffisamment grands.

    Le contraste est suffisant.

    L’information ne dépend pas uniquement de la couleur.

    Le clavier permet d’utiliser les actions principales.

    Le zoom ne casse pas l’écran.

    Les animations réduites sont respectées.

Technique

    npm run typecheck passe.

    npm run lint passe.

    npm run test passe.

    npm run build passe.

    La sauvegarde et la reprise fonctionnent.

    Le mode hors ligne a été vérifié si concerné.

Juridique

    Aucun élément officiel du Scrabble n’est copié.

    Le plateau et les bonus sont originaux.

    Les règles sont rédigées indépendamment.

    La source du dictionnaire est documentée.

    Les licences tierces sont respectées.

31. Principe final

Construire d’abord un jeu simple qui fonctionne. Observer ensuite. Adapter seulement ce qui améliore réellement l’expérience.

Lorsqu’un choix oppose sophistication et sérénité, choisir la sérénité.

Sérénimot doit donner à l’utilisateur le sentiment suivant :

    « Je comprends ce que je peux faire, je peux prendre mon temps, et je peux toujours revenir en arrière. »
