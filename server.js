const express = require("express");
const app = express();
const path = require("path");
const { Pool } = require("pg");
const fs = require("fs");
const handlebars = require("handlebars");
require("dotenv").config();
const multer = require("multer");
const http = require("http");
const axios = require("axios");
const moment = require("moment");
const bodyParser = require("body-parser");
const _ = require("lodash");
const session = require("express-session");
const bcrypt = require("bcrypt");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

app.use(
  session({
    secret: process.env.SEKRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(express.static(path.join(__dirname, "static")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", index);
app.get("/signin", signin);
app.get("/register", register);
app.get("/live", live);
app.get("/reports", reports);
app.get("/devices", devices);
// app.get("/devices/update", update);
app.get("/devices/groups", groups);
app.get("/videos", videos);
app.get("/videos/export", videoExport);
app.get("/settings", settings);
app.get("/documentation", documentation);
app.get("/admin", adminPanel);
app.get("/admin/organisation", organisation);

async function getUserInfo(userId) {
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  try {
    let userInfo = {
      Organisation: "",
      User: "",
      Users: [],
      EditTransport: false,
      DeleteTransport: false,
      Update: false,
    };

    if (userId != "admin") {
      const queryUsers = `
        SELECT name, surname, devices, edittransport, deletetransport, update
        FROM users
        WHERE id = $1
      `;
      const usersResult = await client.query(queryUsers, [userId]);
      const user = usersResult.rows[0];
      userInfo.Users.push({
        name: user.name,
        surname: user.surname,
        devices: user.devices,
        edittransport: user.edittransport,
        deletetransport: user.deletetransport,
        update: user.update,
      });
      userInfo.User = user.name + " " + user.surname;
      userInfo.EditTransport = user.edittransport;
      userInfo.DeleteTransport = user.deletetransport;
      userInfo.Update = user.update;
    } else {
      userInfo.User = "Администратор";
      userInfo.EditTransport = true;
      userInfo.DeleteTransport = true;
      userInfo.Update = true;
    }

    const queryMain = `SELECT organisation FROM main`;
    const mainResult = await client.query(queryMain);
    userInfo.Organisation = mainResult.rows[0].organisation;

    return userInfo;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    client.release();
  }
}

app.post("/videos/restart", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }

  var options = {
    method: "GET",
    url: `http://${process.env.VIRTUAL_HOST}:4747/http/restart`,
    headers: { "Content-Type": "application/json" },
    data: { video: true },
  };

  axios
    .request(options)
    .then(function (response) {
      res.status(200).json({ message: "Команда для рестарта выполнена." });
      return;
    })
    .catch(function (error) {
      console.error(error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
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
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  var templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
        templateData.Count = serialValues.length;
      } else {
        templateData.Count = 0;
      }
    }

    const last11DaysQuery = `
    WITH date_sequence AS (
      SELECT DATE_TRUNC('day', CURRENT_DATE - INTERVAL '10 days') + (generate_series(0, 10) || ' days')::interval AS day
    )
    SELECT
      date_sequence.day AS day,
      COALESCE(COUNT(DISTINCT a.evtuuid), 0) AS count
    FROM date_sequence
    LEFT JOIN (
      SELECT DISTINCT ON (evtuuid) evtuuid, time
      FROM alarms
      WHERE alarmtype = 56
      AND time >= CURRENT_DATE - INTERVAL '11 days'
      AND time <= CURRENT_DATE + INTERVAL '1 day'
      ${!templateData.isAdmin ? "AND serial = ANY($1)" : ""}
      ORDER BY evtuuid, time DESC 
    ) AS a ON DATE_TRUNC('day', a.time) = date_sequence.day
    GROUP BY date_sequence.day
    ORDER BY date_sequence.day DESC;    
    `;
    const last11DaysAlarms = await client.query(
      last11DaysQuery,
      templateData.isAdmin ? [] : [serialValues]
    );

    const daysBeforeQuery = `
    WITH date_sequence AS (
      SELECT DATE_TRUNC('day', CURRENT_DATE - INTERVAL '21 days') + (generate_series(0, 10) || ' days')::interval AS day
    )
    SELECT
      date_sequence.day AS day,
      COALESCE(COUNT(DISTINCT a.evtuuid), 0) AS count
    FROM date_sequence
    LEFT JOIN (
      SELECT DISTINCT ON (evtuuid) evtuuid, time
      FROM alarms
      WHERE alarmtype = 56
      AND time >= CURRENT_DATE - INTERVAL '21 days'
      AND time <= CURRENT_DATE + INTERVAL '10 day'
      ${!templateData.isAdmin ? "AND serial = ANY($1)" : ""}
      ORDER BY evtuuid, time DESC 
    ) AS a ON DATE_TRUNC('day', a.time) = date_sequence.day
    GROUP BY date_sequence.day
    ORDER BY date_sequence.day DESC;
    `;

    const daysBeforeAlarms = await client.query(
      daysBeforeQuery,
      templateData.isAdmin ? [] : [serialValues]
    );

    const currentDate = new Date();
    const dates = [];
    const dates11DaysAgo = [];
    for (let i = 10; i >= 0; i--) {
      const date = new Date(currentDate - i * 24 * 60 * 60 * 1000);
      const formattedDate = date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
      dates.push(formattedDate);

      const date11DaysAgo = new Date(
        currentDate - i * 24 * 60 * 60 * 1000 - 11 * 24 * 60 * 60 * 1000
      );
      const formattedDate11DaysAgo = date11DaysAgo.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
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
  WHERE time >= CURRENT_DATE - INTERVAL '10 days'
    AND time <= CURRENT_DATE + INTERVAL '1 day'
    ${!templateData.isAdmin ? "AND serial = ANY($1)" : ""}
  GROUP BY DATE_TRUNC('day', time)
  ORDER BY sort_value DESC, day DESC;
`;

    const positionsLast11Days = await client.query(
      positionsLast11DaysQuery,
      templateData.isAdmin ? [] : [serialValues]
    );

    templateData.Dates.reverse();

    const last11DaysMap = new Map(
      last11DaysAlarms.rows.map((row) => [
        row.day.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        }),
        parseInt(row.count, 10),
      ])
    );

    for (let i = 0; i < dates.length; i++) {
      const dateKey = dates[i];
      templateData.AlarmsLast11Days[i] = last11DaysMap.has(dateKey)
        ? last11DaysMap.get(dateKey)
        : 0;
    }

    const beforeDaysMap = new Map(
      daysBeforeAlarms.rows.map((row) => [
        row.day.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        }),
        parseInt(row.count, 10),
      ])
    );

    for (let i = 0; i < dates.length; i++) {
      const dateKey = dates11DaysAgo[i];
      templateData.Alarms11DaysBefore[i] = beforeDaysMap.has(dateKey)
        ? beforeDaysMap.get(dateKey)
        : 0;
    }

    const positionsMap = new Map(
      positionsLast11Days.rows.map((row) => [
        row.day.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        }),
        parseInt(row.count, 10),
      ])
    );

    for (let i = 0; i < dates.length; i++) {
      const dateKey = dates[i];
      templateData.PositionsLast11Days[i] = positionsMap.has(dateKey)
        ? positionsMap.get(dateKey)
        : 0;
    }

    // console.log(templateData);

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

async function checkLastKeepAlive(serial) {
  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const client = await pool.connect();

    try {
      const lastKeepAliveQuery = `SELECT lastkeepalive FROM registrars WHERE serial = $1`;
      const lastKeepAliveResult = await client.query(lastKeepAliveQuery, [
        serial,
      ]);

      if (lastKeepAliveResult.rows.length > 0) {
        const lastKeepAlive = lastKeepAliveResult.rows[0].lastkeepalive;
        const currentTime = new Date();
        const lastKeepAliveTime = new Date(lastKeepAlive);
        const minutesDifference =
          (currentTime - lastKeepAliveTime) / (1000 * 60);

        if (minutesDifference > 1) {
          return false; // lastkeepalive старше минуты
        } else {
          return true; // lastkeepalive в пределах минуты
        }
      } else {
        return false; // Устройство не найдено
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Ошибка при проверке lastkeepalive:", error);
    throw new Error("Произошла ошибка при проверке lastkeepalive.");
  }
}

function signin(req, res) {
  if (req.session.userId != undefined) {
    return res.redirect("/");
  }
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });

  let templateData = {
    Page: "",
  };

  const page = req.query.page || "";

  if (page) {
    templateData.Page = page;
  }

  pool.query("SELECT COUNT(*) FROM main", (error, result) => {
    if (error) {
      console.error("Ошибка при выполнении запроса к базе данных:", error);
      res.status(500).send("Ошибка сервера");
      return;
    }

    const rowCount = parseInt(result.rows[0].count, 10);

    if (rowCount === 0) {
      res.redirect("/register");
    } else {
      const source = fs.readFileSync("static/templates/signin.html", "utf8");
      const template = handlebars.compile(source);
      const resultT = template(templateData);
      res.send(resultT);
    }
  });
}

function register(req, res) {
  if (req.session.userId != undefined) {
    return res.redirect("/");
  }
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  pool.query("SELECT COUNT(*) FROM main", (err, result) => {
    if (err) {
      console.error("Ошибка выполнения SQL-запроса:", err);
      res.status(500).send("Внутренняя ошибка сервера");
      return;
    }

    if (result.rows[0].count > 0) {
      res.redirect("/signin");
    } else {
      res.sendFile(path.join(__dirname, "static/templates/register.html"));
    }
  });
}

app.post("/setup", async (req, res) => {
  if (req.session.userId != undefined) {
    return res.redirect("/");
  }
  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });
    const { name, login, password } = req.body;

    const checkQuery = "SELECT * FROM main LIMIT 1";
    const checkResult = await pool.query(checkQuery);

    if (checkResult.rows.length > 0) {
      res.redirect("/signin");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertQuery =
      "INSERT INTO main (organisation, login, password) VALUES ($1, $2, $3)";
    await pool.query(insertQuery, [name, login, hashedPassword]);

    res.status(200).json({ message: "Данные успешно добавлены" });
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    res.status(500).json({ error: "Произошла ошибка при обработке запроса" });
  }
});

app.post("/login", async (req, res) => {
  if (req.session.userId != undefined) {
    return res.redirect("/");
  }
  const { email, password } = req.body;

  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });

    const mainQuery = await pool.query(
      "SELECT login, password FROM main WHERE login = $1",
      [email]
    );

    const mainUser = mainQuery.rows[0];

    if (mainUser) {
      const mainPasswordMatch = await bcrypt.compare(
        password,
        mainUser.password
      );

      if (mainPasswordMatch) {
        req.session.userId = "admin";

        console.log("Авторизация успешна (админ)");
        return res.status(200).json({ message: "Авторизация успешна (админ)" });
      }
    }

    const userQuery = await pool.query(
      "SELECT id, password FROM users WHERE email = $1",
      [email]
    );

    const user = userQuery.rows[0];

    if (!user) {
      return res
        .status(401)
        .json({ message: "Неправильное имя пользователя или пароль" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      req.session.userId = user.id;

      console.log("Авторизация успешна");
      return res.status(200).json({ message: "Авторизация успешна" });
    } else {
      return res
        .status(401)
        .json({ message: "Неправильное имя пользователя или пароль" });
    }
  } catch (error) {
    console.error("Ошибка при выполнении запроса к базе данных:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Ошибка при выходе из системы:", err);
      res.status(500).json({ message: "Ошибка сервера" });
    } else {
      res.redirect("/signin");
    }
  });
});

async function live(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=live");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Registrars: [],
    Alarms: [],
    Count: 0,
    Groups: [],
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const query = `
    SELECT id, serial, channels, lastkeepalive, number FROM registrars ${
      !templateData.isAdmin ? "WHERE serial = ANY($1)" : ""
    } ORDER BY id ASC
    `;
    const registrars = await client.query(
      query,
      templateData.isAdmin ? [] : [serialValues]
    );

    templateData.Registrars = registrars.rows.map((row) => ({
      id: row.id,
      serial: row.serial,
      channels: row.channels,
      status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
      number: row.number,
    }));

    const subquery = `
    SELECT a.evtuuid, a.id, a.cmdno, a.time, a.serial, a.st, r.plate, r.number, g.latitude, g.longitude
    FROM (
      SELECT DISTINCT ON (evtuuid) evtuuid, id, cmdno, time, serial, st
      FROM alarms
      WHERE alarmtype = 56
      ${!templateData.isAdmin ? "AND serial = ANY($1)" : ""}
      ORDER BY evtuuid, time DESC 
    ) AS a
    LEFT JOIN registrars AS r ON a.serial = r.serial
    LEFT JOIN (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - NOW())))) AS row_num
      FROM geo
    ) AS g ON a.serial = g.serial AND g.row_num = 1
    ORDER BY a.time DESC
    LIMIT 100;
    `;
    const alarms = await client.query(
      subquery,
      templateData.isAdmin ? [] : [serialValues]
    );

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const dateString = date.toISOString().replace("T", " ").slice(0, 19);

      const [datePart, timePart] = dateString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const formattedDate = `${("0" + day).slice(-2)}.${("0" + month).slice(
        -2
      )}.${year.slice(-2)} ${("0" + hour).slice(-2)}:${("0" + minute).slice(
        -2
      )}`;

      return formattedDate;
    }

    templateData.Alarms = alarms.rows.map((alarm) => {
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
          type = "Очки, блокирующие инфракрасное";
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
        number: alarm.number,
        serial: alarm.serial,
        st: alarm.st,
        type: type,
        plate: alarm.plate,
        latitude: alarm.latitude.toFixed(6),
        longitude: alarm.longitude.toFixed(6),
        geo: alarm.latitude + "," + alarm.longitude,
      };
    });

    templateData.Count = templateData.Alarms.length;

    // Получаем список групп и их идентификаторов из таблицы groups
    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);
    const groupsMap = {};
    groupsResult.rows.forEach((group) => {
      groupsMap[group.id] = group.name;
    });

    // Выполняем запрос, чтобы получить все данные из таблицы registrars
    const queryRegistrars = `
      SELECT id, serial, channels, lastkeepalive, "group", name, plate, sim, ip, port, number
      FROM registrars ${!templateData.isAdmin ? "WHERE serial = ANY($1)" : ""}
      ORDER BY id
    `;
    const registrarsResult = await client.query(
      queryRegistrars,
      templateData.isAdmin ? [] : [serialValues]
    );
    const allRegistrars = registrarsResult.rows;

    const groupedRegistrars = {};
    allRegistrars.forEach((registrar) => {
      const groupName = groupsMap[registrar.group] || "Другое"; // Используем "Другое", если группа неизвестна
      if (!groupedRegistrars[groupName]) {
        groupedRegistrars[groupName] = [];
      }
      groupedRegistrars[groupName].push({
        id: registrar.id,
        serial: registrar.serial,
        channels: registrar.channels,
        status:
          Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
        name: registrar.name,
        group: groupsMap[registrar.group] || "Другое",
        plate: registrar.plate,
        sim: registrar.sim,
        ip: registrar.ip,
        port: registrar.port,
        number: registrar.number,
      });
    });

    templateData.Registrars = allRegistrars.map((registrar) => ({
      id: registrar.id,
      serial: registrar.serial,
      channels: registrar.channels,
      status:
        Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
      name: registrar.name,
      group: groupsMap[registrar.group] || "Другое",
      plate: registrar.plate,
      sim: registrar.sim,
      ip: registrar.ip,
      port: registrar.port,
    }));

    templateData.Groups = Object.keys(groupedRegistrars).map((groupName) => ({
      name: groupName,
      devices: groupedRegistrars[groupName],
    }));

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
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=live");
  }
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
  SELECT g.serial, g.longitude, g.latitude, g.direction, g.speed, r.lastkeepalive, r.plate, r.group, r.number
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

  pool.query(subquery, selectedDevices, async (err, result) => {
    if (err) {
      console.error("Ошибка выполнения запроса:", err);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }

    const minuteInMillis = 60000;

    const devicesData = [];

    for (const row of result.rows) {
      if (row.speed > 150) {
        row.speed /= 100;
      }

      const groupName = await getGroupNameById(pool, row.group);

      const deviceData = {
        serial: row.serial,
        longitude: row.longitude,
        latitude: row.latitude,
        direction: row.direction,
        speed: row.speed,
        status: Date.now() - Date.parse(row.lastkeepalive) <= minuteInMillis,
        number: row.number,
        plate: row.plate,
        group: row.group,
        groupName: groupName,
      };

      devicesData.push(deviceData);
    }

    res.json({ devicesData });
  });
});

async function getGroupNameById(pool, groupId) {
  const query = "SELECT name FROM groups WHERE id = $1";
  const result = await pool.query(query, [groupId]);
  if (result.rows.length > 0) {
    return result.rows[0].name;
  }
  return "Другое";
}

async function reports(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=reports");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Registrars: [],
    Groups: [],
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const query = `
    SELECT a.evtuuid, a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude, r.number
    FROM (
      SELECT DISTINCT ON (evtuuid) evtuuid, id, cmdno, time, serial, st
      FROM alarms
      WHERE alarmtype = 56
      ${!templateData.isAdmin ? "AND serial = ANY($1)" : ""}
      ORDER BY evtuuid, time DESC 
    ) AS a
    LEFT JOIN registrars AS r ON a.serial = r.serial
    LEFT JOIN (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - NOW())))) AS row_num
      FROM geo
    ) AS g ON a.serial = g.serial AND g.row_num = 1
    ORDER BY a.time DESC
    LIMIT 14;
    `;
    const alarms = await client.query(
      query,
      templateData.isAdmin ? [] : [serialValues]
    );

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const dateString = date.toISOString().replace("T", " ").slice(0, 19);

      const [datePart, timePart] = dateString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const formattedDate = `${("0" + day).slice(-2)}.${("0" + month).slice(
        -2
      )}.${year.slice(-2)} ${("0" + hour).slice(-2)}:${("0" + minute).slice(
        -2
      )}`;

      return formattedDate;
    }

    templateData.Alarms = alarms.rows.map((alarm) => {
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
        number: alarm.number,
        serial: alarm.serial,
        st: alarm.st,
        type: type,
        plate: alarm.plate,
        latitude: alarm.latitude.toFixed(6),
        longitude: alarm.longitude.toFixed(6),
        geo: alarm.latitude.toFixed(6) + "," + alarm.longitude.toFixed(6),
      };
    });

    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);
    const groupsMap = {};
    groupsResult.rows.forEach((group) => {
      groupsMap[group.id] = group.name;
    });

    const minuteInMillis = 90 * 1000;

    // Выполняем запрос, чтобы получить все данные из таблицы registrars
    const queryRegistrars = `
      SELECT id, serial, lastkeepalive, "group", name, plate, sim, ip, port, number
      FROM registrars ${!templateData.isAdmin ? "WHERE serial = ANY($1)" : ""}
      ORDER BY id
    `;
    const registrarsResult = await client.query(
      queryRegistrars,
      templateData.isAdmin ? [] : [serialValues]
    );
    const allRegistrars = registrarsResult.rows;

    const groupedRegistrars = {};
    const groupedNumbers = {};
    allRegistrars.forEach((registrar) => {
      const groupName = groupsMap[registrar.group] || "Другое"; // Используем "Другое", если группа неизвестна
      if (!groupedRegistrars[groupName]) {
        groupedRegistrars[groupName] = [];
        groupedNumbers[groupName] = [];
      }
      groupedRegistrars[groupName].push(registrar.serial);
      groupedNumbers[groupName].push(registrar.number);
    });

    templateData.Groups = Object.keys(groupedRegistrars).map((groupName) => ({
      name: groupName,
      serials: groupedRegistrars[groupName],
      numbers: groupedNumbers[groupName],
    }));

    const countQueryText = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT DISTINCT a.evtuuid
        FROM alarms AS a
        LEFT JOIN registrars AS r ON a.serial = r.serial
        LEFT JOIN (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - NOW())))) AS row_num
          FROM geo
        ) AS g ON a.serial = g.serial AND g.row_num = 1
        WHERE a.alarmtype = 56
        ${!templateData.isAdmin ? "AND a.serial = ANY($1)" : ""}
      ) AS unique_events
  `;

    const countResult = await pool.query(
      countQueryText,
      templateData.isAdmin ? [] : [serialValues]
    );
    templateData.Count = countResult.rows[0].total;

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

