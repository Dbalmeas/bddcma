# Configuration Voxtral - Transcription Audio

## Problème Actuel

L'API de transcription retourne un fallback car **Mistral AI ne propose pas encore d'endpoint direct pour la transcription audio**. Voxtral est un modèle séparé qui nécessite une intégration spécifique.

## Solutions Disponibles

### Option 1: Utiliser Web Speech API (Recommandé - Déjà Fonctionnel)

**✅ Aucune configuration nécessaire** - Fonctionne directement dans le navigateur !

Le fallback vers Web Speech API est automatique et fonctionne dans :
- Chrome/Edge (recommandé)
- Safari (iOS 14.5+)
- Firefox (avec limitations)

**Comment ça marche :**
- Cliquez sur le bouton microphone
- Autorisez l'accès au micro si demandé
- Parlez votre question
- La transcription apparaît automatiquement

### Option 2: Configurer OpenAI Whisper (Optionnel)

Pour une meilleure précision, vous pouvez utiliser OpenAI Whisper :

1. Obtenez une clé API OpenAI : https://platform.openai.com/api-keys
2. Ajoutez dans votre `.env.local` :
```env
OPENAI_API_KEY=sk-votre-cle-api-openai
```
3. L'API utilisera automatiquement Whisper au lieu de Web Speech API

**Avantages :**
- Meilleure précision de transcription
- Support de plus de langues
- Fonctionne hors navigateur

**Coût :** ~$0.006 par minute d'audio

### Option 3: Attendre Mistral Audio API

Mistral AI pourrait ajouter un endpoint audio dans le futur. Quand ce sera disponible :
- L'API utilisera automatiquement la clé `MISTRAL_API_KEY` existante
- Aucune modification de code nécessaire

## Configuration Actuelle

Votre `.env.local` devrait contenir :
```env
MISTRAL_API_KEY=votre-cle-mistral
# Optionnel pour Whisper :
# OPENAI_API_KEY=votre-cle-openai
```

## Dépannage

### Le microphone ne fonctionne pas

1. Vérifiez les permissions du navigateur pour le microphone
2. Utilisez HTTPS (requis pour l'accès au micro)
3. Testez dans Chrome/Edge (meilleur support)

### Transcription imprécise

- Utilisez un environnement calme
- Parlez clairement et pas trop vite
- Utilisez Web Speech API en français pour de meilleurs résultats
- Considérez OpenAI Whisper pour une meilleure précision

## Pourquoi 503 au lieu d'erreur ?

L'API retourne un statut 200 avec `fallback: true` pour indiquer que :
- Ce n'est pas une erreur fatale
- Le système de fallback (Web Speech API) est disponible
- L'utilisateur peut continuer à utiliser la reconnaissance vocale


