import { workerData, parentPort } from 'worker_threads';
import { computeBestRuneSets } from '../services/runeCalculator.js';

const result = computeBestRuneSets(workerData.allRunes);
parentPort.postMessage(result);
