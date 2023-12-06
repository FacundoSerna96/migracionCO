require("dotenv").config(); // Cargar variables de entorno desde .env

const bodyParser = require("body-parser");

const express = require("express");
const { writeToLog, backupIdError } = require("./log");
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var cantLote = 0;

// Ruta básica
app.post("/migracionCO", async (req, res) => {
  const { uuidOrigen, uuidDestino, loteMax } = req.body;

  //buscar los hijos del uuidOrigen

  var requestOptions = {
    method: "GET",
    headers: {
      Authorization: "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==",
    },
    redirect: "follow",
  };

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${uuidOrigen}/children?skipCount=0&maxItems=100&include=path`,
    requestOptions
  )
    .then((response) => response.json())
    .then((res) => {
      writeToLog(`Obtengo los hijos del id: ${uuidOrigen}`);
      console.log(`Obtengo los hijos del id: ${uuidOrigen}`);
      res["list"]["entries"].forEach((f) => {
        cantLote++;

        if (cantLote > loteMax) {
          writeToLog(
            `Se termina la ejecucion por superar el limite del lote de ${loteMax}`
          );
          console.log(
            `Se termina la ejecucion por superar el limite del lote de ${loteMax}`
          );
          return res.status(200).json({
            msg: "La operacion se ejecuto con exito",
            res: `Uuid Origen: ${uuidOrigen} \n Uuid Destino: ${uuidDestino}`,
          });
        }

        var fecha = f["entry"]["createdAt"];
        var name = f["entry"]["name"];
        var idOrigen = f["entry"]["id"];

        const date = new Date(fecha);

        // Desestructurar la fecha en sus componentes
        const year = date.getFullYear();
        const month = date.getMonth(); // Ten en cuenta que en JavaScript los meses comienzan desde 0 (enero es 0, febrero es 1, etc.)
        const day = date.getDate();

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
      console.log(
        `Se encuentra la carpeta con esta fecha: ${day}/${month}/${year}`
      );
      writeToLog(
        `Se encuentra la carpeta con esta fecha: ${day}/${month}/${year}`
      );
      result["list"]["entries"].forEach((d) => {
        if (d["entry"]["name"] == day) {
          moverCarpeta(idOrigen, d["entry"]["id"]);
        }
      });
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
      extraerHijosGR(result["entry"]["id"], result["entry"]["name"]);
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

  await fetch(
    `${process.env.API}/-default-/public/alfresco/versions/1/nodes/${id}/children?skipCount=0&maxItems=100`,
    requestOptions
  )
    .then((response) => response.json())
    .then((hijosGR) => {
      console.log(`Se logran extraer los hijos con id: ${id}`);
      writeToLog(`Se logran extraer los hijos con id: ${id}`);
      buscarEnCO(name, hijosGR["list"]["entries"]);
    })
    .catch((error) => {
      console.log("error en extraerHijos: ", error);
      writeToLog(`Error al extraer hijos con id: ${id}`);
    });
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
      console.log(`Error al buscan carpetas en con con el nombre: ${name}`);
      console.log("error: ", error);
      writeToLog(`Error al buscan carpetas en con con el nombre: ${name}`);
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
    });
};

const compararDuplicados = async (hijosGR, hijosCO) => {
  var destino;
  var documentosMover = [];

  var arrayNombreCO = [];

  var arrayNombre = [];
  var arrayId = [];

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
      destino = hijosGR[0]["entry"]["parentId"];
      documentosMover.push(h["entry"]["id"]);
    }
  });

  documentosMover.forEach((d) => {
    //mueve cada documento
    moverDoc(d, destino);
  });
};

const moverDoc = async (idOrigen, idDestino) => {
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
      console.log("resultado de moverDoc : ", result);
      writeToLog(
        `Se mueve documento con id: ${idOrigen} a la carpeta con id: ${idDestino}`
      );
    })
    .catch((error) => {
      console.log("error en moverDoc", error);
      writeToLog(
        `Error al mover el documento con id: ${idOrigen} a la carpeta con id: ${idDestino}`
      );
    });
};

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
