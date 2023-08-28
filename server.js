const express = require("express");
const app = express();
const path = require("path");
const { Pool } = require("pg");
const fs = require("fs");
const handlebars = require("handlebars");
require("dotenv").config();
const multer = require("multer");
const http = require("http");
const Client = require('ssh2').Client;


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads"); 
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
app.get("/videos", videos);
app.get("/videos/export",videoExport);
app.get("/settings", settings);

const connectionProperties = {
  host: process.env.SSH_HOST,
  port: process.env.SSH_PORT,
  username: process.env.SSH_USERNAME,
  password: process.env.SSH_PASSWORD, 
};

const commandToExecute = 'docker ps | grep connectionserver-video-server';

const conn = new Client();

app.post("/videos/restart", async (req, res) => {
conn.on('ready', function() {
  
  console.log('Подключение по SSH успешно');

  conn.exec(commandToExecute, function(err, stream) {
    if (err) throw err;

    let containerId = '';

    stream
      .on('data', function(data) {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
          if (line.includes('connectionserver-video-server')) {
            containerId = line.trim().split(/\s+/)[0];
            break;
          }
        }

        if (containerId) {
          console.log('Найден CONTAINER ID:', containerId);
          const restartCommand = `docker restart ${containerId}`;
          conn.exec(restartCommand, function(err, stream) {
            if (err);
            console.log('Команда для рестарта выполнена.');
            conn.end(); // Закрываем соединение SSH
            res.status(200).json({ message: "Команда для рестарта выполнена." });
            return;
          });
        } else {
          console.log('Контейнер connectionserver-video-server не найден.');
          conn.end(); // Закрываем соединение SSH
        }
      })
      .stderr.on('data', function(data) {
        console.error('Ошибка выполнения команды:', data.toString());
        conn.end(); // Закрываем соединение SSH
        res.status(500).json({ error: "Ошибка сервера" });
        return;
      });
  });
}).connect(connectionProperties);

conn.on('error', function(err) {
  console.error('Ошибка подключения: ' + err.message);
});
});


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
    AlarmsLast11Days: new Array(11).fill(0),
    Alarms11DaysBefore: new Array(11).fill(0),
    Dates: [], 
    PositionsLast11Days: new Array(11).fill(0),
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

    const query = `
      SELECT COUNT(*) AS count 
      FROM registrars
    `;
    const registrars = await client.query(query);

    templateData.Count = registrars.rows[0].count;

    const last11DaysQuery = `
    WITH date_sequence AS (
      SELECT DATE_TRUNC('day', NOW() - INTERVAL '10 days') + (generate_series(0, 10) || ' days')::interval AS day
    )
    SELECT
      date_sequence.day AS day,
      COALESCE(COUNT(DISTINCT evtuuid), 0) AS count
    FROM date_sequence
    LEFT JOIN alarms ON DATE_TRUNC('day', alarms.time) = date_sequence.day
      AND alarms.time >= NOW() - INTERVAL '11 days' + INTERVAL '3 hours'
      AND alarms.time <= NOW() + INTERVAL '1 day' + INTERVAL '3 hours'
      AND alarms.st IS NOT NULL
    GROUP BY date_sequence.day
    ORDER BY date_sequence.day DESC
    `;
    const last11DaysAlarms = await client.query(last11DaysQuery);

    const daysBeforeQuery = `
    WITH date_sequence AS (
      SELECT DATE_TRUNC('day', NOW() - INTERVAL '21 days') + (generate_series(0, 10) || ' days')::interval AS day
    )
    SELECT
      date_sequence.day AS day,
      COALESCE(COUNT(DISTINCT evtuuid), 0) AS count
    FROM date_sequence
    LEFT JOIN alarms ON DATE_TRUNC('day', alarms.time) = date_sequence.day
      AND alarms.time >= NOW() - INTERVAL '21 days' + INTERVAL '3 hours'
      AND alarms.time <= NOW() - INTERVAL '10 days' + INTERVAL '3 hours'
      AND alarms.st IS NOT NULL
    GROUP BY date_sequence.day
    ORDER BY date_sequence.day DESC;       
`;

    const daysBeforeAlarms = await client.query(daysBeforeQuery);

    const currentDate = new Date();
    const dates = [];
    const dates11DaysAgo = [];
    for (let i = 10; i >= 0; i--) {
      const date = new Date(currentDate - i * 24 * 60 * 60 * 1000);
      const formattedDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      dates.push(formattedDate);

      const date11DaysAgo = new Date(currentDate - i * 24 * 60 * 60 * 1000 - 11 * 24 * 60 * 60 * 1000);
      const formattedDate11DaysAgo = date11DaysAgo.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      dates11DaysAgo.push(formattedDate11DaysAgo);
    }
    templateData.Dates = dates;
    dates11DaysAgo.reverse();

    const positionsLast11DaysQuery = `
    SELECT
    COUNT(*) AS count,
    DATE_TRUNC('day', time) AS day,
    CASE WHEN COUNT(*) = 0 THEN 0 ELSE 1 END AS sort_value
  FROM geo
  WHERE time >= NOW() - INTERVAL '10 days' + INTERVAL '3 hours'
    AND time <= NOW() + INTERVAL '1 day' + INTERVAL '3 hours'
  GROUP BY DATE_TRUNC('day', time)
  ORDER BY sort_value DESC, day DESC
    `;
    const positionsLast11Days = await client.query(positionsLast11DaysQuery);

    templateData.Dates.reverse();

