// =====================================================
// ESTUFA INTELIGENTE
// Comunicação USB / Serial
// =====================================================
//
// O ARDUINO será responsável por:
// - Sensor de umidade
// - Sensor de temperatura
// - Controle da bomba
// - Toda a lógica da estufa
//
// O SITE apenas RECEBE e MOSTRA as informações.
//
// Formato que o Arduino enviará:
//
// UMIDADE:65
// TEMPERATURA:27.4
// BOMBA:LIGADA
//
// As informações poderão ser enviadas a cada 15 segundos.
// =====================================================


// ===============================
// ELEMENTOS DO SITE
// ===============================

const connectButton =
    document.getElementById("connect-button");

const statusIndicator =
    document.getElementById("status-indicator");

const statusTitle =
    document.getElementById("status-title");

const statusText =
    document.getElementById("status-text");

const soilHumidity =
    document.getElementById("soil-humidity");

const soilStatus =
    document.getElementById("soil-status");

const temperature =
    document.getElementById("temperature");

const temperatureStatus =
    document.getElementById(
        "temperature-status"
    );

const pumpStatus =
    document.getElementById("pump-status");

const pumpDetail =
    document.getElementById("pump-detail");

const communicationStatus =
    document.getElementById(
        "communication-status"
    );

const lastUpdate =
    document.getElementById("last-update");

const serialLog =
    document.getElementById("serial-log");

const clearLog =
    document.getElementById("clear-log");


// ===============================
// VARIÁVEIS
// ===============================

let port = null;

let reader = null;

let keepReading = false;


// ===============================
// VERIFICAR WEB SERIAL
// ===============================

if (!("serial" in navigator)) {

    statusTitle.textContent =
        "Navegador não compatível";

    statusText.textContent =
        "Use Google Chrome ou Microsoft Edge.";

    connectButton.disabled = true;
}


// ===============================
// BOTÃO CONECTAR
// ===============================

connectButton.addEventListener(
    "click",
    async () => {

        if (port) {

            await disconnectArduino();

        } else {

            await connectArduino();

        }

    }
);


// ===============================
// CONECTAR ARDUINO
// ===============================

async function connectArduino() {

    setConnectingStatus();


    try {

        // Abre a janela do navegador
        // para escolher a porta USB.

        port =
            await navigator.serial.requestPort();


        // A velocidade precisa ser
        // igual ao Arduino.

        await port.open({

            baudRate: 9600

        });


        setConnectedStatus();


        keepReading = true;


        readSerial();


    } catch (error) {

        console.error(
            "Erro ao conectar:",
            error
        );


        port = null;


        setDisconnectedStatus();

    }

}


// ===============================
// LER SERIAL
// ===============================

async function readSerial() {

    const decoder =
        new TextDecoder();


    let buffer = "";


    while (
        port &&
        port.readable &&
        keepReading
    ) {

        reader =
            port.readable.getReader();


        try {

            while (true) {

                const {
                    value,
                    done
                } =
                    await reader.read();


                if (done) {

                    break;

                }


                if (value) {

                    buffer +=
                        decoder.decode(
                            value,
                            {
                                stream: true
                            }
                        );


                    const lines =
                        buffer.split(/\r?\n/);


                    buffer =
                        lines.pop();


                    for (
                        const line
                        of lines
                    ) {

                        const data =
                            line.trim();


                        if (data) {

                            processArduinoData(
                                data
                            );

                        }

                    }

                }

            }

        } catch (error) {

            console.error(
                "Erro na leitura:",
                error
            );

        } finally {

            if (reader) {

                reader.releaseLock();

                reader = null;

            }

        }

    }

}


// ===============================
// PROCESSAR DADOS
// ===============================

function processArduinoData(data) {

    console.log(
        "Arduino:",
        data
    );


    addLog(data);


    const separator =
        data.indexOf(":");


    if (separator === -1) {

        return;

    }


    const key =
        data
            .slice(
                0,
                separator
            )
            .trim()
            .toUpperCase();


    const value =
        data
            .slice(
                separator + 1
            )
            .trim();


    switch (key) {

        case "UMIDADE":

        case "HUMIDADE":

        case "HUM_SOLO":

            updateSoilHumidity(
                value
            );

            break;


        case "TEMPERATURA":

        case "TEMP":

            updateTemperature(
                value
            );

            break;


        case "BOMBA":

        case "PUMP":

            updatePump(
                value
            );

            break;


        default:

            console.log(
                "Informação desconhecida:",
                key,
                value
            );

    }


    updateLastUpdate();

}


// ===============================
// UMIDADE
// ===============================

function updateSoilHumidity(value) {

    const number =
        Number.parseFloat(value);


    if (Number.isNaN(number)) {

        return;

    }


    soilHumidity.textContent =
        `${number} %`;


    if (number < 30) {

        soilStatus.textContent =
            "Solo muito seco";

    }

    else if (number < 50) {

        soilStatus.textContent =
            "Solo com pouca umidade";

    }

    else {

        soilStatus.textContent =
            "Umidade adequada";

    }

}


