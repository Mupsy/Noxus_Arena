const con = require("../models/ConnectToDatabase")
const axios = require("axios");
require("dotenv").config();

module.exports = async (req, res) => {
    try {
        const { teamName, playerRole, champion } = req.body;
        console.log("Received data:", req.body);
        // Insert database logic or other processing here
        res.json({ success: true, message: "Team created successfully!" });
    } catch (error) {
        console.error("Error in teamController:", error);
        res.status(500).json({ success: false, message: "Error creating team." });
    }
};