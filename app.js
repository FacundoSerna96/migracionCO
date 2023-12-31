require("dotenv").config(); // Cargar variables de entorno desde .env
const LocalStorage = require("node-localstorage").LocalStorage;
const localStorage = new LocalStorage("./storage");

const fs = require('fs'); // Módulo para trabajar con archivos (solo si estás en entorno Node.js)


//console.log(localStorage.getItem('clave')); // Imprime: valor

const bodyParser = require("body-parser");

const express = require("express");
const writeToLog = require("./log");
const logBorrado = require("./logBorrado");
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var cantLote = 0;

var idBackupError = "";

// Función para leer el archivo y extraer los IDs
function leerArchivoYExtraerIDs(nombreArchivo) {
  try {
    const data = fs.readFileSync(nombreArchivo, 'utf8'); // Lee el archivo de manera sincrónica
    const lineas = data.split('\n'); // Separa por líneas

    const ids = lineas.map(linea => {
      // Aquí se asume que cada línea contiene un ID, ajusta esto según la estructura de tu archivo
      return linea.trim(); // Elimina espacios en blanco al inicio y final de la línea
    });

    return ids;
  } catch (error) {
    console.error('Error al leer el archivo:', error);
    return [];
  }
}


app.delete("/borradoCO", async (req, res) => {

  //obtiene lista de ids del archivo "idDisponiblesParaBorrar"
  const listaIDs = leerArchivoYExtraerIDs("idDisponiblesParaBorrar.txt")

  if(listaIDs){
    listaIDs.forEach(async id => {
      //se borra el nodo
      var myHeaders = new Headers();
      myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

      var requestOptions = {
        method: "DELETE",
        headers: myHeaders,
        redirect: "follow",
      };

      await fetch(
        `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${id}?permanent=false`,
        requestOptions
      )
        .then((response) => response.text())
        .then(() => {
          console.log(`La carpeta de CO con id: ${id} , se borro con exito`);
          writeToLog(`La carpeta de CO con id: ${id} , se borro con exito`);
        })
        .catch((error) => {
          console.log(
            `ERROR: La carpeta de CO con id: ${id} , no se pudo borrar, error: ${error}`
          );
          writeToLog(
            `ERROR: La carpeta de CO con id: ${id} , no se pudo borrar, error: ${error}`
          );
        });
    })
    return res.status(200).json({
      msg : "Los archivo se borraron con exito"
    })
  }else{
    return res.status(400).json({
      msg : "No se encuentra archivo 'idDisponiblesParaBorrar.txt'"
    })
  }
});


// Ruta básica
app.post("/migracionCO", async (req, res) => {
  const { uuidOrigen, uuidDestino, loteMax } = req.body;
  cantLote = 0;
  //buscar los hijos del uuidOrigen

  var requestOptions = {
    method: "GET",
    headers: {
      Authorization: "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==",
    },
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${uuidOrigen}/children?maxItems=1000000`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log("resultado de obtener todos los nodos: ", result)
      writeToLog(`Obtengo los hijos del id: ${uuidOrigen}`);
      console.log(`Obtengo los hijos del id: ${uuidOrigen}`);
      result["list"]["entries"].forEach((f) => {
        cantLote++;

        if (cantLote > loteMax) {
          /*  writeToLog(
            `Se termina la ejecucion por superar el limite del lote de ${loteMax}`
          );
          console.log(
            `Se termina la ejecucion por superar el limite del lote de ${loteMax}`
          ); */
          return;
        }

        var fecha = f["entry"]["createdAt"];
        var name = f["entry"]["name"];
        var idOrigen = f["entry"]["id"];

        idBackupError = idOrigen;

        const date = new Date(fecha);

        // Desestructurar la fecha en sus componentes
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Ten en cuenta que en JavaScript los meses comienzan desde 0 (enero es 0, febrero es 1, etc.)
        const day = date.getDate();

        //verifico si existe algun id en el localstorage
        //de esa manera sigo con el proceso que fallo en anterior intento
        if (localStorage.getItem("idBackupError") != "") {
          crearCarpeta(
            year,
            month,
            day,
            localStorage.getItem("idBackupError"),
            uuidOrigen,
            uuidDestino
          );
          localStorage.setItem("idBackupError", "");
        }

        crearCarpeta(year, month, day, idOrigen, uuidOrigen, uuidDestino);
      });
    })
    .catch((error) => {
      console.log("Error al obtener los hijos: ", error);
      writeToLog(`Error al obtener los hijos: ${error}`);
    });

  return res.status(200).json({
    msg: "La operacion se ejecuto con exito",
    res: `Uuid Origen: ${uuidOrigen} \n Uuid Destino: ${uuidDestino}`,
  });
});

const crearCarpeta = async (
  year,
  month,
  day,
  idOrigen,
  uuidOrigen,
  uuidDestino
) => {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var raw = JSON.stringify({
    name: `${day}`,
    nodeType: "cm:folder",
    relativePath: `${year}/${month}`,
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${uuidDestino}/children`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      writeToLog(`Se crea la carpeta con id: ${result["entry"]["id"]}`);
      console.log(`Se crea la carpeta con id: ${result["entry"]["id"]}`);
      encontrarCarpeta(year, month, day, idOrigen, uuidDestino);
    })
    .catch((error) => {
      writeToLog(`La estructura de carpeta ya esta creada.`);
      console.log(`La estructura de carpeta ya esta creada.`);
      encontrarCarpeta(year, month, day, idOrigen, uuidDestino);
    });
};

