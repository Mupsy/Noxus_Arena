const axios = require("axios")
const { connectToDatabase } = require("../models/ConnectToDatabase")

class DataCollectionService {
  constructor() {
    this.riotApiKey = process.env.RIOT_API_KEY
    this.baseUrl = "https://euw1.api.riotgames.com" // Ajustez selon votre région
    this.matchBaseUrl = "https://europe.api.riotgames.com" // API pour les matchs (Europe)
    this.ddragonVersion = "13.24.1" // Mettre à jour selon la version actuelle
  }

  // Récupère les données des meilleurs joueurs pour un champion
  async getTopPlayersForChampion(championId, role, count = 10) {
    try {
      console.log(`Recherche des meilleurs joueurs pour le champion ${championId} au rôle ${role}`)

      // Récupérer les joueurs de Challenger, Grandmaster et Master
      const leagueTypes = ["challengerleagues", "grandmasterleagues", "masterleagues"]
      let allHighEloPlayers = []

      // Récupérer les joueurs de chaque tier
      for (const leagueType of leagueTypes) {
        try {
          const response = await axios.get(`${this.baseUrl}/lol/league/v4/${leagueType}/by-queue/RANKED_SOLO_5x5`, {
            headers: { "X-Riot-Token": this.riotApiKey },
          })

          // Extraire les summoner IDs et les ajouter à la liste
          const players = response.data.entries
            .sort((a, b) => b.leaguePoints - a.leaguePoints)
            .slice(0, 50) // Prendre les 50 meilleurs de chaque tier
            .map((entry) => ({
              summonerId: entry.summonerId,
              leaguePoints: entry.leaguePoints,
              tier: leagueType.replace("leagues", "").toUpperCase(),
            }))

          allHighEloPlayers = [...allHighEloPlayers, ...players]
        } catch (error) {
          console.error(`Erreur lors de la récupération des joueurs ${leagueType}:`, error.message)
          // Continuer avec les autres tiers même si un échoue
        }
      }

      // Trier tous les joueurs par LP et prendre les 100 meilleurs
      allHighEloPlayers.sort((a, b) => b.leaguePoints - a.leaguePoints)
      const topPlayers = allHighEloPlayers.slice(0, 100)

      // 3. Récupérer les données des invocateurs
      const summonersPromises = topPlayers.map((player) =>
        axios
          .get(`${this.baseUrl}/lol/summoner/v4/summoners/${player.summonerId}`, {
            headers: { "X-Riot-Token": this.riotApiKey },
          })
          .catch((err) => {
            console.error(`Erreur pour le joueur ${player.summonerId}:`, err.message)
            return null
          }),
      )

      const summonersResponses = await Promise.allSettled(summonersPromises)
      const summoners = summonersResponses
        .filter((response) => response.status === "fulfilled" && response.value)
        .map((response) => response.value.data)

      // 4. Pour chaque invocateur, vérifier s'il joue le champion demandé
      const championPlayers = []

      for (const summoner of summoners) {
        // Vérifier l'historique des parties pour voir s'ils jouent ce champion
        const matchIds = await this.getPlayerMatchIds(summoner.puuid, 20)
        const matches = await this.getMatchesData(matchIds)

        // Filtrer les parties où le joueur a utilisé le champion spécifié
        const championMatches = matches.filter((match) => {
          const participant = match.info.participants.find(
            (p) =>
              p.puuid === summoner.puuid &&
              p.championId === Number.parseInt(championId) &&
              this.getRoleFromPosition(p.teamPosition) === role,
          )
          return participant !== undefined
        })

        if (championMatches.length > 0) {
          // Calculer le winrate avec ce champion
          const wins = championMatches.filter((match) => {
            const participant = match.info.participants.find((p) => p.puuid === summoner.puuid)
            return participant && participant.win
          }).length

          const winRate = (wins / championMatches.length) * 100

          championPlayers.push({
            summonerId: summoner.id,
            summonerName: summoner.name,
            puuid: summoner.puuid,
            matchCount: championMatches.length,
            winRate: winRate,
            matches: championMatches,
          })

          // Si nous avons assez de joueurs, arrêter la recherche
          if (championPlayers.length >= count) break
        }
      }

      // Trier par winrate
      return championPlayers.sort((a, b) => b.winRate - a.winRate)
    } catch (error) {
      console.error("Erreur lors de la recherche des meilleurs joueurs:", error)
      throw error
    }
  }