const last11DaysMap = new Map(last11DaysAlarms.rows.map(row => [row.day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), parseInt(row.count, 10)]));

for (let i = 0; i < dates.length; i++) {
  const dateKey = dates[i];
  templateData.AlarmsLast11Days[i] = last11DaysMap.has(dateKey) ? last11DaysMap.get(dateKey) : 0;
}

const beforeDaysMap = new Map(daysBeforeAlarms.rows.map(row => [row.day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), parseInt(row.count, 10)]));

for (let i = 0; i < dates.length; i++) {
  const dateKey = dates11DaysAgo[i];
  templateData.Alarms11DaysBefore[i] = beforeDaysMap.has(dateKey) ? beforeDaysMap.get(dateKey) : 0;
}

const positionsMap = new Map(positionsLast11Days.rows.map(row => [row.day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), parseInt(row.count, 10)]));

for (let i = 0; i < dates.length; i++) {
  const dateKey = dates[i];
  templateData.PositionsLast11Days[i] = positionsMap.has(dateKey) ? positionsMap.get(dateKey) : 0;
}


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
    SELECT id, serial, channels, lastkeepalive FROM registrars ORDER BY id ASC
    `;
    const registrars = await client.query(query);

    templateData.Registrars = registrars.rows.map((row) => ({
      id: row.id,
      serial: row.serial,
      channels: row.channels,
      status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
    }));

    const subquery = `
    SELECT a.evtuuid, a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude
    FROM (
      SELECT DISTINCT ON (evtuuid) evtuuid, id, cmdno, time, serial, st
      FROM alarms
      WHERE alarmtype = 56
      ORDER BY evtuuid, time DESC 
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
    const alarms = await client.query(subquery, [new Date()]); 

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      const adjustedDate = new Date(date);
      adjustedDate.setHours(adjustedDate.getHours() - 3); 
    
      const formattedDate = adjustedDate.toLocaleString("ru-RU", options);
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

  const placeholders = selectedDevices
  .map((_, index) => `$${index + 1}`)
  .join(",");
  const subquery = `
  SELECT g.serial, g.longitude, g.latitude, g.direction, g.speed, r.lastkeepalive, r.plate, r.group
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

  const devicesData = result.rows.map((row) => {
    if (row.speed > 150) {
      row.speed /= 100;
    }
    
    return {
      serial: row.serial,
      longitude: row.longitude,
      latitude: row.latitude,
      direction: row.direction,
      speed: row.speed,
      status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
      plate: row.plate,
      group: row.group,
    };
  });
  
  // console.log(devicesData)

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

    const query = `
    SELECT a.evtuuid, a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude
    FROM (
      SELECT DISTINCT ON (evtuuid) evtuuid, id, cmdno, time, serial, st
      FROM alarms
      WHERE alarmtype = 56
      ORDER BY evtuuid, time DESC 
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
    const alarms = await client.query(query, [new Date()]); 

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      const adjustedDate = new Date(date);
      adjustedDate.setHours(adjustedDate.getHours() - 3); 
    
      const formattedDate = adjustedDate.toLocaleString("ru-RU", options);
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
      const adjustedDate = new Date(date);
      adjustedDate.setHours(adjustedDate.getHours() - 3); 
    
      const formattedDate = adjustedDate.toLocaleString("ru-RU", options);
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
    Latitude: "",
    Longitude: "",
    
    DriverName: "",
    DriverPhone: "",
    DriverEmail: "",
    DriverLicense: "",

    PrevLatitude: "",
    PrevLongitude: "",
    NextLatitude: "",
    NextLongitude: "",
    Speeds: "",
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
    WITH PrevNextGeo AS (
      SELECT
        a.serial,
        a.st,
        a.time,
        a.geoid,
        (SELECT g1.latitude FROM alarms a1 LEFT JOIN geo g1 ON a1.geoid = g1.id WHERE a1.evtuuid = a.evtuuid ORDER BY a1.time ASC LIMIT 1) AS prev_latitude,
        (SELECT g2.longitude FROM alarms a2 LEFT JOIN geo g2 ON a2.geoid = g2.id WHERE a2.evtuuid = a.evtuuid ORDER BY a2.time ASC LIMIT 1) AS prev_longitude,
        (SELECT g3.latitude FROM alarms a3 LEFT JOIN geo g3 ON a3.geoid = g3.id WHERE a3.evtuuid = a.evtuuid ORDER BY a3.time DESC LIMIT 1) AS next_latitude,
        (SELECT g4.longitude FROM alarms a4 LEFT JOIN geo g4 ON a4.geoid = g4.id WHERE a4.evtuuid = a.evtuuid ORDER BY a4.time DESC LIMIT 1) AS next_longitude,
        g.longitude,
        g.latitude,
        g.speed,
        d.name,
        d.surname,
        d.card,
        d.phone,
        d.email
      FROM alarms a
      LEFT JOIN geo g ON a.geoid = g.id
      LEFT JOIN drivers d ON a.serial = d.transport
      WHERE a.id = ${id}
      LIMIT 1
    ),
    Speeds AS (
      SELECT
        g.speed,
        ROW_NUMBER() OVER (ORDER BY ABS(EXTRACT(EPOCH FROM (a.time - (SELECT time FROM PrevNextGeo)))) ASC) AS row_number
      FROM alarms a
      LEFT JOIN geo g ON a.geoid = g.id
      WHERE g.serial = (SELECT serial FROM PrevNextGeo) -- Ограничиваем результаты только записями с тем же serial
    )
    SELECT
      *,
      (
        SELECT array_agg(speed) FROM Speeds
        WHERE row_number <= 11
      ) AS nearest_speeds
    FROM PrevNextGeo;
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
      const adjustedDate = new Date(date);
      adjustedDate.setHours(adjustedDate.getHours() - 3); 
    
      const formattedDate = adjustedDate.toLocaleString("ru-RU", options);
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

      var actualSpeed;
      if (alarm.speed > 150) {
        actualSpeed = alarm.speed / 100
      } else {
        actualSpeed = alarm.speed
      }

      templateData.Type = type;
      templateData.Speed = actualSpeed;
      templateData.Date = formatDate(alarm.time);
      templateData.Serial = alarm.serial;
      templateData.Geo = alarm.latitude + "," + alarm.longitude;
      templateData.Latitude = alarm.latitude
      templateData.Longitude = alarm.longitude

      templateData.DriverName = alarm.name + " " + alarm.surname;
      templateData.DriverPhone = alarm.phone;
      templateData.DriverEmail = alarm.email;
      templateData.DriverLicense = alarm.card;

      templateData.PrevLatitude = alarm.prev_latitude;   
      templateData.PrevLongitude = alarm.prev_longitude; 
      templateData.NextLatitude = alarm.next_latitude;   
      templateData.NextLongitude = alarm.next_longitude; 

      templateData.Speeds = alarm.nearest_speeds
      templateData.Speeds = templateData.Speeds.map(speed => {
        if (speed > 150) {
          return speed / 100;
        } else {
          return speed;
        }
      });
      
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
    const query = "SELECT * FROM registrars WHERE id = $1;";
    const devicedata = await client.query(query, [id]);

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

function settings(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/settings.html"));
}

async function videos(req, res) {
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

    const minuteInMillis = 60 * 1000;

    const query = `
    SELECT id, serial, lastkeepalive FROM registrars ORDER BY id ASC
    `;
    const registrars = await client.query(query);

    templateData.Registrars = registrars.rows.map((row) => ({
      id: row.id,
      serial: row.serial,
      status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
    }));

    console.log(templateData);

    const source = fs.readFileSync("static/templates/videos/playback.html", "utf8");
    const template = handlebars.compile(source);
    const resultHTML = template(templateData);
    res.send(resultHTML);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/videos/playback.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

async function videoExport(req, res) {
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

    const minuteInMillis = 60 * 1000;

    const query = `
    SELECT id, serial, lastkeepalive FROM registrars ORDER BY id ASC
    `;
    const registrars = await client.query(query);

    templateData.Registrars = registrars.rows.map((row) => ({
      id: row.id,
      serial: row.serial,
      status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
    }));

    console.log(templateData);

    const source = fs.readFileSync("static/templates/videos/export.html", "utf8");
    const template = handlebars.compile(source);
    const resultHTML = template(templateData);
    res.send(resultHTML);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/videos/export.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}


app.post("/getspeedarchive", async (req, res) => {
  const { serial, datetime } = req.body;

  const formattedDateTime = new Date(datetime).toISOString();
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();
  const sqlQuery = `
    SELECT speed, latitude, longitude
    FROM geo
    WHERE serial = $1
    AND time >= $2
    AND time < $3;
  `;

  const startTime = new Date(formattedDateTime);
  startTime.setMinutes(0, 0, 0); // Округление до начала часа
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);

  pool.query(sqlQuery, [serial, startTime, endTime], (error, results) => {
    if (error) {
      console.error("Ошибка при выполнении SQL-запроса:", error);
      res.status(500).json({ error: "Ошибка на сервере" });
    } else {
      const speeds = results.rows.map((row) => row.speed);
      const transformedSpeeds = speeds.map((speed) => {
        if (speed > 150) {
          return speed / 100;
        } else {
          return speed;
        }
      });

      const geoData = results.rows.map((row) => ({
        latitude: row.latitude,
        longitude: row.longitude,
      }));
      res.json({ speeds: transformedSpeeds, geo: geoData });
    }
  });
});

const port = 8081;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, "static/templates/404.html"));
// });
