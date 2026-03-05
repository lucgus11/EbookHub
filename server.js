const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuration du stockage temporaire
const upload = multer({ dest: 'uploads/' });

// Base de données en mémoire (s'efface au redémarrage du serveur)
const fileDatabase = {};

// Autoriser le frontend à lire l'API (CORS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");
    next();
});

// Route d'accueil pour vérifier que le serveur vit
app.get('/', (req, res) => {
    res.send("Serveur Send-App opérationnel !");
});

// 1. ROUTE UPLOAD
app.post('/upload', upload.single('file'), (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    // Vérification de la clé API via variable d'environnement
    if (apiKey !== process.env.MY_SECRET_KEY) {
        return res.status(403).json({ error: "Clé API invalide" });
    }

    if (!req.file) return res.status(400).json({ error: "Aucun fichier" });

    // Générer un code court de 5 caractères (ex: 8F2DE)
    const fileId = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    fileDatabase[fileId] = {
        path: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
    };

    console.log(`Fichier reçu : ${req.file.originalname} -> Code : ${fileId}`);
    res.json({ key: fileId });
});

// 2. ROUTE TÉLÉCHARGEMENT
app.get('/download/:key', (req, res) => {
    const fileData = fileDatabase[req.params.key.toUpperCase()];

    if (fileData && fs.existsSync(fileData.path)) {
        res.download(fileData.path, fileData.originalName, (err) => {
            if (!err) {
                // Supprimer le fichier après le téléchargement pour rester propre
                fs.unlinkSync(fileData.path);
                delete fileDatabase[req.params.key];
            }
        });
    } else {
        res.status(404).send("Code invalide ou fichier expiré.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
