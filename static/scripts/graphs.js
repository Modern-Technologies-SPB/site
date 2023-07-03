Chart.defaults.color = "rgba(0, 0, 0, 0.4)";
Chart.defaults.font.size = 15;
Chart.defaults.font.weight = 400;

var warningsData = {
  labels: [
    "9.03",
    "10.03",
    "11.03",
    "12.03",
    "13.03",
    "14.03",
    "15.03",
    "16.03",
    "17.03",
    "18.03",
    "19.03",
  ],
  datasets: [
    {
      label: "Актуальный период",
      backgroundColor: "rgba(235, 146, 139, 1)",
      borderWidth: 0,
      borderRadius: 9,
      hoverBackgroundColor: "rgba(235, 146, 139, 0.8)",
      data: [1150, 1400, 2100, 900, 1200, 400, 950, 1400, 1250, 1150, 1650],
      grouped: false,
    },
    {
      label: "Предыдущий период",
      backgroundColor: "rgba(235, 146, 139, 0.5)",
      borderWidth: 0,
      borderRadius: 9,
      hoverBackgroundColor: "rgba(235, 146, 139, 0.3)",
      data: [2700, 1850, 1100, 1550, 2300, 2200, 1650, 1200, 1500, 1850, 800],
    },
  ],
};

var warningsOptions = {
  plugins: {
    legend: {
      display: false,
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      grid: {
        display: true,
        color: "#D9D9D9",
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

new Chart("chart-warnings", {
  type: "bar",
  options: warningsOptions,
  data: warningsData,
});

var positionsData = {
  labels: [
    "9.03",
    "10.03",
    "11.03",
    "12.03",
    "13.03",
    "14.03",
    "15.03",
    "16.03",
    "17.03",
    "18.03",
    "19.03",
  ],
  datasets: [
    {
      label: "Позиционирование",
      borderColor: "#8086F9",
      fill: false,
      data: [
        480000, 390000, 407000, 400000, 435000, 460000, 385000, 410000, 380000,
        410000, 410000,
      ],
      pointStyle: false,
      pointRadius: 25,
      pointHoverRadius: 25,
      tension: 0.4,
    },
  ],
};

var positionsOptions = {
  plugins: {
    legend: {
      display: false,
    },
  },
  labelStep: "3",
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      stacked: true,
      grid: {
        display: true,
        color: "#D9D9D9",
      },
      ticks: {
        stepSize: 50000,
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

new Chart("chart-positions", {
  type: "line",
  data: positionsData,
  options: positionsOptions,
});
