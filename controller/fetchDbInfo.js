const con = require("../models/ConnectToDatabase");
const axios = require("axios");

module.exports = async (req, res) => {
    const connection = con.getConnection()

    const getTeamInfo = "SELECT Team_Name, Team_Members FROM Team_Info";

    const [teamInfo] = (await connection).execute(getTeamInfo);
    console.log("team info", teamInfo);
    return teamInfo;
}