# Plan d'Implémentation des Fonctionnalités

Date: 25 novembre 2025

## Fonctionnalités à Implémenter

### 1. ✅ Gestionnaire de Conversations
**Fichier créé**: `lib/conversation-manager.ts`
- ✅ Sauvegarde/chargement depuis localStorage
- ✅ Export JSON/CSV
- ✅ Génération de share links
- ✅ Gestion historique (max 50 conversations)

### 2. 🔄 Chat Area - Intégration avec Conversations
**Fichier**: `components/chat-area.tsx`

**Modifications nécessaires:**
- [ ] Importer `conversation-manager.ts`
- [ ] Créer un ID de conversation au démarrage
- [ ] Sauvegarder automatiquement après chaque message
- [ ] Ajouter boutons Copy/Share sur chaque message assistant
- [ ] Rendre le bouton Export fonctionnel (menu déroulant JSON/CSV)
- [ ] Charger conversation depuis share link au démarrage
- [ ] Ajouter bouton "New Chat" pour recommencer

**Nouveaux composants à ajouter:**
```tsx
// Boutons d'actions sur messages
<div className="flex gap-2 mt-2">
  <Button size="sm" onClick={() => copyMessage(msg.content)}>
    <Copy className="h-4 w-4" />
  </Button>
  <Button size="sm" onClick={() => shareMessage(msg)}>
    <Share className="h-4 w-4" />
  </Button>
</div>

// Menu export
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm">Export</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => exportJSON()}>
      Export JSON
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => exportCSV()}>
      Export CSV
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 3. 🔄 Sidebar - Historique Réel
**Fichier**: `components/chat-sidebar.tsx`

**Modifications nécessaires:**
- [ ] Importer `loadConversations()` depuis `conversation-manager.ts`
- [ ] Remplacer `recentSessions` hardcodé par données réelles
- [ ] Ajouter fonction `onClick` pour charger une conversation
- [ ] Implémenter bouton Export global (toutes les conversations)
- [ ] Implémenter bouton Filters (modal avec filtres de dates/lieux)
- [ ] Implémenter bouton Templates (queries pré-définies)
- [ ] Ajouter bouton "Delete" sur chaque session

**Nouveau composant `useConversations` hook:**
```tsx
const { conversations, loadConversation, deleteConversation } = useConversations()
```

### 4. 🔄 Header - Settings Panel
**Fichier**: `components/chat-header.tsx`

**Modifications nécessaires:**
- [ ] Rendre le bouton Settings fonctionnel
- [ ] Créer composant `SettingsDialog`
- [ ] Options: Langue (FR/EN), Modèle LLM, Export format par défaut

### 5. 📁 Nouveaux Composants à Créer

#### `components/ExportMenu.tsx`
Menu déroulant pour exporter conversations (JSON/CSV)

#### `components/FiltersDialog.tsx`
Modal avec filtres:
- Date range picker
- Multi-select pays
- Multi-select types d'événements
- Mots-clés

#### `components/TemplatesDialog.tsx`
Modal avec templates de requêtes:
- Par catégorie (Sécurité, Accidents, etc.)
- Favoris utilisateur
- Historique des requêtes fréquentes

#### `components/SettingsDialog.tsx`
Modal avec paramètres:
- Langue interface (FR/EN)
- Format export par défaut
- Effacer historique
- À propos

#### `hooks/useConversations.ts`
Hook React pour gérer l'état des conversations

### 6. 🎨 Composants UI Manquants

À installer si nécessaire:
- ✅ DropdownMenu (déjà installé via @radix-ui)
- ✅ Dialog (déjà installé)
- ✅ Popover (déjà installé)
- 🔄 DatePicker (peut-être à créer)

---

## Ordre d'Implémentation Recommandé

### Phase 1: Core (Urgent)
1. ✅ Créer `conversation-manager.ts`
2. 🔄 Hook `useConversations`
3. 🔄 Mise à jour `chat-area.tsx` (sauvegarde auto)
4. 🔄 Mise à jour `sidebar` (historique réel)

### Phase 2: Actions (Important)
5. 🔄 Boutons Copy/Share sur messages
6. 🔄 Export menu fonctionnel
7. 🔄 Share link generation

### Phase 3: Avancé (Nice to have)
8. 🔄 Filters dialog
9. 🔄 Templates dialog
10. 🔄 Settings dialog

---

## Notes d'Implémentation

### LocalStorage Structure
```json
{
  "everdian_conversations": [
    {
      "id": "conv-123456789",
      "title": "Cyberattacks in France...",
      "messages": [...],
      "createdAt": "2025-11-25T20:00:00Z",
      "updatedAt": "2025-11-25T21:30:00Z"
    }
  ]
}
```

### Share Link Format
```
https://app.com/?share=base64EncodedConversation
```

### Export Formats

**JSON:**
```json
{
  "id": "conv-123",
  "title": "...",
  "messages": [...]
}
```

**CSV:**
```csv
Role,Content,Timestamp,Valid,Confidence
user,"Show me events...",2025-11-25T20:00:00Z,N/A,N/A
assistant,"Here are the events...",2025-11-25T20:00:05Z,true,0.95
```

---

## Tests à Effectuer

- [ ] Sauvegarder conversation automatiquement
- [ ] Charger conversation depuis historique
- [ ] Supprimer conversation
- [ ] Export JSON
- [ ] Export CSV
- [ ] Générer share link
- [ ] Charger depuis share link
- [ ] Copier message
- [ ] Appliquer filtres
- [ ] Utiliser template
- [ ] Modifier settings

---

## Prochaines Étapes Immédiates

1. Créer le hook `useConversations`
2. Mettre à jour `chat-area.tsx` pour sauvegarder auto
3. Mettre à jour `sidebar` pour afficher historique réel
4. Ajouter boutons Copy/Share/Export fonctionnels

Temps estimé: 30-45 minutes pour Phase 1 + 2
