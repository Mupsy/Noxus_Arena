var mariadb = require('mariadb');
require("dotenv").config();

var con = mariadb.createPool({
    host: "127.0.0.1",

    user: process.env.USER_BDD,
    password: process.env.USER_BDD_PW,
    database:"Noxus_arena",
    port: 3306,
    connectionLimit: 50,  // Augmenter le nombre de connexions dans le pool
    connectTimeout: 20000
});

con.getConnection().then(conn => {
    console.log('Connecté à MariaDB');
}).catch(err => {console.error("Erreur de connexion à MariaDB :", err.message)});

module.exports = con;
