import { google } from 'googleapis';
import { getAuthenticatedClient } from './auth.js';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const RECON_HOME_PATH = "/home/grill0/Projects/project-cloud/recon";

export function setup() {
    console.log("Starting Recon System...");
    try {
        for (const directory of [RECON_HOME_PATH, `${RECON_HOME_PATH}/files`, `${RECON_HOME_PATH}/history`]) {
            fs.mkdirSync(directory, { recursive: true });
        }
    }catch (err) {
        throw err;
    }finally { console.log("Recon directory structure ready."); }
}