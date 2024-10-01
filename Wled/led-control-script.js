const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const url = require('url');
const axios = require('axios');

const ESP32_IPS = [
  '192.168.0.118',
  '192.168.0.174',
  '192.168.0.151',
  '192.168.0.142'
];

const ESP32_PORT = 21324;

const EFFECTS = {
  'LIGHTNING': 57,
  'DANCING_SHADOW': 58,
  'LISS': 59,
  'RIPPLE': 79,
  'RAIN': 43,
  'DRIP': 60,
  'CRAZY_BEES': 119
};

const IP_EFFECT_GROUPS = {
  '192.168.0.118': [
    [EFFECTS.LIGHTNING, EFFECTS.DANCING_SHADOW],
    [EFFECTS.CRAZY_BEES]
  ],
  '192.168.0.174': [
    [EFFECTS.LISS, EFFECTS.RIPPLE],
    [EFFECTS.CRAZY_BEES]
  ],
  '192.168.0.151': [
    [EFFECTS.RAIN, EFFECTS.DRIP],
    [EFFECTS.CRAZY_BEES]
  ],
  '192.168.0.142': [
    [EFFECTS.LIGHTNING, EFFECTS.DANCING_SHADOW],
    [EFFECTS.CRAZY_BEES]
  ]
};

function selectRandomEffect(ip) {
  const effectGroups = IP_EFFECT_GROUPS[ip];
  const randomGroupIndex = Math.floor(Math.random() * effectGroups.length);
  const selectedGroup = effectGroups[randomGroupIndex];

  if (selectedGroup.length === 1) {
    return selectedGroup[0];
  } else {
    const randomEffectIndex = Math.floor(Math.random() * selectedGroup.length);
    return selectedGroup[randomEffectIndex];
  }
}

const port = new SerialPort({
  path: '/dev/cu.usbserial-A5069RR4',
  baudRate: 9600
});

const arduinoParser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

arduinoParser.on('data', (data) => {
  const parsedData = parseArduinoData(data);
  sendToESP32s(parsedData);
});

function parseArduinoData(data) {
  const result = { channels: [] };
  const parts = data.split(', ');
  parts.forEach(part => {
    if (part.startsWith('Timestamp')) {
      result.timestamp = parseInt(part.split(': ')[1]);
    } else {
      const channelData = part.split(': ');
      const channelIndex = parseInt(channelData[0].split(' ')[1]);
      const channelValue = parseInt(channelData[1]);
      result.channels[channelIndex] = channelValue;
    }
  });
  return result;
}

function sendToESP32s(parsedData) {
  if (parsedData.channels.length < 128) {
    console.error('Not enough channel data');
    return;
  }

  let averages = [];
  for (let i = 0; i < 24; i++) {
    let sum = 0;
    for (let j = 0; j < 5; j++) {
      sum += parsedData.channels[i * 5 + j] || 0;
    }
    averages[i] = sum / 5;
  }

  const mappedData = applyMappings(averages);
  const normalizedData = normalizeData(mappedData);
  const commands = prepareCommands(normalizedData);

  sendCommandsHttp(commands);
}

function applyMappings(averages) {
  const minValue = Math.min(...averages);
  const maxValue = Math.max(...averages);
  const range = maxValue - minValue;

  return averages.map(x => {
    const normalized = range !== 0 ? (x - minValue) / range : 0;
    const power = 1.2;
    const nonLinear = Math.pow(normalized, power);
    const minOutput = 0.05;
    return minOutput + (1 - minOutput) * nonLinear;
  });
}

function normalizeData(mappedData) {
  const minValue = Math.min(...mappedData);
  const maxValue = Math.max(...mappedData);
  const range = maxValue - minValue;

  return mappedData.map(value => {
    const normalized = range !== 0 ? ((value - minValue) / range) * 255 : 0;
    const contrast = 1.3;
    const enhanced = ((normalized / 255 - 0.5) * contrast + 0.5) * 255;
    return Math.max(20, Math.min(255, Math.round(enhanced)));
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateDuration(normalizedData) {
  // 计算持续时间，基于数据的变化程度
  const changeRate = Math.max(...normalizedData) - Math.min(...normalizedData);
  // 将持续时间限制在 1 到 10 秒之间
  return Math.round(clamp(changeRate * 10, 400, 1000));
}

function prepareCommands(normalizedData) {
  const duration = calculateDuration(normalizedData);

  return ESP32_IPS.map((ip, index) => {
    const baseIndex = index * 6;
    const minValue = 50;
    const brightness = Math.max(minValue, clamp(normalizedData[baseIndex], 0, 255));

    const r = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 1] * 1.5), 0, 255));
    const g = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 2] * 1.5), 0, 255));
    const b = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 3] * 1.5), 0, 255));

    const sx = Math.max(minValue, clamp(normalizedData[baseIndex + 4], 0, 255));
    const ix = Math.max(minValue, clamp(normalizedData[baseIndex + 5], 0, 255));

    const selectedEffect = selectRandomEffect(ip);

    return {
      ip: ip,
      command: {
        on: true,
        bri: brightness,
        tt: duration,  // 添加持续时间参数
        seg: [
          {
            col: [[r, g, b]],
            fx: selectedEffect,
            sx: sx,
            ix: ix
          }
        ]
      }
    };
  });
}

async function sendCommandsHttp(commands) {
  for (let i = 0; i < ESP32_IPS.length; i++) {
    const ip = ESP32_IPS[i];
    const url = `http://${ip}/json/state`;
    const command = commands[i].command;

    try {
      const response = await axios.post(url, command);
      console.log(`Command sent to LED panel ${i + 1} (${ip}):`, JSON.stringify(command));
      console.log(`Response: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`Error sending HTTP request to LED panel ${i + 1} (${ip}):`, error.message);
    }
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/control') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const command = JSON.parse(body);
        if (command.ip && command.command) {
          sendCommandsHttp([{ ip: command.ip, command: command.command }]);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Command sent successfully');
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid command format');
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON');
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const HTTP_PORT = 3000;
server.listen(HTTP_PORT, () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
});