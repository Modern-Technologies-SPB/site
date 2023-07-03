const devices = [
  {
    id: "1",
    group: "0001",
    name: "Трамваи",
    numberTS: "008803559E",
    time: "12.03.23 17:33",
    file: "X5H_V262_T191112.80_R0010_FS5.0",
    status: 100,
  },
  {
    id: "2",
    group: "0001",
    name: "Электробусы",
    numberTS: "0088036B78",
    time: "12.03.23 17:33",
    file: "A5H_V262.B107_T220801.70_C3920",
    status: 60,
  },
  {
    id: "3",
    group: "0002",
    name: "Трамваи",
    numberTS: "009800852A",
    time: "12.03.23 17:33",
    file: "A5H_V262.B107_T220801.70_C3920",
    status: 90,
  },
  {
    id: "4",
    group: "0003",
    name: "Троллейбусы",
    numberTS: "009800858D",
    time: "12.03.23 17:33",
    file: "A5H_V262.B107_T220801.70_C3920",
    status: 100,
  },
  {
    id: "5",
    group: "0003",
    name: "Электробусы",
    numberTS: "00980084FD",
    time: "12.03.23 17:33",
    file: "A5H_V262.B107_T220801.70_C3920",
    status: 100,
  },
  {
    id: "6",
    group: "0004",
    name: "Трамваи",
    numberTS: "0088036B7F",
    time: "12.03.23 17:33",
    file: "X5H_V262_T191112.80_R0010_FS5.0",
    status: 100,
  },
  {
    id: "7",
    group: "0005",
    name: "Старые ТС",
    numberTS: "00880302CD",
    time: "12.03.23 17:33",
    file: "X5H_V262_T191112.80_R0010_FS5.0",
    status: 20,
  },
  {
    id: "8",
    group: "0006",
    name: "Старые ТС",
    numberTS: "008802A035",
    time: "12.03.23 17:33",
    file: "X5H_V262_T191112.80_R0010_FS5.0",
    status: 100,
  },
  {
    id: "9",
    group: "0007",
    name: "Трамваи",
    numberTS: "008802A96A",
    time: "12.03.23 17:33",
    file: "X5H_V262_T191112.80_R0010_FS5.0",
    status: 100,
  },
  {
    id: "10",
    group: "0002",
    name: "Старые ТС",
    numberTS: "00880302C7",
    time: "12.03.23 17:33",
    file: "A5H_V262.B107_T220801.70_C3920",
    status: 35,
  },
];

// Получаем высоту таблицы и определяем, сколько строк помещается на странице
let currentPage = 1;
let tableHeight = document.getElementById("table-area").offsetHeight;
let rowHeight = 60;
let rowsPerPage = Math.floor(tableHeight / rowHeight) - 3;
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
    const numberTS = document.createElement("td");
    numberTS.textContent = device.numberTS;
    row.appendChild(numberTS);

    // const statusСell = document.createElement("td");
    // const status = document.createElement("div");
    // status.setAttribute("class", "status");
    // if (device.status === 100) {
    //   trashButton.setAttribute("class", "clockwise");
    // }
    // row.appendChild(statusСell);

    const status = document.createElement("div");
    status.setAttribute("class", "status");
    status.style.width = "80px";
    status.style.backgroundColor = "rgba(0, 0, 0, 0.05)";

    const fill = document.createElement("div");
    if (device.status === 100) {
      fill.style.width = `${device.status}%`;
      fill.style.height = "100%";
      fill.style.backgroundColor = "#32D74B";
      fill.style.borderRadius = "5px";
    } else {
      fill.style.width = `${device.status}%`;
      fill.style.height = "100%";
      fill.style.backgroundColor = "#FF453A";
      fill.style.borderRadius = "5px 0px 0px 5px";
    }

    status.appendChild(fill);

    const statusСell = document.createElement("td");
    statusСell.title = `Статус: ${device.status}%`;
    statusСell.appendChild(status);
    row.appendChild(statusСell);

    const time = document.createElement("td");
    time.textContent = device.time;
    row.appendChild(time);
    const file = document.createElement("td");
    file.textContent = device.file;
    row.appendChild(file);

    // Добавляем кнопку удаления после каждого ряда
    const trashCell = document.createElement("td");
    const trashButton = document.createElement("button");
    trashButton.setAttribute("class", "clockwise");
    trashButton.value = `delete-device-${device.id}`;
    trashButton.id = `delete-device-${device.id}`;

    trashCell.appendChild(trashButton);

    row.appendChild(trashCell);
    tbody.appendChild(row);
  });
};

window.addEventListener("resize", function (event) {
  tableHeight = document.getElementById("table-area").offsetHeight;
  rowHeight = 60;
  rowsPerPage = Math.floor(tableHeight / rowHeight) - 3;
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
      `${device.group} ${device.driverID} ${device.name} ${device.number} ${device.surname} ${device.numberTS} ${device.phone} ${device.mail} ${device.driverCard}`.toLowerCase();
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
