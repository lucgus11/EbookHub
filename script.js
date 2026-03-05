const API_URL = "https://ton-api-deployee.com"; // Remplace par ton URL finale

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const status = document.getElementById('uploadStatus');
    
    if (!fileInput.files[0]) return alert("Choisis un fichier !");

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    status.innerText = "Chargement...";

    const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'x-api-key': 'TA_CLE_API_CHOISIE' }, // Ta clé de sécurité
        body: formData
    });

    const data = await response.json();
    status.innerHTML = `Fichier prêt ! Code : <strong>${data.key}</strong>`;
}

async function downloadFile() {
    const code = document.getElementById('fileCode').value.toUpperCase();
    window.location.href = `${API_URL}/download/${code}`;
}
