const con = require("../models/ConnectToDatabase");

module.exports = async (req, res) => {
    const query = "SELECT * FROM LoL_Info WHERE User_ID = ?";

    try {
        // Get a database connection
        const connect = await con.getConnection();

        // Execute the query with the provided user ID
        const [results] = await connect.execute(query, [req.body.id]);

        // Release the connection back to the pool
        connect.release();

        // Check if results were found and respond appropriately
        if (results && results.User_ID) {
            res.json({ success: true, results });
        } else {
            res.json({ success: false, message: "No results found" });
        }
    } catch (error) {
        // Log the error and send an error response
        console.error("Database query error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
