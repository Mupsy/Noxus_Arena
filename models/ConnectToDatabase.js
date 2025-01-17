var mariadb = require('mariadb');
require("dotenv").config();

var con = mariadb.createPool({
    host: "100.92.95.45",
<<<<<<< HEAD
    user: process.env.USER_BDD,
    password: process.env.USER_BDD_PW,
=======
    user: '',
    password: "",
>>>>>>> d85cb8a9e8ce6f6c5fdef30e418623cf12d8c156
    database:"Noxus_Arena",
    port: 3306,
    connectionLimit: 50,  // Augmenter le nombre de connexions dans le pool
    connectTimeout: 20000
});

con.getConnection().then(conn => {
    console.log('Connecté à MariaDB');
}).catch(err => {console.error("Erreur de connexion à MariaDB :", err.message)});

module.exports = con;
