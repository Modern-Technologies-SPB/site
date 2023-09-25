

const container = document.getElementById("new-parameters");
const content1 = document.getElementById("parameters");
const content2 = document.getElementById("ethernet");
const content3 = document.getElementById("wifi");
const content4 = document.getElementById("communication");
const content5 = document.getElementById("install");
const content6 = document.getElementById("ai");;
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

var givenData;

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
    } else if (radioButton.value === "ai") {
      switchContent(content6);
      document.getElementById('parameters-bg').style.display = 'flex';

          fetch('/ai-parameters', {
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
            givenData = data.DATA.DSM.DSMA;

            console.log(givenData);

            function encodeCHValue(channels) {
              let CH = 0;
              for (const channelNumber of channels) {
                if (channelNumber >= 1 && channelNumber <= 32) {
                  const channelBit = 1 << (channelNumber - 1);
                  CH |= channelBit;
                }
              }
              return CH;
            }
            
            let selectedCameras;

            function checkSelectedCameras() {
              const checkboxes = document.querySelectorAll('.checkbox-input');
              selectedCameras = []; 
          
              checkboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                  const cameraNumber = checkbox.id.replace('camera', ''); 
                  selectedCameras.push(cameraNumber);
                }
              });

            }

            function decodeCHValue(CH) {
              const channels = [];
              for (let i = 0; i < 32; i++) {
                const channelBit = (CH >> i) & 1;
                if (channelBit === 1) {
                  const channelNumber = i + 1;
                  channels.push(channelNumber);
                }
              }
              return channels;
            }

            var desiredCameras;

            function updateCheckboxes() {
              var checkboxes = document.querySelectorAll('.checkbox-input');

              checkboxes.forEach(function (checkbox) {
                var cameraNumber = parseInt(checkbox.id.replace('camera', ''), 10);

                checkbox.checked = desiredCameras.includes(cameraNumber);
              });
            }

            let newCH;

            

              function updateFields(selectedIndex) {
                const selectedData = givenData[selectedIndex];
                console.log(selectedData);

                document.getElementById("system-ai-en1").value = selectedData.EN;
                document.getElementById("system-ai-as1").value = selectedData.AS;
                document.getElementById("system-ai-ensp1").value = selectedData.APR.ENSP;
                document.getElementById("system-ai-fgms1").value = selectedData.FGMS;
                document.getElementById("system-ai-sgms1").value = selectedData.SGMS;
                document.getElementById("system-ai-esst1").value = selectedData.ESST;
                document.getElementById("system-ai-udt1").value = selectedData.UDT;
                document.getElementById("system-ai-vt1").value = selectedData.VT;
                document.getElementById("system-ai-sdt1").value = selectedData.SDT;
                document.getElementById("system-ai-et1").value = selectedData.APR.ET;
                document.getElementById("system-ai-ss-en1").value = selectedData.APR.SS.EN;
                document.getElementById("system-ai-ar-d1").value = selectedData.APR.AR.D;

                desiredCameras = decodeCHValue(selectedData.APR.AR.CH);
                updateCheckboxes();

                checkSelectedCameras();
                newCH = encodeCHValue(selectedCameras);
                console.log('Выбранные камеры:', newCH);
            }

            document.getElementById("system-ai").addEventListener("change", function () {
                const selectedIndex = parseInt(this.value);
                updateFields(selectedIndex);
            });

            document.getElementById("checkboxContainer").addEventListener("change", function () {
                checkSelectedCameras();
                newCH = encodeCHValue(selectedCameras);
                console.log('Выбранные камеры:', newCH);
          });
          function updateDataInArray(selectedIndex) {
            const selectedDataRow = data.DATA.DSM.DSMA[selectedIndex];
          
            selectedDataRow.EN = document.getElementById("system-ai-en1").value;
            selectedDataRow.AS = document.getElementById("system-ai-as1").value;
            selectedDataRow.APR.ENSP = document.getElementById("system-ai-ensp1").value;
            selectedDataRow.FGMS = document.getElementById("system-ai-fgms1").value;
            selectedDataRow.SGMS = document.getElementById("system-ai-sgms1").value;
            selectedDataRow.ESST = document.getElementById("system-ai-esst1").value;
            selectedDataRow.UDT = document.getElementById("system-ai-udt1").value;
            selectedDataRow.VT = document.getElementById("system-ai-vt1").value;
            selectedDataRow.SDT = document.getElementById("system-ai-sdt1").value;
            selectedDataRow.APR.ET = document.getElementById("system-ai-et1").value;
            selectedDataRow.APR.SS.EN = document.getElementById("system-ai-ss-en1").value;
            selectedDataRow.APR.AR.D = document.getElementById("system-ai-ar-d1").value;
          
            selectedDataRow.APR.AR.CH = encodeCHValue(selectedCameras);

            console.log(selectedDataRow);
          }

            updateFields(0);

            $("select").trigger("input");

          })
          .catch(error => console.error('Ошибка:', error));
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
