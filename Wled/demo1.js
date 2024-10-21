import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set up __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration constants
const WLED_IP = "http://172.20.10.7";
const CSV_FILE_PATH = '../../datafiles/DATA.CSV';
const ROWS_TO_PROCESS = 370;

// Define WLED effect IDs
const EFFECTS = {
    SOLID: 0,
    BLINK: 1,
    BREATHE: 2,
    WIPE: 3,
    FADE: 4,
    SCAN: 5,
    DUAL_SCAN: 6,
    FLASH: 7,
    RAINBOW: 8,
    // ... add more effects as needed
};

// Normalize data to a specified range (default 0-255)
function normalizeData(data, min = 0, max = 255) {
    const dataMin = Math.min(...data);
    const dataMax = Math.max(...data);
    return data.map(x => Math.round((x - dataMin) / (dataMax - dataMin) * (max - min) + min));
}

// Map normalized data to WLED segments
function mapDataToWLED(data) {
    const normalizedData = normalizeData(data);
    const segmentCount = 4; // Divide LEDs into 4 segments
    const dataPerSegment = Math.floor(normalizedData.length / segmentCount);

    const segments = [];
    for (let i = 0; i < segmentCount; i++) {
        const segmentData = normalizedData.slice(i * dataPerSegment, (i + 1) * dataPerSegment);
        const avgValue = Math.round(segmentData.reduce((a, b) => a + b, 0) / segmentData.length);

        segments.push({
            start: i * Math.floor(128 / segmentCount),
            stop: (i + 1) * Math.floor(128 / segmentCount) - 1,
            effect: mapValueToEffect(avgValue),
            speed: mapValueToSpeed(avgValue),
            intensity: mapValueToIntensity(avgValue),
            palette: mapValueToPalette(avgValue),
            col: [mapValueToColor(avgValue), mapValueToSecondaryColor(avgValue), [0, 0, 0]]
        });
    }

    return segments;
}

// Mapping functions for various WLED parameters
function mapValueToEffect(value) {
    if (value < 50) return EFFECTS.BREATHE;
    if (value < 100) return EFFECTS.SCAN;
    if (value < 150) return EFFECTS.WIPE;
    if (value < 200) return EFFECTS.FLASH;
    return EFFECTS.RAINBOW;
}

function mapValueToSpeed(value) {
    return Math.round(value / 2); // Speed range 0-127
}

function mapValueToIntensity(value) {
    return value; // Intensity range 0-255
}

function mapValueToPalette(value) {
    return Math.floor(value / 16); // Assuming 16 palettes available
}

function mapValueToColor(value) {
    const hue = Math.floor((value / 255) * 360);
    return hsvToRgb(hue, 100, 100);
}

function mapValueToSecondaryColor(value) {
    const hue = Math.floor(((value + 128) % 255 / 255) * 360);
    return hsvToRgb(hue, 100, 100);
}

// Convert HSV to RGB
function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s / 100);
    const q = v * (1 - f * s / 100);
    const t = v * (1 - (1 - f) * s / 100);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [Math.round(r * 2.55), Math.round(g * 2.55), Math.round(b * 2.55)];
}

// Send visualization data to WLED device
function visualizeData(timestamp, data) {
    const segments = mapDataToWLED(data);

    const payload = {
        on: true,
        bri: 255,
        seg: segments
    };

    fetch(`${WLED_IP}/json/state`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    .then(response => {
        if (response.ok) {
            console.log(`Data for timestamp ${timestamp} sent successfully`);
        } else {
            console.log(`Failed to send data for timestamp ${timestamp}`);
        }
    })
    .catch(error => console.error('Error sending data:', error));
}

// Process CSV data
function processCSVData() {
    const results = [];
    createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (data) => {
            results.push(data);
            if (results.length === ROWS_TO_PROCESS) {
                // Stop reading more rows
                this.pause();
            }
        })
        .on('end', () => {
            console.log(`Processed ${results.length} rows from CSV`);
            processResults(results);
        });
}

// Process and visualize results
function processResults(results) {
    results.forEach((row, index) => {
        setTimeout(() => {
            const timestamp = row.timestamp; // Assuming CSV has a timestamp column
            const channelData = Object.values(row).slice(1).map(Number); // Ignore timestamp, convert remaining data to numbers
            visualizeData(timestamp, channelData);
        }, index * 1000); // Process one row per second
    });
}

// Start processing CSV data
processCSVData();