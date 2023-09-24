
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

    // Добавляем ячейки с данными
    const name = document.createElement("td");
    name.textContent = device.type;
    row.appendChild(name);
    const reportID = document.createElement("td");
    reportID.textContent = device.id;
    row.appendChild(reportID);
    const plate = document.createElement("td");
    plate.textContent = device.plate;
    row.appendChild(plate);
    const numberTS = document.createElement("td");
    numberTS.textContent = device.serial;
    row.appendChild(numberTS);
    const time = document.createElement("td");
    time.textContent = device.time;
    row.appendChild(time);
    const place = document.createElement("td");
    place.textContent = device.geo;
    row.appendChild(place);

    // Добавляем кнопку удаления после каждого ряда
    const shareCell = document.createElement("td");
    const shareButton = document.createElement("button");
    shareButton.setAttribute("class", "share");
    shareButton.setAttribute("onclick", `location.href = '/reports/${device.id}';`);
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
      `${device.group} ${device.name} ${device.id} ${device.place} ${device.numberTS} ${device.time} ${device.place} ${device.geo} ${device.serial}`.toLowerCase();
    const matchGroup =
      groupFilters.length === 0 || groupFilters.includes(device.group) || groupFilters.includes(device.serial);
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
