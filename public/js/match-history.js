// Variables globales
let currentPage = 0;
let hasMoreMatches = true;
let isLoading = false;
let summonerPuuid = '';
let championData = null; // Cache pour les données des champions
let matchStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  kdaSum: 0,
  mostPlayedChampions: {}
};

// Fonction principale qui s'exécute au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Précharger les données des champions
    await loadChampionData();
    
    // Vérifier si l'utilisateur est connecté
    const sessionData = await fetchSessionInfo();
    
    if (!sessionData.success || !sessionData.user || !sessionData.user.isLoggedIn) {
      showError('Vous devez être connecté pour voir votre historique de matchs');
      return;
    }
    
    // Récupérer les informations du joueur
    const summonerData = await fetchSummonerData(sessionData.user.userId);
    
    if (!summonerData || !summonerData.results) {
      showError('Impossible de récupérer vos informations de joueur');
      return;
    }
    
    // Afficher le profil du joueur
    displaySummonerProfile(summonerData.results);
    
    // Récupérer et afficher les matchs
    summonerPuuid = summonerData.results.Summoner_PUUID;
    await fetchAndDisplayMatches(summonerPuuid, 0);
    
    // Ajouter l'événement pour charger plus de matchs
    document.getElementById('load-more-button').addEventListener('click', () => {
      if (!isLoading && hasMoreMatches) {
        fetchAndDisplayMatches(summonerPuuid, currentPage + 1);
      }
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    showError('Une erreur est survenue lors du chargement de l\'historique des matchs');
  }
});

// Fonction pour charger les données des champions
async function loadChampionData() {
  try {
    const response = await fetch('https://ddragon.leagueoflegends.com/cdn/15.3.1/data/fr_FR/champion.json');
    const data = await response.json();
    championData = data.data;
    console.log('Données des champions chargées avec succès');
  } catch (error) {
    console.error('Erreur lors du chargement des données des champions:', error);
    showError('Impossible de charger les données des champions');
  }
}

// Fonction pour récupérer les informations de session
async function fetchSessionInfo() {
  try {
    const response = await fetch('/session-info');
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des informations de session:', error);
    throw error;
  }
}

