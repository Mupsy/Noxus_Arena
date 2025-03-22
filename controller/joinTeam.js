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
        // Construire la requête en injectant le nom de colonne validé
        const selectQuery = `SELECT \`${playerRole}\` FROM team_info WHERE Team_Name = ?`;
        const [rows] = await db.execute(selectQuery, [teamId]);
        console.log("Rows returned:", rows);
        console.log("Received data:", req.body);
        console.log("User ID:", req.session.user && req.session.user.userId);

        let roleValue;
        // Vérifiez si rows est un tableau
        if (Array.isArray(rows)) {
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "Team not found" });
            }
            roleValue = rows[0][playerRole];
        } else if (typeof rows === 'object' && rows !== null) {
            // Dans certains cas, rows est directement un objet
            roleValue = rows[playerRole];
        } else {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Si la valeur dans la colonne est null, le rôle est libre
        if (roleValue == null) {
            const userId = req.session.user ? req.session.user.userId : null;
            if (!userId) {
                return res.status(400).json({ success: false, message: "User not authenticated" });
            }

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
