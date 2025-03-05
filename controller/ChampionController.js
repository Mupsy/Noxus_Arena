const axios = require("axios");
const { connectToDatabase } = require("../models/ConnectToDatabase");
const SimpleMLModel = require('../models/SimpleMLModel');
const DataCollectionService = require('./DataCollectionService');

class ChampionController {
  constructor() {
    this.riotApiKey = process.env.RIOT_API_KEY;
    this.baseUrl = "https://euw1.api.riotgames.com"; // Ajustez selon votre région
    this.ddragonVersion = "13.24.1"; // Mettre à jour selon la version actuelle
  }

  // Récupère les données d'un champion spécifique
  async getChampionData(championId) {
    try {
      // Récupérer les données du champion depuis Data Dragon
      const response = await axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/data/fr_FR/champion.json`
      );
      
      // Trouver le champion par son ID
      const champions = response.data.data;
      const champion = Object.values(champions).find(
        champ => champ.key === championId.toString()
      );
      
      if (!champion) {
        throw new Error(`Champion avec l'ID ${championId} non trouvé`);
      }
      
      // Récupérer les données détaillées du champion
      const detailResponse = await axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/data/fr_FR/champion/${champion.id}.json`
      );
      
      const championDetail = detailResponse.data.data[champion.id];
      
      return {
        id: championId,
        key: champion.id,
        name: champion.name,
        title: champion.title,
        image: `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/img/champion/${champion.image.full}`,
        splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`,
        loading: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champion.id}_0.jpg`,
        lore: championDetail.lore,
        blurb: champion.blurb,
        tags: champion.tags,
        stats: champion.stats,
        spells: championDetail.spells.map(spell => ({
          id: spell.id,
          name: spell.name,
          description: spell.description,
          image: `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/img/spell/${spell.image.full}`,
          cooldown: spell.cooldown,
          cost: spell.cost,
          range: spell.range
        })),
        passive: {
          name: championDetail.passive.name,
          description: championDetail.passive.description,
          image: `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/img/passive/${championDetail.passive.image.full}`
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données du champion:', error);
      throw error;
    }
  }

  // Récupère les statistiques globales d'un champion
  async getChampionStats(championId) {
    try {
      // Dans une implémentation réelle, vous récupéreriez ces données depuis une API externe
      // ou une base de données. Ici, nous simulons des données.
      
      // Simuler une requête à une API de statistiques
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Générer des statistiques aléatoires mais réalistes
      const winRate = 48 + Math.random() * 10; // Entre 48% et 58%
      const pickRate = 2 + Math.random() * 15; // Entre 2% et 17%
      const banRate = 1 + Math.random() * 20; // Entre 1% et 21%
      
      // Générer des statistiques par rôle
      const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
      const roleStats = {};
      
      roles.forEach(role => {
        const presence = Math.random() * 100;
        roleStats[role] = {
          presence: presence,
          winRate: 45 + Math.random() * 15,
          pickRate: presence * 0.8, // La pick rate est une partie de la presence
          banRate: presence * 0.2, // La ban rate est une partie de la presence
        };
      });
      
      // Trier les rôles par présence
      const sortedRoles = Object.entries(roleStats)
        .sort((a, b) => b[1].presence - a[1].presence)
        .map(([role]) => role);
      
      // Le rôle principal est celui avec la plus grande présence
      const primaryRole = sortedRoles[0];
      const secondaryRole = sortedRoles[1];
      
      return {
        overall: {
          winRate,
          pickRate,
          banRate,
          tier: this.calculateTier(winRate, pickRate),
          primaryRole,
          secondaryRole
        },
        roles: roleStats,
        counters: this.generateCounters(championId),
        synergies: this.generateSynergies(championId)
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du champion:', error);
      throw error;
    }
  }

  // Calcule le tier d'un champion basé sur son win rate et pick rate
  calculateTier(winRate, pickRate) {
    const score = (winRate - 50) * 2 + pickRate / 2;
    
    if (score > 15) return 'S+';
    if (score > 10) return 'S';
    if (score > 5) return 'A';
    if (score > 0) return 'B';
    if (score > -5) return 'C';
    return 'D';
  }

  // Génère des counters pour un champion (simulation)
  generateCounters(championId) {
    // Dans une implémentation réelle, vous récupéreriez ces données depuis une API
    // Ici, nous générons des données aléatoires
    const counterIds = [
      266, 103, 84, 12, 32, 34, 1, 523, 22, 136,
      268, 432, 53, 63, 201, 51, 164, 69, 31, 42
    ];
    
    // Exclure le champion lui-même
    const filteredIds = counterIds.filter(id => id !== parseInt(championId));
    
    // Sélectionner 5 champions aléatoires
    const selectedIds = [];
    while (selectedIds.length < 5 && filteredIds.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredIds.length);
      selectedIds.push(filteredIds[randomIndex]);
      filteredIds.splice(randomIndex, 1);
    }
    
    // Générer des statistiques pour chaque counter
    return selectedIds.map(id => ({
      championId: id,
      winRate: 52 + Math.random() * 8, // Entre 52% et 60%
      games: 1000 + Math.floor(Math.random() * 9000) // Entre 1000 et 10000 parties
    }));
  }

  // Génère des synergies pour un champion (simulation)
  generateSynergies(championId) {
    // Similaire aux counters, mais avec des champions qui fonctionnent bien ensemble
    const synergyIds = [
      99, 412, 157, 555, 35, 18, 64, 427, 40, 202,
      222, 429, 498, 83, 154, 887, 523, 875, 147, 101
    ];
    
    // Exclure le champion lui-même
    const filteredIds = synergyIds.filter(id => id !== parseInt(championId));
    
    // Sélectionner 5 champions aléatoires
    const selectedIds = [];
    while (selectedIds.length < 5 && filteredIds.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredIds.length);
      selectedIds.push(filteredIds[randomIndex]);
      filteredIds.splice(randomIndex, 1);
    }
    
    // Générer des statistiques pour chaque synergie
    return selectedIds.map(id => ({
      championId: id,
      winRate: 52 + Math.random() * 8, // Entre 52% et 60%
      games: 1000 + Math.floor(Math.random() * 9000) // Entre 1000 et 10000 parties
    }));
  }

  // Génère des builds recommandés pour un champion
  async getRecommendedBuilds(championId, role = 'MID') {
    try {
      // Vérifier si nous avons des données analysées en cache
      let analyzedData = await DataCollectionService.getAnalyzedData(championId, role);
      
      // Si nous n'avons pas de données ou si elles sont trop anciennes, les récupérer
      if (!analyzedData) {
        console.log(`Aucune donnée en cache pour le champion ${championId} au rôle ${role}, analyse en cours...`);
        
        // Analyser les builds des meilleurs joueurs
        analyzedData = await DataCollectionService.analyzeTopPlayerBuilds(championId, role);
        
        // Sauvegarder les données pour une utilisation future
        if (!analyzedData.error) {
          await DataCollectionService.saveAnalyzedData(championId, role, analyzedData);
        }
      }
      
      // Si nous avons une erreur ou pas assez de données, utiliser des données simulées
      if (analyzedData.error || analyzedData.matchesAnalyzed < 5) {
        console.log(`Pas assez de données réelles, utilisation de données simulées pour ${championId} au rôle ${role}`);
        return this.generateSimulatedBuilds(championId, role);
      }
      
      // Ajouter des conseils de jeu
      const playstyleTips = this.generatePlaystyleTips(championId, role);
      
      // Retourner les données analysées
      return {
        ...analyzedData,
        playstyleTips,
        confidence: Math.min(85 + (analyzedData.matchesAnalyzed / 2), 98), // Plus de matchs = plus de confiance
        dataPoints: analyzedData.matchesAnalyzed
      };
    } catch (error) {
      console.error('Erreur lors de la génération des builds recommandés:', error);
      
      // En cas d'erreur, retourner des données simulées
      return this.generateSimulatedBuilds(championId, role);
    }
  }

  // Génère des builds simulés (fallback si l'API échoue)
  generateSimulatedBuilds(championId, role) {
    // Générer des builds pour différents scénarios
    const builds = {
      standard: this.generateBuild(championId, role, 'standard'),
      aggressive: this.generateBuild(championId, role, 'aggressive'),
      defensive: this.generateBuild(championId, role, 'defensive')
    };
    
    // Générer des runes pour différents scénarios
    const runes = {
      standard: this.generateRunes(championId, role, 'standard'),
      aggressive: this.generateRunes(championId, role, 'aggressive'),
      defensive: this.generateRunes(championId, role, 'defensive')
    };
    
    // Générer des sorts d'invocateur recommandés
    const summonerSpells = this.generateSummonerSpells(championId, role);
    
    // Générer des ordres de compétences
    const skillOrders = this.generateSkillOrders(championId, role);
    
    // Générer des conseils de jeu
    const playstyleTips = this.generatePlaystyleTips(championId, role);
    
    return {
      builds,
      runes,
      summonerSpells,
      skillOrders,
      playstyleTips,
      confidence: 70, // Confiance plus faible pour les données simulées
      dataPoints: 0,
      simulated: true // Indiquer que ce sont des données simulées
    };
  }

  // Génère un build pour un champion et un rôle spécifiques
  generateBuild(championId, role, style) {
    // Définir des pools d'items par catégorie
    const starterItems = {
      'MID': [1056, 2033, 1082, 1083],
      'TOP': [1054, 1055, 1083, 2033],
      'JUNGLE': [1103, 1104, 1102],
      'ADC': [1055, 1083, 2003],
      'SUPPORT': [3850, 2003, 3862]
    };
    
    const boots = [3006, 3047, 3117, 3009, 3158, 3111];
    
    const mythicItems = {
      'standard': [6653, 6655, 6656, 6662, 6671, 6672, 6673],
      'aggressive': [6655, 6656, 6673, 6693, 6694, 6675, 6676],
      'defensive': [6632, 6653, 6662, 6667, 6664, 3190, 3222]
    };
    
    const legendaryItems = {
      'standard': [3089, 3135, 3116, 3157, 3165, 3115, 3102, 3041, 3139, 3142, 3153, 3156, 3161, 3193, 3814],
      'aggressive': [3089, 3124, 3135, 3142, 3153, 3814, 3036, 3031, 3033, 3046, 3094, 3095, 3139, 3156],
      'defensive': [3026, 3102, 3110, 3143, 3157, 3193, 3222, 3065, 3075, 3083, 3190, 3194, 3211, 3742, 3748]
    };
    
    // Sélectionner des items aléatoires pour chaque catégorie
    const starter = starterItems[role] ? 
      starterItems[role][Math.floor(Math.random() * starterItems[role].length)] : 
      1056;
    
    const boot = boots[Math.floor(Math.random() * boots.length)];
    
    const mythic = mythicItems[style] ? 
      mythicItems[style][Math.floor(Math.random() * mythicItems[style].length)] : 
      6655;
    
    // Sélectionner 4 items légendaires uniques
    const legendary = [];
    const availableLegendary = [...legendaryItems[style]];
    
    for (let i = 0; i < 4; i++) {
      if (availableLegendary.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * availableLegendary.length);
      legendary.push(availableLegendary[randomIndex]);
      availableLegendary.splice(randomIndex, 1);
    }
    
    return {
      starter: [starter],
      core: [boot, mythic, legendary[0]],
      legendary: legendary.slice(1),
      situational: [3139, 3026, 3116, 3135, 3157].filter(item => !legendary.includes(item))
    };
  }

  // Génère des runes pour un champion et un rôle spécifiques
  generateRunes(championId, role, style) {
    // Définir des pools de runes par style
    const primaryStyles = {
      'standard': [8200, 8000, 8100, 8400],
      'aggressive': [8100, 8000],
      'defensive': [8400, 8300]
    };
    
    const primaryRunes = {
      8000: [8005, 8008, 8010, 8021], // Precision
      8100: [8112, 8124, 8128, 9923], // Domination
      8200: [8214, 8229, 8230, 8360], // Sorcery
      8300: [8351, 8358, 8360, 8369], // Inspiration
      8400: [8437, 8439, 8465, 8437]  // Resolve
    };
    
    const secondaryStyles = {
      8000: [8100, 8200, 8300, 8400],
      8100: [8000, 8200, 8300, 8400],
      8200: [8000, 8100, 8300, 8400],
      8300: [8000, 8100, 8200, 8400],
      8400: [8000, 8100, 8200, 8300]
    };
    
    const secondaryRunes = {
      8000: [[8009, 8017, 8014], [8009, 8017, 8299], [8009, 8014, 8299]], // Precision
      8100: [[8126, 8139, 8143], [8126, 8139, 8135], [8126, 8135, 8143]], // Domination
      8200: [[8210, 8226, 8233], [8210, 8226, 8237], [8210, 8233, 8237]], // Sorcery
      8300: [[8306, 8345, 8347], [8306, 8345, 8410], [8306, 8347, 8410]], // Inspiration
      8400: [[8446, 8444, 8451], [8446, 8444, 8453], [8446, 8451, 8453]]  // Resolve
    };
    
    const statShards = [
      [5008, 5005, 5007], // Adaptive, AS, CDR
      [5008, 5002, 5003], // Adaptive, Armor, MR
      [5003, 5002, 5001]  // MR, Armor, HP
    ];
    
    // Sélectionner un style primaire
    const primaryStyle = primaryStyles[style][Math.floor(Math.random() * primaryStyles[style].length)];
    
    // Sélectionner une rune principale
    const primaryRune = primaryRunes[primaryStyle][Math.floor(Math.random() * primaryRunes[primaryStyle].length)];
    
    // Sélectionner 3 runes secondaires dans le style primaire
    const availablePrimaryRunes = primaryRunes[primaryStyle].filter(rune => rune !== primaryRune);
    const selectedPrimaryRunes = [];
    
    for (let i = 0; i < 3; i++) {
      if (availablePrimaryRunes.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * availablePrimaryRunes.length);
      selectedPrimaryRunes.push(availablePrimaryRunes[randomIndex]);
      availablePrimaryRunes.splice(randomIndex, 1);
    }
    
    // Sélectionner un style secondaire
    const availableSecondaryStyles = secondaryStyles[primaryStyle];
    const secondaryStyle = availableSecondaryStyles[Math.floor(Math.random() * availableSecondaryStyles.length)];
    
    // Sélectionner 2 runes secondaires
    const secondaryRuneSets = secondaryRunes[secondaryStyle];
    const selectedSecondaryRunes = secondaryRuneSets[Math.floor(Math.random() * secondaryRuneSets.length)].slice(0, 2);
    
    // Sélectionner des fragments de statistiques
    const selectedStatShards = statShards[Math.floor(Math.random() * statShards.length)];
    
    return {
      primaryStyle,
      primaryRune,
      primaryRunes: selectedPrimaryRunes.slice(0, 3),
      secondaryStyle,
      secondaryRunes: selectedSecondaryRunes,
      statShards: selectedStatShards
    };
  }

  // Génère des sorts d'invocateur recommandés
  generateSummonerSpells(championId, role) {
    const spellsByRole = {
      'TOP': [[4, 12], [4, 6], [4, 14]],
      'JUNGLE': [[11, 4], [11, 6], [11, 14]],
      'MID': [[4, 14], [4, 6], [4, 7]],
      'ADC': [[4, 7], [4, 6], [4, 3]],
      'SUPPORT': [[4, 14], [4, 3], [4, 7]]
    };
    
    const spells = spellsByRole[role] || [[4, 14], [4, 6], [4, 7]];
    return spells[Math.floor(Math.random() * spells.length)];
  }

  // Génère des ordres de compétences
  generateSkillOrders(championId, role) {
    // Générer un ordre de compétences aléatoire
    const skills = ['Q', 'W', 'E'];
    
    // Mélanger les compétences pour l'ordre de priorité
    const shuffledSkills = [...skills].sort(() => Math.random() - 0.5);
    
    // Générer les 3 premiers niveaux
    const firstThree = [];
    
    // Le premier niveau est souvent la compétence principale
    firstThree.push(shuffledSkills[0]);
    
    // Les niveaux 2 et 3 sont souvent différents
    if (Math.random() > 0.3) {
      firstThree.push(shuffledSkills[1]);
      firstThree.push(shuffledSkills[0]);
    } else {
      firstThree.push(shuffledSkills[0]);
      firstThree.push(shuffledSkills[1]);
    }
    
    // Ordre de priorité pour la montée des compétences
    const priority = shuffledSkills;
    
    return {
      firstThree,
      priority,
      ultimate: 'R' // Toujours monter l'ultime quand disponible
    };
  }

  // Génère des conseils de jeu
  generatePlaystyleTips(championId, role) {
    const earlyGameTips = [
      "Concentrez-vous sur le farm pendant les premières minutes",
      "Jouez de manière agressive dès le niveau 2 pour prendre l'avantage",
      "Restez sous votre tour et attendez les ganks de votre jungler",
      "Utilisez votre portée pour harceler l'adversaire sans prendre de dégâts",
      "Économisez votre mana en début de partie"
    ];
    
    const midGameTips = [
      "Aidez votre jungler à sécuriser les objectifs neutres",
      "Cherchez des opportunités de roaming pour aider les autres lignes",
      "Focalisez-vous sur la destruction de la première tour",
      "Groupez-vous avec votre équipe pour les combats autour du dragon",
      "Placez des wards profonds dans la jungle ennemie"
    ];
    
    const lateGameTips = [
      "Positionnez-vous correctement dans les combats d'équipe",
      "Focalisez les cibles prioritaires comme l'ADC ou le mid ennemi",
      "Splitpush pour créer de la pression sur la carte",
      "Protégez votre carry en restant près de lui",
      "Attendez les erreurs ennemies plutôt que de forcer des engagements risqués"
    ];
    
    return {
      earlyGame: earlyGameTips[Math.floor(Math.random() * earlyGameTips.length)],
      midGame: midGameTips[Math.floor(Math.random() * midGameTips.length)],
      lateGame: lateGameTips[Math.floor(Math.random() * lateGameTips.length)]
    };
  }
}

module.exports = new ChampionController();
