module.exports = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erreur lors de la déconnexion :", err)
            return res.json({ success: false, message: "Erreur lors de la déconnexion." })
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Déconnexion réussie !" })
    })
}
