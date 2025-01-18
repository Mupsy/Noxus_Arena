// Importation des modules nécessaires
const http = require('http');

const express = require("express");
const app = express();
const session = require("express-session")

const path = require("path");
const con = require('./models/ConnectToDatabase');
const routesApi = require("./api/routes");



const PORT = 3000;
app.use(session({
  secret: 'votre-clé-secrète',
  resave: false,
  saveUninitialized: true,
  cookie: {
      secure: false,  // Assurez-vous que secure est à `false` en développement (sans HTTPS)
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000  // Durée de vie du cookie (1 jour)
  }
}));
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));
app.use(routesApi);


// Définir une route de base
app.get('/', (req, res) => {console.log('Session après la connexion : ', req.session);
  res.sendFile(path.join(__dirname,'public','home.html'));
});

app.get("/login", async (req, res) => {console.log('Session avant la connexion : ', req.session);
  res.sendFile(path.join(__dirname,'public', 'login.html'));
});

app.get('/session-info', (req, res) => {
  if (req.session.user && req.session.user.isLoggedIn) {
      res.json({
          success: true,
          user: req.session.user
      });
  } else {
      res.json({
          success: false,
          message: 'Aucun utilisateur connecté'
      });
  }
});


app.get("/register", async (req, res) => {
  res.sendFile(path.join(__dirname,'public', 'register.html'));
});


app.get('/profile/masteries', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile_masteries.html'));
});

app.get('/tournament', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tournament.html'));
})

app.get('/tournament', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tournament.html'));
})

app.get('/teams', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teams.html'));
})

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});


