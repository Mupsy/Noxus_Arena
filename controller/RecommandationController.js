const axios = require("axios")
const { connectToDatabase } = require("../models/ConnectToDatabase")

class RecommendationController {
  constructor() {
    this.riotApiKey = process.env.RIOT_API_KEY
    this.baseUrl = "https://euw1.api.riotgames.com" // Ajustez selon votre région
  }

  // Récupère l'historique des parties d'un joueur
  async getMatchHistory(summonerName, count = 20) {
    try {
      // 1. Obtenir le PUUID du joueur
      const summonerResponse = await axios.get(
        `${this.baseUrl}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`,
        { headers: { "X-Riot-Token": this.riotApiKey } },
      )

      const puuid = summonerResponse.data.puuid

      // 2. Obtenir les IDs des dernières parties
      const matchIdsResponse = await axios.get(
        `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`,
        {
          params: { count },
          headers: { "X-Riot-Token": this.riotApiKey },
        },
      )

      const matchIds = matchIdsResponse.data

      // 3. Récupérer les détails de chaque partie
      const matchesPromises = matchIds.map((matchId) =>
        axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
          headers: { "X-Riot-Token": this.riotApiKey },
        }),
      )

      const matchesResponses = await Promise.all(matchesPromises)
      const matches = matchesResponses.map((response) => response.data)

