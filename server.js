const express = require("express");
const app = express();
const path = require("path");
const { Pool } = require("pg");
const fs = require("fs");
const handlebars = require("handlebars");
require("dotenv").config();
const multer = require("multer");
const http = require("http");

// Для сохранения загруженных фотографий
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads"); // Папка для сохранения фотографий
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, "static")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", index);
app.get("/login", login);
app.get("/register", register);
app.get("/live", live);
app.get("/reports", reports);
app.get("/devices", devices);
app.get("/devices/drivers", drivers);
app.get("/devices/update", update);


// const DB_User = process.env.DB_USER;
// const DB_Password = process.env.DB_PASSWORD;
// const DB_Host = process.env.DB_HOST;
// const DB_Port = process.env.DB_PORT;
// const DB_Name = process.env.DB_NAME;

const DB_User = "postgres";
const DB_Password = process.env.POSTGRES_PASSWORD;
const DB_Host = "postgres";
const DB_Port = "5432";
const DB_Name = "postgres";

async function index(req, res) {
  var templateData = {
    Organisation: "Название организации",
    User: "Тестовое Имя",
    ifDBError: false,
    Count: "",
  };
  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();
    // Выполняем запрос и получаем результат
    const query = `
      SELECT COUNT(*) AS count 
      FROM registrars
    `;
    const registrars = await client.query(query);

    templateData.Count = registrars.rows[0].count;

    console.log(templateData);

    const source = fs.readFileSync("static/templates/index.html", "utf8");

    const template = handlebars.compile(source);

    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/index.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
  // res.sendFile(path.join(__dirname, "static/templates/index.html"));
}
function login(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/login.html"));
}
function register(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/register.html"));
}