app.post("/getreports", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=reports");
  }
  try {
    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });

    let serialValues = [];
    if (req.session.userId != "admin") {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await pool.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const { page, timeRangeStart, timeRangeEnd, serials, searchText } =
      req.body;

    let timeRangeStartCheck = timeRangeStart;
    let timeRangeEndCheck = timeRangeEnd;
    let serialsCheck = serials;

    console.log(req.body);

    if (!timeRangeStartCheck || !timeRangeEndCheck || serialsCheck.length < 1) {
      const minMaxSerialQuery = `
        SELECT
          MIN(time) AS min_date,
          MAX(time) AS max_date,
          ARRAY_AGG(DISTINCT serial) AS unique_serials
        FROM
          alarms;
      `;

      const minMaxDateResult = await pool.query(minMaxSerialQuery);

      if (!timeRangeStartCheck) {
        timeRangeStartCheck = minMaxDateResult.rows[0].min_date;
      }

      if (!timeRangeEndCheck) {
        timeRangeEndCheck = minMaxDateResult.rows[0].max_date;
      }

      if (serialsCheck.length < 1) {
        if (req.session.userId != "admin") {
          serialsCheck = serialValues;
        } else {
          serialsCheck = minMaxDateResult.rows[0].unique_serials;
        }
      }
    }

    const violationsMapping = {
      0: "усталость",
      1: "водитель пропал",
      2: "разговор по телефону",
      3: "курение за рулём",
      4: "водитель отвлекся",
      5: "выезд с полосы движения",
      6: "!!! лобовое столкновение",
      7: "скорость превышена",
      8: "распознавание номерных знаков",
      9: "!! маленькое расстояние спереди",
      10: "водитель зевает",
      11: "!!! столкновение с пешеходом",
      12: "проходы переполнены",
      13: "!! посадка/высадка вне остановки",
      14: "!! смена полосы с нарушением ПДД",
      15: "! включенный телефон у водителя",
      16: "!!! ремень безопасности",
      17: "проверка не удалась",
      18: "слепые зоны справа",
      19: "!!! заднее столкновение",
      20: "!!! управление без рук",
      21: "!! управление одной рукой",
      22: "очки, блокирующие инфракрасное излучение",
      23: "слепые зоны слева",
      24: "помехи для пассажиров",
      25: "на перекрестке ограничена скорость",
      26: "обнаружен перекресток",
      27: "пешеходы на переходе",
      28: "! неучтивое отношение к пешеходам",
      29: "обнаружен пешеходный переход",
      30: "водитель матерится",
    };

    const idList = Object.entries(violationsMapping)
      .filter(([id, violation]) => violation.includes(searchText.toLowerCase()))
      .map(([id, violation]) => id);

    console.log(idList);

    const searchConditions = [
      "a.evtuuid::TEXT ILIKE $4",
      "a.id::TEXT ILIKE $4",
      "r.plate::TEXT ILIKE $4",
      "a.serial::TEXT ILIKE $4",
      "g.latitude::TEXT ILIKE $4",
      "g.longitude::TEXT ILIKE $4",
    ];

    const countQueryText = `
  SELECT COUNT(*) AS total
  FROM (
    SELECT DISTINCT a.evtuuid
    FROM alarms AS a
    LEFT JOIN registrars AS r ON a.serial = r.serial
    LEFT JOIN (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - NOW())))) AS row_num
      FROM geo
    ) AS g ON a.serial = g.serial AND g.row_num = 1
    WHERE a.alarmtype = 56
      AND a.time >= $1::timestamp
      AND a.time <= $2::timestamp
      AND a.serial = ANY($3)
      ${
        searchText
          ? `AND (${
              idList.length > 0 ? "st = ANY($5) OR" : ""
            } (${searchConditions.join(" OR ")}))`
          : ""
      }
  ) AS unique_events;
`;

    const countValues = [timeRangeStartCheck, timeRangeEndCheck, serialsCheck];

    if (searchText.length > 0) {
      countValues.push(`%${searchText}%`);
    }

    if (idList.length > 0 && idList.length !== 31) {
      countValues.push(idList);
    }

    const countResult = await pool.query(countQueryText, countValues);
    const totalCount = countResult.rows[0].total;

    const queryConditions = [
      "a.evtuuid::TEXT ILIKE $6",
      "a.id::TEXT ILIKE $6",
      "r.plate::TEXT ILIKE $6",
      "a.serial::TEXT ILIKE $6",
      "g.latitude::TEXT ILIKE $6",
      "g.longitude::TEXT ILIKE $6",
    ];

    const queryText = `
      SELECT a.evtuuid, a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude, r.number
      FROM (
        SELECT DISTINCT ON (evtuuid) evtuuid, id, cmdno, time, serial, st
        FROM alarms
        WHERE alarmtype = 56
          AND time >= $1::timestamp
          AND time <= $2::timestamp
        ORDER BY evtuuid, time DESC 
      ) AS a
      LEFT JOIN registrars AS r ON a.serial = r.serial
      LEFT JOIN (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY serial ORDER BY ABS(EXTRACT(EPOCH FROM (time - NOW())))) AS row_num
        FROM geo
      ) AS g ON a.serial = g.serial AND g.row_num = 1
      WHERE a.time >= $1::timestamp
        AND a.time <= $2::timestamp
        AND a.serial = ANY($3)
        ${
          searchText
            ? `AND (${
                idList.length > 0 ? "st = ANY($7) OR" : ""
              } (${queryConditions.join(" OR ")}))`
            : ``
        }
      ORDER BY a.time DESC
      OFFSET $4 LIMIT $5;
    `;

    const values = [
      timeRangeStartCheck,
      timeRangeEndCheck,
      serialsCheck,
      (page - 1) * 14,
      14,
    ];

    if (searchText.length > 0) {
      values.push(`%${searchText}%`);
    }

    if (idList.length > 0 && idList.length !== 31) {
      values.push(idList);
    }

    const result = await pool.query(queryText, values);

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const dateString = date.toISOString().replace("T", " ").slice(0, 19);

      const [datePart, timePart] = dateString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const formattedDate = `${("0" + day).slice(-2)}.${("0" + month).slice(
        -2
      )}.${year.slice(-2)} ${("0" + hour).slice(-2)}:${("0" + minute).slice(
        -2
      )}`;

      return formattedDate;
    }

    const Alarms = result.rows.map((alarm) => {
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
        number: alarm.number,
        serial: alarm.serial,
        st: alarm.st,
        type: type,
        plate: alarm.plate,
        latitude: alarm.latitude.toFixed(6),
        longitude: alarm.longitude.toFixed(6),
        geo: alarm.latitude.toFixed(6) + "," + alarm.longitude.toFixed(6),
      };
    });

    res.json({
      total: totalCount,
      data: Alarms,
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/devices", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=live");
  }
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const query = `
      SELECT a.id, a.cmdno, a.time, a.serial, a.st, r.plate, g.latitude, g.longitude
      FROM (
        SELECT id, cmdno, time, serial, st
        FROM alarms
        ${!templateData.isAdmin ? "WHERE serial = ANY($4)" : ""}
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
    const alarms = await pool.query(
      query,
      templateData.isAdmin
        ? [limit, offset, new Date()]
        : [limit, offset, new Date(), serialValues]
    );

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const dateString = date.toISOString().replace("T", " ").slice(0, 19);

      const [datePart, timePart] = dateString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const formattedDate = `${("0" + day).slice(-2)}.${("0" + month).slice(
        -2
      )}.${year.slice(-2)} ${("0" + hour).slice(-2)}:${("0" + minute).slice(
        -2
      )}`;

      return formattedDate;
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

    const totalCountQuery = `SELECT COUNT(*) FROM alarms ${
      !templateData.isAdmin ? "WHERE serial = ANY($1)" : ""
    };`;
    const totalCount = await pool.query(
      totalCountQuery,
      templateData.isAdmin ? [] : [serialValues]
    );

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

app.get("/reports/:id", async (req, res) => {
  const id = req.params.id;
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=reports/" + id);
  }
  const userInfo = await getUserInfo(req.session.userId);

  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Id: id,
    Type: "",
    Speed: "",
    Date: "",
    Serial: "",
    Geo: "",
    Latitude: "",
    Longitude: "",
    QueryTime: "",
    StartTime: "",
    EndTime: "",

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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

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
        g.speed
      FROM alarms a
      LEFT JOIN geo g ON a.geoid = g.id
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
    // console.log(alarm);

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const dateString = date.toISOString().replace("T", " ").slice(0, 19);

      const [datePart, timePart] = dateString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const formattedDate = `${("0" + day).slice(-2)}.${("0" + month).slice(
        -2
      )}.${year.slice(-2)} ${("0" + hour).slice(-2)}:${("0" + minute).slice(
        -2
      )}`;

      return formattedDate;
    }

    function formatDateToYYYYMMDD(sqlDate) {
      const date = new Date(sqlDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    }

    function formatTimeToHHMMSSBefore(sqlDate) {
      const date = new Date(sqlDate);
      date.setSeconds(date.getSeconds() - 10);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${hours}${minutes}${seconds}`;
    }

    function formatTimeToHHMMSSAfter(sqlDate) {
      const date = new Date(sqlDate);
      date.setSeconds(date.getSeconds() + 10);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${hours}${minutes}${seconds}`;
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
      actualSpeed = alarm.speed / 100;
    } else {
      actualSpeed = alarm.speed;
    }

    if (serialValues.includes(alarm.serial) || templateData.isAdmin) {
      templateData.Type = type;
      templateData.Speed = actualSpeed;
      templateData.Date = formatDate(alarm.time);
      templateData.Serial = alarm.serial;
      templateData.Geo = alarm.latitude + "," + alarm.longitude;
      templateData.Latitude = alarm.latitude;
      templateData.Longitude = alarm.longitude;
      templateData.QueryTime = formatDateToYYYYMMDD(alarm.time);
      templateData.StartTime = formatTimeToHHMMSSBefore(alarm.time);
      templateData.EndTime = formatTimeToHHMMSSAfter(alarm.time);

      templateData.PrevLatitude = alarm.prev_latitude;
      templateData.PrevLongitude = alarm.prev_longitude;
      templateData.NextLatitude = alarm.next_latitude;
      templateData.NextLongitude = alarm.next_longitude;

      templateData.Speeds = alarm.nearest_speeds;
      templateData.Speeds = templateData.Speeds.map((speed) => {
        if (speed > 150) {
          return speed / 100;
        } else {
          return speed;
        }
      });
    } else {
      console.log("Нет доступа к данному аларму");
      templateData.ifDBError = true;
    }
    // console.log(templateData);

    const source = fs.readFileSync(
      "static/templates/reports/report.html",
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
      "static/templates/reports/report.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
});

app.get("/generate-pdf/:id", async (req, res) => {
  const id = req.params.id;
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=generate-pdf/" + id);
  }
  const userInfo = await getUserInfo(req.session.userId);

  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Id: id,
    Type: "",
    Speed: "",
    Date: "",
    Serial: "",
    Geo: "",
    Latitude: "",
    Longitude: "",

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
        g.speed
      FROM alarms a
      LEFT JOIN geo g ON a.geoid = g.id
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
    // console.log(alarm);

    function formatDate(date) {
      const options = {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const dateString = date.toISOString().replace("T", " ").slice(0, 19);

      const [datePart, timePart] = dateString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute, second] = timePart.split(":");

      const formattedDate = `${("0" + day).slice(-2)}.${("0" + month).slice(
        -2
      )}.${year.slice(-2)} ${("0" + hour).slice(-2)}:${("0" + minute).slice(
        -2
      )}`;

      return formattedDate;
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
      actualSpeed = alarm.speed / 100;
    } else {
      actualSpeed = alarm.speed;
    }

    templateData.Type = type;
    templateData.Speed = actualSpeed;
    templateData.Date = formatDate(alarm.time);
    templateData.Serial = alarm.serial;
    templateData.Geo = alarm.latitude + "," + alarm.longitude;
    templateData.Latitude = alarm.latitude;
    templateData.Longitude = alarm.longitude;

    templateData.PrevLatitude = alarm.prev_latitude;
    templateData.PrevLongitude = alarm.prev_longitude;
    templateData.NextLatitude = alarm.next_latitude;
    templateData.NextLongitude = alarm.next_longitude;

    templateData.Speeds = alarm.nearest_speeds;
    templateData.Speeds = templateData.Speeds.map((speed) => {
      if (speed > 150) {
        return speed / 100;
      } else {
        return speed;
      }
    });

    let data = {
      Id: templateData.Id,
      Organisation: templateData.Organisation,
      Type: templateData.Type,
      Speed: templateData.Speed,
      Date: templateData.Date,
      Serial: templateData.Serial,
      Geo: templateData.Geo,
      PrevLongitude: templateData.PrevLongitude,
      PrevLatitude: templateData.PrevLatitude,
      NextLongitude: templateData.NextLongitude,
      NextLatitude: templateData.NextLatitude,
      Speeds: templateData.Speeds,
    };

    const source = fs.readFileSync("static/templates/reports/pdf.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/reports/pdf.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(data);
    res.send(resultT);
  }
});

async function devices(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=devices");
  }

  let userInfo;
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: "",
    User: "",
    UserInfo: "",
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Registrars: [],
    Groups: [],
    GroupsList: [],
    EditTransport: false,
    DeleteTransport: false,
    Update: false,
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);
    const groupsMap = {};
    groupsResult.rows.forEach((group) => {
      groupsMap[group.id] = group.name;
    });

    const minuteInMillis = 90 * 1000;

    const queryRegistrars = `
      SELECT id, serial, lastkeepalive, "group", name, plate, sim, ip, port, number
      FROM registrars ${!templateData.isAdmin ? "WHERE serial = ANY($1)" : ""}
      ORDER BY id
    `;
    const registrarsResult = await client.query(
      queryRegistrars,
      templateData.isAdmin ? [] : [serialValues]
    );
    const allRegistrars = registrarsResult.rows;

    const groupedRegistrars = {};
    const groupedNumbers = {};
    allRegistrars.forEach((registrar) => {
      const groupName = groupsMap[registrar.group] || "Другое"; // Используем "Другое", если группа неизвестна
      if (!groupedRegistrars[groupName]) {
        groupedRegistrars[groupName] = [];
        groupedNumbers[groupName] = [];
      }
      groupedRegistrars[groupName].push(registrar.serial);
      groupedNumbers[groupName].push(registrar.number);
    });

    userInfo = await getUserInfo(req.session.userId);

    templateData = {
      VIRTUAL_HOST: process.env.VIRTUAL_HOST,
      Organisation: userInfo.Organisation,
      User: userInfo.User,
      UserInfo: userInfo.Users,
      EditTransport: userInfo.EditTransport,
      DeleteTransport: userInfo.DeleteTransport,
      Update: userInfo.Update,
      isAdmin: req.session.userId === "admin",
      ifDBError: false,
      Registrars: allRegistrars.map((registrar) => ({
        id: registrar.id,
        number: registrar.number,
        serial: registrar.serial,
        status:
          Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
        name: registrar.name,
        group: groupsMap[registrar.group] || "Другое",
        plate: registrar.plate,
        sim: registrar.sim,
        ip: registrar.ip,
        port: registrar.port,
      })),
      Groups: Object.keys(groupedRegistrars).map((groupName) => ({
        name: groupName,
        serials: groupedRegistrars[groupName],
        numbers: groupedNumbers[groupName],
      })),
      GroupsList: groupsResult.rows,
    };

    const source = fs.readFileSync(
      "static/templates/devices/index.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);

    client.release();
  } catch (error) {
    console.error(error);
    if (templateData) {
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
}

app.get("/devices/device/system/:serial", async (req, res) => {
  const serial = req.params.serial;
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=devices/device/system/" + serial);
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }

  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Serial: serial,
    EditTransport: false,
    DeleteTransport: false,
    Update: false,
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

    const source = fs.readFileSync(
      "static/templates/devices/system.html",
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
      "static/templates/devices/system.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
});

app.get("/devices/device/:serial", async (req, res) => {
  const serial = req.params.serial;
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=devices/device/" + serial);
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }

  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Serial: serial,
    EditTransport: false,
    DeleteTransport: false,
    Update: false,
    GroupsList: [],

    Number: "",
    Plate: "",
    PlateColor: "",
    Channels: "",
    Protocol: "",
    Ip: "",
    Group: "",
    Port: "",
    Sim: "",
    Imei: "",
    Imsi: "",
    Module: "",
    Type: "",
    Factory: "",
    Capacity: "",
    Engine: "",
    Stanina: "",
    Fuel: "",
    Certificate: "",
    Category: "",
    Expire: "",
    Consumption: "",
    Region: "",
    City: "",
    Name: "",
    Password: "",
    Batch: "",
    Release: "",
    Installer: "",
    Installation: "",
    Description: "",
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

    const query = "SELECT * FROM registrars WHERE serial = $1";
    const result = await client.query(query, [serial]);

    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);

    templateData.GroupsList = groupsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
    }));

    // Предполагается, что результат запроса содержит одну строку данных.
    if (result.rows.length === 1) {
      const rowData = result.rows[0];

      // Заполнение данных из результата SQL запроса в объект templateData.
      templateData.Number = rowData.number;
      templateData.Plate = rowData.plate;
      templateData.PlateColor = rowData.plate_color;
      templateData.Channels = rowData.channels;
      templateData.Protocol = rowData.protocol;
      templateData.Ip = rowData.ip;
      templateData.Group = rowData.group;
      templateData.Port = rowData.port;
      templateData.Sim = rowData.sim;
      templateData.Imei = rowData.imei;
      templateData.Imsi = rowData.imsi;
      templateData.Module = rowData.module;
      templateData.Type = rowData.auto;
      templateData.Factory = rowData.factory;
      templateData.Capacity = rowData.capacity;
      templateData.Engine = rowData.engine;
      templateData.Stanina = rowData.stanina;
      templateData.Fuel = rowData.fuel;
      templateData.Certificate = rowData.certificate;
      templateData.Category = rowData.category;
      templateData.Expire = rowData.certificate_exp;
      templateData.Consumption = rowData.consumption;
      templateData.Region = rowData.region;
      templateData.City = rowData.city;
      templateData.Name = rowData.name;
      templateData.Password = rowData.password;
      templateData.Batch = rowData.batch;
      templateData.Release = rowData.release;
      templateData.Installer = rowData.installer;
      templateData.Installation = rowData.installation;
      templateData.Description = rowData.description;
    }

    const source = fs.readFileSync(
      "static/templates/devices/device.html",
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
      "static/templates/devices/device.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
});

async function groups(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=devices/groups");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/signin");
  }
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    ifDBError: false,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    Groups: [],
    EditTransport: userInfo.EditTransport,
    DeleteTransport: userInfo.DeleteTransport,
    Update: userInfo.Update,
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
    const result = await client.query("SELECT id, name FROM groups");
    const groups = result.rows;
    client.release();

    templateData.Groups = groups;

    const source = fs.readFileSync(
      "static/templates/devices/groups.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/devices/groups.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

app.post("/update-group", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=devices/groups");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { groupId, newName } = req.body;

    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });

    const query = "UPDATE groups SET name = $1 WHERE id = $2";
    const values = [newName, groupId];

    await pool.query(query, values);

    res.status(200).json({ message: "Данные группы обновлены успешно" });
  } catch (error) {
    console.error("Ошибка при обновлении данных группы:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

async function getParameters(serial) {
  const requestResponse = await axios.get(
    `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        FIELDS: ["EOSD"],
      }),
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 300));

  const requestResponse2 = await axios.get(
    `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        FIELDS: ["GSP"],
      }),
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 300));

  const requestResponse3 = await axios.get(
    `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        FIELDS: ["TIMEP"],
      }),
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 300));

  const requestResponse5 = await axios.get(
    `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        FIELDS: ["AR"],
      }),
    }
  );

  // console.log(requestResponse.data);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const getResponse = await axios.get(
    `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
  );

  return getResponse.data;
}

