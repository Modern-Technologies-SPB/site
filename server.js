const express = require("express");
const app = express();
const path = require("path");

app.use(express.static(path.join(__dirname, "static")));

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

function index(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/index.html"));
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
function reports(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/reports/index.html"));
}
function reports346(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/reports/346.html"));
}
function devices(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/index.html"));
}
function drivers(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/drivers.html"));
}
function newdevice(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/newdevice.html"));
}
function newdriver(req, res) {
  res.sendFile(path.join(__dirname, "static/templates/devices/newdriver.html"));
}

// function unauthorized(req, res) {
//   const td = {};
//   res.sendFile(path.join(__dirname, "static/templates/unauthorized.html"));
// }

const port = 8081;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, "static/templates/404.html"));
// });
