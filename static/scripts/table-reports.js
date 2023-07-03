const devices = [
  {
    id: "1",
    group: "0001",
    name: "Разговор по телефону",
    reportID: "354",
    plate: "AO30877",
    numberTS: "008803559E",
    time: "12.03.23 17:33",
    place: "59.852371, 30.344543",
  },
  {
    id: "2",
    group: "0001",
    name: "Водитель зевает",
    reportID: "353",
    plate: "AO64377",
    numberTS: "0088036B78",
    time: "12.03.23 14:26",
    place: "60.058236, 30.315283",
  },
  {
    id: "3",
    group: "0002",
    name: "Усталость",
    reportID: "352",
    plate: "ГД44377",
    numberTS: "009800852A",
    time: "12.03.23 10:07",
    place: "59.878256, 30.31962",
  },
  {
    id: "4",
    group: "0003",
    name: "Водитель зевает",
    reportID: "351",
    plate: "УА86577",
    numberTS: "009800858D",
    time: "12.03.23 09:56",
    place: "60.045981, 30.4134",
  },
  {
    id: "5",
    group: "0003",
    name: "Разговор по телефону",
    reportID: "350",
    plate: "БВ74665",
    numberTS: "00980084FD",
    time: "11.03.23 20:43",
    place: "59.83257, 30.389893",
  },
  {
    id: "6",
    group: "0004",
    name: "Разговор по телефону",
    reportID: "349",
    plate: "ЦУ445101",
    numberTS: "0088036B7F",
    time: "11.03.23 19:17",
    place: "59.959926, 30.42224",
  },
  {
    id: "7",
    group: "0005",
    name: "Усталость",
    reportID: "348",
    plate: "КТ32376",
    numberTS: "00880302CD",
    time: "11.03.23 15:32",
    place: "60.046346, 30.405688",
  },
  {
    id: "8",
    group: "0006",
    name: "Курение за рулём",
    reportID: "347",
    plate: "ОА33277",
    numberTS: "008802A035",
    time: "11.03.23 15:06",
    place: "59.956626, 30.234408",
  },
  {
    id: "9",
    group: "0007",
    name: "Водитель отвлекся",
    reportID: "346",
    plate: "КЛ987102",
    numberTS: "008802A96A",
    time: "11.03.23 12:44",
    place: "59.956626, 30.234408",
  },
  {
    id: "10",
    group: "0002",
    name: "Водитель отвлекся",
    reportID: "345",
    plate: "АУ22377",
    numberTS: "00880302C7",
    time: "11.03.23 11:40",
    place: "59.956626, 30.234408",
  },
];

// Получаем высоту таблицы и определяем, сколько строк помещается на странице
let currentPage = 1;
let tableHeight = document.getElementById("table-area").offsetHeight;
let rowHeight = 60;
let rowsPerPage = Math.floor(tableHeight / rowHeight) - 3;
let filteredDevices = [...devices];
let timeRangeStart = null;
let timeRangeEnd = null;

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
    const reportID = document.createElement("td");
    reportID.textContent = device.reportID;
    row.appendChild(reportID);
    const plate = document.createElement("td");
    plate.textContent = device.plate;
    row.appendChild(plate);
    const numberTS = document.createElement("td");
    numberTS.textContent = device.numberTS;
    row.appendChild(numberTS);
    const time = document.createElement("td");
    time.textContent = device.time;
    row.appendChild(time);
    const place = document.createElement("td");
    place.textContent = device.place;
    row.appendChild(place);

    // Добавляем кнопку удаления после каждого ряда
    const shareCell = document.createElement("td");
    const shareButton = document.createElement("button");
    shareButton.setAttribute("class", "share");
    shareButton.setAttribute("onclick", "location.href = '/reports/346';");
    shareButton.value = `delete-device-${device.id}`;
    shareButton.id = `delete-device-${device.id}`;

    shareCell.appendChild(shareButton);

    row.appendChild(shareCell);
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
      `${device.group} ${device.name} ${device.reportID} ${device.place} ${device.numberTS} ${device.time} ${device.place}`.toLowerCase();
    const matchGroup =
      groupFilters.length === 0 || groupFilters.includes(device.group);
    const matchSearch = !searchValue || searchString.includes(searchValue);

    // Фильтр по временному диапазону
    let matchTimeRange = true;
    if (timeRangeStart) {
      const startTimestamp = new Date(timeRangeStart).getTime();
      const deviceTimestamp = parseTableTime(device.time); // Преобразование времени из таблицы
      matchTimeRange = startTimestamp <= deviceTimestamp;
    }
    if (timeRangeEnd) {
      const endTimestamp = new Date(timeRangeEnd).getTime();
      const deviceTimestamp = parseTableTime(device.time); // Преобразование времени из таблицы
      matchTimeRange = matchTimeRange && deviceTimestamp <= endTimestamp;
    }

    return matchGroup && matchSearch && matchTimeRange;
  });

  currentPage = 1;
  createTable();
  createPagination();
};

// Функция для преобразования времени из таблицы в миллисекунды
function parseTableTime(tableTime) {
  // Парсинг даты и времени из строки формата "12.03.23 17:33"
  const parts = tableTime.split(" ");
  const dateParts = parts[0].split(".");
  const timeParts = parts[1].split(":");
  const year = 2000 + parseInt(dateParts[2]);
  const month = parseInt(dateParts[1]) - 1; // Месяцы в JavaScript начинаются с 0
  const day = parseInt(dateParts[0]);
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  return new Date(year, month, day, hours, minutes).getTime();
}

const searchInput = document.getElementById("table-search");
searchInput.addEventListener("input", applyFilterAndSearch);

const filterCheckboxes = Array.from(
  document.querySelectorAll('input[type="checkbox"].device-filter')
);
filterCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", applyFilterAndSearch);
});

// Обработчик изменения значения в поле начала временного диапазона
const timeRangeStartInput = document.getElementById("timeRangeStart");
timeRangeStartInput.addEventListener("change", () => {
  timeRangeStart = timeRangeStartInput.value;
  console.log(timeRangeStart);
  applyFilterAndSearch();
});

// Обработчик изменения значения в поле конца временного диапазона
const timeRangeEndInput = document.getElementById("timeRangeEnd");
timeRangeEndInput.addEventListener("change", () => {
  timeRangeEnd = timeRangeEndInput.value;
  console.log(timeRangeEnd);
  applyFilterAndSearch();
});

createTable();
createPagination();