  // Convertit la position en rôle
  getRoleFromPosition(position) {
    const positionMap = {
      TOP: "TOP",
      JUNGLE: "JUNGLE",
      MIDDLE: "MID",
      BOTTOM: "ADC",
      UTILITY: "SUPPORT",
    }

    return positionMap[position] || position
  }

  // Récupère les IDs des parties d'un joueur
  async getPlayerMatchIds(puuid, count = 20) {
    try {
      const response = await axios.get(`${this.matchBaseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids`, {
        params: { count },
        headers: { "X-Riot-Token": this.riotApiKey },
      })

      return response.data
    } catch (error) {
      console.error("Erreur lors de la récupération des IDs de parties:", error)
      return []
    }
  }

  // Récupère les données de plusieurs parties
  async getMatchesData(matchIds) {
    try {
      // Limiter le nombre de requêtes simultanées pour éviter de dépasser les limites de l'API
      const batchSize = 5
      const matches = []

      for (let i = 0; i < matchIds.length; i += batchSize) {
        const batch = matchIds.slice(i, i + batchSize)
        const batchPromises = batch.map((matchId) =>
          axios
            .get(`${this.matchBaseUrl}/lol/match/v5/matches/${matchId}`, {
              headers: { "X-Riot-Token": this.riotApiKey },
            })
            .catch((err) => {
              console.error(`Erreur pour le match ${matchId}:`, err.message)
              return null
            }),
        )

        const batchResponses = await Promise.all(batchPromises)
        const batchData = batchResponses.filter((response) => response !== null).map((response) => response.data)

        matches.push(...batchData)

        // Attendre un peu entre les lots pour respecter les limites de l'API
        if (i + batchSize < matchIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 1200))
        }
      }

