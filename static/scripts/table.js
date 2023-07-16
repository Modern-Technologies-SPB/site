// const devices = [
//   {
//     id: "1",
//     group: "2-device-1",
//     name: "Трамваи",
//     plate: "AB1234",
//     serial: "008803559E",
//     sim: "1234567890",
//     channels: 12,
//     ip: "192.168.0.1",
//     port: 17891,
//   },
//   {
//     id: "2",
//     group: "2-device-2",
//     name: "Электробусы",
//     plate: "BC2345",
//     serial: "008803559E",
//     sim: "2345678901",
//     channels: 12,
//     ip: "192.168.0.2",
//     port: 17891,
//   },
//   {
//     id: "3",
//     group: "2-device-1",
//     name: "Трамваи",
//     plate: "CD3456",
//     serial: "009800852A",
//     sim: "3456789012",
//     channels: 16,
//     ip: "192.168.0.3",
//     port: 17891,
//   },
//   {
//     id: "4",
//     group: "2-device-3",
//     name: "Троллейбусы",
//     plate: "DE4567",
//     serial: "009800858D",
//     sim: "4567890123",
//     channels: 12,
//     ip: "192.168.0.4",
//     port: 17891,
//   },
//   {
//     id: "5",
//     group: "2-device-2",
//     name: "Электробусы",
//     plate: "EF5678",
//     serial: "00980084FD",
//     sim: "5678901234",
//     channels: 16,
//     ip: "192.168.0.5",
//     port: 17891,
//   },
//   {
//     id: "6",
//     group: "2-device-1",
//     name: "Трамваи",
//     plate: "FG6789",
//     serial: "0088036B7F",
//     sim: "6789012345",
//     channels: 16,
//     ip: "192.168.0.6",
//     port: 17891,
//   },
//   {
//     id: "7",
//     group: "2-device-4",
//     name: "Старые ТС",
//     plate: "GH7890",
//     serial: "00880302CD",
//     sim: "7890123456",
//     channels: 12,
//     ip: "192.168.0.7",
//     port: 17891,
//   },
//   {
//     id: "8",
//     group: "2-device-4",
//     name: "Старые ТС",
//     plate: "HI8901",
//     serial: "008802A035",
//     sim: "8901234567",
//     channels: 12,
//     ip: "192.168.0.8",
//     port: 17891,
//   },
//   {
//     id: "9",
//     group: "1-device-1",
//     name: "Трамваи",
//     plate: "IJ9012",
//     serial: "008802A96A",
//     sim: "9012345678",
//     channels: 16,
//     ip: "192.168.0.9",
//     port: 17891,
//   },
//   {
//     id: "10",
//     group: "2-device-4",
//     name: "Старые ТС",
//     plate: "КТ32376",
//     serial: "00880302C7",
//     sim: "7012345678",
//     channels: 14,
//     ip: "192.168.0.10",
//     port: 17891,
//   },
//   {
//     id: "11",
//     group: "2-device-3",
//     name: "Троллейбусы",
//     plate: "ОА33277",
//     serial: "008802A035",
//     sim: "9034234348",
//     channels: 12,
//     ip: "192.168.0.11",
//     port: 17891,
//   },
//   {
//     id: "12",
//     group: "1-device-2",
//     name: "Маршрутки",
//     plate: "КЛ987102",
//     serial: "009800852A",
//     sim: "9023345678",
//     channels: 10,
//     ip: "192.168.0.12",
//     port: 17891,
//   },
//   {
//     id: "13",
//     group: "3-device-1",
//     name: "Троллейбусы",
//     plate: "КЛ987102",
//     serial: "0088036B78",
//     sim: "9023345678",
//     channels: 8,
//     ip: "192.168.0.13",
//     port: 17891,
//   },
//   {
//     id: "14",
//     group: "3-device-1",
//     name: "Маршрутки",
//     plate: "КЛ987102",
//     serial: "0088036B7F",
//     sim: "9023345678",
//     channels: 8,
//     ip: "192.168.0.14",
//     port: 17891,
//   },
//   {
//     id: "15",
//     group: "1-device-1",
//     name: "Трамваи",
//     plate: "КЛ987102",
//     serial: "008802A96A",
//     sim: "9023345678",
//     channels: 16,
//     ip: "192.168.0.15",
//     port: 17891,
//   },
// ];

console.log(devices);

// Получаем высоту таблицы и определяем, сколько строк помещается на странице
let currentPage = 1;
let tableHeight = document.getElementById("table-area").offsetHeight;
let rowHeight = 60;
let rowsPerPage = Math.floor(tableHeight / rowHeight) - 2;
let filteredDevices = [...devices];

