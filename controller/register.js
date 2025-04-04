const con = require("../models/ConnectToDatabase");
const axios = require('axios');
require("dotenv").config();

module.exports = async (req, res) => {
    const { email, password, username, tagline } = req.body;

    const insertUserQuery = "INSERT INTO Users (User_Email, User_Password, NA_Rank) VALUES (?, ?, 0)";
    const selectUserIdQuery = "SELECT * FROM Users WHERE User_Email = ?";
    const insertLoLInfoQuery = "INSERT INTO LoL_Info (User_ID, Summoner_Name, Summoner_TagLine, Summoner_PUUID, Summoner_LvL, Summoner_Rank, Summoner_ID, Summoner_Icon_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    let connection;

    try {
        // Connexion à la base de données
        connection = await con.getConnection();
        console.log("Connexion à la base de données réussie");

        // Insertion de l'utilisateur
        await connection.execute(insertUserQuery, [email, password]);
        console.log("Utilisateur inséré");

        // Récupération de l'ID de l'utilisateur
        const userResults = await connection.execute(selectUserIdQuery, [email]);
        if (userResults.length === 0) {
            throw new Error("Failed to retrieve user ID after insertion.");
        }
        console.log("User result:", userResults);
        const userId = userResults[0].id; // Accéder correctement à l'ID

        // Récupération du PUUID via l'API
        const puuidResponse = await axios.get(`http://localhost:3000/api/user/${username}/${tagline}`);
        const puuid = puuidResponse.data.puuid;
        console.log("PUUID:", puuid);

        const summIdResponse = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY}`);
        const summId = summIdResponse.data.id;
        const lvl = summIdResponse.data.summonerLevel;
        const iconId = summIdResponse.data.profileIconId;
        console.log("Summoner ID : ", summId);
        console.log("Summoner Level : ", lvl);

        const rankResponse = await axios.get(`https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summId}?api_key=${process.env.RIOT_API_KEY}`);
        console.log(rankResponse.data);
        
        let rank = "Unranked"; // Valeur par défaut
        const soloQueueEntries = rankResponse.data.filter(entry => entry.queueType === "RANKED_SOLO_5x5");

        if (soloQueueEntries.length > 0) {
            const soloQueueInfo = soloQueueEntries[0]; // Récupérer la première entrée
            rank = soloQueueInfo.tier + " " + soloQueueInfo.rank;
            console.log("Rank:", rank);
        } else {
            console.log("No data for RANKED_SOLO_5x5");
        }

        // Insertion des informations LoL dans la base de données
        await connection.execute(insertLoLInfoQuery, [userId, username, tagline, puuid, lvl, rank, summId, iconId]);

        // Initialisation de la session
        if (!req.session) {
            req.session = {};
        }

        req.session.user = {
            email: userResults[0].User_Email,
            userId: userId,
            isLoggedIn: true,
        };

        console.log("Session après mise à jour : ", req.session);

        // Réponse de succès
        res.json({ success: true, message: "Inscription réussie !" });
    } catch (err) {
        console.error("Erreur de requête :", err);
        res.json({ success: false, message: "Erreur serveur" });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};