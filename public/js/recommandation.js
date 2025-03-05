// Ce fichier contient des fonctions utilitaires pour la page de recommandations

// Fonction pour formater les données pour l'entraînement du modèle ML
function formatMatchDataForML(matches, summonerPuuid) {
    return matches
      .map((match) => {
        const participant = match.info.participants.find((p) => p.puuid === summonerPuuid)
  
        if (!participant) return null
  
        return {
          // Données de base
          championId: participant.championId,
          win: participant.win,
          teamPosition: participant.teamPosition,
  
          // Statistiques de performance
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          kda:
            participant.deaths > 0
              ? (participant.kills + participant.assists) / participant.deaths
              : participant.kills + participant.assists,
  
          // Statistiques de farm et d'or
          totalMinionsKilled: participant.totalMinionsKilled,
          neutralMinionsKilled: participant.neutralMinionsKilled,
          goldEarned: participant.goldEarned,
          goldSpent: participant.goldSpent,
  
          // Statistiques de dégâts
          totalDamageDealt: participant.totalDamageDealt,
          totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
          damageDealtToObjectives: participant.damageDealtToObjectives,
          totalDamageTaken: participant.totalDamageTaken,
  
          // Statistiques de vision
          visionScore: participant.visionScore,
          wardsPlaced: participant.wardsPlaced,
          wardsKilled: participant.wardsKilled,
  
          // Durée de la partie
          gameDuration: match.info.gameDuration,
  
          // Items finaux
          items: [
            participant.item0,
            participant.item1,
            participant.item2,
            participant.item3,
            participant.item4,
            participant.item5,
            participant.item6,
          ].filter((item) => item > 0),
  
          // Runes
          runes: participant.perks.styles.flatMap((style) => style.selections.map((selection) => selection.perk)),
  
          // Sorts d'invocateur
          summonerSpells: [participant.summoner1Id, participant.summoner2Id],
        }
      })
      .filter((data) => data !== null)
  }
  
  // Fonction pour calculer les statistiques moyennes par champion
  function calculateChampionStats(matchesData) {
    const championStats = {}
  
    matchesData.forEach((match) => {
      const championId = match.championId
  
      if (!championStats[championId]) {
        championStats[championId] = {
          games: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          gold: 0,
          cs: 0,
          vision: 0,
          itemCounts: {},
          runeCounts: {},
          spellCounts: {},
        }
      }
  
      const stats = championStats[championId]
  
      stats.games++
      if (match.win) stats.wins++
      stats.kills += match.kills
      stats.deaths += match.deaths
      stats.assists += match.assists
      stats.damage += match.totalDamageDealtToChampions
      stats.gold += match.goldEarned
      stats.cs += match.totalMinionsKilled + match.neutralMinionsKilled
      stats.vision += match.visionScore
  
      // Compter les items
      match.items.forEach((itemId) => {
        stats.itemCounts[itemId] = (stats.itemCounts[itemId] || 0) + 1
      })
  
      // Compter les runes
      match.runes.forEach((runeId) => {
        stats.runeCounts[runeId] = (stats.runeCounts[runeId] || 0) + 1
      })
  
      // Compter les sorts d'invocateur
      match.summonerSpells.forEach((spellId) => {
        stats.spellCounts[spellId] = (stats.spellCounts[spellId] || 0) + 1
      })
    })
  
    // Calculer les moyennes
    Object.keys(championStats).forEach((championId) => {
      const stats = championStats[championId]
      const games = stats.games
  
      stats.winRate = (stats.wins / games) * 100
      stats.avgKills = stats.kills / games
      stats.avgDeaths = stats.deaths / games
      stats.avgAssists = stats.assists / games
      stats.avgKDA = stats.deaths > 0 ? (stats.kills + stats.assists) / stats.deaths : stats.kills + stats.assists
      stats.avgDamage = stats.damage / games
      stats.avgGold = stats.gold / games
      stats.avgCS = stats.cs / games
      stats.avgVision = stats.vision / games
  
      // Trier les items par fréquence
      stats.mostUsedItems = Object.entries(stats.itemCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([itemId, count]) => ({
          itemId: Number.parseInt(itemId),
          frequency: (count / games) * 100,
        }))
  
      // Trier les runes par fréquence
      stats.mostUsedRunes = Object.entries(stats.runeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([runeId, count]) => ({
          runeId: Number.parseInt(runeId),
          frequency: (count / games) * 100,
        }))
  
      // Trier les sorts par fréquence
      stats.mostUsedSpells = Object.entries(stats.spellCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([spellId, count]) => ({
          spellId: Number.parseInt(spellId),
          frequency: (count / games) * 100,
        }))
    })
  
    return championStats
  }
  
  // Exporter les fonctions
  export { formatMatchDataForML, calculateChampionStats }
  
  