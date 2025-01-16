// Importation des modules nécessaires
const http = require('http');


// Définition de la fonction de callback pour le serveur HTTP
const server = http.createServer((req, res) => {
  // Envoi de la réponse HTTP avec le code 200 (OK) et le contenu textuel
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello, World!\n');
});

// Définition du port sur lequel le serveur écoutera les requêtes
const port = 3000;

// Démarrage du serveur en écoutant le port spécifié
server.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