// ===============================
// TEMPERATURA
// ===============================

function updateTemperature(value) {

    const number =
        Number.parseFloat(value);


    if (Number.isNaN(number)) {

        return;

    }


    temperature.textContent =
        `${number} °C`;


    if (number >= 35) {

        temperatureStatus.textContent =
            "Temperatura alta";

    }

    else {

        temperatureStatus.textContent =
            "Leitura recebida";

    }

}


// ===============================
// BOMBA
// ===============================

function updatePump(value) {

    const normalized =
        value
            .toUpperCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            );


    if (
        [
            "1",
            "ON",
            "LIGADA",
            "LIGADO",
            "TRUE"
        ].includes(normalized)
    ) {

        pumpStatus.textContent =
            "LIGADA";

        pumpStatus.className =
            "on";

        pumpDetail.textContent =
            "Bomba acionada pelo Arduino";


        return;

    }


    if (
        [
            "0",
            "OFF",
            "DESLIGADA",
            "DESLIGADO",
            "FALSE"
        ].includes(normalized)
    ) {

        pumpStatus.textContent =
            "DESLIGADA";

        pumpStatus.className =
            "off";

        pumpDetail.textContent =
            "Bomba desligada pelo Arduino";


        return;

    }


    pumpStatus.textContent =
        value;

    pumpStatus.className = "";

    pumpDetail.textContent =
        "Estado recebido do Arduino";

}


// ===============================
// ÚLTIMA ATUALIZAÇÃO
// ===============================

function updateLastUpdate() {

    const now =
        new Date();


    lastUpdate.textContent =
        `Última atualização: ${
            now.toLocaleTimeString("pt-BR")
        }`;

}


// ===============================
// LOG
// ===============================

function addLog(data) {

    const empty =
        serialLog.querySelector(
            ".empty-log"
        );


    if (empty) {

        empty.remove();

    }


    const line =
        document.createElement(
            "div"
        );


    line.className =
        "log-line";


    const time =
        new Date()
            .toLocaleTimeString(
                "pt-BR"
            );


    line.textContent =
        `[${time}] ${data}`;


    serialLog.appendChild(
        line
    );


    serialLog.scrollTop =
        serialLog.scrollHeight;


    // Guarda somente as
    // últimas 100 mensagens.

    while (
        serialLog.children.length > 100
    ) {

        serialLog.removeChild(
            serialLog.firstChild
        );

    }

}


// ===============================
// LIMPAR LOG
// ===============================

clearLog.addEventListener(
    "click",
    () => {

        serialLog.innerHTML =
            '<div class="empty-log">' +
            'Nenhum dado recebido ainda.' +
            '</div>';

    }
);


// ===============================
// STATUS: CONECTANDO
// ===============================

function setConnectingStatus() {

    statusIndicator.className =
        "status-indicator connecting";


    statusTitle.textContent =
        "Conectando...";


    statusText.textContent =
        "Selecione a porta USB do Arduino.";


    connectButton.disabled =
        true;

}


// ===============================
// STATUS: CONECTADO
// ===============================

function setConnectedStatus() {

    statusIndicator.className =
        "status-indicator connected";


    statusTitle.textContent =
        "Arduino conectado";


    statusText.textContent =
        "Recebendo informações pela USB.";


    connectButton.textContent =
        "🔌 Desconectar Arduino";


    connectButton.classList.add(
        "disconnect"
    );


    connectButton.disabled =
        false;


    communicationStatus.textContent =
        "CONECTADO";

}


// ===============================
// STATUS: DESCONECTADO
// ===============================

function setDisconnectedStatus() {

    statusIndicator.className =
        "status-indicator disconnected";


    statusTitle.textContent =
        "Arduino desconectado";


    statusText.textContent =
        "Conecte o Arduino pela USB para começar.";


    connectButton.textContent =
        "🔌 Conectar Arduino";


    connectButton.classList.remove(
        "disconnect"
    );


    connectButton.disabled =
        false;


    communicationStatus.textContent =
        "USB";

}


// ===============================
// DESCONECTAR
// ===============================

async function disconnectArduino() {

    keepReading = false;


    try {

        if (reader) {

            await reader.cancel();

            reader = null;

        }


        if (port) {

            await port.close();

        }

    } catch (error) {

        console.error(
            "Erro ao desconectar:",
            error
        );

    }


    port = null;


    setDisconnectedStatus();

}


// ===============================
// DESCONECTAR FISICAMENTE
// ===============================

if ("serial" in navigator) {

    navigator.serial.addEventListener(
        "disconnect",
        async (event) => {

            if (
                port === event.target
            ) {

                await disconnectArduino();

            }

        }
    );

}