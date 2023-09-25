

const container = document.getElementById("new-parameters");
const content1 = document.getElementById("parameters");
const content2 = document.getElementById("ethernet");
const content3 = document.getElementById("wifi");
const content4 = document.getElementById("communication");
const content5 = document.getElementById("install");
const content6 = document.getElementById("cameras");;
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


for (let radioButton of radioButtons) {
  radioButton.addEventListener("change", () => {
    if (radioButton.value === "parameters") {
      switchContent(content1);
      document.getElementById('parameters-bg').style.display = 'flex';
          
          fetch('/device-parameters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(data => {

            document.getElementById('parameters-bg').style.display = 'none';

            camerasData = data;

            console.log(data.DATA);

            document.getElementById('system-date').value = data.DATA.TIMEP.DATEM;
            document.getElementById('system-time').value = data.DATA.TIMEP.TIMEM;
            document.getElementById('system-language').value = data.DATA.GSP.LANT;
            document.getElementById('system-timezone').value = data.DATA.TIMEP.TIMEZ;
            document.getElementById('system-geo').value = data.DATA.GSP.GM;
            document.getElementById('system-stream').value = data.DATA.SUBSTRNET.SM;
            document.getElementById('NE').checked = data.DATA.EOSD[0].NE === 1;
            document.getElementById('TE').checked = data.DATA.EOSD[0].TE === 1;
            document.getElementById('VE').checked = data.DATA.EOSD[0].VE === 1;
            document.getElementById('SE').checked = data.DATA.EOSD[0].SE === 1;
            document.getElementById('GE').checked = data.DATA.EOSD[0].GE === 1;
            document.getElementById('DE').checked = data.DATA.EOSD[0].DE === 1;

            $("select").trigger("input");
          })
          .catch(error => console.error('Ошибка:', error));
    } else if (radioButton.value === "ethernet") {
      switchContent(content2);

      document.getElementById('parameters-bg').style.display = 'flex';

          fetch('/ethernet-parameters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(data => {

            document.getElementById('parameters-bg').style.display = 'none';

            camerasData = data;

            console.log(data.DATA);

            document.getElementById('system-ipmode').value = data.DATA.ETHERNET.IPMODE;
            document.getElementById('system-ipaddr').value = data.DATA.ETHERNET.PIP.IPADDR;
            document.getElementById('system-submask').value = data.DATA.ETHERNET.PIP.SUBMASK;
            document.getElementById('system-gateway').value = data.DATA.ETHERNET.PIP.GATEWAY;
            document.getElementById('system-dnsmode').value = data.DATA.ETHERNET.DNSMODE;
            document.getElementById('system-pdns').value = data.DATA.ETHERNET.DNS.PDNS;
            document.getElementById('system-adns').value = data.DATA.ETHERNET.DNS.ADNS;
            document.getElementById('system-mac').value = data.DATA.KEYS.MAC;

            $("select").trigger("input");

          })
          .catch(error => console.error('Ошибка:', error));
    } else if (radioButton.value === "wifi") {
      switchContent(content3);

      document.getElementById('parameters-bg').style.display = 'flex';

          fetch('/wifi-parameters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(data => {

            document.getElementById('parameters-bg').style.display = 'none';

            camerasData = data;

            console.log(data.DATA);

            document.getElementById('system-wifi').value = data.DATA.WIFI.ENABLE;
            document.getElementById('system-wifi-essid').value = data.DATA.WIFI.ESSID;
            document.getElementById('system-wifi-ecrypttype').value = data.DATA.WIFI.ECRYPTTYPE;
            document.getElementById('system-wifi-pwd').value = data.DATA.WIFI.PWD;
            document.getElementById('system-wifi-ipmode').value = data.DATA.WIFI.IPMODE;
            document.getElementById('system-wifi-ipaddr').value = data.DATA.WIFI.PIP.IPADDR;
            document.getElementById('system-wifi-submask').value = data.DATA.WIFI.PIP.SUBMASK;
            document.getElementById('system-wifi-gateway').value = data.DATA.WIFI.PIP.GATEWAY;

            $("select").trigger("input");

          })
          .catch(error => console.error('Ошибка:', error));
    } else if (radioButton.value === "communication") {
      switchContent(content4);

      document.getElementById('parameters-bg').style.display = 'flex';

          fetch('/communication-parameters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(data => {

            document.getElementById('parameters-bg').style.display = 'none';

            camerasData = data;

            console.log(data.DATA);

            document.getElementById('system-nm1').value = data.DATA.M3G.MP.NM;
            document.getElementById('system-apn1').value = data.DATA.M3G.MP.APN;
            document.getElementById('system-un1').value = data.DATA.M3G.MP.UN;
            document.getElementById('system-pw1').value = data.DATA.M3G.MP.PW;

            document.getElementById('system-nm2').value = data.DATA.M3G.M4G.NM;
            document.getElementById('system-apn2').value = data.DATA.M3G.M4G.APN;
            document.getElementById('system-un2').value = data.DATA.M3G.M4G.UN;
            document.getElementById('system-pw2').value = data.DATA.M3G.M4G.PW;

            document.getElementById('system-at').value = data.DATA.M3G.M3M.AT;
            document.getElementById('system-tn1').value = data.DATA.M3G.M3M.TN1;
            document.getElementById('system-tn2').value = data.DATA.M3G.M3M.TN2;
            document.getElementById('system-tn3').value = data.DATA.M3G.M3M.TN3;

            $("select").trigger("input");

          })
          .catch(error => console.error('Ошибка:', error));
    } else if (radioButton.value === "install") {
      switchContent(content5);

      document.getElementById('parameters-bg').style.display = 'flex';

          fetch('/install-parameters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(data => {

            document.getElementById('parameters-bg').style.display = 'none';

            camerasData = data;

            console.log(data.DATA);

            clearServerContainer();

            data.DATA.MCMS.SP.forEach((data) => {
              addServer(data);
            });

            $("select").trigger("input");

          })
          .catch(error => console.error('Ошибка:', error));
    } else if (radioButton.value === "cameras") {
      switchContent(content6);
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