async function live(req, res) {
  let templateData = {
    Organisation: "Название организации",
    User: "Тестовое Имя",
    ifDBError: false,
    Registrars: [],
    Alarms: [],
    Count: 0,
  };

  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();

    const minuteInMillis = 90 * 1000;

    const query = `
    SELECT id, serial, lastkeepalive FROM registrars ORDER BY id ASC
    `;
    const registrars = await client.query(query);

    templateData.Registrars = registrars.rows.map((row) => ({
      id: row.id,
      serial: row.serial,
      status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
    }));

    const subquery = `
      SELECT a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude
      FROM (
        SELECT id, cmdno, time, serial, st
        FROM alarms
        WHERE alarmtype = 56
        ORDER BY time DESC 
        LIMIT 100
      ) AS a
      LEFT JOIN registrars AS r ON a.serial = r.serial
      LEFT JOIN (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - $1)))) AS row_num
        FROM geo
      ) AS g ON a.serial = g.serial AND g.row_num = 1
      ORDER BY a.time DESC;
    `;
    const alarms = await client.query(subquery, [new Date()]); // Pass current date/time to the query for finding the nearest geoposition.

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

    (templateData.Alarms = alarms.rows.map((alarm) => {
      let type;
      switch (alarm.st) {
        case "0":
          type = "Усталость";
          break;
        case "1":
          type = "Водитель пропал";
          break;
        case "2":
          type = "Разговор по телефону";
          break;
        case "3":
          type = "Курение за рулём";
          break;
        case "4":
          type = "Водитель отвлекся";
          break;
        case "5":
          type = "Выезд с полосы движения";
          break;
        case "6":
          type = "!!! Лобовое столкновение";
          break;
        case "7":
          type = "Скорость превышена";
          break;
        case "8":
          type = "Распознавание номерных знаков";
          break;
        case "9":
          type = "!! Маленькое расстояние спереди";
          break;
        case "10":
          type = "Водитель зевает";
          break;
        case "11":
          type = "!!! Столкновение с пешеходом";
          break;
        case "12":
          type = "Проходы переполнены";
          break;
        case "13":
          type = "!! Посадка/высадка вне остановки";
          break;
        case "14":
          type = "!! Смена полосы с нарушением ПДД";
          break;
        case "15":
          type = "! Включенный телефон у водителя";
          break;
        case "16":
          type = "!!! Ремень безопасности";
          break;
        case "17":
          type = "Проверка не удалась";
          break;
        case "18":
          type = "Слепые зоны справа";
          break;
        case "19":
          type = "!!! Заднее столкновение";
          break;
        case "20":
          type = "!!! Управление без рук";
          break;
        case "21":
          type = "!! Управление одной рукой";
          break;
        case "22":
          type = "Очки, блокирующие инфракрасное излучение";
          break;
        case "23":
          type = "Слепые зоны слева";
          break;
        case "24":
          type = "Помехи для пассажиров";
          break;
        case "25":
          type = "На перекрестке ограничена скорость";
          break;
        case "26":
          type = "Обнаружен перекресток";
          break;
        case "27":
          type = "Пешеходы на переходе";
          break;
        case "28":
          type = "! Неучтивое отношение к пешеходам";
          break;
        case "29":
          type = "Обнаружен пешеходный переход";
          break;
        case "30":
          type = "Водитель матерится";
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
        plate: alarm.plate,
        latitude: (alarm.latitude).toFixed(6),
        longitude: (alarm.longitude).toFixed(6),
        geo: alarm.latitude + "," + alarm.longitude,
      };
    }))

    templateData.Count = templateData.Alarms.length;

    const source = fs.readFileSync("static/templates/live.html", "utf8");
    const template = handlebars.compile(source);
    const resultHTML = template(templateData);
    res.send(resultHTML);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/live.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

app.post("/devices-geo", async (req, res) => {
  const selectedDevices = req.body.devices;

  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });

  // console.log(selectedDevices);

  const placeholders = selectedDevices
  .map((_, index) => `$${index + 1}`)
  .join(",");
  const subquery = `
  SELECT g.serial, g.longitude, g.latitude, g.direction, g.speed, r.lastkeepalive
  FROM geo g
  INNER JOIN (
    SELECT serial, MAX(time) AS time
    FROM geo
    WHERE serial IN (
      SELECT serial
      FROM registrars
      WHERE id IN (${placeholders})
    )
    GROUP BY serial
  ) s ON g.serial = s.serial AND g.time = s.time
  INNER JOIN registrars r ON g.serial = r.serial
`;

pool.query(subquery, selectedDevices, (err, result) => {
  if (err) {
    console.error("Ошибка выполнения запроса:", err);
    res.status(500).json({ error: "Ошибка сервера" });
    return;
  }

  const minuteInMillis = 60000;

  // Process the result to include lastkeepalive information
  const devicesData = result.rows.map((row) => ({
    serial: row.serial,
    longitude: row.longitude,
    latitude: row.latitude,
    direction: row.direction,
    speed: row.speed,
    status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
  }));



    // console.log(result.rows);


    res.json({ devicesData });
  });
});