const encontrarCarpeta = async (year, month, day, idOrigen, uuidDestino) => {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${uuidDestino}/children?skipCount=0&maxItems=100&include=path&relativePath=${year}%2F${month}`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(`Se encuentra la carpeta con esta fecha: ${year}/${month}`);
      writeToLog(`Se encuentra la carpeta con esta fecha: ${year}/${month}`);

      //en el caso de que la carpeta este vacia
      if (result["list"]) {
        result["list"]["entries"].forEach((d) => {
          if (d["entry"]["name"] == day) {
            moverCarpeta(idOrigen, d["entry"]["id"]);
          }
        });
      } else {
        console.log("resultados al fallar en obtencion fecha: ", result);
        console.log(
          `Error al obtener carpeta con fecha: ${day}/${month}/${year}`
        );
        writeToLog(
          `Error al obtener carpeta con fecha: ${day}/${month}/${year}`
        );
      }
    })
    .catch((error) => {
      console.log("error en encontrarCarpeta: ", error);
      writeToLog(
        `Error al encontrar carpeta con fecha: ${day}/${month}/${year}`
      );
    });
};

const moverCarpeta = async (uuidOrigen, uuidDestino) => {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var raw = JSON.stringify({
    targetParentId: uuidDestino,
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${uuidOrigen}/move`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(
        `Se mueve la carpeta con id : ${uuidOrigen} a la carpeta con id: ${uuidDestino}`
      );
      writeToLog(
        `Se mueve la carpeta con id : ${uuidOrigen} a la carpeta con id: ${uuidDestino}`
      );

      // en el caso de que la carpeta este vacia
      if (result["entry"]) {
        extraerHijosGR(result["entry"]["id"], result["entry"]["name"]);
      }
    })
    .catch((error) => {
      console.log("error en moverCarpeta: ", error);
      writeToLog(
        `Error al mover carpeta con id: ${uuidOrigen} a la carpeta con id: ${uuidDestino}`
      );
    });
};

const extraerHijosGR = async (id, name) => {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  let extraerHijos = false
  do {
    await fetch(
      `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${id}/children?skipCount=0&maxItems=100`,
      requestOptions
    )
      .then((response) => response.json())
      .then((hijosGR) => {
        console.log(`Se logran extraer los hijos con id: ${id}`);
        writeToLog(`Se logran extraer los hijos con id: ${id}`);
        buscarEnCO(name, hijosGR["list"]["entries"]);
        extraerHijos = true;
      })
      .catch((error) => {
        console.log("error en extraerHijos: ", error, " se intenta de nuevo...");
        writeToLog(`Error al extraer hijos con id: ${id} , se intenta de nuevo...`);
        localStorage.setItem("idBackupError", idBackupError);
      });
  } while (!extraerHijos);
};

const buscarEnCO = async (name, hijosGR) => {
  //ir a buscar el cm:name a CO
  //si encuentra duplicado en co, devolver el id del nodo duplicada para obtener los hijos
  //si no encuentra entonces no hay duplicado, pasa a la siguiente
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var raw = JSON.stringify({
    query: {
      query: `TYPE:'cm:folder' and @cm:name:'${name}' and PATH:'/app:company_home/cm:CO//*'`,
    },
    include: ["aspectNames", "properties", "path"],
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/search/versions/1/search`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(`Se buscan carpetas en con con el nombre: ${name}`);
      writeToLog(`Se buscan carpetas en con con el nombre: ${name}`);

      let listResult = result["list"]["entries"];

      if (listResult) {
        //obtendria el nodo duplicado de co
        let hijos = extraerHijos(listResult[0]["entry"]["id"], hijosGR);
        return hijos;
      }
    })
    .catch((error) => {
      console.log(`No se encuentran carpetas con con el nombre: ${name}`);
      writeToLog(`No se encuentran carpetas con con el nombre: ${name}`);

      //localStorage.setItem("idBackupError", idBackupError);
    });
};

const extraerHijos = async (id, hijosGR) => {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${id}/children?skipCount=0&maxItems=100`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(`Se extraen hijos con id: ${id}`);
      writeToLog(`Se extraen hijos con id: ${id}`);
      compararDuplicados(hijosGR, result["list"]["entries"]);
    })
    .catch((error) => {
      console.log("error en extraerHijos: ", error);
      writeToLog(`Error al extraer hijos con id: ${id}`);

      localStorage.setItem("idBackupError", idBackupError);
    });
};

