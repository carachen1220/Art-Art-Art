const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const url = require('url');
const axios = require('axios');

const ESP32_IPS = [
  '192.168.1.50',
  '192.168.1.51',
  '192.168.1.52',
  '192.168.1.53'
];

const ESP32_PORT = 21324;

const EFFECTS = {
  'LIGHTNING': 57,
  'DANCING_SHADOW': 112,
  'LISS': 176,
  'RIPPLE': 79,
  'RAIN': 43,
  'DRIP': 96,
  'CRAZY_BEES': 119,
  'SOLAR_LIGHTS': 174
};

const IP_EFFECT_CONFIG = {
  '192.168.1.50': { effect: EFFECTS.SOLAR_LIGHTS, defaultSx: 128, defaultIx: 128 },
  '192.168.1.51': { effect: EFFECTS.DANCING_SHADOW, defaultSx: 200, defaultIx: 180 },
  '192.168.1.52': { effect: EFFECTS.LISS, defaultSx: 45, defaultIx: 180 },
  '192.168.1.53': { effect: EFFECTS.CRAZY_BEES, defaultSx: 200, defaultIx: 180 }
};

// 命令队列
const commandQueues = ESP32_IPS.reduce((acc, ip) => {
  acc[ip] = [];
  return acc;
}, {});

const port = new SerialPort({
  path: 'COM6',
  baudRate: 9600
});

const arduinoParser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// 添加一个变量来存储上一次的数据
let previousData = null;

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

  queueCommands(commands);

  // 更新上一次的数据
  previousData = normalizedData;
}

function applyMappings(averages) {
  const minValue = Math.min(...averages);
  const maxValue = Math.max(...averages);
  const range = maxValue - minValue;

  return averages.map(x => {
    const normalized = range !== 0 ? (x - minValue) / range : 0;
    const power = 1.2; // 增加非线性程度
    const nonLinear = Math.pow(normalized, power);
    const minOutput = 0.1; // 提高最小输出值
    return minOutput + (1 - minOutput) * nonLinear;
  });
}

function normalizeData(mappedData) {
  const minValue = Math.min(...mappedData);
  const maxValue = Math.max(...mappedData);
  const range = maxValue - minValue;

  return mappedData.map(value => {
    const normalized = range !== 0 ? ((value - minValue) / range) * 255 : 0;
    const contrast = 1.2; // 增加对比度
    const enhanced = ((normalized / 255 - 0.5) * contrast + 0.5) * 255;
    return Math.max(30, Math.abs(Math.min(255, Math.round(enhanced)))); // 提高最小值到 30
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateDuration(normalizedData) {
  let changeRate = 0;
  if (previousData) {
    changeRate = normalizedData.reduce((sum, value, index) => {
      return sum + Math.abs(value - previousData[index]);
    }, 0) / normalizedData.length;
  } else {
    changeRate = Math.max(...normalizedData) - Math.min(...normalizedData);
  }
  return Math.round(clamp(changeRate * 20, 1000, 2000));
}

function prepareCommands(normalizedData) {
  const duration = calculateDuration(normalizedData);

  return ESP32_IPS.map((ip, index) => {
    const baseIndex = index * 6;
    const config = IP_EFFECT_CONFIG[ip];
    const minValue = 30; // 提高最小值

    // 计算变化量
    const calculateDelta = (current, previous, factor = 1) => {
      if (previous === null) return current;
      const delta = (current - previous) * factor;
      return Math.max(minValue, clamp(Math.round(previous + delta), 0, 255));
    };

      // const brightness = Math.max(minValue, clamp(normalizedData[baseIndex], 0, 255));
      const brightness = 40+ Math.round(Math.max(minValue, clamp(normalizedData[baseIndex], 0, 255))*180/255);

    const r = calculateDelta(normalizedData[baseIndex + 1] * 1.5, previousData ? previousData[baseIndex + 1] * 1.5 : null);
    const g = calculateDelta(normalizedData[baseIndex + 2] * 1.5, previousData ? previousData[baseIndex + 2] * 1.5 : null);
    const b = calculateDelta(normalizedData[baseIndex + 3] * 1.5, previousData ? previousData[baseIndex + 3] * 1.5 : null);

    const sxInput = normalizedData[baseIndex + 4];
    const ixInput = normalizedData[baseIndex + 5];
    const sx = calculateDelta(
      config.defaultSx * (0.5 + sxInput / 510),
      previousData ? config.defaultSx * (0.5 + previousData[baseIndex + 4] / 510) : null,
      0.5
    );
    const ix = calculateDelta(
      config.defaultIx * (0.5 + ixInput / 510),
      previousData ? config.defaultIx * (0.5 + previousData[baseIndex + 5] / 510) : null,
      0.5
    );

    return {
      ip: ip,
      command: {
        on: true,
        bri: brightness,
        tt: duration,
        seg: [
          {
            col: [[r, g, b]],
            fx: config.effect,
            sx: sx,
            ix: ix
          }
        ]
      }
    };
  });
}

function queueCommands(commands) {
  commands.forEach(command => {
    commandQueues[command.ip].push(command);
    if (commandQueues[command.ip].length === 1) {
      sendNextCommand(command.ip);
    }
  });
}

async function sendNextCommand(ip) {
  if (commandQueues[ip].length === 0) return;

  const command = commandQueues[ip][0];
  const url = `http://${ip}/json/state`;

  try {
    const response = await axios.post(url, command.command);
    console.log(`Command sent to LED panel (${ip}):`, JSON.stringify(command.command));
    console.log(`Response: ${response.status} ${response.statusText}`);

    const nextCommandDelay = command.command.tt * 7.5;
    setTimeout(() => {
      commandQueues[ip].shift();
      sendNextCommand(ip);
    }, nextCommandDelay);
  } catch (error) {
    console.error(`Error sending HTTP request to LED panel (${ip}):`, error.message);
    commandQueues[ip].shift();
    sendNextCommand(ip);
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
          queueCommands([{ ip: command.ip, command: command.command }]);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Command queued successfully');
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