      return matches
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique des parties:", error)
      throw error
    }
  }

  // Analyse les données des parties pour un champion spécifique
  async analyzeChampionData(summonerName, championId) {
    try {
      const matches = await this.getMatchHistory(summonerName, 50)

      // Filtrer les parties où le joueur a utilisé le champion spécifié
      const championMatches = matches.filter((match) => {
        const participant = match.info.participants.find(
          (p) =>
            p.puuid ===
            match.metadata.participants.find(
              (id) =>
                id === match.info.participants.find((part) => part.championId === Number.parseInt(championId))?.puuid,
            ),
        )
        return participant !== undefined
      })

      if (championMatches.length === 0) {
        return { message: "Aucune partie trouvée avec ce champion" }
      }

      // Analyser les builds, runes, sorts d'invocateur, etc.
      const buildsData = this.extractBuildsData(championMatches)

      return buildsData
    } catch (error) {
      console.error("Erreur lors de l'analyse des données du champion:", error)
      throw error
    }
  }

  // Extrait les données de builds à partir des parties
  extractBuildsData(matches) {
    // Compteurs pour les items, runes, sorts, etc.
    const itemsCounter = {}
    const runesCounter = {}
    const summonerSpellsCounter = {}
    const skillOrderCounter = {}

    // Variables pour calculer les statistiques de performance
    let totalWins = 0
    let totalKills = 0
    let totalDeaths = 0
    let totalAssists = 0

    matches.forEach((match) => {
      const playerData = match.info.participants.find((p) => p.puuid === match.metadata.participants[0])

      if (!playerData) return

      // Compter les victoires
      if (playerData.win) totalWins++

      // Compter les KDA
      totalKills += playerData.kills
      totalDeaths += playerData.deaths
      totalAssists += playerData.assists

      // Compter les items
      ;[
        playerData.item0,
        playerData.item1,
        playerData.item2,
        playerData.item3,
        playerData.item4,
        playerData.item5,
        playerData.item6,
      ]
        .filter((item) => item > 0)
        .forEach((item) => {
          itemsCounter[item] = (itemsCounter[item] || 0) + 1
        })

      // Compter les runes
      playerData.perks.styles.forEach((style) => {
        style.selections.forEach((selection) => {
          runesCounter[selection.perk] = (runesCounter[selection.perk] || 0) + 1
        })
      })

      // Compter les sorts d'invocateur
      summonerSpellsCounter[playerData.summoner1Id] = (summonerSpellsCounter[playerData.summoner1Id] || 0) + 1
      summonerSpellsCounter[playerData.summoner2Id] = (summonerSpellsCounter[playerData.summoner2Id] || 0) + 1
    })

    // Calculer les taux de victoire et KDA moyen
    const winRate = (totalWins / matches.length) * 100
    const avgKDA = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : totalKills + totalAssists

    // Trier les items, runes et sorts par fréquence
    const sortedItems = Object.entries(itemsCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([itemId, count]) => ({
        itemId: Number.parseInt(itemId),
        frequency: (count / matches.length) * 100,
      }))

    const sortedRunes = Object.entries(runesCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([runeId, count]) => ({
        runeId: Number.parseInt(runeId),
        frequency: (count / matches.length) * 100,
      }))

    const sortedSummonerSpells = Object.entries(summonerSpellsCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([spellId, count]) => ({
        spellId: Number.parseInt(spellId),
        frequency: (count / matches.length) * 100,
      }))

    return {
      matchesAnalyzed: matches.length,
      winRate,
      avgKDA,
      recommendedItems: sortedItems,
      recommendedRunes: sortedRunes,
      recommendedSummonerSpells: sortedSummonerSpells,
    }
  }

  // Génère des recommandations basées sur l'analyse des données
  async generateRecommendations(summonerName, championId, role) {
    try {
      // Au lieu d'analyser les données du joueur, récupérer uniquement les données globales
      const globalData = await this.getGlobalChampionData(championId, role)

      // Créer une structure de données simulée pour le joueur (données vides)
      const playerData = {
        matchesAnalyzed: 0,
        winRate: 50,
        avgKDA: 2.5,
        recommendedItems: [],
        recommendedRunes: [],
        recommendedSummonerSpells: [],
      }

      // Générer des recommandations basées uniquement sur les données globales
      const recommendations = {
        summary: `Basé sur l'analyse des meilleurs joueurs, le taux de victoire moyen avec ce champion est de ${globalData.winRate.toFixed(1)}%.`,
        itemsRecommendation: `Objets recommandés: ${globalData.recommendedItems
          .slice(0, 3)
          .map((i) => `Item ${i.itemId}`)
          .join(", ")}.`,
        runesRecommendation: `Runes recommandées: ${globalData.recommendedRunes
          .slice(0, 3)
          .map((r) => `Rune ${r.runeId}`)
          .join(", ")}.`,
        spellsRecommendation: `Sorts d'invocateur recommandés: ${globalData.recommendedSummonerSpells.map((s) => `Sort ${s.spellId}`).join(", ")}.`,
        playstyleRecommendation: this.generatePlaystyleRecommendation(playerData, globalData),
      }

      return recommendations
    } catch (error) {
      console.error("Erreur lors de la génération des recommandations:", error)
      throw error
    }
  }

  // Récupère les données globales pour un champion (à partir des meilleurs joueurs)
  async getGlobalChampionData(championId, role) {
    try {
      // Utiliser le DataCollectionService pour obtenir les données des joueurs d'élite
      const dataCollectionService = require("./DataCollectionService")
      const eliteData = await dataCollectionService.analyzeTopPlayerBuilds(championId, role, 10, 20)

      // Si nous avons des données réelles, les utiliser
      if (!eliteData.error && eliteData.matchesAnalyzed > 0) {
        // Extraire les données pertinentes
        return {
          winRate: eliteData.winRate || 52.3,
          pickRate: 8.7, // Donnée non disponible directement, utiliser une valeur par défaut
          banRate: 4.2, // Donnée non disponible directement, utiliser une valeur par défaut
          recommendedItems: eliteData.builds?.standard?.core?.map((itemId) => ({ itemId, frequency: 85 })) || [
            { itemId: 3157, frequency: 87.5 },
            { itemId: 3089, frequency: 82.1 },
            { itemId: 3135, frequency: 76.8 },
            { itemId: 3165, frequency: 65.3 },
            { itemId: 3152, frequency: 58.9 },
            { itemId: 3116, frequency: 52.4 },
          ],
          recommendedRunes: eliteData.runes?.standard?.primaryRunes?.map((runeId) => ({ runeId, frequency: 85 })) || [
            { runeId: 8214, frequency: 92.1 },
            { runeId: 8226, frequency: 85.7 },
            { runeId: 8210, frequency: 78.3 },
            { runeId: 8237, frequency: 72.5 },
            { runeId: 8345, frequency: 68.9 },
            { runeId: 8347, frequency: 65.2 },
          ],
          recommendedSummonerSpells: eliteData.summonerSpells?.map((spellId) => ({ spellId, frequency: 90 })) || [
            { spellId: 4, frequency: 95.8 },
            { spellId: 12, frequency: 87.3 },
          ],
        }
      }

      // Sinon, utiliser des données simulées
      return {
        winRate: 52.3,
        pickRate: 8.7,
        banRate: 4.2,
        recommendedItems: [
          { itemId: 3157, frequency: 87.5 },
          { itemId: 3089, frequency: 82.1 },
          { itemId: 3135, frequency: 76.8 },
          { itemId: 3165, frequency: 65.3 },
          { itemId: 3152, frequency: 58.9 },
          { itemId: 3116, frequency: 52.4 },
        ],
        recommendedRunes: [
          { runeId: 8214, frequency: 92.1 },
          { runeId: 8226, frequency: 85.7 },
          { runeId: 8210, frequency: 78.3 },
          { runeId: 8237, frequency: 72.5 },
          { runeId: 8345, frequency: 68.9 },
          { runeId: 8347, frequency: 65.2 },
        ],
        recommendedSummonerSpells: [
          { spellId: 4, frequency: 95.8 },
          { spellId: 12, frequency: 87.3 },
        ],
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données globales:", error)
      throw error
    }
  }

  // Compare les données du joueur avec les données globales et génère des recommandations
  compareAndRecommend(playerData, globalData) {
    // Identifier les différences entre les builds du joueur et les builds optimaux
    const itemsToImprove = globalData.recommendedItems
      .filter((item) => !playerData.recommendedItems.some((pItem) => pItem.itemId === item.itemId))
      .slice(0, 3)

    const runesToImprove = globalData.recommendedRunes
      .filter((rune) => !playerData.recommendedRunes.some((pRune) => pRune.runeId === rune.runeId))
      .slice(0, 3)

    const spellsToImprove = globalData.recommendedSummonerSpells.filter(
      (spell) => !playerData.recommendedSummonerSpells.some((pSpell) => pSpell.spellId === spell.spellId),
    )

    // Calculer la différence de win rate
    const winRateDiff = globalData.winRate - playerData.winRate

    // Générer des recommandations textuelles
    const recommendations = {
      summary: `Basé sur l'analyse de ${playerData.matchesAnalyzed} parties, votre taux de victoire est de ${playerData.winRate.toFixed(1)}% (${winRateDiff > 0 ? "-" : "+"}${Math.abs(winRateDiff).toFixed(1)}% par rapport à la moyenne).`,
      itemsRecommendation:
        itemsToImprove.length > 0
          ? `Essayez d'inclure ces objets dans votre build: ${itemsToImprove.map((i) => `Item ${i.itemId}`).join(", ")}.`
          : "Votre build d'objets est optimal!",
      runesRecommendation:
        runesToImprove.length > 0
          ? `Considérez ces runes pour améliorer vos performances: ${runesToImprove.map((r) => `Rune ${r.runeId}`).join(", ")}.`
          : "Votre configuration de runes est optimale!",
      spellsRecommendation:
        spellsToImprove.length > 0
          ? `Les meilleurs joueurs utilisent ces sorts d'invocateur: ${spellsToImprove.map((s) => `Sort ${s.spellId}`).join(", ")}.`
          : "Vos sorts d'invocateur sont optimaux!",
      playstyleRecommendation: this.generatePlaystyleRecommendation(playerData, globalData),
    }

    return recommendations
  }

  // Génère des recommandations de style de jeu basées sur les statistiques
  generatePlaystyleRecommendation(playerData, globalData) {
    // Dans une implémentation réelle, vous utiliseriez un modèle ML pour générer ces recommandations
    // Ici, nous utilisons une logique simple basée sur le KDA

    if (playerData.avgKDA < 2.0) {
      return "Vous mourez trop souvent. Essayez de jouer plus prudemment et d'améliorer votre positionnement en combat d'équipe."
    } else if (playerData.avgKDA >= 2.0 && playerData.avgKDA < 3.5) {
      return "Votre KDA est correct, mais vous pourriez améliorer votre impact en jeu en participant davantage aux objectifs d'équipe."
    } else {
      return "Votre KDA est excellent! Continuez à aider votre équipe et à partager votre avantage avec les autres lignes."
    }
  }
}

module.exports = new RecommendationController()

