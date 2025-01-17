// Importation des modules nécessaires
const http = require('http');

const express = require("express");
const app = express();

const path = require("path");
const con = require('./models/ConnectToDatabase');
const routesApi = require("./api/routes");



const PORT = 3000;

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));
app.use(routesApi);
// Définir une route de base
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public','home.html'));
});

app.get("/login", async (req, res) => {
  res.sendFile(path.join(__dirname,'public', 'login.html'));
});


app.get("/register", async (req, res) => {
  res.sendFile(path.join(__dirname,'public', 'register.html'));
});





app.get('/profile/masteries', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile_masteries.html'));
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});


