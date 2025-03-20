
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
const joinTeam = require('../controller/joinTeam');
const showTeams = require("../controller/show team");
const championController = require('../controller/ChampionController');
const dataCollectionService = require("../controller/DataCollectionService");
const tournamentController = require("../controller/tournament");
const createTournament = require("../controller/createTournament");
const showTournaments = require("../controller/showTournaments");
const joinTournament = require ("../controller/joinTournament")

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

const DATA_DRAGON_URL = 'https://ddragon.leagueoflegends.com/cdn/15.3.1/data/fr_FR/champion.json';

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
// Ajoutez ces routes à votre fichier routes.js existant


// Route pour obtenir les données d'un champion
router.get("/champion/:championId", async (req, res) => {
  try {
    const { championId } = req.params

    const championData = await championController.getChampionData(championId)
    res.json(championData)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Route pour obtenir les statistiques d'un champion
router.get("/champion/:championId/stats", async (req, res) => {
  try {
    const { championId } = req.params

    const stats = await championController.getChampionStats(championId)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Route pour obtenir les builds recommandés pour un champion
router.get("/champion/:championId/builds", async (req, res) => {
  try {
    const { championId } = req.params
    const { role } = req.query

    const builds = await championController.getRecommendedBuilds(championId, role || "MID")
    res.json(builds)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Route pour forcer l'analyse des builds d'un champion (utile pour mettre à jour les données)
router.get("/champion/:championId/analyze", async (req, res) => {
  try {
    const { championId } = req.params
    const { role } = req.query

    // Analyser les builds des meilleurs joueurs
    const analyzedData = await dataCollectionService.analyzeTopPlayerBuilds(championId, role || "MID")

    // Sauvegarder les données
    if (!analyzedData.error) {
      await dataCollectionService.saveAnalyzedData(championId, role || "MID", analyzedData)
    }

    res.json(analyzedData)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Route pour obtenir la liste de tous les champions
router.get("/champions", async (req, res) => {
  try {
    const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/15.3.1/data/fr_FR/champion.json`)

    const champions = Object.values(response.data.data).map((champion) => ({
      id: champion.key,
      name: champion.name,
      image: `https://ddragon.leagueoflegends.com/cdn/15.3.1/img/champion/${champion.image.full}`,
      tags: champion.tags,
    }))

    res.json(champions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Modifier la route pour les recommandations
router.get("/recommend/:summonerName/:championId/:role", async (req, res) => {
  try {
    const { summonerName, championId, role } = req.params
    router.get("/api/controller/tournament", async (req, res) => {
      try {
        res.json({message:"success"});
        // await tournamentController(req, res);
      } catch (error) {
        console.error("Error in tournamentController:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Utiliser le RecommendationController pour générer des recommandations
    const recommendationController = require("../controller/RecommendationController")
    const recommendations = await recommendationController.generateRecommendations(summonerName, championId, role)

    res.json(recommendations)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post("/api/controller/create-tournament", async (req, res) => {
  try{
    await createTournament(req, res)
  } catch (error) {
    console.error("Error ", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/controller/show-tournament", async (req, res) => {
  try{
    console.log("route was called")
    await showTournaments(req, res);
  } catch (error){
    console.error("Error in tournamentController:", error);
    res.status(500).json({ error: error.message });
  }
})

router.get("/api/controller/show-teams", async (req, res) => {
  try{
    console.log("route was called")
    await showTeams(req, res);
  } catch (error){
    console.error("Error in teamController:", error);
    res.status(500).json({ error: error.message });
  }
})

router.post("/api/controller/join-tournament", async (req, res) =>{
  try{
    await joinTournament(req, res)
  }catch (error){
    console.error(error)
  }
});

router.post('/api/controller/join-team', async (req, res) => {
  try {
    await joinTeam(req, res); // Ensure the controller is invoked correctly
  } catch (error) {
    console.error("Error in team route:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})


router.get('/api/matches', async (req, res) => {
  try {
    const { puuid, page = 0, count = 5 } = req.query;

    if (!puuid) {
      return res.status(400).json({ error: 'PUUID requis' });
    }

    // Récupérer les IDs de match
    const start = parseInt(page) * parseInt(count);
    const matchIds = await getMatchIds(puuid, start, parseInt(count));

    if (matchIds.length === 0) {
      return res.json({ matches: [] });
    }

    // Récupérer les détails de chaque match
    const matchPromises = matchIds.map(id => getMatchDetails(id));
    const matches = await Promise.all(matchPromises);

    // Filtrer les matchs null (en cas d'erreur)
    const validMatches = matches.filter(match => match !== null);

    res.json({ matches: validMatches });
  } catch (error) {
    console.error('Erreur lors de la récupération des matchs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des matchs' });
  }
});

// Fonctions auxiliaires pour l'API
async function getMatchIds(puuid, start = 0, count = 10) {
  try {
    const response = await axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
        {
          headers: {
            'X-Riot-Token': API_KEY
          }
        }
    );

    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des IDs de match:', error);
    return [];
  }
}

async function getMatchDetails(matchId) {
  try {
    const response = await axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`,
        {
          headers: {
            'X-Riot-Token': API_KEY
          }
        }
    );

    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des détails du match ${matchId}:`, error);
    return null;
  }
}



module.exports = router




