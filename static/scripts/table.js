
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
    name.textContent = device.group;
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
      groupFilters.length === 0 || groupFilters.includes(device.group) || groupFilters.includes(device.serial);
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