app.post("/main-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["RIP", "VS"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/main-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  const requestData = req.body;
  const { serial } = req.query;

  const { NUMBER, PLATE, VIN } = requestData;

  const requestBody = {
    RIP: {
      BN: NUMBER,
      BID: PLATE,
    },
    VS: {
      VIN: VIN,
    },
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.post("/device-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const responseData = await getParameters(serial);

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/ethernet-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["ETHERNET", "KEYS"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/ethernet-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  const requestData = req.body;
  const { serial } = req.query;

  const { IPMODE, IPADDR, SUBMASK, GATEWAY, DNSMODE, PDNS, ADNS, MAC } =
    requestData;

  const requestBody = {
    ETHERNET: {
      IPMODE: IPMODE,
      PIP: {
        IPADDR: IPADDR,
        SUBMASK: SUBMASK,
        GATEWAY: GATEWAY,
      },
      DNSMODE: DNSMODE,
      DNS: {
        PDNS: PDNS,
        ADNS: ADNS,
      },
    },
    KEYS: {
      MAC: MAC,
    },
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.post("/wifi-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["WIFI"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/wifi-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  const requestData = req.body;
  const { serial } = req.query;

  const { WIFI, ESSID, ECRYPTTYPE, PWD, IPMODE, IPADDR, SUBMASK, GATEWAY } =
    requestData;

  const requestBody = {
    WIFI: {
      ENABLE: WIFI,
      ESSID: ESSID,
      ECRYPTTYPE: ECRYPTTYPE,
      IPMODE: IPMODE,
      PWD: PWD,
      PIP: {
        IPADDR: IPADDR,
        SUBMASK: SUBMASK,
        GATEWAY: GATEWAY,
      },
    },
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.post("/communication-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["M3G"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/communication-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }

  const requestData = req.body;
  const { serial } = req.query;

  const { NM1, APN1, UN1, PW1, NM2, APN2, UN2, PW2, AT, TN1, TN2, TN3 } =
    requestData;

  const requestBody = {
    M3G: {
      M3M: {
        AT: AT,
        TN1: TN1,
        TN2: TN2,
        TN3: TN3,
      },
      MP: {
        NM: NM1,
        APN: APN1,
        UN: UN1,
        PW: PW1,
      },
      M4G: {
        NM: NM2,
        APN: APN2,
        UN: UN2,
        PW: PW2,
      },
    },
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.post("/install-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["MCMS"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/ai-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["DSM"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/ai-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }

  const requestData = req.body;
  const { serial } = req.query;

  const { DSMA, DSMFE, RWFE } = requestData;

  const requestBody = {
    DSM: {
      DSMA: DSMA,
      DSMFE: DSMFE,
      RWFE: RWFE,
    },
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.post("/cameras-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  try {
    const { serial } = req.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const requestResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/request?serial=${serial}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          FIELDS: ["MAIN"],
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const getResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/get?serial=${serial}`
    );

    res.json(getResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/cameras-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }

  const requestData = req.body;
  const { serial } = req.query;

  const { MAIN } = requestData;

  const requestBody = {
    MAIN: MAIN,
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.put("/install-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }

  const requestData = req.body;
  const { serial } = req.query;

  const { SP, M } = requestData;

  const requestBody = {
    MCMS: {
      M: parseInt(M, 10),
      SP: SP,
    },
  };

  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.put("/device-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  // Получаем данные из PUT запроса
  const requestData = req.body;
  const { serial } = req.query;

  // Извлекаем необходимые параметры
  const {
    DATEMOD,
    TIMEFORMAT,
    LANGUAGE,
    GEOMOD,
    TIMEZ,
    NE,
    TE,
    VE,
    SE,
    GE,
    DE,
    TX,
    TY,
    SX,
    SY,
    VX,
    VY,
    GX,
    GY,
    NX,
    NY,
    DX,
    DY,
  } = requestData;

  // Создаем JSON для GET запроса
  const requestBody = {
    TIMEP: {
      DATEM: parseInt(DATEMOD, 10),
      TIMEM: parseInt(TIMEFORMAT, 10),
      TIMEZ: TIMEZ,
    },
    GSP: {
      LANT: parseInt(LANGUAGE, 10),
      GM: parseInt(GEOMOD, 10),
    },
    EOSD: [
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
      {
        GE: GE,
        NE: NE,
        SE: SE,
        TE: TE,
        VE: VE,
        DE: DE,
        TX: TX,
        TY: TY,
        SX: SX,
        SY: SY,
        VX: VX,
        VY: VY,
        GX: GX,
        GY: GY,
        NX: NX,
        NY: NY,
        DX: DX,
        DY: DY,
      },
    ],
  };

  // Отправляем GET запрос с JSON BODY
  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.put("/camera-parameters", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  // Получаем данные из PUT запроса
  const camerasData = req.body;
  const { serial } = req.query;

  // Создаем JSON для GET запроса
  const requestBody = {
    MAIN: camerasData,
  };

  // Отправляем GET запрос с JSON BODY
  try {
    const isLastKeepAliveValid = await checkLastKeepAlive(serial);

    if (!isLastKeepAliveValid) {
      return res
        .status(400)
        .send("Ошибка: lastkeepalive старше минуты или устройство не найдено.");
    }
    const response = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/parameters/set?serial=${serial}`,
      {
        data: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(500).send("Произошла ошибка при отправке GET запроса.");
  }
});

app.post("/devicedata", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
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
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  var {
    serialNumber,
    deviceNumber,
    plateNumber,
    vinNumber,
    channelsAmount,
    plateColor,
    IPAddress,
    serverPort,
    deviceGroup,
    connectionProtocol,
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
        description = $30,
        number = $31,
        vin = $32
      WHERE serial = $33
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
      deviceNumber,
      vinNumber,
      serialNumber,
    ];

    const result = await client.query(query, values);

    const updatedRow = result.rows[0];
    // console.log("Updated row:", updatedRow);

    res.send("Data updated successfully");
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).send("An error occurred while updating data");
  } finally {
    client.release();
  }
});

app.post("/userdata", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
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
    const query = "SELECT * FROM users WHERE id = $1;";
    const userdata = await client.query(query, [id]);

    // Формирование и отправка ответа
    const response = userdata.rows[0];
    res.json(response);
  } finally {
    client.release();
  }
});

app.post("/groupdata", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
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
    const query = "SELECT * FROM groups WHERE id = $1;";
    const userdata = await client.query(query, [id]);

    // Формирование и отправка ответа
    const response = userdata.rows[0];
    res.json(response);
  } finally {
    client.release();
  }
});

app.post("/deletedevice", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.DeleteTransport) {
    return res.redirect("/devices");
  }
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
    const query = "DELETE FROM registrars WHERE id = $1;";
    const devicedata = await client.query(query, [id]);

    // Формирование и отправка ответа
    res.send("Data deleted successfully");
  } finally {
    client.release();
  }
});

