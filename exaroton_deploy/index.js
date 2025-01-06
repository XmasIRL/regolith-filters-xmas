
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const Exaroton = require('exaroton');
const { asyncFolderWalker } = require('async-folder-walker')

const settings = process.argv[2] ? JSON.parse(process.argv[2]) : null;

const keepExistingPacks = settings?.keepExistingPacks ?? true;
const keepExistingWorlds = settings?.keepExistingWorlds ?? true;

const envPath = settings?.envPath ?? 'data/exaroton_deploy/.env';
dotenv.config({ path: envPath });
const token = process.env.TOKEN;
const serverID = process.env.SERVER_ID;

const ROOT_DIR = process.env.ROOT_DIR + "/"
const filesPath  = ROOT_DIR + (settings?.filesPath  ?? 'packs/data/exaroton_deploy/files' );
const packsPath  = ROOT_DIR + (settings?.packsPath  ?? 'packs/data/exaroton_deploy/packs' );
const worldsPath = ROOT_DIR + (settings?.worldsPath ?? 'packs/data/exaroton_deploy/worlds');

if (!token || !serverID) {
  console.error("Error: Invalid configuration. Please check whether your .env file has TOKEN and SERVER_ID defined.");
  process.exit(1);
}

async function deploy() {

    try {

        const client = new Exaroton.Client(token);
        const server = client.server(serverID);
        await server.get();

        // recursive read server files
        // async function readFiles(filePath) {
        //     const fileRemote = server.getFile(filePath);
        //     const children = await fileRemote.getChildren();
        //     for (const child of children) {
        //         if (!child.isDirectory) console.log(child.path);
        //         else try { await readFiles(child.path) } catch (e) {}
        //     }
        // }
        // await readFiles('');

        // deploy files
        console.log('Deploying server files... ');
        console.log('Existing files will be kept.');
        if (!fs.existsSync(filesPath)) { console.error('Files folder not found!'); }
        else {
          let filesWalker = asyncFolderWalker(filesPath,{statFilter: st => !st.isDirectory()});
          for await (const filePath of filesWalker) {
              const destPath = path.relative(filesPath, filePath).replace(/\\/g, '/');
              console.log('Deploying ' + destPath);
              const fileRemote = server.getFile(destPath);
              // try {await fileRemote.delete();} catch (e) { console.error(e.message); }
              try {await fileRemote.uploadFromStream(fs.createReadStream(filePath));} catch (e) { console.error(e.message); }
          }
        }

        // deploy packs
        console.log('Deploying server packs... ');
        console.log(keepExistingPacks ? 'Existing packs will be kept.' : 'Existing packs will be deleted.');
        if (!fs.existsSync(packsPath)) { console.error('Packs folder not found!'); }
        else {
          if (!keepExistingPacks) for (const child of await server.getFile('packs').getChildren()) {try {
                console.log('Deleting ' + child.path);
                await fileRemote.delete();
          } catch (e) { console.error(e.message); }}
          let packsWalker = asyncFolderWalker(packsPath,{statFilter: st => !st.isDirectory()});
          for await (const filePath of packsWalker) {
              const destPath = 'packs/' + path.basename(filePath);
              console.log('Deploying ' + destPath);
              const fileRemote = server.getFile(destPath);
              try {await fileRemote.uploadFromStream(fs.createReadStream(filePath));} catch (e) { console.error(e.message); }
          }
        }

        // deploy worlds
        console.log('Deploying server worlds... ');
        console.log(keepExistingWorlds ? 'Existing worlds will be kept.' : 'Existing worlds will be deleted.');
        if (!fs.existsSync(worldsPath)) { console.error('Worlds folder not found!'); }
        else {
          if (!keepExistingWorlds) for (const child of await server.getFile('worlds').getChildren()) {try {
                console.log('Deleting ' + child.path);
                await fileRemote.delete();
          } catch (e) { console.error(e.message); }}
          let worldsWalker = asyncFolderWalker(worldsPath,{statFilter: st => !st.isDirectory()});
          for await (const filePath of worldsWalker) {
              const destPath = 'worlds/' + path.basename(filePath);
              console.log('Deploying ' + destPath);
              const fileRemote = server.getFile(destPath);
              try {await fileRemote.uploadFromStream(fs.createReadStream(filePath));} catch (e) { console.error(e.message); }
          }
        }

        // if(server.hasStatus(server.STATUS.ONLINE)) await server.restart();
        // else await server.start();

    } catch (e) { console.error(e.message); }

    console.log('Finished deploying server files!');

}

deploy();