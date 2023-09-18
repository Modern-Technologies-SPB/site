Chart.defaults.color = "rgba(0, 0, 0, 0.4)";
Chart.defaults.font.size = 15;
Chart.defaults.font.weight = 400;



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
        stepSize: 10000,
      },
      beginAtZero: true,
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
