
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import open from 'open';
import { OAuth2Client } from 'google-auth-library';

const KEY_PATH = path.resolve(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.resolve(process.cwd(), 'token.json');

const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly'
];

if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`No se encontró: ${KEY_PATH}`);
}

const { installed: keys } = JSON.parse(
    fs.readFileSync(KEY_PATH, 'utf-8')
);

// Inicia el flujo de autenticación y devuelve el cliente y los tokens.
async function startGoogleAuthentication() {
    const server = http.createServer();

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();

    if (!address || typeof address === 'string') {
        server.close();
        throw new Error('No se pudo iniciar el servidor local');
    }

    const redirectUrl = `http://127.0.0.1:${address.port}`;
    const oauth2Client = new OAuth2Client(keys.client_id, keys.client_secret, redirectUrl);
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    const tokensPromise = new Promise((resolve, reject) => {
        server.on('request', async (req, res) => {
            const url = new URL(req.url ?? '/', redirectUrl);
            if (url.pathname !== '/') {
                res.writeHead(404);
                res.end('No encontrado');
                return;
            }

            const error = url.searchParams.get('error');
            if (error) {
                res.writeHead(400);
                res.end('Autenticación cancelada');
                reject(new Error(error));
                return;
            }

            const code = url.searchParams.get('code');
            if (!code) {
                res.writeHead(400);
                res.end('Falta el código de autorización');
                return;
            }

            try {
                const { tokens } = await oauth2Client.getToken(code);

                res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                res.end('<h1>¡Autenticación exitosa!</h1>');

                resolve(tokens);
            } catch (error) {
                res.writeHead(500);
                res.end('Error de autenticación');
                reject(error);
            }
        });
    });

    try {
        await open(authUrl);

        const tokens = await tokensPromise;

        oauth2Client.setCredentials(tokens);

        return { oauth2Client, tokens };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        console.log('Servidor local cerrado.');
    }
}

// Recupera la sesión existente o inicia una nueva.
export async function getAuthenticatedClient() {
    const oauth2Client = new OAuth2Client(keys.client_id, keys.client_secret);

    // 1. Intentamos reutilizar los tokens guardados.
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));

            oauth2Client.setCredentials(tokens);
            await oauth2Client.getAccessToken();
            console.log('Sesión recuperada.');

            return oauth2Client;
        } catch (error) {
            console.error('No se pudieron reutilizar los tokens. Se intentará autenticar nuevamente.', error);
        }
    }

    // 2. Iniciamos el flujo de autenticación.
    const { oauth2Client: newClient, tokens } = await startGoogleAuthentication();

    // 3. Conservamos el refresh token anterior si no llega uno nuevo.
    let tokensFinales = tokens;

    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const anteriores = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));

            tokensFinales = {
                ...anteriores,
                ...tokens,
                refresh_token: tokens.refresh_token ?? anteriores.refresh_token
            };
        } catch {
            // Si los tokens anteriores son ilegibles, usamos los nuevos.
        }
    }

    // 4. Configuramos el cliente y guardamos los tokens.
    newClient.setCredentials(tokensFinales);

    fs.writeFileSync(
        TOKEN_PATH,
        JSON.stringify(tokensFinales, null, 2),
        { mode: 0o600 }
    );

    console.log('Tokens guardados.');
    return newClient;
}