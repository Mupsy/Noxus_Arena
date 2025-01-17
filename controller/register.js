const con = require("../models/ConnectToDatabase");


module.exports = async (req, res) => {
    const { email, password, username, tagline } = req.body;

    const insertUserQuery = "INSERT INTO Users (User_Email, User_Password, NA_Rank) VALUES (?, ?, 0)";
    const selectUserIdQuery = "SELECT id FROM Users WHERE User_Email = ?";
    const insertLoLInfoQuery = "INSERT INTO LoL_Info (User_ID, Summoner_Name, Summoner_TagLine) VALUES (?, ?, ?)";

    let connection;

    try {
        

        connection = await con.getConnection();


        await connection.execute(insertUserQuery, [email, password]);


        const [userResult] = await connection.execute(selectUserIdQuery, [email]);
        if (userResult.length === 0) {
            throw new Error("Failed to retrieve user ID after insertion.");
        }
        console.log(userResult);
        const userId = userResult.id;


        await connection.execute(insertLoLInfoQuery, [userId, username, tagline]);


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
