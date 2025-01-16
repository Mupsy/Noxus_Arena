// Importation des modules nécessaires
const http = require('http');
const axios  = require("axios");
require("dotenv").config();

const API_KEY = process.env.RIOT_API_KEY;
const RIOT_URL = "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/";




// Définition de la fonction de callback pour le serveur HTTP
const server = http.createServer(async (req, res) => {
  // Extraction du pseudo depuis l'URL
  const urlParts = req.url.split('/');
  const pseudo = urlParts[urlParts.length - 2];
  const tagline = urlParts[urlParts.length - 1];  // On récupère le pseudo dans l'URL

  // Vérifier si un pseudo a été fourni
  if (!pseudo && !tagline) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Veuillez fournir un pseudo et une tagline dans l\'URL.');
    return;
  }
  res.writeHead(400, { 'Content-Type': 'text/plain' });
  res.end("" + RIOT_URL + "/" + pseudo + "/" + tagline);

  /*try {
    // Appel à l'API Riot pour récupérer les informations du compte
    const response = await axios.get(`${RIOT_URL}/${pseudo}/${tagline}`, {
      headers: {
        'X-Riot-Token': API_KEY
    });

    // Retour des informations du joueur au format JSON
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));
  } catch (error) {
    // En cas d'erreur, on renvoie une erreur
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erreur lors de la récupération des informations Riot.');
  }*/
});

// Démarrage du serveur sur le port 3000
const port = 3000;
server.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});