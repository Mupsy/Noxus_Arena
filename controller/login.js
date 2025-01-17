const con = require("../models/ConnectToDatabase");

module.exports = async (req, res) => {
    const { email, password } = req.body;


    const query = "SELECT * FROM Users WHERE User_Email = ? and User_Password = ?";

    try {
        // Connexion à la base de données
        const connection = await con.getConnection(); // Assurez-vous que getConnection est une fonction asynchrone

        // Exécution de la requête
        const [results] = await connection.execute(query, [email, password]);
        
        // Libération de la connexion
        connection.release();
        // Vérification du résultat
        if (results) {
            const resultsJson = JSON.stringify(results);
            if(resultsJson.length > 0 ){
                // Utilisateur trouvé, connexion réussie
                res.json({ success: true, message: 'Connexion réussie !' });
            }
        } else {
            // Aucun utilisateur trouvé avec ces identifiants
            res.json({ success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
        }  
    } catch (err) {
        console.error('Erreur de requête :', err);
        res.json({ success: false, message: 'Erreur serveur' });
    }
};
