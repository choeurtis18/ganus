# Cahier de Recette - Ganus

## Vue d'ensemble
Document de test fonctionnel pour valider toutes les features de l'application Ganus.

---

## 1. AUTHENTIFICATION

### 1.1 Inscription
- [ ] Accéder à la page `/auth/signup`
- [ ] Entrer un email valide et un mot de passe (min 8 caractères)
- [ ] Confirmer le mot de passe identique
- [ ] Cliquer "S'inscrire"
- [ ] Vérifier la redirection vers `/dashboard`
- [ ] Vérifier que l'email est affiché dans le profil

### 1.2 Connexion
- [ ] Logout du compte précédent
- [ ] Aller à `/auth/login`
- [ ] Entrer email et mot de passe valides
- [ ] Cliquer "Se connecter"
- [ ] Vérifier la redirection vers `/dashboard`

### 1.3 Gestion du mot de passe
- [ ] Aller au profil (`/profile`)
- [ ] Cliquer "Changer le mot de passe"
- [ ] Entrer mot de passe actuel (faux) → vérifier erreur
- [ ] Entrer mot de passe actuel (correct), nouveau (6 chars) → vérifier erreur "min 8"
- [ ] Entrer mot de passe actuel, nouveau (8+ chars), confirmation différente → vérifier erreur
- [ ] Entrer tout correctement → modal de confirmation
- [ ] Confirmer → vérifier message "Mis à jour avec succès"

### 1.4 Logout
- [ ] Cliquer sur avatar en bas de sidebar
- [ ] Cliquer "Déconnecter"
- [ ] Vérifier redirection vers `/auth/login`
- [ ] Vérifier impossible d'accéder `/dashboard` (redirect login)

---

## 2. PROFIL UTILISATEUR

### 2.1 Infos personnelles
- [ ] Aller au `/profile`
- [ ] Dans "Profil professionnel", remplir :
  - Nom, Prénom, Âge (18-99)
  - Domaine (choisir option)
  - Sous-domaine (change selon domaine)
  - Niveau d'expérience
  - Postes recherchés (max 5, avec autocomplete)
- [ ] Cliquer "Sauvegarder"
- [ ] Vérifier message succès
- [ ] Recharger page → vérifier données persistées

### 2.2 Validation des données
- [ ] Âge < 18 ou > 99 → erreur
- [ ] Postes > 5 → erreur "Max 5"
- [ ] Domaine invalide → erreur
- [ ] Laisser champs vides → pas d'erreur (optionnel)

### 2.3 Export des données
- [ ] Aller `/profile`
- [ ] Cliquer "Télécharger mes données"
- [ ] Vérifier fichier JSON téléchargé avec toutes les données (profil, sessions, logs)

### 2.4 Suppression de compte
- [ ] Aller `/profile`
- [ ] Section "Supprimer mon compte"
- [ ] Cliquer "Supprimer mon compte"
- [ ] Cliquer "Confirmer la suppression"
- [ ] Vérifier redirection login
- [ ] Tenter de se reconnecter avec cet email → erreur "credentials invalides"

---

## 3. MON CV (Page `/cv`)

### 3.1 Upload PDF
- [ ] Aller `/cv`
- [ ] Uploader un PDF valide (text extraction)
- [ ] Vérifier analyse automatique → score affiché
- [ ] Vérifier forces, améliorations, suggestions visibles
- [ ] Vérifier bouton "Télécharger" disponible
- [ ] Cliquer "Télécharger" → PDF ouvert dans nouvel onglet

### 3.2 Upload Image
- [ ] Aller `/cv`
- [ ] Uploader une image JPG/PNG (CV scanné)
- [ ] Vérifier analyse OK (OCR via GPT-4 Vision)
- [ ] Vérifier score et conseils affichés

### 3.3 Upload invalide
- [ ] Uploader fichier > 5 MB → erreur
- [ ] Uploader format non-supporté (.txt, .doc) → erreur
- [ ] Uploader PDF sans texte → erreur "Exportez depuis Word/Canva"

### 3.4 Rate limiting
- [ ] Uploader CV (1ère analyse) → OK
- [ ] Uploader CV (2e analyse) → OK
- [ ] Uploader CV (3e analyse) → erreur "Limite 2/jour"
- [ ] Attendre 24h (ou vérifier BDD que compteur reset)
- [ ] 3e analyse → OK

### 3.5 Remplacement CV
- [ ] Avoir un CV uploadé
- [ ] Uploader nouveau CV → old remplacé
- [ ] Vérifier nouveau score affiché

---

## 4. PROFIL - Section CV résumée

### 4.1 Affichage CV
- [ ] Aller `/profile`
- [ ] Section "Mon CV" affiche :
  - Score avec barre de couleur
  - Date dernière analyse
  - Bouton "Télécharger"
  - Lien "Voir l'analyse complète →"
