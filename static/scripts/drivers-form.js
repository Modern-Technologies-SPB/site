$("#continue-main").click(function () {
  document.getElementById("stage-details").checked = true;
});

$("#continue-main-edit").click(function () {
  document.getElementById("stage-details-edit").checked = true;
});

const container = document.getElementById("new-parameters");
const content1 = document.getElementById("main");
const content2 = document.getElementById("details");
const btn1 = document.getElementById("continue-main");
const content3 = document.getElementById("main-edit");
const content4 = document.getElementById("details-edit");
const btn2 = document.getElementById("continue-main-edit");
const radioButtons = document.querySelectorAll(
  'input[type="radio"][name="newStage"]'
);
const radioButtonsEdit = document.querySelectorAll(
  'input[type="radio"][name="newStageEdit"]'
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
  if (activeContent === content3) {
    switchContent(content4);
  } else {
    switchContent(content3);
  }
});

for (let radioButton of radioButtons) {
  radioButton.addEventListener("change", () => {
    if (radioButton.value === "main") {
      switchContent(content1);
    } else if (radioButton.value === "details") {
      switchContent(content2);
    }
  });
}

for (let radioButton of radioButtonsEdit) {
  radioButton.addEventListener("change", () => {
    if (radioButton.value === "main") {
      switchContent(content3);
    } else if (radioButton.value === "details") {
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
