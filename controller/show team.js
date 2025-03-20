const con = require("../models/ConnectToDatabase");

module.exports = async function(req, res) {

    const db = await con.getConnection();
    const getTeam = "SELECT * FROM Team_Info";
    const query = await db.execute(getTeam);

    res.json({success: true, message: "got tournaments successfully", data: query});
};