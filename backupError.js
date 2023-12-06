const fs = require('fs');
const path = require('path');

// Función para guardar un id en caso de error
// para no romper el proceso
const backupIdError = (message) => {
    const logFileName = "backupID.txt";
    const logFilePath = path.join(__dirname, logFileName);
    const logEntry = `${message}`;
    fs.appendFile(logFilePath, logEntry, err => {
        if (err) {
        console.error('Error al escribir en el archivo de log: ', err);
        }
    });
}


module.exports = backupIdError;