// const devices = [
//   {
//     id: "2",
//     group: "2-device-2",
//     driverID: "233",
//     name: "Иван",
//     surname: "Спахов",
//     numberTS: "008803559E",
//     phone: "+7 999 123 45 67",
//     mail: "spahov@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "6",
//     group: "2-device-1",
//     driverID: "782",
//     name: "Александр",
//     surname: "Богаченко",
//     numberTS: "0088036B78",
//     phone: "+7 989 443 23 46",
//     mail: "bogachenko@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "7",
//     group: "2-device-4",
//     driverID: "2943",
//     name: "Михаил",
//     surname: "Гукасян",
//     numberTS: "009800852A",
//     phone: "+7 909 133 55 67",
//     mail: "agucasyan@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "8",
//     group: "2-device-4",
//     driverID: "87",
//     name: "Марат",
//     surname: "Шмидт",
//     numberTS: "009800858D",
//     phone: "+7 915 555 45 89",
//     mail: "shmidt@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "9",
//     group: "1-device-1",
//     driverID: "823",
//     name: "Никита",
//     surname: "Ильяшенко",
//     numberTS: "00980084FD",
//     phone: "+7 909 123 45 67",
//     mail: "iluashenko@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "10",
//     group: "2-device-4",
//     driverID: "15",
//     name: "Валерий",
//     surname: "Сараев",
//     numberTS: "0088036B7F",
//     phone: "+7 909 123 45 67",
//     mail: "saraev@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "11",
//     group: "2-device-3",
//     driverID: "423",
//     name: "Александр",
//     surname: "Курочкин",
//     numberTS: "00880302CD",
//     phone: "+7 999 123 45 67",
//     mail: "curochkin@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "12",
//     group: "1-device-2",
//     driverID: "6456",
//     name: "Екатерина",
//     surname: "Миненко",
//     numberTS: "008802A035",
//     phone: "+7 999 123 45 67",
//     mail: "minenko@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "13",
//     group: "3-device-1",
//     driverID: "887",
//     name: "Виталий",
//     surname: "Гаспарян",
//     numberTS: "008802A96A",
//     phone: "+7 999 123 45 67",
//     mail: "gosparyan@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
//   {
//     id: "15",
//     group: "1-device-1",
//     driverID: "742",
//     name: "Светлана",
//     surname: "Амусова",
//     numberTS: "00880302C7",
//     phone: "+7 999 123 45 67",
//     mail: "amusova@mail.ru",
//     driverCard: "RUD0000000000111",
//   },
// ];

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
    const driverID = document.createElement("td");
    driverID.textContent = device.id;
    row.appendChild(driverID);
    const name = document.createElement("td");
    name.textContent = device.name;
    row.appendChild(name);
    const surname = document.createElement("td");
    surname.textContent = device.surname;
    row.appendChild(surname);
    const numberTS = document.createElement("td");
    numberTS.textContent = device.numberTS;
    row.appendChild(numberTS);
    const phone = document.createElement("td");
    phone.textContent = device.phone;
    row.appendChild(phone);
    const mail = document.createElement("td");
    mail.textContent = device.mail;
    row.appendChild(mail);
    const driverCard = document.createElement("td");
    driverCard.textContent = device.driverCard;
    row.appendChild(driverCard);

    // Добавляем кнопку удаления после каждого ряда
    const trashCell = document.createElement("td");
    trashCell.setAttribute("class", "optionsCell");
    const trashButton = document.createElement("button");
    trashButton.setAttribute("class", "trash");
    trashButton.setAttribute("onclick", `deleteDriver(${device.id})`);
    trashButton.value = `delete-device-${device.id}`;
    trashButton.id = `delete-device-${device.id}`;
    const optionsButton = document.createElement("button");
    optionsButton.setAttribute("onclick", `openEdit(${device.id})`);
    optionsButton.setAttribute("class", "options");
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
