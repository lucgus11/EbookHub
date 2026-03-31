# 📚 EbookHub — File Bridge

> PWA de transfert, conversion et gestion d'ebooks entre liseuse, téléphone et ordinateur.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ebookhub)

---

## 🚀 Fonctionnalités

### 📁 Gestion de fichiers
- Glisser-déposer de fichiers (`EPUB`, `KEPUB`, `PDF`, `MOBI`, `AZW3`, `CBZ`, `CBR`, `TXT`, `DOCX`, `FB2`, `DJVU`, `LIT`)
- Bibliothèque locale avec recherche, filtre par format, tri
- Extraction automatique des métadonnées (titre, auteur, couverture)

### ☁ Stockage MEGA
- Upload/download via l'API MEGA (dossier `EbookHub/` dédié)
- Liens de partage MEGA permanents
- Gestion des fichiers distants

### ⇄ Transfert entre appareils
- **Code de partage 6 caractères** (ex: `AB3X7K`) pour transférer sans compte
- **QR Code** généré automatiquement
- Session avec durée configurable (1h → 7 jours)
- Page publique `/share/[code]` pour téléchargement direct

### ⚙ Outils de conversion & traitement

| Outil | Description |
|-------|-------------|
| **EPUB → KEPUB** | Conversion pour liseuses Kobo via `kepubify` |
| **PDF Crop Margins** | Suppression des marges via `pdfCropMargins` |
| **Fusionner PDFs** | Assemblage côté client avec `pdf-lib` |
| **Couper un PDF** | Extraction de plages de pages |
| **Compresser PDF** | Réduction de taille côté client |
| **Pivoter PDF** | Rotation de pages 90°/180°/270° |
| **Infos PDF** | Métadonnées, nombre de pages, taille |
| **Lire métadonnées EPUB** | Extraction OPF (titre, auteur, ISBN, couverture) |
| **Spine EPUB** | Table des matières / structure |
| **CBR → CBZ** | Conversion d'archives BD |
| **Nettoyer TXT** | Nettoyage textes OCR (sauts de ligne) |
| **Renommage en lot** | Pattern `{author} - {title}` |

### 📖 Métadonnées enrichies
- Recherche **Open Library** + **Google Books**
- Lookup par ISBN
- Édition manuelle de tous les champs
- Écriture dans le fichier EPUB

---

## 📦 Installation locale

```bash
git clone https://github.com/YOUR_USERNAME/ebookhub.git
cd ebookhub
npm install
cp .env.local.example .env.local
# Éditez .env.local avec vos identifiants MEGA
npm run dev
```

## ⚙ Variables d'environnement

```env
# .env.local
MEGA_EMAIL=votre@email.com
MEGA_PASSWORD=votre_mot_de_passe
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Déploiement Vercel

### 1. Fork & Push sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create ebookhub --public --push
```

### 2. Déployer sur Vercel

```bash
npm i -g vercel
vercel --prod
```

Ou via l'interface Vercel → New Project → importer depuis GitHub.

### 3. Variables d'environnement Vercel

Dans **Settings → Environment Variables** :

```
MEGA_EMAIL          = votre@email.com
MEGA_PASSWORD       = votre_mot_de_passe
NEXT_PUBLIC_APP_URL = https://votre-app.vercel.app
```

---

## 📱 Installation PWA

### Sur mobile (iOS/Android)
1. Ouvrez l'URL dans Safari/Chrome
2. Menu → **Ajouter à l'écran d'accueil**

### Sur desktop (Chrome/Edge)
- Cliquez l'icône ⊕ dans la barre d'adresse

---

## 🛠 Dépendances optionnelles (serveur)

Pour les outils avancés, installez sur votre serveur Vercel custom :

```bash
# kepubify (conversion EPUB → KEPUB pour Kobo)
# https://github.com/pgaskin/kepubify/releases
# Téléchargez le binaire et placez-le dans /usr/local/bin/kepubify

# pdfCropMargins (rognage automatique des marges PDF)
pip install pdfCropMargins

# Ou via Docker
docker run -p 3000:3000 votre-image
```

> Sans ces binaires, les outils côté serveur proposent un fallback avec message d'information.

---

## 🏗 Architecture

```
ebookhub/
├── src/
│   ├── pages/
│   │   ├── index.tsx          # Accueil + dépôt de fichiers
│   │   ├── library.tsx        # Bibliothèque complète
│   │   ├── transfer.tsx       # Envoi/réception par code
│   │   ├── tools.tsx          # Tous les outils
│   │   ├── settings.tsx       # Configuration
│   │   ├── share/[code].tsx   # Page de téléchargement public
│   │   └── api/
│   │       ├── mega/
│   │       │   ├── upload.ts  # Upload vers MEGA
│   │       │   └── files.ts   # Liste/suppression MEGA
│   │       ├── tools/
│   │       │   ├── kepubify.ts
│   │       │   └── pdf-crop.ts
│   │       ├── share.ts       # Sessions de partage
│   │       └── qr.ts          # Génération QR code
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── FileCard.tsx
│   │   ├── DropZone.tsx
│   │   ├── ConvertModal.tsx
│   │   ├── ShareModal.tsx
│   │   └── MetadataModal.tsx
│   ├── services/
│   │   ├── mega.ts            # Client MEGA
│   │   ├── epub.ts            # Lecture/écriture EPUB
│   │   ├── pdf.ts             # Traitement PDF client-side
│   │   └── metadata.ts        # Open Library + Google Books
│   ├── utils/
│   │   └── index.ts
│   └── types/
│       └── index.ts
└── public/
    ├── manifest.json
    └── icons/
```

---

## 📄 Licence

MIT — Libre d'utilisation et de modification.