app.post("/deleteuser", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin");
  }
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
    const query = "DELETE FROM users WHERE id = $1;";
    const userdata = await client.query(query, [id]);

    // Формирование и отправка ответа
    res.send("Data deleted successfully");
  } finally {
    client.release();
  }
});

app.post("/deletegroup", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
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
    const query = "DELETE FROM groups WHERE id = $1;";
    const userdata = await client.query(query, [id]);

    // Формирование и отправка ответа
    res.send("Data deleted successfully");
  } finally {
    client.release();
  }
});

app.post("/add-group", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.EditTransport) {
    return res.redirect("/devices");
  }
  const { name } = req.body;

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
      INSERT INTO groups (name)
      VALUES ($1) 
      RETURNING id
    `;

    const result = await client.query(query, [name]);

    // Освобождение клиента
    client.release();

    console.log("Группа успешно добавлена");
    res.json({ message: "Группа успешно добавлена" });
  } catch (err) {
    console.error("Ошибка при вставке данных в базу данных:", err);
    res.status(500).json({ error: "Ошибка при добавлении пользователя" });
  }
});

async function update(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=devices/update");
  }
  const userInfo = await getUserInfo(req.session.userId);
  if (!userInfo.Update) {
    return res.redirect("/signin");
  }
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    ifDBError: false,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    EditTransport: userInfo.EditTransport,
    DeleteTransport: userInfo.DeleteTransport,
    Update: userInfo.Update,
  };

  try {
    const source = fs.readFileSync(
      "static/templates/devices/update.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/devices/update.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

async function settings(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=settings");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    ifDBError: false,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
  };

  try {
    const source = fs.readFileSync("static/templates/settings.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/settings.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

async function documentation(req, res) {
  if (req.session.userId === undefined) {
    let templateData = {
      VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    };

    const source = fs.readFileSync(
      "static/templates/documentation-NA.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
    return;
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    ifDBError: false,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
  };

  try {
    const source = fs.readFileSync(
      "static/templates/documentation.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/documentation.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "static", "docs", filename);

  // Проверяем существование файла
  const exists = require("fs").existsSync(filePath);
  if (!exists) {
    return res.status(404).send("File not found");
  }

  // Отправляем файл для скачивания
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });
});

async function organisation(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=admin/organisation");
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin?page=admin/organisation");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    ifDBError: false,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
  };

  try {
    const source = fs.readFileSync(
      "static/templates/admin/organisation.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/admin/organisation.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

app.post("/update-organisation", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin");
  }
  try {
    const { name } = req.body;

    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });

    const client = await pool.connect();

    await client.query("UPDATE main SET organisation = $1 WHERE id = 1", [
      name,
    ]);

    client.release();

    res.status(200).json({ message: "Значение успешно обновлено" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Произошла ошибка при обновлении значения" });
  }
});

async function adminPanel(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=admin");
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin?page=admin");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    ifDBError: false,
    Users: [],
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
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
    const queryUsers = `
      SELECT id, name, surname, email, phone, added
      FROM users
      ORDER BY id
    `;
    const usersResult = await client.query(queryUsers);
    const allUsers = usersResult.rows;

    templateData.Users = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      phone: user.phone,
      added: new Date(user.added).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    // console.log(templateData);

    const source = fs.readFileSync("static/templates/admin/index.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/admin/index.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

// Обработка POST-запроса для добавления пользователя
const saltRounds = 10;

app.post("/add-user", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin");
  }
  const { name, surname, email, phone, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const pool = new Pool({
      user: DB_User,
      host: DB_Host,
      database: DB_Name,
      password: DB_Password,
      port: DB_Port,
    });

    const client = await pool.connect();

    const query = `
      INSERT INTO users (name, surname, email, phone, password, added, devices)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6) 
      RETURNING id
    `;

    const result = await client.query(query, [
      name,
      surname,
      email,
      phone,
      hashedPassword,
      "{}",
    ]);

    // Освобождение клиента
    client.release();

    console.log("Пользователь успешно добавлен");
    res.json({ message: "Пользователь успешно добавлен" });
  } catch (err) {
    console.error("Ошибка при вставке данных в базу данных:", err);
    res.status(500).json({ error: "Ошибка при добавлении пользователя" });
  }
});

app.get("/admin/user/:id", async (req, res) => {
  const id = req.params.id;
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=admin/user/" + id);
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin?page=admin/user/" + id);
  }
  const userInfo = await getUserInfo(req.session.userId);

  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Id: id,
    Name: "",
    Surname: "",
    Email: "",
    Phone: "",
    Devices: [],
    EditTransport: false,
    DeleteTransport: false,
    Update: false,

    Groups: [],
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

    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);
    const groupsMap = {};
    groupsResult.rows.forEach((group) => {
      groupsMap[group.id] = group.name;
    });

    const minuteInMillis = 90 * 1000;

    const queryRegistrars = `
  SELECT id, serial, lastkeepalive, "group", name, plate, sim, ip, port, number
  FROM registrars
  ORDER BY id
