const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const dgram = require('dgram');
const udpClient = dgram.createSocket('udp4');

// Set ESP32 IP address and UDP port
const ESP32_IP = '192.168.0.118';  //to be determined
const ESP32_PORT = 21324;  // should be the same as the receiver(ESP-32)

// set port for arduino
const port = new SerialPort({
  // set your port
  path: '/dev/cu.usbserial-A5069RR4',
  baudRate: 9600
});

// set parser
const arduinoParser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Set up the serial port for VS1053
// const vs1053Port = new SerialPort({
//   path: 'COM5',  // Set the appropriate port for VS1053
//   baudRate: 31250 // MIDI uses 31250 baud rate
// });

// WebSocket server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

arduinoParser.on('data', (data) => {
  const parsedData = parseArduinoData(data);
  // this part is sending data through websocket
  // wss.clients.forEach((client) => {
  //   if (client.readyState === WebSocket.OPEN) {
  //     client.send(JSON.stringify(parsedData));    }
  // });
  sendToESP32(parsedData);
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

// Send parsed data to ESP32 using UDP
// function sendToESP32(parsedData) {
//   const message = JSON.stringify(parsedData);

//   // Send the message via UDP to the ESP32
//   udpClient.send(message, ESP32_PORT, ESP32_IP, (err) => {
//     if (err) {
//       console.error(`Error sending UDP message: ${err}`);
//     } else {
//       console.log(`Message sent to ESP32: ${message}`);
//     }
//   });
// }



function sendToESP32(parsedData) {
  // ensure there're 128 channels' strength
  if (parsedData.channels.length < 128) {
    console.error('Not enough channel data');
    return;
  }

  // calculate average value of 8 average channels
  let averages = [];
  for (let i = 0; i < 8; i++) {
    let sum = 0;
    for (let j = 0; j < 16; j++) {
      sum += parsedData.channels[i * 16 + j];
    }
    averages[i] = sum / 16;
  }

  // normalization
  function normalize(value, min, max) {
    return Math.floor((value - min) / (max - min) * 255);
  }

  // find the max and the min of the strength
  const minAvg = Math.min(...averages);
  const maxAvg = Math.max(...averages);

  // normalization
  const normalizedAverages = averages.map(avg => normalize(avg, minAvg, maxAvg));


  const command = {
    on: true,
    bri: normalizedAverages[0], // brightness
    seg: [
      {
        col: [
          [
            normalizedAverages[1], // R
            normalizedAverages[2], // G
            normalizedAverages[3]  // B
          ]
        ],
        fx: Math.min(255, normalizedAverages[4]),  // effect
        sx: normalizedAverages[5],  // effect speed
        ix: normalizedAverages[6]   // effect strength
      }
    ]
  };



  // convert the command to JSON string
  const message = JSON.stringify(command);

  // send to ESP 32
  udpClient.send(message, ESP32_PORT, ESP32_IP, (err) => {
    if (err) {
      console.error(`Error sending UDP message: ${err}`);
    } else {
      console.log(`Command sent to ESP32: ${message}`);
    }
  });
}