const con = require("../models/ConnectToDatabase");

module.exports = async function (req, res) {

    const {tournamentName, maxTeams} = req.body;
    const db = await con.getConnection();
    const addTournament = "INSERT INTO tournaments (Tournament_Name, Max_Teams, Current_Teams, Tournament_Creator) VALUES (?, ?, 1, ?)";
    await db.execute(addTournament, [tournamentName, maxTeams, req.session.user.userId]);
    res.json({message:"success"});

};