async function reports(req, res) {
  let templateData = {
    Organisation: "Название организации",
    User: "Тестовое Имя",
    ifDBError: false,
    Registrars: [],
  };
  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();
    // Выполняем запрос и получаем результат
    const query = `
      SELECT a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude
      FROM (
        SELECT id, cmdno, time, serial, st
        FROM alarms
        WHERE alarmtype = 56
        ORDER BY time DESC 
        LIMIT 100
      ) AS a
      LEFT JOIN registrars AS r ON a.serial = r.serial
      LEFT JOIN (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - $1)))) AS row_num
        FROM geo
      ) AS g ON a.serial = g.serial AND g.row_num = 1
      ORDER BY a.time DESC;
    `;
    const alarms = await client.query(query, [new Date()]); // Pass current date/time to the query for finding the nearest geoposition.

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

    (templateData.Alarms = alarms.rows.map((alarm) => {
      let type;
      switch (alarm.st) {
        case "0":
          type = "Усталость";
          break;
        case "1":
          type = "Водитель пропал";
          break;
        case "2":
          type = "Разговор по телефону";
          break;
        case "3":
          type = "Курение за рулём";
          break;
        case "4":
          type = "Водитель отвлекся";
          break;
        case "5":
          type = "Выезд с полосы движения";
          break;
        case "6":
          type = "!!! Лобовое столкновение";
          break;
        case "7":
          type = "Скорость превышена";
          break;
        case "8":
          type = "Распознавание номерных знаков";
          break;
        case "9":
          type = "!! Маленькое расстояние спереди";
          break;
        case "10":
          type = "Водитель зевает";
          break;
        case "11":
          type = "!!! Столкновение с пешеходом";
          break;
        case "12":
          type = "Проходы переполнены";
          break;
        case "13":
          type = "!! Посадка/высадка вне остановки";
          break;
        case "14":
          type = "!! Смена полосы с нарушением ПДД";
          break;
        case "15":
          type = "! Включенный телефон у водителя";
          break;
        case "16":
          type = "!!! Ремень безопасности";
          break;
        case "17":
          type = "Проверка не удалась";
          break;
        case "18":
          type = "Слепые зоны справа";
          break;
        case "19":
          type = "!!! Заднее столкновение";
          break;
        case "20":
          type = "!!! Управление без рук";
          break;
        case "21":
          type = "!! Управление одной рукой";
          break;
        case "22":
          type = "Очки, блокирующие инфракрасное излучение";
          break;
        case "23":
          type = "Слепые зоны слева";
          break;
        case "24":
          type = "Помехи для пассажиров";
          break;
        case "25":
          type = "На перекрестке ограничена скорость";
          break;
        case "26":
          type = "Обнаружен перекресток";
          break;
        case "27":
          type = "Пешеходы на переходе";
          break;
        case "28":
          type = "! Неучтивое отношение к пешеходам";
          break;
        case "29":
          type = "Обнаружен пешеходный переход";
          break;
        case "30":
          type = "Водитель матерится";
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
        plate: alarm.plate,
        latitude: (alarm.latitude).toFixed(6),
        longitude: (alarm.longitude).toFixed(6),
        geo: (alarm.latitude).toFixed(6) + "," + (alarm.longitude).toFixed(6),
      };
    }))

    const source = fs.readFileSync(
      "static/templates/reports/index.html",
      "utf8"
    );

    const template = handlebars.compile(source);

    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/reports/index.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}
