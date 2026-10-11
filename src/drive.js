
import { google } from 'googleapis';
import { getAuthenticatedClient } from './auth.js';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

/*  CHEATSHEET

drive.files
    .list({
        q: "", -> query
        pageSize: 10,
        orderBy: "folder,name",
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink)
    })

    .get()
*/

async function listRoot(drive) {
    const files = [];
    let pageToken;

    do {
        const response = await drive.files.list({
            q: "'root' in parents and trashed = false",
            pageSize: 1000,
            orderBy: 'folder,name',
            fields: 'nextPageToken, files(id, name, mimeType)',
            pageToken
        });

        files.push(...(response.data.files ?? []));
        pageToken = response.data.nextPageToken;
    } while (pageToken);

    const folders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const looseFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');

    return { folders, looseFiles };
}


async function main() {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({version: 'v3', auth});
    const { folders, looseFiles } = await listRoot(drive);

    for (const folder of folders) console.log(`󰣞 ${folder.name} (${folder.id})`);
    for (const file of looseFiles) console.log(`󰡯 ${file.name} (${file.id})`);
}

main().catch(console.error);