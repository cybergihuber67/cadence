# Cadence — déploiement GitHub + Vercel

Fichiers : `index.html` (le jeu) et `api/scores.js` (le classement en ligne).

1. Mets ces deux fichiers (dossier `api` inclus) dans un dépôt GitHub.
2. Sur vercel.com : **Add New → Project**, importe le dépôt, **Deploy** (aucun réglage de build).
3. Dans le projet Vercel : **Storage → Create / Marketplace → Upstash Redis** (offre gratuite), connecte-le au projet.
   Vercel ajoute tout seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. **Redéploie** (Deployments → ⋯ → Redeploy) pour que les variables soient prises en compte.

Fonctionnement : un pseudo est lié à un jeton secret stocké dans le navigateur du joueur ; personne d'autre ne peut l'utiliser.
Seuls les niveaux terminés jusqu'au bout entrent au classement (un par difficulté), triés par % de parfaits puis par score.
Sans la base, le jeu fonctionne quand même et affiche le score local.

Limite : le score est envoyé par le navigateur, donc un joueur déterminé peut tricher. Pour un jeu entre amis c'est suffisant.
