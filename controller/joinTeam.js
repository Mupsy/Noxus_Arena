const con = require("../models/ConnectToDatabase");
require("dotenv").config();

module.exports = async (req, res) => {
    try {
        const { teamId, playerRole } = req.body;
        const allowedRoles = ["TOP", "JGL", "MID", "ADC", "SUP"];
        if (!allowedRoles.includes(playerRole)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        const db = await con.getConnection();

        // Sélectionner toutes les colonnes de rôles afin de vérifier si l'utilisateur est déjà présent
        const selectQuery = `SELECT \`TOP\`, \`JGL\`, \`MID\`, \`ADC\`, \`SUP\` FROM team_info WHERE Team_Name = ?`;
        const [rows] = await db.execute(selectQuery, [teamId]);
        console.log("Rows returned:", rows);
        console.log("Received data:", req.body);
        console.log("User ID:", req.session.user && req.session.user.userId);

        let teamRow;
        if (Array.isArray(rows)) {
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "Team not found" });
            }
            teamRow = rows[0];
        } else {
            teamRow = rows;
        }

        const userId = req.session.user ? req.session.user.userId : null;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User not authenticated" });
        }

        // Vérifier si l'utilisateur est déjà dans l'équipe avec un autre rôle
        for (let role of allowedRoles) {
            if (role !== playerRole && teamRow[role] === userId) {
                return res.status(400).json({
                    success: false,
                    message: "User already in team with another role"
                });
            }
        }

        // Vérifier si le rôle demandé est libre
        if (teamRow[playerRole] == null) {
            const updateQuery = `UPDATE team_info SET \`${playerRole}\` = ? WHERE Team_Name = ?`;
            await db.execute(updateQuery, [userId, teamId]);
            return res.json({ success: true, message: "Team join successfully!" });
        } else {
            return res.json({ success: false, message: "Team already has this role!" });
        }
    } catch (error) {
        console.error("Error in teamController:", error);
        res.status(500).json({ success: false, message: "Error joining team.", error: error.message });
    }
};
