# Guide Le Moulin 1771

Site du guide voyageurs de l'appartement Le Moulin 1771 à Grimentz, en français, allemand et anglais.
Le contenu se modifie dans Notion. Le site se met à jour tout seul chaque nuit, ou tout de suite sur demande.

Aucun code n'apparaît sur le site : le code de la boîte à clé et le wifi partent uniquement par les messages Lodgify.

## Comment ça marche

1. Le contenu vit dans la base Notion « Guide Le Moulin » : une ligne par rubrique.
2. Chaque nuit (ou quand vous cliquez sur « Run workflow »), GitHub lit la base, traduit ce qui manque avec DeepL, construit le site et le publie.
3. Les traductions sont écrites dans Notion : vous pouvez les corriger directement.

## Modifier le contenu dans Notion

| Colonne | À quoi elle sert |
|---|---|
| Titre | Titre de la rubrique en français |
| Texte FR | Le texte en français |
| Titre DE / Texte DE, Titre EN / Texte EN | Traductions. Laissez vide : DeepL les remplit. Corrigez-les librement. |
| Partie | Où la rubrique apparaît : Accueil, Essentiel (encadré en haut), Intro maison, Intro Grimentz, Maison, Grimentz |
| Ordre | Position (petit nombre = plus haut) |
| Publié | Décochez pour masquer une rubrique sans la supprimer |
| Photos | Glissez une ou plusieurs photos. Pour l'Accueil, la première photo devient la grande image d'ouverture. |
| Icône | L'icône de la tuile |
| Nouveau | Met la tuile en avant avec l'étiquette « Nouveau » |
| Mise en avant | Pour un élément « Essentiel » : pleine largeur, fond coloré |
| Traduction manuelle | Cochez si vous avez corrigé l'allemand ou l'anglais à la main et que vous ne voulez plus que DeepL l'écrase |
| Slug | Nom court dans l'adresse (ex. `parking` donne …/#parking). À ne pas changer une fois le lien envoyé. |
| Empreinte FR | Technique, ne pas toucher |

Mise en forme dans les textes :

- Gras et italique de Notion sont repris. Un paragraphe entièrement en italique s'affiche comme une note discrète.
- Une ligne qui commence par `• ` devient une puce.
- Une puce qui commence par un lien (ex. `• Coop : 7/7`, avec « Coop » en lien) devient une carte cliquable.
- Une ligne vide sépare deux paragraphes.

Quand vous changez le texte français, l'allemand et l'anglais sont retraduits au prochain passage, sauf si « Traduction manuelle » est cochée.

## Publier tout de suite

GitHub, onglet **Actions**, « Publier le guide », bouton **Run workflow**. Le site est à jour 1 à 2 minutes après.

## Mise en route (une seule fois)

1. **Notion** : créez une page vide « Site du guide ». Sur notion.so/profile/integrations, créez une intégration interne « Site guide Moulin » et copiez son jeton secret. Ouvrez la page, menu `•••` en haut à droite, **Connexions**, ajoutez l'intégration.
2. **DeepL** : créez un compte DeepL API Free et copiez la clé (elle finit par `:fx`).
3. **GitHub** : créez le dépôt avec ces fichiers. Dans **Settings > Secrets and variables > Actions**, ajoutez les secrets `NOTION_TOKEN` (jeton Notion) et `DEEPL_KEY` (clé DeepL). Si plusieurs pages sont partagées avec l'intégration, ajoutez aussi `NOTION_PAGE_ID` avec le lien de la page « Site du guide ».
4. **Pages** : dans **Settings > Pages**, choisissez « Source : GitHub Actions ».
5. **Créer la base** : onglet **Actions**, « Créer la base Notion (une seule fois) », **Run workflow**. La base apparaît dans la page Notion, déjà remplie.
6. **Publier** : onglet **Actions**, « Publier le guide », **Run workflow**. L'adresse du site s'affiche dans Settings > Pages.
7. **Nom de domaine (facultatif)** : achetez le domaine, ajoutez la variable `SITE_DOMAIN` (ex. `guide.lemoulin1771.ch`) dans **Settings > Secrets and variables > Actions > Variables**, puis suivez les instructions DNS de Settings > Pages.
8. **Lodgify** : remplacez le lien du guide dans le texte du guide local (Lodgify, rubrique des infos d'accès pour les messages).

## Pour le développeur

Node 20, aucune dépendance. `node scripts/build.mjs --local` construit le site dans `dist/` à partir de `content/seed.json`, sans Notion ni DeepL.
