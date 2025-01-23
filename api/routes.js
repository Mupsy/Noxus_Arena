
const express = require('express');
const router = express.Router();
const axios  = require("axios");
require("dotenv").config();
const bodyParser = require('body-parser');

// Importer ton fichier de routes (controller/login.js)
const loginController = require('../controller/login');
const registerController = require('../controller/register');
const LoLInfoController = require ('../controller/LoLInfoController');
const teamController = require('../controller/teams');
const teamInfoController = require('../controller/fetchDbInfo');


const API_KEY = process.env.RIOT_API_KEY;
const RIOT_URL = "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/";

router.use(bodyParser.urlencoded({ extended: true }));
router.get('/api/user/:username/:tagline', async (req, res) => {
    console.log(req.params);
    console.log(API_KEY);
    const response = await axios.get(RIOT_URL + req.params.username + "/" + req.params.tagline, {
      headers:{
        'X-Riot-Token': API_KEY,
      }
    });
    res.json(response.data);
  });

router.post("/api/lol/user/:id", async (req, res) => {
  req.body = req.params;

  LoLInfoController(req ,res);
});



// Définir la route pour la connexion
router.post('/api/controller/login', (req, res) => {
    // Ajouter les paramètres de query à la requête
    const { email, password } = req.body; 
     // Utiliser req.query pour accéder aux paramètres de la query string
    req.body.email = email;  // Ajouter username dans req.body
    req.body.password = password;  // Ajouter password dans req.body
    loginController(req, res);  // Appeler votre contrôleur en passant la requête et la réponse
});

router.post('/api/controller/register', (req, res) => {
  // Ajouter les paramètres de query à la requête
  const { username, password, email, tagline } = req.body;  // Utiliser req.query pour accéder aux paramètres de la query string
  req.body.username = username;  // Ajouter username dans req.body
  req.body.password = password; 
  req.body.tagline = tagline;
  req.body.email = email; // Ajouter password dans req.body

  registerController(req, res);  // Appeler votre contrôleur en passant la requête et la réponse
});

router.post('/api/controller/team', async (req, res) => {
  try {
    await teamController(req, res); // Ensure the controller is invoked correctly
  } catch (error) {
    console.error("Error in team route:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})

router.post('/api/controller/fetchDbInfo', async (req, res) => {
  try{
    await teamInfoController(req, res);
  } catch(error){
    console.error("Error in team route:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})
  
const DATA_DRAGON_URL = 'https://ddragon.leagueoflegends.com/cdn/15.1.1/data/fr_FR/champion.json';
  
router.get('/api/user/:username/:tagline/masteries', async (req, res) => {
    try {
      // Récupérer les informations du joueur
      const response = await axios.get(
        `${RIOT_URL}${req.params.username}/${req.params.tagline}`,
        {
          headers: {
            'X-Riot-Token': API_KEY,
          },
        }
      );
  
      const puuid = response.data.puuid;
  
      // Construire l'URL pour les maîtrises
      const MASTERIES_URL = `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;
      const masteriesResponse = await axios.get(MASTERIES_URL, {
        headers: {
          'X-Riot-Token': API_KEY,
        },
      });
  
      // Récupérer les données Data Dragon
      const dataDragonResponse = await axios.get(DATA_DRAGON_URL);
      const championsData = dataDragonResponse.data.data;
      
      // Récupérer un dictionnaire pour mappe les clés de champions à leurs ID
      const keyToChampion = Object.values(championsData).reduce((acc, champion) => {
        acc[champion.key] = champion; // Mappe champion.key (id numérique) aux données du champion
        return acc;
      }, {});
  
      const topMasteries = masteriesResponse.data.map((mastery) => {
        const championKey = mastery.championId.toString(); // Utilisation de championId comme clé pour trouver le champion dans championsData
        const championData = keyToChampion[championKey]; // Récupérer le champion à partir de la clé
  
        if (!championData) {
          console.warn(`Données manquantes pour le champion avec ID: ${championKey}`);
          return null; // Ignorer cette entrée si les données du champion sont manquantes
        }
  
        // Extraire les informations du champion
        const championName = championData.name || 'Unknown'; // Nom du champion
        const championId = championData.id || 'Unknown'; // ID du champion
        const championKeyVal = championData.key || 'Unknown'; // Clé numérique du champion
  
        return {
          championId: championId,
          championName: championName,
          championKey: championKeyVal,
          championLevel: mastery.championLevel,
          championPoints: mastery.championPoints,
          lastPlayTime: new Date(mastery.lastPlayTime).toLocaleDateString('fr-FR'),
          chestGranted: mastery.chestGranted,
          tokensEarned: mastery.tokensEarned,
        };
      }).filter(item => item !== null); // Filtrer les entrées où championData est manquant
  
      // Envoyer les résultats dans la réponse
      const result = {
        championMasteries: topMasteries,
      };
  
      res.json(result);
  
    } catch (error) {
      // Gérer les erreurs
      if (error.response) {
        console.error('Erreur API:', error.response.data);
        res.status(error.response.status).json({
          message: error.response.data.status.message || 'Erreur avec l\'API Riot.',
        });
      } else {
        console.error('Erreur inconnue:', error);
        res.status(500).json({
          message: 'Erreur serveur lors de la communication avec l’API Riot ou Data Dragon.',
        });
      }
    }
  });


module.exports = router;