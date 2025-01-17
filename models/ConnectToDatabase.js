var mariadb = require('mariadb');

var con = mariadb.createPool({
    host: "100.92.95.45",
    user: '',
    password: "",
    database:"Noxus_Arena",
    port: 3306,
    connectionLimit: 50,  // Augmenter le nombre de connexions dans le pool
    connectTimeout: 20000
});

con.getConnection().then(conn => {
    console.log('Connecté à MariaDB');
}).catch(err => {console.error("Erreur de connexion à MariaDB :", err.message)});

module.exports = con;
