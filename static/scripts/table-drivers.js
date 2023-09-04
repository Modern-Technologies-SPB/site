

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
