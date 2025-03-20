const con = require("../models/ConnectToDatabase");

module.exports = async function(req, res) {

    const db = await con.getConnection();
    const getTournaments = "SELECT Tournament_Name, Max_Teams, Current_Teams from tournaments";

    const query = await db.execute(getTournaments);
    res.json({success: true, message: "got tournaments successfully", data: query});
};