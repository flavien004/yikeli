# Restaurant Yikéli — React + TypeScript · Netlify · Supabase

## Architecture

```
Navigateur (React, Vite, Tailwind)
   │  HTTPS — JWT d'accès en mémoire + cookie refresh HttpOnly
   ▼
Netlify  ── site statique (dist/)
         ── Function `api` (/api/*)  ← seule à connaître la clé service_role
   │
   ▼
Supabase ── PostgreSQL (RLS activée, aucune politique : accès serveur uniquement)
         ── Storage (bucket public `product-images`)
```

Le navigateur ne parle **jamais** directement à Supabase : pas de clé Supabase côté client.

## 1. Supabase

1. Créez un projet sur supabase.com.
2. *SQL Editor* → exécutez dans l'ordre :
   - `supabase/migrations/001_init.sql` (tables, sécurité, fonctions transactionnelles)
   - `supabase/migrations/002_storage.sql` (bucket d'images)
   - *(optionnel)* `supabase/seed_demo.sql` (menu et ingrédients d'exemple)
3. *Project Settings → API* : notez l'**URL** du projet et la clé **service_role** (secrète).

## 2. Variables d'environnement

Copiez `.env.example` vers `.env` (local) et renseignez les **mêmes** variables dans
Netlify : *Site configuration → Environment variables*.

| Variable | Rôle |
|---|---|
| `SUPABASE_URL` | URL du projet |
| `SUPABASE_SERVICE_ROLE_KEY` | clé serveur — **jamais** préfixée `VITE_` |
| `JWT_SECRET` | ≥ 32 caractères aléatoires : `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ACCESS_TOKEN_TTL_SECONDS` | durée du JWT (défaut 900 = 15 min) |
| `REFRESH_TOKEN_TTL_SECONDS` | durée du refresh token (défaut 604800 = 7 jours) |

## 3. Premier administrateur

Renseignez `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10 caractères minimum) dans `.env`, puis :

```bash
npm install
npm run create-admin
```

Supprimez ensuite `ADMIN_PASSWORD` du `.env`. Les autres comptes se créent depuis l'écran *Employés*.

## 4. Déploiement Netlify

1. Poussez le dossier sur GitHub/GitLab, puis *Add new site → Import an existing project*.
2. Les réglages viennent de `netlify.toml` (build `npm run build`, publication `dist`, fonctions `netlify/functions`).
3. Ajoutez les variables d'environnement, puis déployez.
4. **Vérifiez** : `https://votre-site.netlify.app/api/health` doit répondre `{"ok":true}`.
   Si vous obtenez la page du site à la place, ajoutez dans `netlify.toml`, **avant** la règle `/*` :
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/api/:splat"
     status = 200
   ```

## 5. Développement local

```bash
npm install -g netlify-cli
npm run dev        # netlify dev : front + fonctions sur http://localhost:8888
```

`npm run dev:web` lance seulement Vite (sans API).

## Authentification

- `POST /api/auth/login` : vérifie email + mot de passe (bcrypt, coût 12), renvoie un **JWT d'accès**
  (HS256, 15 min) et pose un **refresh token** (cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`).
- Quand le JWT expire, le client reçoit un 401, appelle `POST /api/auth/refresh` (une seule fois, même
  si plusieurs requêtes échouent en parallèle) puis rejoue la requête. Le refresh token est **tourné** à chaque usage.
- Un refresh token **rejoué** (vol probable) révoque toutes les sessions de l'utilisateur.
- Désactiver un compte ou réinitialiser son mot de passe révoque ses sessions.
- Verrouillage : 5 échecs par email sur 15 minutes. Réponse identique pour email inconnu / mauvais mot de passe / compte désactivé.
- Le JWT n'est **jamais** écrit dans le navigateur (mémoire uniquement). Aucun mot de passe ni hash n'est
  stocké côté client ; l'ancien état `yikeli_app_state` est purgé au démarrage.

## Droits (appliqués par l'API, pas seulement par l'interface)

| Rôle | Accès |
|---|---|
| Public | menu, commande en ligne (prix/stock recalculés par la base) |
| CAISSIER / CHEF | caisse, commandes, encaissements, dépenses **Provisions** uniquement |
| ADMIN | tout : menu, images, ingrédients, dépenses et leurs types, employés, journal, comptabilité, configuration |

Le statut « Payée » n'est posé que par un paiement complet (fonction SQL `add_payment`).

## Fonctions ajoutées dans cette version

- **Images produits** : upload depuis l'écran *Menu & stock* (réduction automatique à 800 px, contrôle du type et des premiers octets côté serveur, stockage Supabase). Repli coloré si aucune image.
- **Types de dépense** : écran *Configuration* (ajout, renommage en cascade, suppression refusée si utilisé ; « Provisions » protégé).
- **Ingrédients** : approvisionnement ingrédient par ingrédient (quantité, coût unitaire, fournisseur), dépense « Provisions » créée automatiquement (désactivable), ajustements motivés (perte, inventaire), historique avec stock après chaque mouvement, alertes de seuil.
- **Design** : palette claire et chaleureuse, boutons orange.

## Tests

```bash
npm test         # 42 tests : JWT, refresh/rotation, droits, validation, schéma SQL réel (PGlite)
npm run build    # typecheck front + serveur, puis build Vite
```

## Limites connues

- Testé : logique SQL (moteur PostgreSQL réel), JWT/refresh, routeur et droits (Supabase simulé).
  **Non testé en conditions réelles** : le déploiement Netlify et les appels à un vrai projet Supabase — faites les vérifications du §4 après le premier déploiement.
- Un JWT déjà émis reste valable jusqu'à son expiration (≤ 15 min) même si le compte est désactivé ; ses sessions de renouvellement, elles, sont coupées.
- Anti-spam de la commande en ligne : limite par numéro de téléphone (5/heure). Pas de CAPTCHA.
- Anti force brute limité par email (pas par adresse IP).
- Les données chargées sont fenêtrées : admin 180 jours, employé 14 jours.
- Export PDF : à brancher sur l'impression navigateur (styles d'impression déjà présents) ; seuls les exports CSV sont réels.
- Graphiques du dashboard analytique non portés dans cette version.
