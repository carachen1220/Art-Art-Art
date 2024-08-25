const WebSocket = require('ws');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

// Debug output: Check the contents of the imported modules
console.log('SerialPort:', SerialPort);
console.log('Readline:', Readline);

const wss = new WebSocket.Server({ port: 8080 });

try {
  const port = new SerialPort.SerialPort({
    path: 'COM3', // Change 'COM3' to your actual COM port
    baudRate: 115200
  });

  console.log('Serial port initialized successfully');

  // Correct Readline initialization method, not using the new keyword
  const parser = port.pipe(new Readline({ delimiter: '\n' }));
  console.log('Parser initialized successfully');

  parser.on('data', (data) => {
    console.log('Data received from serial port:', data);
    const parsedData = parseArduinoData(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(parsedData));
      }
    });
  });

  port.on('open', () => {
    console.log('Serial port opened');
  });

  port.on('error', (err) => {
    console.error('Serial port error:', err);
  });

} catch (error) {
  console.error('Error initializing serial port or parser:', error);
}

wss.on('connection', (ws) => {
  console.log('Client connected');
});

console.log('WebSocket server is running on ws://localhost:8080');

function parseArduinoData(data) {
  const result = {};

  // Parse timestamp
  const timestampMatch = data.match(/Timestamp: (\d+)/);
  if (timestampMatch) {
    result.timestamp = parseInt(timestampMatch[1]);
  }

  // Parse channel data
  result.channels = [];
  const channelMatches = data.match(/Channel \d+: \d+/g);
  if (channelMatches) {
    channelMatches.forEach(channelData => {
      const [channel, strength] = channelData.split(': ').map(Number);
      result.channels.push(strength);
    });
  }

  return result;
}
