# Création des icônes PWA pour CMA CGM

## Instructions pour créer les icônes PWA

Les icônes doivent être générées à partir des logos CMA CGM disponibles dans `/public/`.

### Tailles requises:
- `icon-192x192.png` - 192x192 pixels (minimum)
- `icon-512x512.png` - 512x512 pixels (recommandé)

### Méthode 1: En ligne (Recommandé)
1. Allez sur https://realfavicongenerator.net/ ou https://www.pwabuilder.com/imageGenerator
2. Uploadez `cma-logo.png` ou `cma-logo-white.png`
3. Téléchargez les icônes générées
4. Placez-les dans `/public/` avec les noms `icon-192x192.png` et `icon-512x512.png`

### Méthode 2: Avec ImageMagick (ligne de commande)
```bash
# Depuis le dossier public/
magick cma-logo.png -resize 192x192 -background white -gravity center -extent 192x192 icon-192x192.png
magick cma-logo.png -resize 512x512 -background white -gravity center -extent 512x512 icon-512x512.png
```

### Méthode 3: Avec Python/Pillow
```python
from PIL import Image

# Pour l'icône 192x192
img = Image.open('cma-logo.png')
img = img.resize((192, 192), Image.Resampling.LANCZOS)
img.save('icon-192x192.png')

# Pour l'icône 512x512
img = Image.open('cma-logo.png')
img = img.resize((512, 512), Image.Resampling.LANCZOS)
img.save('icon-512x512.png')
```

### Notes importantes:
- Les icônes doivent avoir un fond transparent ou blanc
- Assurez-vous que le logo est bien visible sur fond clair et sombre
- Pour le mode sombre, vous pouvez utiliser `cma-logo-white.png`

### Vérification
Une fois les icônes créées, vérifiez qu'elles sont accessibles:
- `http://localhost:3000/icon-192x192.png`
- `http://localhost:3000/icon-512x512.png`


