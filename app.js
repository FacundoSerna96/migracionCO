require("dotenv").config(); // Cargar variables de entorno desde .env

const bodyParser = require("body-parser");

const express = require("express");
const writeToLog = require("./log");
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ruta básica
app.post("/migracionCO", async (req, res) => {
  const { uuidOrigen, uuidDestino } = req.body;

  //buscar los hijos del uuidOrigen

  var requestOptions = {
    method: "GET",
    headers: {
      Authorization: "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==",
    },
    redirect: "follow",
  };

  await fetch(
    `https://testdms.tigo.com.co/alfresco/api/-default-/public/alfresco/versions/1/nodes/${uuidOrigen}/children?skipCount=0&maxItems=100&include=path`,
    requestOptions
  )
    .then((response) => response.json())
    .then((res) => {
      console.log(res["list"]["entries"]);
      res["list"]["entries"].forEach((f) => {
        var fecha = f["entry"]["createdAt"];
        var name = f["entry"]["name"];
        var idOrigen = f["entry"]["id"];

        const date = new Date(fecha);

        // Desestructurar la fecha en sus componentes
        const year = date.getFullYear();
        const month = date.getMonth(); // Ten en cuenta que en JavaScript los meses comienzan desde 0 (enero es 0, febrero es 1, etc.)
        const day = date.getDate();

        console.log(`Año: ${year}, Mes: ${month + 1}, Día: ${day}`);

        crearCarpeta(year, month, day,idOrigen, uuidOrigen, uuidDestino);
      });
    })
    .catch((error) => console.log("Error al obtener los hijos: ", error));

  return res.status(200).json({
    msg: "La operacion se ejecuto con exito",
    res: `Uuid Origen: ${uuidOrigen} \n Uuid Destino: ${uuidDestino}`,
  });

  //recorrerlos, ver su cm:created y crear la estructura de carpetas

  //moverlos a la estructura nueva

  //consulta cmis para extraer los datos de generar radicado = vector de radicados

  //recorremos el vector y para cada radicado buscamos en co el igual

  //si se encuentra se crea el path en generar radicado se mueve los archivos al nuevo path y se controlan los documentos
  // que no estes duplicados y se pasa los documentos que no esten
});

const crearCarpeta = async (year, month, day,idOrigen, uuidOrigen, uuidDestino) => {
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
    `https://testdms.tigo.com.co/alfresco/api/-default-/public/alfresco/versions/1/nodes/${uuidDestino}/children`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log("result despues crear la carpeta: ", result);
      encontrarCarpeta(year, month, day, idOrigen, uuidDestino);
    })
    .catch((error) => {
      console.log("error", error);
      encontrarCarpeta(year, month, day, idOrigen, uuidDestino);
    });
};

const encontrarCarpeta = async (year, month, day,idOrigen, uuidDestino) => {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg==");

  var requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };


  await fetch(
    `https://testdms.tigo.com.co/alfresco/api/-default-/public/alfresco/versions/1/nodes/${uuidDestino}/children?skipCount=0&maxItems=100&include=path&relativePath=${year}%2F${month}`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
      console.log("resultados al obtener la carpeta (enconrtarCarpeta): ", result);
      result["list"]["entries"].forEach((d) => {
        if (d["entry"]["name"] == day) {
          moverCarpeta(idOrigen, d["entry"]["id"]);
        }
      });
    })
    .catch((error) => {
      console.log("error", error);
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
    `https://testdms.tigo.com.co/alfresco/api/-default-/public/alfresco/versions/1/nodes/${uuidOrigen}/move`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => {
        console.log(result);
        compararConCO(result["entry"]["parentId"])
    })
    .catch((error) => console.log("error", error));
};

const compararConCO = async (parentId) => {
    
}

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
