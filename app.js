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
        "Authorization":"Basic bXp1bGlhbjo0TG05eSYhTSZXUCN3Zg=="
    },
    redirect: "follow",
  };

  await fetch(
    `https://testdms.tigo.com.co/alfresco/api/-default-/public/alfresco/versions/1/nodes/${uuidOrigen}/children?skipCount=0&maxItems=100`,
    requestOptions
  )
    .then((response) => response.json())
    .then((res) => console.log(res['list']['entries']))
    .catch((error) => console.log("error", error));


    return  res.status(200).json({
        msg: "La operacion se ejecuto con exito",
        res: `Uuid Origen: ${uuidOrigen} \n Uuid Destino: ${uuidDestino}`,
      });

  //recorrerlos, ver su cm:created y crear la estructura de carpetas

  //moverlos a la estructura nueva

  //consulta cmis para extraer los datos de generar radicado = vector de radicados

  //recorremos el vector y para cada radicado buscamos en co el igual

  //si se encuentra se crea el path en generar radicado se mueve los archivos al nuevo path y se controlan los documentos
  // que no estes duplicados y se pasa los documentos que no esten

  for (let index = 0; index < array.length; index++) {
    const element = array[index].properties;
    var nombre = element.cname;

    var queryBusqueda = `(TYPE:"cm:folder") AND (PATH:"/app:company_home/cm:CO//*" )`;
    queryBusqueda = queryBusqueda + " AND (@cm:name:" + nombre + ")";
    var busqueda = search.luceneSearch(queryBusqueda);

    if (busqueda != null) {
      var propiedades = busqueda.properties;
      //path relativo con el el path y le choriamos los documentos
    }
  }

  try {
    res.status(200).json({
      msg: "La operacion se ejecuto con exito",
      res: `Uuid Origen: ${uuidOrigen} \n Uuid Destino: ${uuidDestino}`,
    });
  } catch (error) {
    res.status(400).json({
      msg: "La operacion fallo",
      error,
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