`;
    const registrarsResult = await client.query(queryRegistrars);
    const allRegistrars = registrarsResult.rows;

    const groupedRegistrars = {};
    const groupedNumbers = {};
    allRegistrars.forEach((registrar) => {
      const groupName = groupsMap[registrar.group] || "Другое"; // Используем "Другое", если группа неизвестна
      if (!groupedRegistrars[groupName]) {
        groupedRegistrars[groupName] = [];
        groupedNumbers[groupName] = [];
      }
      groupedRegistrars[groupName].push({
        serial: registrar.serial,
        checked: false,
      });
      groupedNumbers[groupName].push(registrar.number);
    });

    const query = "SELECT * FROM users WHERE id = $1;";
    const userdata = await client.query(query, [id]);
    const response = userdata.rows[0];

    if (response.devices && response.devices.length > 0) {
      for (const groupName in groupedRegistrars) {
        groupedRegistrars[groupName].forEach((serialObj) => {
          serialObj.checked = response.devices.includes(serialObj.serial);
        });
      }
    }

    templateData.Name = response.name;
    templateData.Surname = response.surname;
    templateData.Email = response.email;
    templateData.Phone = response.phone;
    templateData.Devices = response.devices;
    templateData.DeleteTransport = response.deletetransport;
    templateData.EditTransport = response.edittransport;
    templateData.Update = response.update;

    templateData.Groups = Object.keys(groupedRegistrars).map((groupName) => ({
      name: groupName,
      serials: groupedRegistrars[groupName],
      numbers: groupedNumbers[groupName],
    }));

    const source = fs.readFileSync("static/templates/admin/user.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync("static/templates/admin/user.html", "utf8");
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
});

app.post("/updateuser/:id", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  if (req.session.userId != "admin") {
    return res.redirect("/signin");
  }
  const id = req.params.id;
  const pool = new Pool({
    user: DB_User,
    host: DB_Host,
    database: DB_Name,
    password: DB_Password,
    port: DB_Port,
  });
  const client = await pool.connect();

  var {
    name,
    surname,
    email,
    phone,
    password,
    EditTransport,
    DeleteTransport,
    Update,
  } = req.body.formData;

  var devices = req.body.devices;

  try {
    if (password === "" || password === undefined) {
      const query = `
      UPDATE users
      SET
        name = $2,
        surname = $3,
        email = $4,
        phone = $5,
        editTransport = $6,
        deleteTransport = $7,
        update = $8,
        devices = $9
      WHERE id = $1
      RETURNING *;
    `;

      const values = [
        id,
        name,
        surname,
        email,
        phone,
        EditTransport,
        DeleteTransport,
        Update,
        devices,
      ];

      const result = await client.query(query, values);
    } else {
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const query = `
      UPDATE users
      SET
        name = $2,
        surname = $3,
        email = $4,
        phone = $5,
        password = $6,
        editTransport = $7,
        deleteTransport = $8,
        update = $9,
        devices = $10
      WHERE id = $1
      RETURNING *;
    `;

      const values = [
        id,
        name,
        surname,
        email,
        phone,
        hashedPassword,
        EditTransport,
        DeleteTransport,
        Update,
        devices,
      ];

      const result = await client.query(query, values);
    }

    res.send("Data updated successfully");
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).send("An error occurred while updating data");
  } finally {
    client.release();
  }
});

async function videos(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=videos");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Registrars: [],
    Groups: [],
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const minuteInMillis = 60 * 1000;

    // Получаем список групп и их идентификаторов из таблицы groups
    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);
    const groupsMap = {};
    groupsResult.rows.forEach((group) => {
      groupsMap[group.id] = group.name;
    });

    // Выполняем запрос, чтобы получить все данные из таблицы registrars
    const queryRegistrars = `
      SELECT id, serial, channels, lastkeepalive, "group", name, plate, sim, ip, port, number
      FROM registrars ${!templateData.isAdmin ? "WHERE serial = ANY($1)" : ""}
      ORDER BY id
    `;
    const registrarsResult = await client.query(
      queryRegistrars,
      templateData.isAdmin ? [] : [serialValues]
    );
    const allRegistrars = registrarsResult.rows;

    const groupedRegistrars = {};
    allRegistrars.forEach((registrar) => {
      const groupName = groupsMap[registrar.group] || "Другое"; // Используем "Другое", если группа неизвестна
      if (!groupedRegistrars[groupName]) {
        groupedRegistrars[groupName] = [];
      }
      groupedRegistrars[groupName].push({
        id: registrar.id,
        serial: registrar.serial,
        channels: registrar.channels,
        status:
          Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
        name: registrar.name,
        group: groupsMap[registrar.group] || "Другое",
        plate: registrar.plate,
        sim: registrar.sim,
        ip: registrar.ip,
        port: registrar.port,
        number: registrar.number,
      });
    });

    templateData.Registrars = allRegistrars.map((registrar) => ({
      id: registrar.id,
      serial: registrar.serial,
      channels: registrar.channels,
      status:
        Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
      name: registrar.name,
      group: groupsMap[registrar.group] || "Другое",
      plate: registrar.plate,
      sim: registrar.sim,
      ip: registrar.ip,
      port: registrar.port,
    }));

    templateData.Groups = Object.keys(groupedRegistrars).map((groupName) => ({
      name: groupName,
      devices: groupedRegistrars[groupName],
    }));

    // console.log(templateData);

    const source = fs.readFileSync(
      "static/templates/videos/playback.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultHTML = template(templateData);
    res.send(resultHTML);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/videos/playback.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

async function videoExport(req, res) {
  if (req.session.userId === undefined) {
    return res.redirect("/signin?page=videos/export");
  }
  const userInfo = await getUserInfo(req.session.userId);
  let templateData = {
    VIRTUAL_HOST: process.env.VIRTUAL_HOST,
    Organisation: userInfo.Organisation,
    User: userInfo.User,
    UserInfo: userInfo.Users,
    isAdmin: req.session.userId === "admin",
    ifDBError: false,
    Registrars: [],
    Groups: [],
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

    let serialValues = [];
    if (!templateData.isAdmin) {
      const userDevicesQuery = `
        SELECT devices
        FROM users
        WHERE id = $1
      `;
      const userDevicesResult = await client.query(userDevicesQuery, [
        req.session.userId,
      ]);

      if (userDevicesResult.rows[0].devices.length > 0) {
        serialValues = userDevicesResult.rows[0].devices;
      }
    }

    const minuteInMillis = 60 * 1000;

    // Получаем список групп и их идентификаторов из таблицы groups
    const groupsQuery = "SELECT id, name FROM groups";
    const groupsResult = await client.query(groupsQuery);
    const groupsMap = {};
    groupsResult.rows.forEach((group) => {
      groupsMap[group.id] = group.name;
    });

    // Выполняем запрос, чтобы получить все данные из таблицы registrars
    const queryRegistrars = `
       SELECT id, serial, channels, lastkeepalive, "group", name, plate, sim, ip, port, number
       FROM registrars ${!templateData.isAdmin ? "WHERE serial = ANY($1)" : ""}
       ORDER BY id
     `;
    const registrarsResult = await client.query(
      queryRegistrars,
      templateData.isAdmin ? [] : [serialValues]
    );
    const allRegistrars = registrarsResult.rows;

    const groupedRegistrars = {};
    allRegistrars.forEach((registrar) => {
      const groupName = groupsMap[registrar.group] || "Другое"; // Используем "Другое", если группа неизвестна
      if (!groupedRegistrars[groupName]) {
        groupedRegistrars[groupName] = [];
      }
      groupedRegistrars[groupName].push({
        id: registrar.id,
        serial: registrar.serial,
        channels: registrar.channels,
        status:
          Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
        name: registrar.name,
        group: groupsMap[registrar.group] || "Другое",
        plate: registrar.plate,
        sim: registrar.sim,
        ip: registrar.ip,
        port: registrar.port,
        number: registrar.number,
      });
    });

    templateData.Registrars = allRegistrars.map((registrar) => ({
      id: registrar.id,
      serial: registrar.serial,
      channels: registrar.channels,
      status:
        Date.now() - Date.parse(registrar.lastkeepalive) <= minuteInMillis,
      name: registrar.name,
      group: groupsMap[registrar.group] || "Другое",
      plate: registrar.plate,
      sim: registrar.sim,
      ip: registrar.ip,
      port: registrar.port,
    }));

    templateData.Groups = Object.keys(groupedRegistrars).map((groupName) => ({
      name: groupName,
      devices: groupedRegistrars[groupName],
    }));
    // console.log(templateData);

    const source = fs.readFileSync(
      "static/templates/videos/export.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultHTML = template(templateData);
    res.send(resultHTML);

    client.release();
  } catch (error) {
    console.error(error);
    templateData.ifDBError = true;

    const source = fs.readFileSync(
      "static/templates/videos/export.html",
      "utf8"
    );
    const template = handlebars.compile(source);
    const resultT = template(templateData);
    res.send(resultT);
  }
}

app.get("/getData", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  const selectedSerial = req.query.serial;
  const selectedDate = req.query.selectedDate;
  const selectedTime = req.query.selectedTime;
  const selectedChannel = req.query.selectedChannel;

  try {
    const successResponse = await axios.get(
      `http://${process.env.VIRTUAL_HOST}:4747/http/filelist/request?serial=${selectedSerial}&querytime=${selectedDate}&channel=${selectedChannel}`
    );
    if (successResponse.data.SUCCESS) {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      const dataResponse = await axios.get(
        `http://${process.env.VIRTUAL_HOST}:4747/http/filelist/get?serial=${selectedSerial}&querytime=${selectedDate}&channel=${selectedChannel}`
      );
      if (successResponse.data.SUCCESS) {
        const dataId = dataResponse.data.DATAID;
        const dateRanges = dataResponse.data.DATA;
        let dataFound = false;
        let selectedDataId = null;
        const selectedDateTime = moment(
          selectedDate + selectedTime,
          "YYYYMMDDHHmmss"
        ).valueOf();

        if (dateRanges.length === 1) {
          // Если в массиве DATA только одно значение
          const [startRange, endRange] = dateRanges[0].split("-");
          const startDateTime = moment(startRange, "YYYYMMDDHHmmss").valueOf();
          const endDateTime = moment(endRange, "YYYYMMDDHHmmss").valueOf();

          if (
            !isNaN(selectedDateTime) &&
            !isNaN(startDateTime) &&
            !isNaN(endDateTime)
          ) {
            if (
              selectedDateTime >= startDateTime &&
              selectedDateTime <= endDateTime
            ) {
              dataFound = true;
              selectedDataId = dataId[0];
            }
          } else {
            console.error("Неверный формат данных для сравнения.");
          }
        } else {
          // Если в массиве DATA больше одного значения
          for (let i = 0; i < dateRanges.length; i++) {
            const [startRange, endRange] = dateRanges[i].split("-");
            const startDateTime = moment(
              startRange,
              "YYYYMMDDHHmmss"
            ).valueOf();
            const endDateTime = moment(endRange, "YYYYMMDDHHmmss").valueOf();

            if (
              !isNaN(selectedDateTime) &&
              !isNaN(startDateTime) &&
              !isNaN(endDateTime)
            ) {
              if (
                selectedDateTime >= startDateTime &&
                selectedDateTime <= endDateTime
              ) {
                dataFound = true;
                selectedDataId = dataId[i];
                break;
              }
            } else {
              console.error("Неверный формат данных для сравнения.");
            }
          }
        }

        if (dataFound) {
          // Здесь можно отправить запрос скоростей и отрисовать график
          res.json({ success: true, dataId: selectedDataId });
        } else {
          res.json({
            success: false,
            message: "Данных для выбранного периода нет",
          });
        }
      }
    } else {
      res.json({ success: false, message: "Ошибка при получении данных" });
    }
  } catch (error) {
    console.error("Ошибка при отправке запроса:", error);
    res.json({ success: false, message: "Ошибка при отправке запроса" });
  }
});

