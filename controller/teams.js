const con = require("../models/ConnectToDatabase")
const axios = require("axios");
require("dotenv").config();

//essayer de creer un chemin avec express pour envoyer 'rows'??

module.exports = async (req, res) => {
    connection = await con.getConnection();
    const getTeamInfo = "SELECT Team_Name, Player_Role, Player_Champion FROM Team_Info";

    const [rows] = await connection.execute(getTeamInfo)
    console.log("team rows", rows);

    res.json({
        success: true,
        message: "team info",
        data:rows,
    });

    try {
        const insertTeamInfo = "INSERT INTO Team_Info (Team_Name, Player_Role, Player_Champion) VALUES (?, ?, ?)";

        const { teamName, playerRole, champion } = req.body;
        //connect to db
        console.log("Connected to Database:");

        //do team info query
        await connection.execute(insertTeamInfo, [teamName, playerRole, champion]);
        console.log("Team info added to db")

        //show information on the page


        // res.json({ success: true, message: "Team created successfully!" });
    } catch (error) {
        console.error("Error in teamController:", error);
        res.status(500).json({ success: false, message: "Error creating team." });
    }
};