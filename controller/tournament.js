const con  = require("../models/ConnectToDatabase");

module.exports = async (req, res) => {
    res.json({ success: true, message: "Tournament API is working!" });
    // const db = await con.getConnection();
    // const getTeam = "SELECT Team_Name FROM Team_Info WHERE User_Id = ?"
    // if (!req.session || !req.session.user || !req.session.user.userId) {
    //     return res.status(401).json({success: false, message: "User not authenticated"});
    // }

    // const [rows] = await db.execute(getTeam, [req.session.user.userId])
    // res.json({ success: true, team: rows });
    // const getAllTeams = "SELECT * FROM Team_Info"
    // const [rows, fields] = await db.execute(getAllTeams);
    // res.json({success: true, data: [rows, fields]});

}