- [ ] Cliquer lien → redirection `/cv`

### 4.2 Aucun CV
- [ ] Supprimer CV de la BDD (ou compte sans CV)
- [ ] Aller `/profile`
- [ ] Section "Mon CV" non affichée

---

## 5. DASHBOARD (`/dashboard`)

### 5.1 Stats cards
- [ ] Affichage 4 cartes :
  - Messages envoyés (icône chat)
  - Score moyen (icône trending up + trend ce mois)
  - Score du CV (icône award)
  - Sessions (icône briefcase + trend ce mois)
- [ ] Vérifier icônes visibles
- [ ] Vérifier trend % visible si données suffisantes

### 5.2 Graphique progression
- [ ] Voir courbe score entretiens par semaine
- [ ] Pas de CV score sur le graphique (CV statique)
- [ ] Hover/clic sur points → pas d'action (juste visuel)

### 5.3 Points à améliorer
- [ ] Affiche top 2 critères < 70% avg
- [ ] Chaque ligne avec icône → et texte "Travailler votre..."
- [ ] Si pas de données → "Continue tes entretiens..."

### 5.4 Conseils personnalisés
- [ ] Si CV analysé → affiche suggestions du CV
- [ ] Si pas CV → affiche bouton "Uploader un CV"
- [ ] Cliquer bouton → redirection `/cv`

### 5.5 Sessions récentes
- [ ] Affiche max 5 dernières sessions
- [ ] Chaque ligne : titre, date, score (si existe)
- [ ] Cliquer → redirection `/chat?id=...`
- [ ] Si 0 sessions → affiche "Aucune session, Lance une..."
- [ ] Cliquer bouton → redirection `/chat`

---

## 6. CHAT (`/chat`)

### 6.1 Nouvelle session
- [ ] Aller `/chat`
- [ ] Voir sidebar vide ou liste sessions
- [ ] Bouton "Nouvelle session" visible
- [ ] Cliquer → nouvelle session créée, formulaire input visible
- [ ] Entrer message et envoyer
- [ ] Vérifier réponse IA

### 6.2 Scoring et feedback
- [ ] Envoyer plusieurs messages (≥ 2)
- [ ] Après réponse IA, vérifier :
  - Si réponse > 20 mots → Feedback card avec score
  - Score (0-100) affiché
  - Barre couleur (vert ≥80, or ≥60, orange <60)
- [ ] Cliquer "Voir détails" → modal avec 5 critères (pertinence, clarté, exemples, profondeur, communication)

### 6.3 Historique sessions
- [ ] Créer 3-4 sessions avec messages
- [ ] Sidebar affiche toutes les sessions
- [ ] Cliquer sur une session → charger messages de cette session
- [ ] Vérifier titre auto-généré (1er message)

### 6.4 Suppression session
- [ ] Hover sur une session → bouton delete
- [ ] Cliquer delete → confirmation
- [ ] Confirmer → session supprimée, redirection nouvelle session
- [ ] Vérifier session absente de sidebar

### 6.5 Profil contextualisé
- [ ] Avoir profil pro rempli + CV analysé
- [ ] Envoyer message en chat
- [ ] IA répond avec références au profil/CV (optionnel, si implémenté)

---

## 7. ADMIN PANEL (`/admin`)

### 7.1 Authentification Admin
- [ ] Aller `/admin` (sans auth)
- [ ] Formulaire "Admin Secret" visible
- [ ] Entrer secret invalide → erreur "Secret invalide"
- [ ] Entrer secret correct → page dashboard admin

### 7.2 Onglet Stats
- [ ] Affiche 6 cards :
  - Total users
  - Total sessions
  - Total messages
  - Coût aujourd'hui
  - Coût ce mois
  - Coût all-time
- [ ] Top users : liste email + coûts + calls

### 7.3 Onglet Users
- [ ] Liste tous les users (paginated si > 25)
- [ ] Chaque user : email, sessions, coût, rôle (badge)
- [ ] Barre recherche : filtrer par email
- [ ] Boutons rôle : user ↔ admin
- [ ] Bouton delete → confirmation → user soft-deleted
- [ ] Cliquer user → expansion inline avec :
  - Sessions count
  - Coût total
  - Coûts par fonctionnalité (chat, feedback, cv)
  - Logs récents (feature, model, tokens, coût)

### 7.4 Onglet Logs
- [ ] Liste logs avec pagination (25 par page)
- [ ] Chaque log : email, feature (badge), model, tokens, coût, date/heure
- [ ] Barre recherche email (debounce 300ms)
- [ ] Filtres feature : Tous, Chat, Feedback, CV
- [ ] Pagination : ← page/max →

### 7.5 Onglet Storage
- [ ] Bouton "Charger" pour lancer fetch
- [ ] Affiche fileCount (CVs uploadés)
- [ ] Affiche totalSizeBytes (formaté KB/MB)
- [ ] Bouton refresh

