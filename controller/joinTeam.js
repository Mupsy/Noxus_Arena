const con = require("../models/ConnectToDatabase")
const axios = require("axios");
const session = require("express-session")
require("dotenv").config();

module.exports = async (req, res) => {
    let role
    try {
        const {teamId, playerRole} = req.body
        const select = `SELECT ${playerRole}
                        FROM teams
                        WHERE Team_name = ${teamId}`;
        const update = `UPDATE ${playerRole} SET ${playerRole} WHERE ${teamId}`
        const db = await con.getConnection();
        role = await db.execute(select);
        console.log("Received data:", req.body);
        console.log("User ID:", req.session.user.userId);
        if (role == null) {
            res.json({success: true, message: "Team join successfully!"});
            await db.execute(select);
        }
        else
        {
            res.json({success: false, message: "Team already has this role!"});
        }
    } catch (error) {
        console.error("Error in teamController:", error);
        res.status(500).json({success: false, message: "Error creating team."});
    }
};