const createTable = () => {
  const table = document.getElementById("deviceTable");
  const tbody = table.querySelector("tbody");
  // Очищаем таблицу
  tbody.innerHTML = "";

  // Добавляем строки таблицы
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const devicesToDisplay = filteredDevices.slice(startIndex, endIndex);

  devicesToDisplay.forEach((device) => {
    const row = document.createElement("tr");
    // Добавляем чекбокс перед каждым рядом
    const checkboxCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = `device-${device.id}`;
    checkbox.id = `device-${device.id}`;

    const checkboxLabel = document.createElement("label");
    checkboxLabel.setAttribute("for", `device-${device.id}`);

    const checkboxDiv = document.createElement("div");
    checkboxDiv.setAttribute("class", "checkmark");
    checkboxLabel.appendChild(checkboxDiv);

    checkboxCell.appendChild(checkbox);
    checkboxCell.appendChild(checkboxLabel);
    row.appendChild(checkboxCell);

    // Добавляем ячейки с данными
    const name = document.createElement("td");
    name.textContent = device.name;
    row.appendChild(name);
    const plate = document.createElement("td");
    plate.textContent = device.plate;
    row.appendChild(plate);
    const serial = document.createElement("td");
    serial.textContent = device.serial;
    row.appendChild(serial);
    const status = document.createElement("td");
    if (device.status === "true") {
      status.textContent = "Включен";
      status.setAttribute("style", "color:#32D74B");
    } else {
      status.textContent = "Выключен";
      status.setAttribute("style", "color:#FF453A");
    }
    // status.textContent = device.status;
    row.appendChild(status);
    const sim = document.createElement("td");
    sim.textContent = device.sim;
    row.appendChild(sim);
    const ip = document.createElement("td");
    ip.textContent = device.ip;
    row.appendChild(ip);
    const port = document.createElement("td");
    port.textContent = device.port;
    row.appendChild(port);

    // Добавляем кнопку удаления после каждого ряда
    const trashCell = document.createElement("td");
    trashCell.setAttribute("class", "optionsCell");
    const trashButton = document.createElement("button");
    trashButton.setAttribute("class", "trash");
    trashButton.value = `delete-device-${device.id}`;
    trashButton.id = `delete-device-${device.id}`;
    const optionsButton = document.createElement("button");
    optionsButton.setAttribute("class", "options");
    optionsButton.setAttribute("onclick", `openForm("${device.id}")`);
    optionsButton.value = `options-device-${device.id}`;
    optionsButton.id = `options-device-${device.id}`;

    trashCell.appendChild(optionsButton);
    trashCell.appendChild(trashButton);

    row.appendChild(trashCell);
    tbody.appendChild(row);
  });
};

window.addEventListener("resize", function (event) {
  tableHeight = document.getElementById("table-area").offsetHeight;
  rowHeight = 60;
  rowsPerPage = Math.floor(tableHeight / rowHeight) - 2;
  createTable();
  createPagination();
});

const createPagination = () => {
  const count = document.getElementById("count");
  count.textContent = `Всего результатов: ${filteredDevices.length}`;

  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const pageCount = Math.ceil(filteredDevices.length / rowsPerPage);
  for (let i = 1; i <= pageCount; i++) {
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    if (i === currentPage) {
      document.querySelector("#device-all").checked = false;
      pageLink.classList.add("active");
    }
    pageLink.textContent = i;
    pageLink.addEventListener("click", (event) => {
      event.preventDefault();
      currentPage = i - 1;
      currentPage = i;
      createTable();
      createPagination();
    });
    pagination.appendChild(pageLink);
  }

  //   var currentPageSpan = document.createElement("span");
  //   currentPageSpan.textContent = currentPage;
  //   pagination.appendChild(currentPageSpan);

  // Добавляем кнопки "Next" и "Previous"

  //   const prevButton = document.createElement("button");
  //   prevButton.innerText = "Previous";
  //   prevButton.onclick = () => {
  //     if (currentPage === 1) return;
  //     currentPage--;
  //     createTable();
  //   };
  //   pagination.appendChild(prevButton);

  //   const nextButton = document.createElement("button");
  //   nextButton.innerText = "Next";
  //   nextButton.onclick = () => {
  //     if (currentPage === pageCount) return;
  //     currentPage++;
  //     createTable();
  //   };
  //   pagination.appendChild(nextButton);
};

const applyFilterAndSearch = () => {
  const searchValue = searchInput.value.toLowerCase();
  const groupFilters = Array.from(
    document.querySelectorAll('input[type="checkbox"].device-filter:checked')
  ).map((checkbox) => checkbox.value);

  filteredDevices = devices.filter((device) => {
    const searchString =
      `${device.group} ${device.name} ${device.plate} ${device.number} ${device.serial} ${device.sim} ${device.channels} ${device.ip} ${device.port}`.toLowerCase();
    const matchGroup =
      groupFilters.length === 0 || groupFilters.includes(device.group);
    const matchSearch = !searchValue || searchString.includes(searchValue);
    return matchGroup && matchSearch;
  });

  currentPage = 1;
  createTable();
  createPagination();
};

const searchInput = document.getElementById("table-search");
searchInput.addEventListener("input", applyFilterAndSearch);

const filterCheckboxes = Array.from(
  document.querySelectorAll('input[type="checkbox"].device-filter')
);
filterCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", applyFilterAndSearch);
});

createTable();
createPagination();
