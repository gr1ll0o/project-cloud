import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const RECON_HOME_PATH = "/home/grill0/project-cloud/recon";
const RECON_DIRS = [RECON_HOME_PATH, `${RECON_HOME_PATH}/files`, `${RECON_HOME_PATH}/history`];

export function setup() {
    try {
        for (const dir of RECON_DIRS) fs.mkdirSync(dir, { recursive: true });
        return true;
    }catch (err) { 
        console.error('(!) Recon setup failed:', err);
        return false; 
    }
}

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export async function scan(drive, pageSize = 1000) {
    const dirs = [];
    const files = [];

    const pendingDirs = [{ id: 'root', name: '', path: '' }];

    console.log("(I) Starting Recon...");
    while (pendingDirs.length > 0) {
        const currentDir = pendingDirs.shift();
        let pageToken;

        do {
            const response = await drive.files.list({
                q: `'${currentDir.id}' in parents and trashed = false`,
                pageSize,
                orderBy: 'folder,name',
                fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents)',
                pageToken
            });

            const items = response.data.files ?? [];
            for (const item of items) {
                const itemPath = currentDir.path ? `${currentDir.path}/${item.name}` : item.name;
                const entry = {...item, path: itemPath};

                if (item.mimeType === FOLDER_MIME_TYPE) {
                    dirs.push(entry);

                    pendingDirs.push({id: item.id, name: item.name, path: itemPath});
                }else files.push(entry);
            }
            pageToken = response.data.nextPageToken;
        }while(pageToken);
    }

    console.log("(I) Recon finished.");
    return { dirs, files };
}