const compararDuplicados = async (hijosGR, hijosCO) => {
  var destino;
  var documentosMover = [];

  var arrayNombreCO = [];

  var arrayNombre = [];
  var arrayId = [];

  //si no hay elementos encontrados de CO
  //no hace falta la comparacion
  if (hijosCO.length == 0) {
    return;
  }

  hijosCO.forEach((h) => {
    arrayNombreCO.push(h["entry"]["name"]);
  });

  hijosGR.forEach((h) => {
    arrayNombre.push(h["entry"]["name"]);
    arrayId.push(h["entry"]["id"]);
  });

  hijosCO.forEach((h) => {
    if (arrayNombre.includes(h["entry"]["name"])) {
      //archivos duplicados
      //no se mueve
      //posible validacion de versiones
      console.log(
        "Se encuentra archivo duplicado con nombre: ",
        h["entry"]["name"]
      );
      writeToLog(
        `Se encuentra archivo duplicado con nombre: ${h["entry"]["name"]}`
      );
    } else {
      writeToLog(
        `No se encuentra archivo duplicado con nombre: ${h["entry"]["name"]}`
      );

      //en el caso de que la carpeta este vacia
      if (hijosGR[0]) {
        destino = hijosGR[0]["entry"]["parentId"];
        documentosMover.push(h["entry"]["id"]);
      }
    }
  });

  //si todos los archivos estan duplicados
  if (documentosMover.length == 0) {
    //se guarda el id para su posterior borrado
    logBorrado(`${hijosCO[0]["entry"]["parentId"]}`);

    //se borra la carpeta padre en CO
    borrarCO(`${hijosCO[0]["entry"]["parentId"]}`);
  }

  var ultimo = false;

  documentosMover.forEach((d, index) => {
    //verifica si es el ultimo a mover
    //si es asi lo marca para su posterior borrado
    if (index + 1 == documentosMover.length) {
      ultimo = true;
    }

    //mueve cada documento
    moverDoc(d, destino, ultimo, hijosCO[0]["entry"]["parentId"]);

    ultimo = false;
  });
};

const moverDoc = async (idOrigen, idDestino, ultimo, parent) => {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var raw = JSON.stringify({
    targetParentId: idDestino,
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${idOrigen}/move`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log(
        `Se mueve documento con id: ${idOrigen} a la carpeta con id: ${idDestino}`
      );
      writeToLog(
        `Se mueve documento con id: ${idOrigen} a la carpeta con id: ${idDestino}`
      );

      if (ultimo) {
        //se guarda el id para su posterior borrado
        logBorrado(parent);

        //se borra la carpeta padre en CO
        borrarCO(parent);
      }
    })
    .catch((error) => {
      console.log("error en moverDoc", error);
      writeToLog(
        `Error al mover el documento con id: ${idOrigen} a la carpeta con id: ${idDestino}`
      );

      localStorage.setItem("idBackupError", idBackupError);
    });
};

const borrarCO = async (idAborrar) => {
  //borra carpetas en co
  writeToLog(`Se borra la carpeta en CO con id: ${idAborrar}`);

  return

  //se borra el nodo
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var requestOptions = {
    method: "DELETE",
    headers: myHeaders,
    redirect: "follow",
  };


  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${idAborrar}?permanent=false`,
    requestOptions
  )
    .then((response) => response.text())
    .then(() => {
      console.log(`La carpeta de CO con id: ${idAborrar} , se borro con exto`);
      writeToLog(`La carpeta de CO con id: ${idAborrar} , se borro con exito`);
    })
    .catch((error) => {
      console.log(
        `ERROR: La carpeta de CO con id: ${idAborrar} , no se pudo borrar, error: ${error}`
      );
      writeToLog(
        `ERROR: La carpeta de CO con id: ${idAborrar} , no se pudo borrar, error: ${error}`
      );
    });
};

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