// Fonction pour récupérer les données du joueur
async function fetchSummonerData(userId) {
  try {
    const response = await fetch(`/api/lol/user/${userId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des données du joueur:', error);
    throw error;
  }
}

// Fonction pour récupérer et afficher les matchs
async function fetchAndDisplayMatches(puuid, page) {
  if (isLoading) return;
  
  try {
    isLoading = true;
    showLoadingSpinner(true);
    
    const response = await fetch(`/api/matches?puuid=${puuid}&page=${page}`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.matches || data.matches.length === 0) {
      hasMoreMatches = false;
      
      if (page === 0) {
        document.getElementById('no-matches').classList.remove('hidden');
      }
      
      document.getElementById('load-more-container').classList.add('hidden');
      return;
    }
    
    // Afficher les matchs
    displayMatches(data.matches, puuid, page === 0);
    
    // Mettre à jour la page courante
    currentPage = page;
    
    // Afficher le bouton "Charger plus"
    document.getElementById('load-more-container').classList.remove('hidden');
    
    // Afficher les statistiques de match (seulement à la première page)
    if (page === 0) {
      displayMatchStats();
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération des matchs:', error);
    showError('Impossible de charger les matchs');
  } finally {
    isLoading = false;
    showLoadingSpinner(false);
  }
}

// Fonction pour afficher le profil du joueur
function displaySummonerProfile(summoner) {
  const profileContainer = document.getElementById('summoner-profile');
  
  profileContainer.innerHTML = `
    <div class="bg-gray-800 rounded-lg p-6">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="relative">
          <div class="rounded-full overflow-hidden border-4 border-yellow-500 h-24 w-24">
            <img
              src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/${summoner.Summoner_Icon_ID}.png"
              alt="${summoner.Summoner_Name} icon"
              class="object-cover w-full h-full"
            />
          </div>
          <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-700 px-2 py-0.5 rounded-full border border-gray-600 text-xs">
            ${summoner.Summoner_LvL}
          </div>
        </div>
        
        <div class="text-center md:text-left flex-1">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div class="flex items-center gap-2 justify-center md:justify-start">
                <h2 class="text-2xl font-bold">${summoner.Summoner_Name}</h2>
                <span class="text-gray-400 text-sm">#${summoner.Summoner_TagLine}</span>
              </div>
              
              <div class="mt-2 flex items-center gap-2 justify-center md:justify-start">
                <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 px-3 py-1 rounded text-black font-semibold text-sm">
                  ${summoner.Summoner_Rank || 'Non classé'}
                </div>
              </div>
            </div>
            
            <div class="mt-4 md:mt-0 flex flex-col items-center md:items-end">
              <div class="text-sm text-gray-400">Dernière mise à jour</div>
              <div class="text-sm">${new Date().toLocaleString('fr-FR')}</div>
              <button class="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm">
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  profileContainer.classList.remove('hidden');
}

// Fonction pour afficher les statistiques des matchs
function displayMatchStats() {
  const statsContainer = document.getElementById('match-stats-summary');
  
  if (matchStats.totalGames === 0) {
    statsContainer.classList.add('hidden');
    return;
  }
  
  const winRate = Math.round((matchStats.wins / matchStats.totalGames) * 100);
  const avgKDA = (matchStats.kdaSum / matchStats.totalGames).toFixed(2);
  
  // Trier les champions les plus joués
  const mostPlayedChampions = Object.entries(matchStats.mostPlayedChampions)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);
  
  statsContainer.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between">
      <div>
        <h3 class="text-lg font-semibold mb-2">Résumé des matchs récents</h3>
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="text-sm text-gray-400">Matchs</div>
            <div class="text-xl font-bold">${matchStats.totalGames}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-400">Victoires</div>
            <div class="text-xl font-bold text-blue-500">${matchStats.wins}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-400">Défaites</div>
            <div class="text-xl font-bold text-red-500">${matchStats.losses}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-400">Winrate</div>
            <div class="text-xl font-bold ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}">${winRate}%</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-400">KDA Moyen</div>
            <div class="text-xl font-bold text-yellow-500">${avgKDA}</div>
          </div>
        </div>
      </div>
      
      <div class="mt-4 md:mt-0">
        <h3 class="text-lg font-semibold mb-2">Champions les plus joués</h3>
        <div class="flex gap-4">
          ${mostPlayedChampions.map(([championId, data], index) => {
            const winRate = Math.round((data.wins / data.count) * 100);
            return `
              <div class="text-center">
                <div class="relative mx-auto">
                  <div class="h-12 w-12 rounded-full overflow-hidden">
                    <img
                      src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${championId}.png"
                      alt="${championId}"
                      class="object-cover w-full h-full"
                    />
                  </div>
                  <div class="absolute -bottom-1 -right-1 bg-gray-700 text-xs rounded-full h-5 w-5 flex items-center justify-center border border-gray-600">
                    ${data.count}
                  </div>
                </div>
                <div class="text-sm mt-1">${winRate}%</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  
  statsContainer.classList.remove('hidden');
}

// Fonction pour afficher les matchs
function displayMatches(matches, summonerPuuid, clearExisting = false) {
  const matchListContainer = document.getElementById('match-list');
  
  if (clearExisting) {
    matchListContainer.innerHTML = '';
    // Réinitialiser les statistiques
    matchStats = {
      totalGames: 0,
      wins: 0,
      losses: 0,
      kdaSum: 0,
      mostPlayedChampions: {}
    };
  }
  
  matches.forEach(match => {
    // Trouver les données du joueur dans le match
    const playerData = match.info.participants.find(p => p.puuid === summonerPuuid);
    
    if (!playerData) return;
    
    const isWin = playerData.win;
    const gameDate = new Date(match.info.gameCreation);
    const gameDuration = Math.floor(match.info.gameDuration / 60);
    const timeAgo = formatTimeAgo(gameDate);
    const kda = `${playerData.kills}/${playerData.deaths}/${playerData.assists}`;
    const kdaRatio = playerData.deaths === 0 
      ? 'Perfect' 
      : ((playerData.kills + playerData.assists) / playerData.deaths).toFixed(2);
    
    // Obtenir le nom du champion de manière synchrone
    const championId = getChampionNameById(playerData.championId);
    const championName = getChampionDisplayName(playerData.championId);
    
    // Mettre à jour les statistiques
    matchStats.totalGames++;
    if (isWin) {
      matchStats.wins++;
    } else {
      matchStats.losses++;
    }
    
    const kdaValue = playerData.deaths === 0 
      ? 'Perfect' 
      : (playerData.kills + playerData.assists) / playerData.deaths;
    
    if (typeof kdaValue === 'number') {
      matchStats.kdaSum += kdaValue;
    } else {
      matchStats.kdaSum += 5; // Valeur arbitraire pour "Perfect"
    }
    
    // Mettre à jour les champions les plus joués
    if (!matchStats.mostPlayedChampions[championId]) {
      matchStats.mostPlayedChampions[championId] = {
        count: 0,
        wins: 0
      };
    }
    matchStats.mostPlayedChampions[championId].count++;
    if (isWin) {
      matchStats.mostPlayedChampions[championId].wins++;
    }
    
    // Calculer le CS par minute
    const totalCS = playerData.totalMinionsKilled + playerData.neutralMinionsKilled;
    const csPerMin = (totalCS / (match.info.gameDuration / 60)).toFixed(1);
    
    // Calculer la participation aux kills
    const teamId = playerData.teamId;
    const teamKills = match.info.participants
      .filter(p => p.teamId === teamId)
      .reduce((sum, p) => sum + p.kills, 0);
    
    const killParticipation = teamKills === 0 
      ? 0 
      : Math.round(((playerData.kills + playerData.assists) / teamKills) * 100);
    
    // Créer la carte de match
    const matchCard = document.createElement('div');
    matchCard.className = `match-card rounded-lg overflow-hidden shadow-md ${isWin ? 'win bg-blue-900/20' : 'loss bg-red-900/20'} border-l-4 ${isWin ? 'border-blue-500' : 'border-red-500'}`;
    
    // Déterminer la classe KDA
    let kdaClass = '';
    if (kdaRatio === 'Perfect') {
      kdaClass = 'perfect-kda';
    } else if (parseFloat(kdaRatio) >= 3) {
      kdaClass = 'kda-highlight';
    }
    
    // Define items here
    const items = [playerData.item0, playerData.item1, playerData.item2, playerData.item3, playerData.item4, playerData.item5];

    matchCard.innerHTML = `
      <div class="p-4 cursor-pointer flex flex-wrap items-center gap-4">
        <div class="w-20 flex flex-col items-center">
          <div class="text-xs font-semibold px-2 py-1 rounded ${isWin ? 'bg-blue-500' : 'bg-red-500'} w-full text-center">
            ${isWin ? 'VICTOIRE' : 'DÉFAITE'}
          </div>
          <div class="text-gray-400 text-xs mt-1">${timeAgo}</div>
          <div class="text-gray-400 text-xs flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ${gameDuration}m
          </div>
        </div>
        
        <div class="flex items-center gap-4 flex-1">
          <div class="relative">
            <div class="h-14 w-14 rounded-full overflow-hidden">
              <img
                src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${championId}.png"
                alt="${championName}"
                class="object-cover w-full h-full"
              />
            </div>
            <div class="absolute -bottom-1 -right-1 bg-gray-800 text-xs rounded-full h-5 w-5 flex items-center justify-center border border-gray-700">
              ${playerData.champLevel}
            </div>
          </div>
          
          <div>
            <div class="font-semibold">${championName}</div>
            <div class="text-sm text-gray-400">${getQueueType(match.info.queueId)}</div>
            <div class="flex gap-2 mt-1">
              <div class="stats-badge">${playerData.individualPosition || playerData.lane}</div>
              <div class="stats-badge">${csPerMin} CS/min</div>
              <div class="stats-badge">P/Kill ${killParticipation}%</div>
            </div>
          </div>
        </div>
        
        <div class="text-center">
          <div class="font-bold ${kdaClass}">${kda}</div>
          <div class="text-sm ${kdaClass}">${kdaRatio} KDA</div>
        </div>
        
        <div class="flex gap-1">
          ${items.map((itemId, index) => `
            <div class="h-8 w-8 bg-gray-700 rounded overflow-hidden">
              ${itemId > 0 ? `
                <img
                  src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${itemId}.png"
                  alt="Item ${itemId}"
                  class="object-cover w-full h-full"
                />
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="ml-auto toggle-details">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 chevron-down" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 chevron-up hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>
      
      <div class="match-details">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 border-t border-gray-700">
          <div>
            <h3 class="font-semibold mb-2">Équipe bleue ${match.info.teams[0].win ? '(Victoire)' : '(Défaite)'}</h3>
            <div class="team-blue rounded-lg overflow-hidden">
              ${match.info.participants
                .filter(p => p.teamId === 100)
                .map(p => {
                  const pChampionId = getChampionNameById(p.championId);
                  const pChampionName = getChampionDisplayName(p.championId);
                  const pKda = `${p.kills}/${p.deaths}/${p.assists}`;
                  const pKdaRatio = p.deaths === 0 
                    ? 'Perfect' 
                    : ((p.kills + p.assists) / p.deaths).toFixed(2);
                  
                  return `
                    <div class="player-row flex items-center p-2 ${p.puuid === summonerPuuid ? 'bg-blue-900/30' : ''}">
                      <div class="flex items-center gap-2 w-1/3">
                        <div class="h-8 w-8 rounded-full overflow-hidden">
                          <img
                            src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${pChampionId}.png"
                            alt="${pChampionName}"
                            class="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <div class="text-sm font-medium ${p.puuid === summonerPuuid ? 'font-bold' : ''}">${p.summonerName}</div>
                          <div class="text-xs text-gray-400">${pChampionName}</div>
                        </div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="text-sm ${p.puuid === summonerPuuid ? 'font-bold' : ''}">${pKda}</div>
                        <div class="text-xs text-gray-400">${pKdaRatio} KDA</div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="text-sm">${p.totalDamageDealtToChampions.toLocaleString()}</div>
                        <div class="text-xs text-gray-400">Dégâts</div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="text-sm">${(p.totalMinionsKilled + p.neutralMinionsKilled)}</div>
                        <div class="text-xs text-gray-400">CS</div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="flex justify-center gap-1">
                          ${[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].map(itemId => `
                            <div class="h-5 w-5 bg-gray-700 rounded overflow-hidden">
                              ${itemId > 0 ? `
                                <img
                                  src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${itemId}.png"
                                  alt="Item ${itemId}"
                                  class="object-cover w-full h-full"
                                />
                              ` : ''}
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>
          
          <div>
            <h3 class="font-semibold mb-2">Équipe rouge ${match.info.teams[1].win ? '(Victoire)' : '(Défaite)'}</h3>
            <div class="team-red rounded-lg overflow-hidden">
              ${match.info.participants
                .filter(p => p.teamId === 200)
                .map(p => {
                  const pChampionId = getChampionNameById(p.championId);
                  const pChampionName = getChampionDisplayName(p.championId);
                  const pKda = `${p.kills}/${p.deaths}/${p.assists}`;
                  const pKdaRatio = p.deaths === 0 
                    ? 'Perfect' 
                    : ((p.kills + p.assists) / p.deaths).toFixed(2);
                  
                  return `
                    <div class="player-row flex items-center p-2 ${p.puuid === summonerPuuid ? 'bg-red-900/30' : ''}">
                      <div class="flex items-center gap-2 w-1/3">
                        <div class="h-8 w-8 rounded-full overflow-hidden">
                          <img
                            src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${pChampionId}.png"
                            alt="${pChampionName}"
                            class="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <div class="text-sm font-medium ${p.puuid === summonerPuuid ? 'font-bold' : ''}">${p.summonerName}</div>
                          <div class="text-xs text-gray-400">${pChampionName}</div>
                        </div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="text-sm ${p.puuid === summonerPuuid ? 'font-bold' : ''}">${pKda}</div>
                        <div class="text-xs text-gray-400">${pKdaRatio} KDA</div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="text-sm">${p.totalDamageDealtToChampions.toLocaleString()}</div>
                        <div class="text-xs text-gray-400">Dégâts</div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="text-sm">${(p.totalMinionsKilled + p.neutralMinionsKilled)}</div>
                        <div class="text-xs text-gray-400">CS</div>
                      </div>
                      <div class="w-1/6 text-center">
                        <div class="flex justify-center gap-1">
                          ${[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].map(itemId => `
                            <div class="h-5 w-5 bg-gray-700 rounded overflow-hidden">
                              ${itemId > 0 ? `
                                <img
                                  src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${itemId}.png"
                                  alt="Item ${itemId}"
                                  class="object-cover w-full h-full"
                                />
                              ` : ''}
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t border-gray-700">
          <h3 class="font-semibold mb-2">Détails du match</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              <span>Dégâts: ${playerData.totalDamageDealtToChampions.toLocaleString()}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
              </svg>
              <span>Dégâts subis: ${playerData.totalDamageTaken.toLocaleString()}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span>CS: ${playerData.totalMinionsKilled + playerData.neutralMinionsKilled} (${csPerMin}/min)</span>
            </div>
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Vision: ${playerData.visionScore} (${(playerData.visionScore / (match.info.gameDuration / 60)).toFixed(1)}/min)</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    matchListContainer.appendChild(matchCard);
    
    // Ajouter l'événement pour afficher/masquer les détails
    const toggleButton = matchCard.querySelector('.toggle-details');
    const matchDetails = matchCard.querySelector('.match-details');
    const chevronDown = matchCard.querySelector('.chevron-down');
    const chevronUp = matchCard.querySelector('.chevron-up');
    
    toggleButton.addEventListener('click', () => {
      matchDetails.classList.toggle('expanded');
      chevronDown.classList.toggle('hidden');
      chevronUp.classList.toggle('hidden');
    });
  });
  
  matchListContainer.classList.remove('hidden');
}

// Fonction pour formater le temps écoulé
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'il y a quelques secondes';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `il y a ${diffInMonths} mois`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
}

// Fonction pour obtenir le nom du champion par ID (version synchrone)
function getChampionNameById(championId) {
  if (!championData) {
    return 'Unknown';
  }
  
  // Parcourir les données des champions pour trouver celui qui correspond à l'ID
  for (const key in championData) {
    if (parseInt(championData[key].key) === championId) {
      return championData[key].id; // Utiliser l'ID pour l'URL de l'image
    }
  }
  
  return 'Unknown';
}

// Fonction pour obtenir le nom d'affichage du champion
function getChampionDisplayName(championId) {
  if (!championData) {
    return 'Champion inconnu';
  }
  
  // Parcourir les données des champions pour trouver celui qui correspond à l'ID
  for (const key in championData) {
    if (parseInt(championData[key].key) === championId) {
      return championData[key].name; // Utiliser le nom pour l'affichage
    }
  }
  
  return 'Champion inconnu';
}

// Fonction pour obtenir le type de file d'attente
function getQueueType(queueId) {
  const queueTypes = {
    400: 'Normal Draft',
    420: 'Ranked Solo/Duo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM',
    700: 'Clash',
    830: 'Co-op vs AI Intro',
    840: 'Co-op vs AI Beginner',
    850: 'Co-op vs AI Intermediate',
    900: 'URF',
    1020: 'One for All',
    1300: 'Nexus Blitz',
    1400: 'Ultimate Spellbook',
    1900: 'URF'
  };
  
  return queueTypes[queueId] || 'Mode personnalisé';
}

// Fonction pour afficher un message d'erreur
function showError(message) {
  const errorContainer = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  
  errorText.textContent = message;
  errorContainer.classList.remove('hidden');
  
  document.getElementById('loading-spinner').classList.add('hidden');
}

// Fonction pour afficher/masquer le spinner de chargement
function showLoadingSpinner(show) {
  const spinner = document.getElementById('loading-spinner');
  
  if (show) {
    spinner.classList.remove('hidden');
  } else {
    spinner.classList.add('hidden');
  }
}