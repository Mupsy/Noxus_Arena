const axios = require('axios');
const con = require('../models/ConnectToDatabase');

// Utiliser la clé d'API fournie
const RIOT_API_KEY = process.env.RIOT_API_KEY || 'RGAPI-bed67140-896f-478c-ad57-9ba668f1e82c';

// Constantes pour les régions
const REGION = 'europe'; // Pour les matchs (europe, asia, americas)
const PLATFORM = 'euw1';  // Pour les données de joueur (euw1, eun1, na1, etc.)

// Fonction pour gérer les limites de taux d'API
let lastRequestTime = 0;
const REQUEST_INTERVAL = 1200; // 1.2 secondes entre les requêtes (pour respecter la limite de 20 req/sec)

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
}

// Fonction pour récupérer les informations du joueur à partir de l'ID utilisateur
async function getSummonerByUserId(userId) {
  return new Promise((resolve, reject) => {
    con.query('SELECT * FROM lol_summoner WHERE User_ID = ?', [userId], (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des informations du joueur:', err);
        reject(err);
        return;
      }
      
      if (results.length === 0) {
        reject(new Error('Aucune information de joueur trouvée pour cet utilisateur'));
        return;
      }
      
      resolve(results[0]);
    });
  });
}

// Fonction pour récupérer les IDs de match d'un joueur
async function getMatchIds(puuid, start = 0, count = 10) {
  await rateLimit();
  
  try {
    const response = await axios.get(
      `https://${REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des IDs de match:', error);
    return [];
  }
}

// Fonction pour récupérer les détails d'un match
async function getMatchDetails(matchId) {
  await rateLimit();
  
  try {
    const response = await axios.get(
      `https://${REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des détails du match ${matchId}:`, error);
    return null;
  }
}

// Fonction principale pour récupérer l'historique des matchs
async function getMatchHistory(userId, page = 0, count = 5) {
  try {
    // Récupérer les informations du joueur
    const summoner = await getSummonerByUserId(userId);
    
    if (!summoner || !summoner.Summoner_PUUID) {
      throw new Error('PUUID du joueur non trouvé');
    }
    
    // Récupérer les IDs de match
    const start = page * count;
    const matchIds = await getMatchIds(summoner.Summoner_PUUID, start, count);
    
    if (matchIds.length === 0) {
      return { matches: [] };
    }
    
    // Récupérer les détails de chaque match
    const matchPromises = matchIds.map(id => getMatchDetails(id));
    const matches = await Promise.all(matchPromises);
    
    // Filtrer les matchs null (en cas d'erreur)
    const validMatches = matches.filter(match => match !== null);
    
    return { matches: validMatches };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des matchs:', error);
    throw error;
  }
}

// Fonction pour récupérer les statistiques récentes
async function getRecentStats(userId, count = 10) {
  try {
    // Récupérer l'historique des matchs
    const { matches } = await getMatchHistory(userId, 0, count);
    
    if (matches.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        kdaAvg: 0,
        mostPlayedChampions: []
      };
    }
    
    // Récupérer les informations du joueur
    const summoner = await getSummonerByUserId(userId);
    
    // Calculer les statistiques
    let wins = 0;
    let kills = 0;
    let deaths = 0;
    let assists = 0;
    const championCounts = {};
    
    matches.forEach(match => {
      const playerData = match.info.participants.find(p => p.puuid === summoner.Summoner_PUUID);
      
      if (playerData) {
        if (playerData.win) wins++;
        
        kills += playerData.kills;
        deaths += playerData.deaths;
        assists += playerData.assists;
        
        const championId = playerData.championId;
        championCounts[championId] = (championCounts[championId] || 0) + 1;
      }
    });
    
    // Calculer les champions les plus joués
    const mostPlayedChampions = Object.entries(championCounts)
      .map(([championId, count]) => ({ championId: parseInt(championId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return {
      totalGames: matches.length,
      wins,
      losses: matches.length - wins,
      winRate: Math.round((wins / matches.length) * 100),
      kdaAvg: deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(2),
      mostPlayedChampions
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques récentes:', error);
    throw error;
  }
}

module.exports = {
  getMatchHistory,
  getRecentStats
};