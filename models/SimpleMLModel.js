/**
 * Modèle ML simplifié qui n'utilise pas TensorFlow
 * Cette implémentation utilise des algorithmes statistiques simples
 */
class SimpleMLModel {
    constructor() {
      this.initialized = true;
      this.weights = {
        kills: 0.2,
        deaths: -0.3,
        assists: 0.15,
        damageDealt: 0.1,
        damageTaken: -0.05,
        goldEarned: 0.1,
        visionScore: 0.05,
        cs: 0.1,
        gameDuration: -0.02,
        position: {
          TOP: 0.05,
          JUNGLE: 0.02,
          MID: 0.08,
          ADC: 0.06,
          SUPPORT: 0.03
        }
      };
    }
  
    // Pas besoin d'initialisation complexe
    async initialize() {
      console.log("Modèle ML simplifié initialisé");
      return true;
    }
  
    // Entraînement simplifié basé sur des statistiques
    async train(data) {
      console.log(`Entraînement sur ${data.length} échantillons`);
      
      // Calculer les moyennes pour les parties gagnées et perdues
      const winMatches = data.filter(match => match.win);
      const loseMatches = data.filter(match => !match.win);
      
      if (winMatches.length === 0 || loseMatches.length === 0) {
        console.log("Pas assez de données pour l'entraînement");
        return false;
      }
      
      // Calculer les moyennes pour chaque métrique
      const winStats = this.calculateAverageStats(winMatches);
      const loseStats = this.calculateAverageStats(loseMatches);
      
      // Ajuster les poids en fonction des différences
      this.adjustWeights(winStats, loseStats);
      
      console.log("Entraînement terminé, poids ajustés");
      return true;
    }
  
    // Calculer les statistiques moyennes pour un ensemble de parties
    calculateAverageStats(matches) {
      const stats = {
        kills: 0,
        deaths: 0,
        assists: 0,
        damageDealt: 0,
        damageTaken: 0,
        goldEarned: 0,
        visionScore: 0,
        cs: 0,
        gameDuration: 0,
        positions: {
          TOP: 0,
          JUNGLE: 0,
          MID: 0,
          ADC: 0,
          SUPPORT: 0
        }
      };
      
      matches.forEach(match => {
        stats.kills += match.kills;
        stats.deaths += match.deaths;
        stats.assists += match.assists;
        stats.damageDealt += match.totalDamageDealt;
        stats.damageTaken += match.totalDamageTaken;
        stats.goldEarned += match.goldEarned;
        stats.visionScore += match.visionScore;
        stats.cs += match.totalMinionsKilled;
        stats.gameDuration += match.gameDuration;
        
        // Incrémenter le compteur pour la position
        if (match.teamPosition) {
          stats.positions[match.teamPosition] = (stats.positions[match.teamPosition] || 0) + 1;
        }
      });
      
      // Calculer les moyennes
      const count = matches.length;
      return {
        kills: stats.kills / count,
        deaths: stats.deaths / count,
        assists: stats.assists / count,
        damageDealt: stats.damageDealt / count,
        damageTaken: stats.damageTaken / count,
        goldEarned: stats.goldEarned / count,
        visionScore: stats.visionScore / count,
        cs: stats.cs / count,
        gameDuration: stats.gameDuration / count,
        positions: stats.positions
      };
    }
  
    // Ajuster les poids en fonction des différences entre parties gagnées et perdues
    adjustWeights(winStats, loseStats) {
      // Facteur d'apprentissage
      const learningRate = 0.01;
      
      // Ajuster les poids en fonction des différences
      this.weights.kills += learningRate * (winStats.kills - loseStats.kills);
      this.weights.deaths += learningRate * (winStats.deaths - loseStats.deaths);
      this.weights.assists += learningRate * (winStats.assists - loseStats.assists);
      this.weights.damageDealt += learningRate * (winStats.damageDealt - loseStats.damageDealt);
      this.weights.damageTaken += learningRate * (winStats.damageTaken - loseStats.damageTaken);
      this.weights.goldEarned += learningRate * (winStats.goldEarned - loseStats.goldEarned);
      this.weights.visionScore += learningRate * (winStats.visionScore - loseStats.visionScore);
      this.weights.cs += learningRate * (winStats.cs - loseStats.cs);
      this.weights.gameDuration += learningRate * (winStats.gameDuration - loseStats.gameDuration);
      
      // Ajuster les poids des positions
      for (const position in this.weights.position) {
        const winCount = winStats.positions[position] || 0;
        const loseCount = loseStats.positions[position] || 0;
        
        if (winCount + loseCount > 0) {
          const winRate = winCount / (winCount + loseCount);
          this.weights.position[position] += learningRate * (winRate - 0.5);
        }
      }
    }
  
    // Prédire la probabilité de victoire
    async predict(matchData) {
      // Normaliser les données
      const normalizedData = this.normalizeData(matchData);
      
      // Calculer le score
      let score = 0;
      
      score += this.weights.kills * normalizedData.kills;
      score += this.weights.deaths * normalizedData.deaths;
      score += this.weights.assists * normalizedData.assists;
      score += this.weights.damageDealt * normalizedData.damageDealt;
      score += this.weights.damageTaken * normalizedData.damageTaken;
      score += this.weights.goldEarned * normalizedData.goldEarned;
      score += this.weights.visionScore * normalizedData.visionScore;
      score += this.weights.cs * normalizedData.cs;
      score += this.weights.gameDuration * normalizedData.gameDuration;
      
      // Ajouter le poids de la position
      if (matchData.teamPosition && this.weights.position[matchData.teamPosition]) {
        score += this.weights.position[matchData.teamPosition];
      }
      
      // Convertir le score en probabilité (sigmoid)
      const probability = 1 / (1 + Math.exp(-score));
      
      return probability;
    }
  
    // Normaliser les données pour la prédiction
    normalizeData(matchData) {
      // Valeurs moyennes typiques pour normalisation
      const avgStats = {
        kills: 5,
        deaths: 5,
        assists: 7,
        damageDealt: 20000,
        damageTaken: 20000,
        goldEarned: 10000,
        visionScore: 20,
        cs: 150,
        gameDuration: 25 * 60 // 25 minutes en secondes
      };
      
      return {
        kills: matchData.kills / avgStats.kills,
        deaths: matchData.deaths / avgStats.deaths,
        assists: matchData.assists / avgStats.assists,
        damageDealt: matchData.totalDamageDealt / avgStats.damageDealt,
        damageTaken: matchData.totalDamageTaken / avgStats.damageTaken,
        goldEarned: matchData.goldEarned / avgStats.goldEarned,
        visionScore: matchData.visionScore / avgStats.visionScore,
        cs: matchData.totalMinionsKilled / avgStats.cs,
        gameDuration: matchData.gameDuration / avgStats.gameDuration
      };
    }
  
    // Sauvegarder le modèle (version simplifiée)
    async saveModel(path) {
      console.log(`Modèle sauvegardé (simulation) à ${path}`);
      return true;
    }
  
    // Charger un modèle (version simplifiée)
    async loadModel(path) {
      console.log(`Modèle chargé (simulation) depuis ${path}`);
      return true;
    }
  }
  
  module.exports = new SimpleMLModel();
  