app.get("/api/devices", async (req, res) => {
  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude
      FROM (
        SELECT id, cmdno, time, serial, st
        FROM alarms
        ORDER BY time DESC 
        LIMIT $1 OFFSET $2
      ) AS a
      LEFT JOIN registrars AS r ON a.serial = r.serial
      LEFT JOIN (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - $3)))) AS row_num
        FROM geo
      ) AS g ON a.serial = g.serial AND g.row_num = 1
      ORDER BY a.time DESC;
    `;
    const alarms = await pool.query(query, [limit, offset, new Date()]); 

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

    const alarmsData = alarms.rows.map((alarm) => {
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
        plate: alarm.plate,
        latitude: alarm.latitude,
        longitude: alarm.longitude,
        geo: alarm.latitude + "," + alarm.longitude,
      };
    });

    const totalCountQuery = "SELECT COUNT(*) FROM alarms;";
    const totalCount = await pool.query(totalCountQuery);

    const totalPages = Math.ceil(totalCount.rows[0].count / limit);

    res.json({
      data: alarmsData,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/reports/:id', async (req, res) => {
  const id = req.params.id;

  let templateData = {
    Organisation: "Название организации",
    User: "Тестовое Имя",
    ifDBError: false,
    Id: id,
    Type: "",
    Speed: "",
    Date: "",
    Serial: "",
    Geo: "",
    DriverName: "",
    DriverPhone: "",
    DriverEmail: "",
    DriverLicense: "",
  };

  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();
  
    const minuteInMillis = 90 * 1000; 
  
    // Выполняем запрос, чтобы получить все данные из таблицы registrars
    const query = `
    SELECT a.serial, a.st, a.time, a.geoid, g.longitude, g.latitude, g.speed,
    d.name, d.surname, d.card, d.phone, d.email
    FROM alarms a
    LEFT JOIN geo g ON a.geoid = g.id
    LEFT JOIN drivers d ON a.serial = d.transport
    WHERE a.id = ${id}
    LIMIT 1;
    `;

    const alarm = (await client.query(query)).rows[0];
    console.log(alarm);

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

      let type;
      switch (alarm.st) {
        case "0":
          type = "Усталость";
          break;
        case "1":
          type = "Водитель пропал";
          break;
        case "2":
          type = "Разговор по телефону";
          break;
        case "3":
          type = "Курение за рулём";
          break;
        case "4":
          type = "Водитель отвлекся";
          break;
        case "5":
          type = "Выезд с полосы движения";
          break;
        case "6":
          type = "!!! Лобовое столкновение";
          break;
        case "7":
          type = "Скорость превышена";
          break;
        case "8":
          type = "Распознавание номерных знаков";
          break;
        case "9":
          type = "!! Маленькое расстояние спереди";
          break;
        case "10":
          type = "Водитель зевает";
          break;
        case "11":
          type = "!!! Столкновение с пешеходом";
          break;
        case "12":
          type = "Проходы переполнены";
          break;
        case "13":
          type = "!! Посадка/высадка вне остановки";
          break;
        case "14":
          type = "!! Смена полосы с нарушением ПДД";
          break;
        case "15":
          type = "! Включенный телефон у водителя";
          break;
        case "16":
          type = "!!! Ремень безопасности";
          break;
        case "17":
          type = "Проверка не удалась";
          break;
        case "18":
          type = "Слепые зоны справа";
          break;
        case "19":
          type = "!!! Заднее столкновение";
          break;
        case "20":
          type = "!!! Управление без рук";
          break;
        case "21":
          type = "!! Управление одной рукой";
          break;
        case "22":
          type = "Очки, блокирующие инфракрасное излучение";
          break;
        case "23":
          type = "Слепые зоны слева";
          break;
        case "24":
          type = "Помехи для пассажиров";
          break;
        case "25":
          type = "На перекрестке ограничена скорость";
          break;
        case "26":
          type = "Обнаружен перекресток";
          break;
        case "27":
          type = "Пешеходы на переходе";
          break;
        case "28":
          type = "! Неучтивое отношение к пешеходам";
          break;
        case "29":
          type = "Обнаружен пешеходный переход";
          break;
        case "30":
          type = "Водитель матерится";
          break;
        default:
          type = "Неизвестный тип";
      }

      templateData.Type = type;
      templateData.Speed = alarm.speed;
      templateData.Date = formatDate(alarm.time);
      templateData.Serial = alarm.serial;
      templateData.Geo = alarm.latitude + "," + alarm.longitude;

      templateData.DriverName = alarm.name + " " + alarm.surname;
      templateData.DriverPhone = alarm.phone;
      templateData.DriverEmail = alarm.email;
      templateData.DriverLicense = alarm.card;
      
    console.log(templateData);
  
    const source = fs.readFileSync("static/templates/reports/report.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  
    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/reports/report.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
  // res.sendFile(path.join(__dirname, "static/templates/reports/report.html"));
});

async function devices(req, res) {
  let templateData = {
    Organisation: "Название организации",
    User: "Тестовое Имя",
    ifDBError: false,
    Registrars: [],
  };

  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();
  
    const minuteInMillis = 90 * 1000; 
  
    // Выполняем запрос, чтобы получить все данные из таблицы registrars
    const queryRegistrars = `
      SELECT id, serial, lastkeepalive, name, "group", plate, sim, ip, port 
      FROM registrars
      ORDER BY id
    `;
    const registrarsResult = await client.query(queryRegistrars);
    const allRegistrars = registrarsResult.rows;
  
    // Определяем статус connected на основе lastkeepalive
    templateData.Registrars = allRegistrars.map((registrar) => ({
        id: registrar.id,
        serial: registrar.serial,
        status: Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
        name: registrar.name,
        group: registrar.group,
        plate: registrar.plate,
        sim: registrar.sim,
        ip: registrar.ip,
        port: registrar.port,
      })),
  
    console.log(templateData);
  
    const source = fs.readFileSync("static/templates/devices/index.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  
    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/devices/index.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

app.post("/devicedata", async (req, res) => {
  const id = req.body.id;

  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
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
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
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

app.post("/updatedriver", upload.single("upload-file"), async (req, res) => {
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  var {
    driverName,
    driverSurname,
    driverCard,
    driverGender,
    driverLicense,
    driverPassport,
    driverPhone,
    driverEmail,
    driverTransport,
    driverDescription,
    driverID,
  } = req.body;

  try {
    // Вставка новой строки в таблицу drivers
    const query = `
      UPDATE drivers
      SET name = $1,
          surname = $2,
          card = $3,
          gender = $4,
          license = $5,
          passport = $6,
          phone = $7,
          email = $8,
          transport = $9,
          description = $10
      WHERE id = $11
      RETURNING *;
    `;

    const values = [
      driverName,
      driverSurname,
      driverCard,
      driverGender,
      driverLicense,
      driverPassport,
      driverPhone,
      driverEmail,
      driverTransport,
      driverDescription,
      driverID,
    ];

    const result = await client.query(query, values);

    const newRow = result.rows[0];
    console.log("New driver added:", newRow);

    res.send("Data added successfully");
  } catch (error) {
    console.error("Error adding data:", error);
    res.status(500).send("An error occurred while adding data");
  } finally {
    client.release();
  }
});

app.post("/adddriver", upload.single("upload-file"), async (req, res) => {
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  var {
    driverName,
    driverSurname,
    driverCard,
    driverGender,
    driverLicense,
    driverPassport,
    driverPhone,
    driverEmail,
    driverTransport,
    driverDescription,
  } = req.body;

  try {
    // Вставка новой строки в таблицу drivers
    const query = `
      INSERT INTO drivers (
        name,
        surname,
        card,
        gender,
        license,
        passport,
        phone,
        email,
        transport,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      driverName,
      driverSurname,
      driverCard,
      driverGender,
      driverLicense,
      driverPassport,
      driverPhone,
      driverEmail,
      driverTransport,
      driverDescription,
    ];

    const result = await client.query(query, values);

    const newRow = result.rows[0];
    console.log("New driver added:", newRow);

    res.send("Data added successfully");
  } catch (error) {
    console.error("Error adding data:", error);
    res.status(500).send("An error occurred while adding data");
  } finally {
    client.release();
  }
});