      return matches
    } catch (error) {
      console.error("Erreur lors de la récupération des données de parties:", error)
      return []
    }
  }

  // Analyse les builds des meilleurs joueurs pour un champion
  async analyzeTopPlayerBuilds(championId, role, playerCount = 5, matchesPerPlayer = 10) {
    try {
      // 1. Trouver les meilleurs joueurs pour ce champion
      const topPlayers = await this.getTopPlayersForChampion(championId, role, playerCount)

      if (topPlayers.length === 0) {
        return {
          error: `Aucun joueur de haut niveau trouvé pour le champion ${championId} au rôle ${role}`,
        }
      }

      // 2. Collecter toutes les parties des joueurs d'élite
      const allMatches = []

      for (const player of topPlayers) {
        // Utiliser les matches déjà récupérés lors de getTopPlayersForChampion
        const championMatches = player.matches.slice(0, matchesPerPlayer)
        allMatches.push(...championMatches)
      }

      // 3. Analyser les builds
      return this.analyzeBuildsFromMatches(allMatches, championId)
    } catch (error) {
      console.error("Erreur lors de l'analyse des builds des meilleurs joueurs:", error)
      throw error
    }
  }

  // Analyse les builds à partir des données de parties
  analyzeBuildsFromMatches(matches, championId) {
    try {
      // Extraire les données des participants qui jouent le champion spécifié
      const participants = matches
        .map((match) => {
          return match.info.participants.find((p) => p.championId === Number.parseInt(championId))
        })
        .filter((p) => p !== undefined)

      if (participants.length === 0) {
        return {
          error: `Aucune donnée trouvée pour le champion ${championId}`,
        }
      }

      // Séparer les parties gagnées et perdues
      const winningParticipants = participants.filter((p) => p.win)
      const losingParticipants = participants.filter((p) => !p.win)

      // Analyser les builds gagnants
      const winningBuilds = this.extractBuildsData(winningParticipants)

      // Analyser les builds perdants (pour comparaison)
      const losingBuilds = this.extractBuildsData(losingParticipants)

      // Calculer le winrate global
      const winRate = (winningParticipants.length / participants.length) * 100

      // Générer différents types de builds
      const standardBuild = this.generateBuildFromData(winningBuilds, "standard")
      const aggressiveBuild = this.generateBuildFromData(winningBuilds, "aggressive")
      const defensiveBuild = this.generateBuildFromData(winningBuilds, "defensive")

      return {
        matchesAnalyzed: participants.length,
        winRate: winRate,
        builds: {
          standard: standardBuild,
          aggressive: aggressiveBuild,
          defensive: defensiveBuild,
        },
        runes: {
          standard: this.extractRunesData(winningParticipants),
          aggressive: this.extractRunesData(winningParticipants.filter((p) => p.kills > p.deaths * 2)),
          defensive: this.extractRunesData(winningParticipants.filter((p) => p.deaths < 3)),
        },
        summonerSpells: this.extractSummonerSpellsData(winningParticipants),
        skillOrders: this.extractSkillOrderData(winningParticipants),
      }
    } catch (error) {
      console.error("Erreur lors de l'analyse des builds:", error)
      throw error
    }
  }

  // Extrait les données de builds à partir des participants
  extractBuildsData(participants) {
    // Compteurs pour les items
    const starterItemsCounter = {}
    const bootsCounter = {}
    const mythicItemsCounter = {}
    const legendaryItemsCounter = {}

    // Liste des items mythiques
    const mythicItems = [
      6653, 6655, 6656, 6662, 6671, 6672, 6673, 6693, 6694, 6675, 6676, 6632, 6664, 6667, 6630, 6631, 3152, 6692,
    ]

    // Liste des bottes
    const boots = [3006, 3047, 3117, 3009, 3158, 3111, 3157]

    // Analyser chaque participant
    participants.forEach((participant) => {
      // Extraire les items
      const items = [
        participant.item0,
        participant.item1,
        participant.item2,
        participant.item3,
        participant.item4,
        participant.item5,
        participant.item6,
      ].filter((item) => item > 0)

      // Identifier les items de départ (estimation basée sur le prix)
      const starterItems = [
        1054, 1055, 1056, 1082, 1083, 1101, 1102, 1103, 1104, 2003, 2033, 3070, 3850, 3854, 3858, 3862,
      ]

      // Compter les items de départ
      starterItems.forEach((itemId) => {
        if (items.includes(itemId)) {
          starterItemsCounter[itemId] = (starterItemsCounter[itemId] || 0) + 1
        }
      })

      // Compter les bottes
      boots.forEach((bootId) => {
        if (items.includes(bootId)) {
          bootsCounter[bootId] = (bootsCounter[bootId] || 0) + 1
        }
      })

      // Compter les items mythiques
      let foundMythic = false
      mythicItems.forEach((mythicId) => {
        if (items.includes(mythicId)) {
          mythicItemsCounter[mythicId] = (mythicItemsCounter[mythicId] || 0) + 1
          foundMythic = true
        }
      })

      // Compter les items légendaires (tous les autres items)
      items.forEach((itemId) => {
        if (!starterItems.includes(itemId) && !boots.includes(itemId) && !mythicItems.includes(itemId)) {
          legendaryItemsCounter[itemId] = (legendaryItemsCounter[itemId] || 0) + 1
        }
      })
    })

    return {
      starterItems: this.sortItemsByFrequency(starterItemsCounter, participants.length),
      boots: this.sortItemsByFrequency(bootsCounter, participants.length),
      mythicItems: this.sortItemsByFrequency(mythicItemsCounter, participants.length),
      legendaryItems: this.sortItemsByFrequency(legendaryItemsCounter, participants.length),
    }
  }

  // Trie les items par fréquence
  sortItemsByFrequency(itemsCounter, totalCount) {
    return Object.entries(itemsCounter)
      .sort((a, b) => b[1] - a[1])
      .map(([itemId, count]) => ({
        itemId: Number.parseInt(itemId),
        frequency: (count / totalCount) * 100,
      }))
  }

  // Génère un build à partir des données analysées
  generateBuildFromData(buildsData, style) {
    // Sélectionner les items de départ les plus fréquents
    const starter = buildsData.starterItems.slice(0, 1).map((item) => item.itemId)

    // Sélectionner les bottes les plus fréquentes
    const boot = buildsData.boots.length > 0 ? buildsData.boots[0].itemId : 3006

    // Sélectionner l'item mythique le plus fréquent
    const mythic = buildsData.mythicItems.length > 0 ? buildsData.mythicItems[0].itemId : 6655

    // Sélectionner les items légendaires les plus fréquents
    const legendary = buildsData.legendaryItems.slice(0, 4).map((item) => item.itemId)

    // Sélectionner des items situationnels (moins fréquents)
    const situational = buildsData.legendaryItems.slice(4, 9).map((item) => item.itemId)

    // Adapter le build selon le style
    if (style === "aggressive") {
      // Privilégier les items offensifs
      const offensiveItems = [3089, 3124, 3135, 3142, 3153, 3814, 3036, 3031, 3033, 3046, 3094, 3095]
      return {
        starter: starter,
        core: [boot, mythic, this.findFirstMatch(legendary, offensiveItems) || legendary[0]],
        legendary: this.filterPreferredItems(legendary.slice(1), offensiveItems),
        situational: this.filterPreferredItems(situational, offensiveItems),
      }
    } else if (style === "defensive") {
      // Privilégier les items défensifs
      const defensiveItems = [3026, 3102, 3110, 3143, 3157, 3193, 3222, 3065, 3075, 3083, 3190, 3194, 3211, 3742, 3748]
      return {
        starter: starter,
        core: [boot, mythic, this.findFirstMatch(legendary, defensiveItems) || legendary[0]],
        legendary: this.filterPreferredItems(legendary.slice(1), defensiveItems),
        situational: this.filterPreferredItems(situational, defensiveItems),
      }
    } else {
      // Build standard
      return {
        starter: starter,
        core: [boot, mythic, legendary[0]],
        legendary: legendary.slice(1),
        situational: situational,
      }
    }
  }

  // Trouve le premier item qui correspond à une liste préférée
  findFirstMatch(items, preferredItems) {
    for (const item of items) {
      if (preferredItems.includes(item)) {
        return item
      }
    }
    return null
  }

  // Filtre les items pour privilégier certains types
  filterPreferredItems(items, preferredItems) {
    // D'abord inclure les items préférés qui sont dans la liste
    const preferred = items.filter((item) => preferredItems.includes(item))

    // Ensuite ajouter les autres jusqu'à avoir 3 items
    const others = items.filter((item) => !preferredItems.includes(item))

    return [...preferred, ...others].slice(0, 3)
  }

  // Extrait les données de runes à partir des participants
  extractRunesData(participants) {
    // Compteurs pour les styles et runes
    const primaryStyleCounter = {}
    const primaryRuneCounter = {}
    const secondaryStyleCounter = {}
    const secondaryRunesCounter = {}
    const statShardsCounter = {}

    participants.forEach((participant) => {
      if (!participant.perks || !participant.perks.styles) return

      // Style primaire
      const primaryStyle = participant.perks.styles[0]
      if (primaryStyle) {
        primaryStyleCounter[primaryStyle.style] = (primaryStyleCounter[primaryStyle.style] || 0) + 1

        // Rune principale (la première sélection)
        if (primaryStyle.selections && primaryStyle.selections.length > 0) {
          const primaryRune = primaryStyle.selections[0].perk
          primaryRuneCounter[primaryRune] = (primaryRuneCounter[primaryRune] || 0) + 1

          // Autres runes primaires
          primaryStyle.selections.slice(1).forEach((selection) => {
            const runeKey = `${primaryStyle.style}_${selection.perk}`
            secondaryRunesCounter[runeKey] = (secondaryRunesCounter[runeKey] || 0) + 1
          })
        }
      }

      // Style secondaire
      const secondaryStyle = participant.perks.styles[1]
      if (secondaryStyle) {
        secondaryStyleCounter[secondaryStyle.style] = (secondaryStyleCounter[secondaryStyle.style] || 0) + 1

        // Runes secondaires
        if (secondaryStyle.selections) {
          secondaryStyle.selections.forEach((selection) => {
            const runeKey = `${secondaryStyle.style}_${selection.perk}`
            secondaryRunesCounter[runeKey] = (secondaryRunesCounter[runeKey] || 0) + 1
          })
        }
      }

      // Fragments de statistiques (dans l'API moderne, ils sont dans un troisième style)
      if (participant.perks.statPerks) {
        const statPerks = participant.perks.statPerks

        if (statPerks.offense) {
          statShardsCounter[`offense_${statPerks.offense}`] =
            (statShardsCounter[`offense_${statPerks.offense}`] || 0) + 1
        }

        if (statPerks.flex) {
          statShardsCounter[`flex_${statPerks.flex}`] = (statShardsCounter[`flex_${statPerks.flex}`] || 0) + 1
        }

        if (statPerks.defense) {
          statShardsCounter[`defense_${statPerks.defense}`] =
            (statShardsCounter[`defense_${statPerks.defense}`] || 0) + 1
        }
      }
    })

    // Déterminer le style primaire le plus fréquent
    const primaryStyle = this.getMostFrequent(primaryStyleCounter)

    // Déterminer la rune principale la plus fréquente
    const primaryRune = this.getMostFrequent(primaryRuneCounter)

    // Déterminer les runes primaires les plus fréquentes
    const primaryRunes = Object.entries(secondaryRunesCounter)
      .filter(([key]) => key.startsWith(`${primaryStyle}_`))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => Number.parseInt(key.split("_")[1]))

    // Déterminer le style secondaire le plus fréquent
    const secondaryStyle = this.getMostFrequent(secondaryStyleCounter)

    // Déterminer les runes secondaires les plus fréquentes
    const secondaryRunes = Object.entries(secondaryRunesCounter)
      .filter(([key]) => key.startsWith(`${secondaryStyle}_`))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key]) => Number.parseInt(key.split("_")[1]))

    // Déterminer les fragments de statistiques les plus fréquents
    const offenseShard = this.getMostFrequent(
      Object.entries(statShardsCounter)
        .filter(([key]) => key.startsWith("offense_"))
        .reduce((acc, [key, value]) => {
          acc[key.split("_")[1]] = value
          return acc
        }, {}),
    )

    const flexShard = this.getMostFrequent(
      Object.entries(statShardsCounter)
        .filter(([key]) => key.startsWith("flex_"))
        .reduce((acc, [key, value]) => {
          acc[key.split("_")[1]] = value
          return acc
        }, {}),
    )

    const defenseShard = this.getMostFrequent(
      Object.entries(statShardsCounter)
        .filter(([key]) => key.startsWith("defense_"))
        .reduce((acc, [key, value]) => {
          acc[key.split("_")[1]] = value
          return acc
        }, {}),
    )

    // Convertir les IDs des fragments en IDs compatibles avec l'interface
    const statShardMap = {
      // Offense
      5008: 5008, // Adaptive Force
      5005: 5005, // Attack Speed
      5007: 5007, // Ability Haste
      // Flex
      "5008_2": 5008, // Adaptive Force
      5002: 5002, // Armor
      5003: 5003, // Magic Resist
      // Defense
      5001: 5001, // Health
      "5002_2": 5002, // Armor
      "5003_2": 5003, // Magic Resist
    }

    const statShards = [
      statShardMap[offenseShard] || 5008,
      statShardMap[flexShard] || 5002,
      statShardMap[defenseShard] || 5001,
    ]

    return {
      primaryStyle: Number.parseInt(primaryStyle),
      primaryRune: Number.parseInt(primaryRune),
      primaryRunes: primaryRunes,
      secondaryStyle: Number.parseInt(secondaryStyle),
      secondaryRunes: secondaryRunes,
      statShards: statShards,
    }
  }

  // Extrait les données de sorts d'invocateur à partir des participants
  extractSummonerSpellsData(participants) {
    const spellsCounter = {}

    participants.forEach((participant) => {
      const spellPair = `${participant.summoner1Id}_${participant.summoner2Id}`
      spellsCounter[spellPair] = (spellsCounter[spellPair] || 0) + 1
    })

    // Trouver la paire de sorts la plus fréquente
    const mostFrequentPair = Object.entries(spellsCounter)
      .sort((a, b) => b[1] - a[1])[0][0]
      .split("_")
      .map((id) => Number.parseInt(id))

    return mostFrequentPair
  }

  // Extrait les données d'ordre de compétences à partir des participants
  extractSkillOrderData(participants) {
    // Note: Cette fonction est une approximation car l'API ne fournit pas directement l'ordre des compétences
    // Dans une implémentation réelle, vous pourriez analyser les événements de la partie pour déterminer l'ordre

    // Pour l'exemple, nous allons générer un ordre basé sur les compétences les plus utilisées
    const skillsUsed = {
      Q: 0,
      W: 0,
      E: 0,
    }

    participants.forEach((participant) => {
      // Estimer l'utilisation des compétences à partir des dégâts ou d'autres statistiques
      // Ceci est une approximation simplifiée
      skillsUsed["Q"] += participant.spell1Casts || 0
      skillsUsed["W"] += participant.spell2Casts || 0
      skillsUsed["E"] += participant.spell3Casts || 0
    })

    // Trier les compétences par utilisation
    const skillPriority = Object.entries(skillsUsed)
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill)

    // Générer les 3 premiers niveaux (généralement on monte d'abord la compétence principale)
    const firstThree = [skillPriority[0], skillPriority[1], skillPriority[0]]

    return {
      firstThree: firstThree,
      priority: skillPriority,
      ultimate: "R",
    }
  }

  // Retourne la clé avec la valeur la plus élevée dans un objet
  getMostFrequent(counter) {
    if (Object.keys(counter).length === 0) return null

    return Object.entries(counter).sort((a, b) => b[1] - a[1])[0][0]
  }

  // Sauvegarde les données analysées dans la base de données
  async saveAnalyzedData(championId, role, data) {
    try {
      const db = await connectToDatabase()
      const collection = db.collection("championBuilds")

      // Vérifier si des données existent déjà pour ce champion et ce rôle
      const existingData = await collection.findOne({ championId, role })

      if (existingData) {
        // Mettre à jour les données existantes
        await collection.updateOne(
          { championId, role },
          {
            $set: {
              data: data,
              updatedAt: new Date(),
            },
          },
        )
      } else {
        // Insérer de nouvelles données
        await collection.insertOne({
          championId,
          role,
          data: data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      return { success: true }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des données analysées:", error)
      return { success: false, error: error.message }
    }
  }

  // Récupère les données analysées depuis la base de données
  async getAnalyzedData(championId, role) {
    try {
      const collection = db.collection("championBuilds")

      const data = await collection.findOne({ championId, role })

      if (!data) {
        return null
      }

      return data.data
    } catch (error) {
      console.error("Erreur lors de la récupération des données analysées:", error)
      return null
    }
  }
}

module.exports = new DataCollectionService()

