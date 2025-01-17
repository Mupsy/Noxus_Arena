const con = require("../models/ConnectToDatabase");
const session = require("express-session");

module.exports = async (req, res) => {
    const { email, password } = req.body;

    console.log("Email : ", email);
    console.log("Password : ", password);
    const query = "SELECT * FROM Users WHERE User_Email = ? and User_Password = ?";

    try {
        // Connexion à la base de données
        const connection = await con.getConnection();

        // Exécution de la requête
        const [results] = await connection.execute(query, [email, password]);

        // Libération de la connexion
        connection.release();

        // Vérification du résultat

// Vérifier si 'results' contient un utilisateur
        if (results && results.id) {
            // Connexion réussie, l'utilisateur est trouvé

            // Assurez-vous que la session est bien initialisée
            if (!req.session) {
                req.session = {};
            }

            // Enregistrer l'utilisateur dans la session
            req.session.user = {
                email: results.User_Email,  // Accéder à l'élément de l'objet
                userId: results.id,         // Accéder à l'élément de l'objet
                isLoggedIn: true,
            };

            console.log("Session après mise à jour : ", req.session);

            // Sauvegarder la session et envoyer la réponse uniquement après cela
            req.session.save((err) => {
                if (err) {
                    console.error("Erreur de sauvegarde de la session :", err);
                    return res.json({ success: false, message: 'Erreur de session.' });
                }

                // Envoyer la réponse après que la session a été sauvegardée
                res.json({ success: true, message: 'Connexion réussie !' });
            });
        } else {
            console.log("Aucun utilisateur trouvé");
            res.json({ success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
        }

    } catch (err) {
        console.error('Erreur de requête :', err);
        res.json({ success: false, message: 'Erreur serveur' });
    }
};
