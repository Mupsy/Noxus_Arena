const con = require("../models/ConnectToDatabase");
const axios = require('axios');
require("dotenv").config();

module.exports = async (req, res) => {
    const { email, password, username, tagline } = req.body;

    const insertUserQuery = "INSERT INTO Users (User_Email, User_Password, NA_Rank) VALUES (?, ?, 0)";
    const selectUserIdQuery = "SELECT id FROM Users WHERE User_Email = ?";
    const insertLoLInfoQuery = "INSERT INTO LoL_Info (User_ID, Summoner_Name, Summoner_TagLine, Summoner_PUUID,Summoner_LvL, Summoner_Rank, Summoner_ID, Summoner_Icon_ID) VALUES (?, ?, ?, ?, ?, ?, ? , ?)";

    let connection;

    try {
        connection = await con.getConnection();

        // Insertion de l'utilisateur
        await connection.execute(insertUserQuery, [email, password]);

        // Récupération de l'ID de l'utilisateur
        const [userResult] = await connection.execute(selectUserIdQuery, [email]);
        if (userResult.length === 0) {
            throw new Error("Failed to retrieve user ID after insertion.");
        }
        console.log(userResult);
        const userId = userResult.id; // Assurez-vous d'accéder correctement à l'ID dans le tableau de résultats.

        // Récupération du PUUID via l'API
        const puuidResponse = await axios.get(`http://localhost:3000/api/user/${username}/${tagline}`);

        const puuid = puuidResponse.data.puuid;
        console.log("PUUID:", puuid);

        
        const summIdResponse = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY}`)

        const summId = summIdResponse.data.id;
        const lvl = summIdResponse.data.summonerLevel;
        const iconId = summIdResponse.data.profileIconId;
        console.log("Summoner ID : ", summId);
        console.log("lvl : ", lvl);

        const rankResponse = await axios.get(`https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summId}?api_key=${process.env.RIOT_API_KEY}`);
        console.log(rankResponse.data); // Affiche les données reçues dans la console
        var rank = " ";
        // Vérification pour obtenir le rang (si la réponse n'est pas vide)
        if (rankResponse.data && rankResponse.data.length > 0) {
            rank = rankResponse.data[0].tier + " " + rankResponse.data[0].rank; 
            console.log(rank); // Affiche le rang
        } else {
            console.log("Aucun rang trouvé pour ce summoner.");
            rank = "unranked";
        }
        await connection.execute(insertLoLInfoQuery, [userId, username, tagline, puuid, lvl, rank, summId, iconId]);

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
