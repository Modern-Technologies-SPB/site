const createTable = () => {
  const table = document.getElementById("deviceTable");
  const tbody = table.querySelector("tbody");
  // Очищаем таблицу
  tbody.innerHTML = "";


  devices.forEach((device) => {
    const row = document.createElement("tr");

    // Добавляем ячейки с данными
    const name = document.createElement("td");
    name.textContent = device.type;
    row.appendChild(name);
    const reportID = document.createElement("td");
    reportID.textContent = device.id;
    row.appendChild(reportID);
    const plate = document.createElement("td");
    plate.textContent = device.number;
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


createTable();
