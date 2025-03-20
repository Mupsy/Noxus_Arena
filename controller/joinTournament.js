const con = require("../models/ConnectToDatabase");

module.exports = async function(req, res) {
    try {
        const db = await con.getConnection();
        const { tournamentName } = req.body;
        const userId = req.session.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated." });
        }

        console.log(`User ID: ${userId}`);

        // Ensure teams is an array and access the first element
        const [teams] = await db.execute(
            "SELECT Id, Tournament_Id FROM Team_Info WHERE User_Id = ? AND Tournament_Id = 0",
            [userId]
        );

        console.log(`Teams Found:`, teams);

        // Check if there are no teams or the first team's Tournament_Id is not 0
        if (teams.Id === undefined || teams.Tournament_Id !== 0) {
            console.log(teams.id, teams.Tournament_Id)
            return res.status(400).json({ message: "You are not in a team or already in a tournament." });
        }

        // Access the first team's ID
        const teamId = teams.Id;
        console.log(teamId)

        const [tournaments] = await db.execute(
            "SELECT id, Current_Teams, Max_Teams FROM Tournaments WHERE Tournament_name = ? AND Current_Teams < Max_Teams LIMIT 1",
            [tournamentName]
        );

        console.log(`Tournaments Found:`, tournaments);

        if (tournaments.Current_Teams === tournaments.Max_Teams || tournaments.id === undefined) {
            return res.status(404).json({ message: "Tournament not found or full." });
        }

        const tournamentId = tournaments.id;  // Access first tournament
        const currentTeams = tournaments.Current_Teams;

        console.log(`Joining tournament: ${tournamentId} with team: ${teamId}`);

        // Update Team_Info with Tournament_Id
        await db.execute(
            "UPDATE Team_Info SET Tournament_Id = ? WHERE id = ?",
            [tournamentId, teamId]
        );

        // Update Tournaments with the new number of teams
        await db.execute(
            "UPDATE Tournaments SET Current_Teams = ? WHERE id = ?",
            [currentTeams + 1, tournamentId]
        );

        res.status(200).json({ message: "Successfully joined the tournament!" });
    } catch (error) {
        console.error("Error processing join request:", error);
        res.status(500).json({ message: "An internal server error occurred." });
    }
};
