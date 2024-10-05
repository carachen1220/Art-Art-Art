const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const dgram = require('dgram');
const udpClient = dgram.createSocket('udp4');

const ESP32_IPS = [
  '192.168.0.118',
  '192.168.0.174',
  '192.168.0.151',
  '192.168.0.142'
];

const ESP32_PORT = 21324;

const EFFECTS = {
  'CRAZY_BEES': 119,
  'RAIN': 43,
  'RIPPLE': 79,
  'LIGHTNING': 57
};

const IP_EFFECTS = {
  '192.168.0.118': EFFECTS.CRAZY_BEES,
  '192.168.0.174': EFFECTS.RAIN,
  '192.168.0.151': EFFECTS.RIPPLE,
  '192.168.0.142': EFFECTS.LIGHTNING
};

const port = new SerialPort({
  path: '/dev/cu.usbserial-A5069RR4',
  baudRate: 9600
});

const arduinoParser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

arduinoParser.on('data', (data) => {
  const parsedData = parseArduinoData(data);
  sendToESP32s(parsedData);
});

wss.on('connection', (ws) => {
  console.log('Client connected');
});

console.log('WebSocket server is running on ws://localhost:8080');

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
      sum += parsedData.channels[i * 5 + j];
    }
    averages[i] = sum / 5;
  }

  const mappedData = applyMappings(averages);
  const normalizedData = normalizeData(mappedData);
  const commands = prepareCommands(normalizedData);

  commands.forEach((command, index) => {
    const message = JSON.stringify(command);
    udpClient.send(message, ESP32_PORT, ESP32_IPS[index], (err) => {
      if (err) {
        console.error(`Error sending UDP message to LED panel ${index + 1} (${ESP32_IPS[index]}): ${err}`);
      } else {
        console.log(`Command sent to LED panel ${index + 1} (${ESP32_IPS[index]}): ${message}`);
      }
    });
  });
}

function applyMappings(averages) {
  const minValue = Math.min(...averages);
  const maxValue = Math.max(...averages);
  const range = maxValue - minValue;

  return averages.map(x => {
    const normalized = (x - minValue) / range;
    const power = 1.2; // Reduced power for a more linear response
    const nonLinear = Math.pow(normalized, power);
    const minOutput = 0.05; // Ensure a minimum output value
    return minOutput + (1 - minOutput) * nonLinear;
  });
}

function normalizeData(mappedData) {
  const minValue = Math.min(...mappedData);
  const maxValue = Math.max(...mappedData);
  const range = maxValue - minValue;

  return mappedData.map(value => {
    const normalized = ((value - minValue) / range) * 255;
    const contrast = 1.3; // Slightly reduced contrast
    const enhanced = ((normalized / 255 - 0.5) * contrast + 0.5) * 255;
    return Math.max(20, Math.min(255, Math.round(enhanced))); // Minimum value of 20
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function prepareCommands(normalizedData) {
  return ESP32_IPS.map((ip, index) => {
    const baseIndex = index * 6;
    const minValue = 20; // Minimum value for all parameters
    const brightness = Math.max(minValue, clamp(normalizedData[baseIndex], 0, 255));

    // Enhance RGB sensitivity and ensure minimum value
    const r = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 1] * 1.5), 0, 255));
    const g = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 2] * 1.5), 0, 255));
    const b = Math.max(minValue, clamp(Math.round(normalizedData[baseIndex + 3] * 1.5), 0, 255));

    // Ensure minimum values for sx and ix
    const sx = Math.max(minValue, clamp(normalizedData[baseIndex + 4], 0, 255));
    const ix = Math.max(minValue, clamp(normalizedData[baseIndex + 5], 0, 255));

    return {
      on: true,
      bri: brightness,
      seg: [
        {
          col: [[r, g, b]],
          fx: IP_EFFECTS[ip],
          sx: sx,
          ix: ix
        }
      ]
    };
  });
}