$("#continue-details").click(function () {
  document.getElementById("stage-sim").checked = true;
});
$("#continue-sim").click(function () {
  document.getElementById("stage-ts").checked = true;
});
$("#continue-ts").click(function () {
  document.getElementById("stage-equipment").checked = true;
});

const container = document.getElementById("new-parameters");
const content1 = document.getElementById("details");
const content2 = document.getElementById("sim");
const content3 = document.getElementById("ts");
const content4 = document.getElementById("equipment");
const btn1 = document.getElementById("continue-details");
const btn2 = document.getElementById("continue-sim");
const btn3 = document.getElementById("continue-ts");
const radioButtons = document.querySelectorAll(
  'input[type="radio"][name="newStage"]'
);
const duration = 100;

let activeContent = content1;

function switchContent(newContent) {
  fadeOut(activeContent, () => {
    fadeIn(newContent);
    activeContent = newContent;
  });
}

function fadeIn(element) {
  element.style.opacity = 0;
  element.style.display = "block";
  let start = performance.now();

  function animate(time) {
    let timeFraction = (time - start) / duration;
    if (timeFraction > 1) {
      element.style.opacity = 1;
    } else {
      element.style.opacity = timeFraction;
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function fadeOut(element, callback) {
  element.style.opacity = 1;
  let start = performance.now();

  function animate(time) {
    let timeFraction = (time - start) / duration;
    if (timeFraction > 1) {
      element.style.opacity = 0;
      element.style.display = "none";
      if (callback) {
        callback();
      }
    } else {
      element.style.opacity = 1 - timeFraction;
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

btn1.addEventListener("click", () => {
  if (activeContent === content1) {
    switchContent(content2);
  } else {
    switchContent(content1);
  }
});

btn2.addEventListener("click", () => {
  if (activeContent === content2) {
    switchContent(content3);
  } else {
    switchContent(content2);
  }
});

btn3.addEventListener("click", () => {
  if (activeContent === content3) {
    switchContent(content4);
  } else {
    switchContent(content3);
  }
});

for (let radioButton of radioButtons) {
  radioButton.addEventListener("change", () => {
    if (radioButton.value === "details") {
      switchContent(content1);
    } else if (radioButton.value === "sim") {
      switchContent(content2);
    } else if (radioButton.value === "ts") {
      switchContent(content3);
    } else if (radioButton.value === "equipment") {
      switchContent(content4);
    }
  });
}

function truncateText(select) {
  var maxLength = 30;
  var option = select.options[select.selectedIndex];
  if (option.text.length > maxLength) {
    option.text = option.text.substring(0, maxLength) + "...";
  }
}