app.post("/getspeedarchive", async (req, res) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
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

  // Запрос для получения первой и последней временных отметок
  const timeRangeQuery = `
    SELECT MIN(time) as min_time, MAX(time) as max_time
    FROM geo
    WHERE serial = $1
    AND time >= $2
    AND time <= $3;
  `;

  const startTime = new Date(formattedDateTime);
  startTime.setMinutes(0, 0, 0); // Округление до начала часа
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);

  // Первый запрос для получения временных отметок
  pool.query(
    timeRangeQuery,
    [serial, startTime, endTime],
    (error, timeResults) => {
      if (error) {
        console.error("Ошибка при выполнении SQL-запроса:", error);
        res.status(500).json({ error: "Ошибка на сервере" });
      } else {
        const { min_time, max_time } = timeResults.rows[0];

        // Запрос для получения данных скорости и геолокации
        const sqlQuery = `
        SELECT speed, latitude, longitude, time
        FROM geo
        WHERE serial = $1
        AND time >= $2
        AND time <= $3;
      `;

        pool.query(sqlQuery, [serial, startTime, endTime], (error, results) => {
          if (error) {
            console.error("Ошибка при выполнении SQL-запроса:", error);
            res.status(500).json({ error: "Ошибка на сервере" });
          } else {
            const data = results.rows.map((row) => ({
              speed: row.speed > 150 ? row.speed / 100 : row.speed,
              geo: {
                latitude: row.latitude,
                longitude: row.longitude,
              },
              time: row.time.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
            }));

            // Функция для сравнения времени в формате "час:минута"
            function compareTime(a, b) {
              return (
                new Date("1970-01-01 " + a.time) -
                new Date("1970-01-01 " + b.time)
              );
            }

            // Сортируем массив данных
            data.sort(compareTime);

            // Разделяем отсортированный массив обратно на отдельные массивы
            const transformedSpeeds = data.map((item) => item.speed);
            const geoData = data.map((item) => item.geo);
            const names = data.map((item) => item.time);

            res.json({ speeds: transformedSpeeds, geo: geoData, names });
          }
        });
      }
    }
  );
});

const port = 8081;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    return res.redirect("/signin");
  }
  res.sendFile(path.join(__dirname, "static/templates/404.html"));
});
