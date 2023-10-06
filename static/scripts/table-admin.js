// Получаем высоту таблицы и определяем, сколько строк помещается на странице
let currentPage = 1;
let tableHeight = document.getElementById("content").offsetHeight;
let rowHeight = 75;
let rowsPerPage = Math.floor(tableHeight / rowHeight) - 3;
let filteredUsers = [...users];
let timeRangeStart = null;
let timeRangeEnd = null;

const createTable = () => {
  const table = document.getElementById("adminTable");
  const tbody = table.querySelector("tbody");
  // Очищаем таблицу
  tbody.innerHTML = "";

  // Добавляем строки таблицы
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const usersToDisplay = filteredUsers.slice(startIndex, endIndex);

  usersToDisplay.forEach((user) => {
    const row = document.createElement("tr");

    // Добавляем ячейку с данными
    const dataCell = document.createElement("td");
    dataCell.classList.add("user-data");

    // Создаем контейнер для аватара и имени
    const avatarContainer = document.createElement("div");
    avatarContainer.classList.add("avatar-container");
    avatarContainer.style.display = "inline-block"; 

    // Добавляем аватар в контейнер
    const avatar = document.createElement("div");
    avatar.textContent = user.name[0] + user.surname[0]; // Инициалы
    avatar.classList.add("avatar");
    avatar.style.backgroundColor = getRandomColor(); // Добавляем случайный цвет фона (функция getRandomColor определена ниже)
    avatar.style.color = "#fff"; // Устанавливаем белый цвет текста на фоне
    avatar.style.borderRadius = "50%"; // Делаем аватар круглым
    avatar.style.width = "45px"; // Устанавливаем ширину
    avatar.style.height = "43px"; // Устанавливаем высоту
    avatar.style.display = "flex"; // Делаем аватар flex-элементом
    avatar.style.justifyContent = "center"; // Выравниваем содержимое по центру
    avatar.style.alignItems = "center"; // Выравниваем содержимое по центру
    avatar.style.fontSize = "17px"; // Устанавливаем размер шрифта
    avatar.style.paddingTop = "2px"; // Устанавливаем отступ сверху
    avatar.style.cursor = "default"; // Устанавливаем курсор в виде стрелки

    // Добавляем аватар в контейнер
    avatarContainer.appendChild(avatar);

    // Добавляем имя в контейнер
    const name = document.createElement("div");
    name.textContent = user.name + " " + user.surname;
    name.classList.add("user-name");
    name.style.display = "inline-block";
    name.style.marginLeft = "14px";

    // Добавляем контейнер с аватаром и именем в ячейку
    dataCell.appendChild(avatarContainer);
    dataCell.appendChild(name);

    // Добавляем ячейку с данными в строку
    row.appendChild(dataCell);

    // Добавляем ячейки с данными
    // const name = document.createElement("td");
    // name.textContent = user.name + " " + user.surname;
    // row.appendChild(name);
    const ID = document.createElement("td");
    ID.textContent = user.id;
    row.appendChild(ID);
    const mail = document.createElement("td");
    mail.textContent = user.email;
    row.appendChild(mail);
    const phone = document.createElement("td");
    phone.textContent = user.phone;
    row.appendChild(phone);
    const date = document.createElement("td");
    date.textContent = user.date;
    row.appendChild(date);

    const optionsCell = document.createElement("td");
    optionsCell.setAttribute("class", "optionsCell");
    const trashButton = document.createElement("button");
    trashButton.setAttribute("class", "trash");
    trashButton.setAttribute("onclick", `deleteUser(${user.id})`);
    trashButton.value = `delete-user-${user.id}`;
    trashButton.id = `delete-user-${user.id}`;
    const optionsButton = document.createElement("button");
    optionsButton.setAttribute("class", "options");
    optionsButton.setAttribute("onclick", `location.href = '/admin/user/${user.id}';`);

    optionsCell.appendChild(optionsButton);
    optionsCell.appendChild(trashButton);

    row.appendChild(optionsCell);
    tbody.appendChild(row);
  });
};

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

window.addEventListener("resize", function (event) {
  tableHeight = document.getElementById("content").offsetHeight;
  rowHeight = 75;
  rowsPerPage = Math.floor(tableHeight / rowHeight) - 3;
  createTable();
  createPagination();
});

const createPagination = () => {
  const count = document.getElementById("count");
  count.textContent = `Всего результатов: ${filteredUsers.length}`;

  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);
  for (let i = 1; i <= pageCount; i++) {
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    if (i === currentPage) {
      // document.querySelector("#device-all").checked = false;
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

  filteredUsers = users.filter((user) => {
    const searchString =
      `${user.id} ${user.name} ${user.surname} ${user.email} ${user.phone} ${user.date}`.toLowerCase();
    const matchSearch = !searchValue || searchString.includes(searchValue);

    // Фильтр по временному диапазону
    let matchTimeRange = true;
    if (timeRangeStart) {
      const startTimestamp = new Date(timeRangeStart).getTime();
      const deviceTimestamp = parseTableTime(user.time); // Преобразование времени из таблицы
      matchTimeRange = startTimestamp <= deviceTimestamp;
    }
    if (timeRangeEnd) {
      const endTimestamp = new Date(timeRangeEnd).getTime();
      const deviceTimestamp = parseTableTime(user.time); // Преобразование времени из таблицы
      matchTimeRange = matchTimeRange && deviceTimestamp <= endTimestamp;
    }

    return matchSearch && matchTimeRange;
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


createTable();
createPagination();
