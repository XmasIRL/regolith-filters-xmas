
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const Exaroton = require('exaroton');
const { asyncFolderWalker } = require('async-folder-walker')

const settings = process.argv[2] ? JSON.parse(process.argv[2]) : null;

const envPath = settings?.envPath ?? 'data/exaroton_deploy/.env';
dotenv.config({ path: envPath });
const token = process.env.TOKEN;
const serverID = process.env.SERVER_ID;

const files_path = settings?.filesPath ?? 'data/exaroton_deploy/files';

if (!token || !serverID) {
  console.error("Error: Invalid configuration. Please check whether your .env file has TOKEN and SERVER_ID defined.");
  process.exit(1);
}

async function deployFiles() {

    console.log('Deploying server files (Modify only) ...');

    try {

        const client = new Exaroton.Client(token);
        const server = client.server(serverID);
        await server.get();


        // recursive read server files
        async function readFiles(filePath) {
            const fileRemote = server.getFile(filePath);
            const children = await fileRemote.getChildren();
            for (const child of children) {
                if (!child.isDirectory) console.log(child.path);
                else try { await readFiles(child.path) } catch (e) {}
            }
        }

        // await readFiles('');

        const walker = asyncFolderWalker(files_path,{statFilter: st => !st.isDirectory()});
        for await (const filePath of walker) {
            const destPath = path.relative(files_path, filePath).replace(/\\/g, '/');
            console.log('Deploying ' + destPath);
            const fileRemote = server.getFile(destPath);
            // try {await fileRemote.delete();} catch (e) { console.error(e.message); }
            try {await fileRemote.uploadFromStream(fs.createReadStream(filePath));} catch (e) { console.error(e.message); }
        }

        // if(server.hasStatus(server.STATUS.ONLINE)) await server.restart();
        // else await server.start();

    } catch (e) { console.error(e.message); }

    console.log('Finished deploying server files!');

}

deployFiles();