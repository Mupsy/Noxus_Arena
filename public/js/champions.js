// Fonction pour charger la liste des champions
async function loadChampions() {
    try {
      const response = await fetch("/api/champions")
      const champions = await response.json()
  
      return champions
    } catch (error) {
      console.error("Erreur lors du chargement des champions:", error)
      return []
    }
  }
  
  // Fonction pour créer une carte de champion
  function createChampionCard(champion) {
    const card = document.createElement("div")
    card.className =
      "champion-card bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:transform hover:scale-105"
  
    const link = document.createElement("a")
    link.href = `/champion.html?id=${champion.id}`
  
    const img = document.createElement("img")
    img.src = champion.image
    img.alt = champion.name
    img.className = "w-full h-40 object-cover"
  
    const content = document.createElement("div")
    content.className = "p-4"
  
    const name = document.createElement("h3")
    name.textContent = champion.name
    name.className = "text-lg font-bold text-gray-900 dark:text-white"
  
    content.appendChild(name)
    link.appendChild(img)
    link.appendChild(content)
    card.appendChild(link)
  
    return card
  }
  
  // Fonction pour afficher les champions
  function displayChampions(champions, container, searchTerm = "", filterTag = "") {
    container.innerHTML = ""
  
    // Filtrer les champions
    let filteredChampions = champions
  
    if (searchTerm) {
      filteredChampions = filteredChampions.filter((champion) =>
        champion.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
  
    if (filterTag && filterTag !== "all") {
      filteredChampions = filteredChampions.filter((champion) => champion.tags && champion.tags.includes(filterTag))
    }
  
    // Afficher les champions filtrés
    if (filteredChampions.length === 0) {
      const noResults = document.createElement("div")
      noResults.className = "col-span-full text-center py-8 text-gray-500 dark:text-gray-400"
      noResults.textContent = "Aucun champion trouvé"
      container.appendChild(noResults)
      return
    }
  
    filteredChampions.forEach((champion) => {
      const card = createChampionCard(champion)
      container.appendChild(card)
    })
  }
  
  // Exporter les fonctions
  export { loadChampions, displayChampions }
  
  