app.post("/driverdata", async (req, res) => {
  const id = req.body.id;

  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  try {
    // Выполняем запрос и получаем результат
    const query = "SELECT * FROM drivers WHERE id = $1;";
    const driverdata = await client.query(query, [id]);

    // Формирование и отправка ответа
    const response = driverdata.rows[0];
    res.json(response);
  } finally {
    client.release();
  }
});

app.post("/deletedriver", async (req, res) => {
  const id = req.body.id;

  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  try {
    // Выполняем запрос и получаем результат
    const query = "DELETE FROM drivers WHERE id = $1;";
    const driverdata = await client.query(query, [id]);

    // Формирование и отправка ответа
    res.send("Data deleted successfully");
  } finally {
    client.release();
  }
});

async function drivers(req, res) {
  let templateData = {
    Organisation: "Название организации",
    User: "Тестовое Имя",
    ifDBError: false,
    Drivers: [],
    Registrars: [],
  };

  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();

    // Выполняем запрос для объединения данных из таблиц drivers и registrars
    const queryDrivers = `
      SELECT d.id, d.name, d.surname, d.transport, d.phone, d.email, d.card, r.connected
      FROM drivers d
      LEFT JOIN registrars r ON d.transport = r.serial
      ORDER BY r.connected DESC NULLS LAST, CASE WHEN r.connected = true THEN 0 ELSE 1 END, d.id
    `;
    const driversResult = await client.query(queryDrivers);

    templateData.Drivers = driversResult.rows.map((driver) => ({
      id: driver.id,
      name: driver.name,
      surname: driver.surname,
      transport: driver.transport,
      phone: driver.phone,
      email: driver.email,
      card: driver.card,
    }));

    const queryRegistrars = `
      SELECT serial
      FROM registrars
    `;
    const registrarsResult = await client.query(queryRegistrars);

    templateData.Registrars = registrarsResult.rows.map(
      (registrar) => registrar.serial
    );

    console.log(templateData);

    const source = fs.readFileSync(
      "static/templates/devices/drivers.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/devices/drivers.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

function update(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/update.html"));
}

const port = 8081;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, "static/templates/404.html"));
// });