### 7.6 Session persistance
- [ ] Login admin
- [ ] Recharger page → rester logged (sessionStorage)
- [ ] Fermer tab → perdre session
- [ ] Logout (avatar logout) → redirect login

---

## 8. RESPONSIVE & DARK MODE

### 8.1 Mobile (< 768px)
- [ ] Sidebar collapses → hamburger menu
- [ ] Navbar mobile visible avec logo + menu icon
- [ ] Tous les inputs, boutons clickables (target ≥ 44px)
- [ ] Pas de horizontal scroll
- [ ] Grid cards stack en 1 colonne

### 8.2 Tablet (768-1024px)
- [ ] Sidebar compressé (icons only, 72px)
- [ ] Contenu full width
- [ ] Grid cards 2-3 colonnes

### 8.3 Desktop (> 1024px)
- [ ] Sidebar plein (240px)
- [ ] Contenu max-width responsive
- [ ] Grid cards 4 colonnes

### 8.4 Dark mode
- [ ] Toggle en bas sidebar
- [ ] Click → passer dark/light
- [ ] Préférence persistée (localStorage)
- [ ] Reload → mode préservé
- [ ] Tous les éléments correctement stylisés dans les deux modes

---

## 9. i18n (FR/EN)

### 9.1 Navigation i18n
- [ ] URL inclut locale : `/fr/...` ou `/en/...`
- [ ] Toggle langue en bas sidebar
- [ ] Cliquer EN → tous les textes en anglais, URL `/en/...`
- [ ] Cliquer FR → français, URL `/fr/...`

### 9.2 Couverture traductions
- [ ] Authentification (login, signup, erreurs)
- [ ] Profil (tous les champs)
- [ ] Chat (UI, feedback)
- [ ] CV (upload, analysis, rate limit)
- [ ] Dashboard (cards, charts, tips)
- [ ] Admin (stats, users, logs, storage)

### 9.3 Pas de texte hardcodé
- [ ] Aucun label non-traduit
- [ ] Pas de "undefined" ou clés manquantes

---

## 10. COÛTS LLM & LOGGING

### 10.1 Tracking des coûts
- [ ] Chat turn (gpt-4o-mini < 10 msgs, gpt-4o ≥ 10) → LLMLog créé
- [ ] Feedback score (gpt-4o-mini) → LLMLog créé
- [ ] CV analysis (text: gpt-4o-mini, image: gpt-4o) → LLMLog créé
- [ ] Admin panel → coûts affichés correctement

### 10.2 Tokens & cost accuracy
- [ ] Chat 100 tokens input → log show ~correct usage
- [ ] Coût total visible admin panel
- [ ] Coût par user = somme LLMLogs

---

## 11. CAS LIMITES & ERREURS

### 11.1 Sessions simultanées
- [ ] Ouvrir 2 onglets même compte
- [ ] Chat dans onglet 1 → vérifier sync onglet 2 (rechargement manuel)

### 11.2 Réseau lent
- [ ] Simulation throttle réseau (DevTools)
- [ ] Chat sending → vérifier "Envoi..." état
- [ ] Upload CV large → vérifier "Analyse..." état

### 11.3 Erreurs serveur
- [ ] Intentionnellement casser endpoint (500)
- [ ] Vérifier message erreur user-friendly affiché

### 11.4 Edge cases
- [ ] Âge: 18, 99, 17, 100 → validations OK
- [ ] Postes: 0, 1, 5, 6 → max 5 OK
- [ ] Email: valid, invalid, déjà existant → OK
- [ ] Caractères spéciaux dans nom → OK

---

## 12. PERFORMANCE

### 12.1 Lighthouse
- [ ] Aller page principale (authenticité)
- [ ] DevTools → Lighthouse
- [ ] Performance, Accessibility, Best Practices ≥ 80

### 12.2 Chargement données
- [ ] Dashboard stats < 1s
- [ ] Admin users list < 2s (25 users/page)
- [ ] Chat messages load < 500ms

---

## Checklist finale

- [ ] Tous les tests passent
- [ ] Pas de console errors
- [ ] Pas de types TypeScript warnings
- [ ] Tests unitaires passent (`npm test`)
- [ ] Build production OK (`npm run build`)
- [ ] Responsive à tous les breakpoints
- [ ] Dark/Light modes fonctionnent
- [ ] FR/EN traductions complètes
- [ ] Admin panel sécurisé (secret)
- [ ] Soft-delete respecté (RGPD)
- [ ] Rate limiting en place (CV 2/jour)
- [ ] Coûts LLM trackés correctement

---

## Notes

- Test sur Chrome, Firefox, Safari (si possible)
- Test sur mobile réel (iOS/Android)
- Vérifier performance sur réseau 3G (throttle DevTools)
- Admin secret: check `.env.example` pour valeur test
