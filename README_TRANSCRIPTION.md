# 🎤 Configuration de la Transcription Audio

## Alternatives à Voxtral

### Option 1: AssemblyAI (⭐ Recommandé - GRATUIT)

**Avantages :**
- ✅ Gratuit jusqu'à 5 heures par mois
- ✅ Très précis (99%+ de précision)
- ✅ Support du français
- ✅ API simple et rapide
- ✅ Pas de carte de crédit requise pour commencer

**Configuration :**
1. Créez un compte gratuit : https://www.assemblyai.com/
2. Obtenez votre clé API dans le dashboard
3. Ajoutez dans `.env.local` :
```env
ASSEMBLYAI_API_KEY=votre-cle-assemblyai
```

**Coût :** Gratuit jusqu'à 5h/mois, puis $0.00025/seconde

---

### Option 2: Deepgram (⭐ Excellent - GRATUIT)

**Avantages :**
- ✅ Gratuit jusqu'à 12,000 minutes par mois
- ✅ Très rapide (temps réel possible)
- ✅ Support du français
- ✅ Modèle Nova-2 très précis

**Configuration :**
1. Créez un compte gratuit : https://deepgram.com/
2. Obtenez votre clé API
3. Ajoutez dans `.env.local` :
```env
DEEPGRAM_API_KEY=votre-cle-deepgram
```

**Coût :** Gratuit jusqu'à 12k minutes/mois, puis $0.0043/minute

---

### Option 3: OpenAI Whisper

**Avantages :**
- ✅ Très précis
- ✅ Support de nombreuses langues
- ✅ Modèle open-source

**Configuration :**
1. Obtenez une clé OpenAI : https://platform.openai.com/api-keys
2. Ajoutez dans `.env.local` :
```env
OPENAI_API_KEY=sk-votre-cle-openai
```

**Coût :** ~$0.006 par minute

---

### Option 4: Google Speech-to-Text

**Avantages :**
- ✅ Très précis
- ✅ Support de nombreuses langues
- ✅ Intégration Google Cloud

**Configuration :**
1. Activez Google Cloud Speech-to-Text API
2. Créez une clé API
3. Ajoutez dans `.env.local` :
```env
GOOGLE_SPEECH_API_KEY=votre-cle-google
```

**Coût :** ~$0.006 par 15 secondes

---

## Ordre de Priorité

L'API essaie dans cet ordre :
1. **AssemblyAI** (si configuré)
2. **Deepgram** (si configuré)
3. **OpenAI Whisper** (si configuré)
4. **Google Speech-to-Text** (si configuré)
5. **Web Speech API** (fallback automatique - fonctionne sans configuration)

## Recommandation

**Pour commencer rapidement :** Utilisez **AssemblyAI** (gratuit, facile à configurer)

**Pour un usage intensif :** Utilisez **Deepgram** (plus de minutes gratuites)

**Pour la meilleure précision :** Utilisez **OpenAI Whisper** ou **Google Speech-to-Text**


