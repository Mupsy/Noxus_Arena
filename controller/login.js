const con = require("../models/ConnectToDatabase");
const axios = require('axios');
require("dotenv").config();

module.exports = async (req, res) => {
    const { email, password } = req.body;

    console.log("Email : ", email);
    console.log("Password : ", password);
    const query = "SELECT * FROM Users WHERE User_Email = ? and User_Password = ?";
    const getLolInfoQuery = "SELECT * FROM LoL_Info WHERE User_ID = ?";
    const updateLolInfoQuery = "UPDATE LoL_Info SET Summoner_LvL = ?, Summoner_Rank = ?, Summoner_Icon_ID = ? WHERE User_ID = ?";

    let connection;

    try {
        // Connexion à la base de données
        connection = await con.getConnection();

        // Exécution de la requête
        const results = await connection.execute(query, [email, password]);

        // Vérifier si 'results' contient un utilisateur
        if (results && results.length > 0) {
            const user = results;
            console.log(user); // Récupérer le premier utilisateur trouvé
            u_email = user[0].User_Email;
            id = user[0].id;
            console.log("Utilisateur trouvé : ", email + ", id :", id);
            // Assurez-vous que la session est bien initialisée
            if (!req.session) {
                req.session = {};
            }

            // Récupérer les informations LoL de l'utilisateur
            const lolInfoResults = await connection.execute(getLolInfoQuery, [id]);
            
            // Enregistrer l'utilisateur dans la session avec les infos LoL
            req.session.user = {
                email: u_email,
                userId: id,
                isLoggedIn: true,
            };

            // Ajouter les informations LoL à la session si disponibles
            if (lolInfoResults && lolInfoResults.length > 0) {
                const lolInfo = lolInfoResults;
                req.session.user.summonerName = lolInfo[0].Summoner_Name;
                req.session.user.summonerTagLine = lolInfo[0].Summoner_TagLine;
                req.session.user.summonerIconId = lolInfo[0].Summoner_Icon_ID;
            }

            console.log("Session après mise à jour : ", req.session);

            // Mise à jour des informations LoL
            try {
                if (lolInfoResults && lolInfoResults.length > 0) {
                    const lolInfo = lolInfoResults;
                    
                    // Récupérer les informations mises à jour depuis l'API Riot
                    const region = process.env.REGION.toLowerCase();
                    const summIdResponse = await axios.get(`https://${region}1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${lolInfo[0].Summoner_PUUID}?api_key=${process.env.RIOT_API_KEY}`);
                    const lvl = summIdResponse.data.summonerLevel;
                    const iconId = summIdResponse.data.profileIconId;
                    const summId = summIdResponse.data.id;
                    
                    console.log("Summoner Level : ", lvl);
                    console.log("Summoner Icon ID : ", iconId);

                    // Récupérer le rang du joueur
                    const rankResponse = await axios.get(`https://${region}1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summId}?api_key=${process.env.RIOT_API_KEY}`);
                    
                    let rank = "Unranked"; // Valeur par défaut
                    const soloQueueEntries = rankResponse.data.filter(entry => entry.queueType === "RANKED_SOLO_5x5");
                    console.log("Solo queue entries:", soloQueueEntries);
                    if (soloQueueEntries.length > 0) {
                        const soloQueueInfo = soloQueueEntries[0]; // Récupérer la première entrée
                        rank = soloQueueInfo.tier + " " + soloQueueInfo.rank;
                        console.log("Rank:", rank);
                    } else {
                        console.log("No data for RANKED_SOLO_5x5");
                    }

                    // Mettre à jour les informations LoL dans la base de données
                    await connection.execute(updateLolInfoQuery, [lvl, rank, iconId, user[0].id]);
                    console.log("Informations LoL mises à jour avec succès");
                    
                    // Mettre à jour l'icône dans la session
                    req.session.user.summonerIconId = iconId;
                }
            } catch (apiError) {
                console.error("Erreur lors de la mise à jour des informations LoL:", apiError);
                // Continuer malgré l'erreur de mise à jour des infos LoL
            }

            // Libération de la connexion
            connection.release();

            // Sauvegarder la session et envoyer la réponse
            if (req.session.save) {
                req.session.save((err) => {
                    if (err) {
                        console.error("Erreur de sauvegarde de la session :", err);
                        return res.json({ success: false, message: 'Erreur de session.' });
                    }
                    
                    // Envoyer la réponse après que la session a été sauvegardée
                    res.json({ success: true, message: 'Connexion réussie !' });
                });
            } else {
                // Si req.session.save n'est pas disponible, envoyer directement la réponse
                res.json({ success: true, message: 'Connexion réussie !' });
            }
        } else {
            console.log("Aucun utilisateur trouvé");
            if (connection) connection.release();
            res.json({ success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
        }
    } catch (err) {
        console.error('Erreur de requête :', err);
        if (connection) connection.release();
        res.json({ success: false, message: 'Erreur serveur' });
    }
};