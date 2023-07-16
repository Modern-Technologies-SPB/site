const express = require("express");
const app = express();
const path = require("path");
const { Pool } = require("pg");
const fs = require("fs");
const handlebars = require("handlebars");
require("dotenv").config();
const multer = require("multer");

const upload = multer();

app.use(express.static(path.join(__dirname, "static")));
app.use(express.json());

app.get("/", index);
app.get("/login", login);
app.get("/register", register);
app.get("/live", live);
app.get("/reports", reports);
app.get("/reports/346", reports346);
app.get("/devices", devices);
app.get("/devices/drivers", drivers);
app.get("/devices/newdevice", newdevice);
app.get("/devices/newdriver", newdriver);

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

const pool = new Pool({
  user: "postgres",
  host: "postgres",
  database: "postgres",
  password: "password",
  port: "5432",
});

async function index(req, res) {
  const client = await pool.connect();
  try {
    // Выполняем запрос и получаем результат
    const query = `
      SELECT COUNT(*) AS count 
      FROM registrars
    `;
    const registrars = await client.query(query);

    var templateData = {
      Organisation: "Название организации",
      User: "Тестовое Имя",
      Count: registrars.rows[0].count,
    };

    console.log(templateData);

    const source = fs.readFileSync("static/templates/index.html", "utf8");

    const template = handlebars.compile(source);

    const resultT = template(templateData);
    res.send(resultT);
  } finally {
    client.release();
  }
  // res.sendFile(path.join(__dirname, "static/templates/index.html"));
}
function login(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/login.html"));
}
function register(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/register.html"));
}
function live(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/live.html"));
}
async function reports(req, res) {
  const client = await pool.connect();
  try {
    // Выполняем запрос и получаем результат
    const query = `
      SELECT id, cmdno, time, serial, st 
      FROM alarms
    `;
    const alarms = await client.query(query);

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      const formattedDate = new Date(date).toLocaleString("ru-RU", options);
      return formattedDate.replace(",", "");
    }

    var templateData = {
      Organisation: "Название организации",
      User: "Тестовое Имя",
      Alarms: alarms.rows.map((alarm) => {
        let type;
        switch (alarm.st) {
          case "0":
            type = "Усталость";
            break;
          case "1":
            type = "Отсутствие водителя";
            break;
          case "2":
            type = "Разговор по телефону";
            break;
          default:
            type = "Неизвестный тип";
        }
        return {
          id: alarm.id,
          cmdno: alarm.cmdno,
          time: formatDate(alarm.time),
          serial: alarm.serial,
          st: alarm.st,
          type: type,
        };
      }),
    };

    console.log(templateData);

    const source = fs.readFileSync(
      "static/templates/reports/index.html",
      "utf8"
    );

    const template = handlebars.compile(source);

    const resultT = template(templateData);
    res.send(resultT);
  } finally {
    client.release();
  }
  // res.sendFile(path.join(__dirname, "static/templates/reports/index.html"));
}
function reports346(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/reports/346.html"));
}
async function devices(req, res) {
  const client = await pool.connect();
  try {
    // Выполняем два запроса и получаем результаты
    const queryConnected = `
      SELECT id, serial, connected, name, "group", plate, sim, ip, port 
      FROM registrars
      WHERE connected = true
      ORDER BY id
    `;
    const queryDisconnected = `
      SELECT id, serial, connected, name, "group", plate, sim, ip, port 
      FROM registrars
      WHERE connected = false
      ORDER BY id
    `;
    const connectedRegistrars = await client.query(queryConnected);
    const disconnectedRegistrars = await client.query(queryDisconnected);

    const templateData = {
      Organisation: "Название организации",
      User: "Тестовое Имя",
      Registrars: [
        ...connectedRegistrars.rows.map((registrar) => ({
          id: registrar.id,
          serial: registrar.serial,
          status: registrar.connected,
          name: registrar.name,
          group: registrar.group,
          plate: registrar.plate,
          sim: registrar.sim,
          ip: registrar.ip,
          port: registrar.port,
        })),
        ...disconnectedRegistrars.rows.map((registrar) => ({
          id: registrar.id,
          serial: registrar.serial,
          status: registrar.connected,
          name: registrar.name,
          group: registrar.group,
          plate: registrar.plate,
          sim: registrar.sim,
          ip: registrar.ip,
          port: registrar.port,
        })),
      ],
    };

    console.log(templateData);

    const source = fs.readFileSync(
      "static/templates/devices/index.html",
      "utf8"
    );

    const template = handlebars.compile(source);

    const resultT = template(templateData);
    res.send(resultT);
  } finally {
    client.release();
  }
}

app.post("/devicedata", async (req, res) => {
  const id = req.body.id;

  const client = await pool.connect();
  try {
    // Выполняем запрос и получаем результат
    const query = "SELECT * FROM registrars WHERE id = $1;";
    const devicedata = await client.query(query, [id]);

    // Формирование и отправка ответа
    const response = devicedata.rows[0];
    res.json(response);
  } finally {
    client.release();
  }
});

app.post("/updatedevice", async (req, res) => {
  const client = await pool.connect();

  var {
    plateNumber,
    plateColor,
    serialNumber,
    channelsAmount,
    connectionProtocol,
    IPAddress,
    deviceGroup,
    serverPort,
    sumNumber,
    simIMEI,
    simIMSI,
    simModule,
    transportType,
    transportFactory,
    transportStrength,
    transportEngine,
    transportStanina,
    transportFuel,
    transportCertificate,
    transportCategory,
    transportExpire,
    transportConsumption,
    transportProvince,
    transportCity,
    equipmentName,
    equipmentPassword,
    equipmentNumber,
    equipmentReleased,
    equipmentInstaller,
    equipmentInstalled,
    equipmentDescription,
  } = req.body;

  try {
    // Обновление строки в таблице registrars
    const query = `
      UPDATE registrars
      SET
        plate = $1,
        plate_color = $2,
        channels = $3,
        protocol = $4,
        ip = $5,
        "group" = $6,
        port = $7,
        sim = $8,
        imei = $9,
        imsi = $10,
        module = $11,
        auto = $12,
        factory = $13,
        capacity = $14,
        engine = $15,
        stanina = $16,
        fuel = $17,
        certificate = $18,
        category = $19,
        certificate_exp = $20,
        consumption = $21,
        region = $22,
        city = $23,
        name = $24,
        password = $25,
        batch = $26,
        release = $27,
        installer = $28,
        installation = $29,
        description = $30
      WHERE serial = $31
      RETURNING *;
    `;

    const values = [
      plateNumber,
      plateColor,
      channelsAmount,
      connectionProtocol,
      IPAddress,
      deviceGroup,
      serverPort,
      sumNumber,
      simIMEI,
      simIMSI,
      simModule,
      transportType,
      transportFactory,
      transportStrength,
      transportEngine,
      transportStanina,
      transportFuel,
      transportCertificate,
      transportCategory,
      transportExpire,
      transportConsumption,
      transportProvince,
      transportCity,
      equipmentName,
      equipmentPassword,
      equipmentNumber,
      equipmentReleased,
      equipmentInstaller,
      equipmentInstalled,
      equipmentDescription,
      serialNumber,
    ];

    const result = await client.query(query, values);

    const updatedRow = result.rows[0];
    console.log("Updated row:", updatedRow);

    res.send("Data updated successfully");
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).send("An error occurred while updating data");
  } finally {
    client.release();
  }
});

function drivers(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/drivers.html"));
}
function newdevice(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/newdevice.html"));
}
function newdriver(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/newdriver.html"));
}

const port = 8081;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, "static/templates/404.html"));
// });
