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
  'CRAZY_BEES': 119
};

const IP_EFFECT_CONFIG = {
  '192.168.1.50': { effect: EFFECTS.LIGHTNING, defaultSx: 128, defaultIx: 128 },
  '192.168.1.51': { effect: EFFECTS.DANCING_SHADOW, defaultSx: 200, defaultIx: 180 },
  '192.168.1.52': { effect: EFFECTS.LISS, defaultSx: 150, defaultIx: 150 },
  '192.168.1.53': { effect: EFFECTS.RAIN, defaultSx: 100, defaultIx: 200 }
};

// 命令队列
const commandQueues = ESP32_IPS.reduce((acc, ip) => {
  acc[ip] = [];
  return acc;
}, {});

const port = new SerialPort({
  path: 'COM9',
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

  queueCommands(commands);
}

function applyMappings(averages) {
  const minValue = Math.min(...averages);
  const maxValue = Math.max(...averages);
  const range = maxValue - minValue;

  return averages.map(x => {
    const normalized = range !== 0 ? (x - minValue) / range : 0;
    const power = 1.5;
    const nonLinear = Math.pow(normalized, power);
    const minOutput = 0.1;
    return minOutput + (1 - minOutput) * nonLinear;
  });
}

function normalizeData(mappedData) {
  const minValue = Math.min(...mappedData);
  const maxValue = Math.max(...mappedData);
  const range = maxValue - minValue;

  return mappedData.map(value => {
    const normalized = range !== 0 ? ((value - minValue) / range) : 0;
    const contrast = 2.0; // 增加对比度
    const enhanced = Math.pow(normalized, contrast) * 255; // 使用指数函数增强对比
    return Math.max(100, Math.min(255, Math.round(enhanced))); // 允许更低的最小值
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateDuration(normalizedData) {
  const changeRate = Math.max(...normalizedData) - Math.min(...normalizedData);
  return Math.round(clamp(changeRate * 10, 200, 2000));
}

function prepareCommands(normalizedData) {
  const duration = calculateDuration(normalizedData);

  return ESP32_IPS.map((ip, index) => {
    const baseIndex = index * 6;
    const config = IP_EFFECT_CONFIG[ip] || {
      effect: EFFECTS.LIGHTNING,
      defaultSx: 128,
      defaultIx: 128
    };
    const minValue = 0; // 降低RGB的最小值

    // 使用更复杂的映射来增加颜色变化
    let r = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 1] * 2), 0, 255));
    let g = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 2] * 2), 0, 255));
    let b = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 3] * 2), 0, 255));

    // 确保至少有一个颜色通道有显著值
    const maxColor = Math.max(r, g, b);
    if (maxColor < 50) {
      if (maxColor === 0) {
        r = g = b = 50; // 设置一个默认的最低亮度值
      } else {
        const factor = 50 / maxColor;
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
      }
    }

    const brightness = Math.max(30, clamp(normalizedData[baseIndex], 0, 255));

    const sxInput = normalizedData[baseIndex + 4];
    const ixInput = normalizedData[baseIndex + 5];
    const sx = Math.max(30, clamp(Math.round(config.defaultSx * (0.5 + sxInput / 510)), 0, 255));
    const ix = Math.max(30, clamp(Math.round(config.defaultIx * (0.5 + ixInput / 510)), 0, 255));

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