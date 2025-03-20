const con = require("../models/ConnectToDatabase")
const axios = require("axios");
const session = require("express-session")
require("dotenv").config();

module.exports = async (req, res) => {
    try {
        const { teamName, playerRole } = req.body
        const insertTeamQuery = `INSERT INTO Team_Info (Team_Name, ${playerRole}, User_Id) VALUES (?, ?, ?)`;
        const db = await con.getConnection();
        await db.execute(insertTeamQuery, [teamName, req.session.user.userId, req.session.user.userId])
        console.log("Received data:", req.body);
        console.log("User ID:", req.session.user.userId);
        res.json({ success: true, message: "Team created successfully!" });
    } catch (error) {
        console.error("Error in teamController:", error);
        res.status(500).json({ success: false, message: "Error creating team." });
    }
};