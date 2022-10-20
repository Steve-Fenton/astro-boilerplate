import fs from 'fs';
import path from 'path';
import { size } from '../plugins/image-size.mjs';
import { ImagePool } from '@squoosh/lib';

const workingDirectory = process.cwd();
const imagePath = path.join('public', 'img');
const outputPath = path.join('public', 'i');
const imageDirectory = path.join(workingDirectory, imagePath);

console.log(imageDirectory);

const filesToProcess = [];

function getDestinationFolder (source, s) {
    let destination = path.join(workingDirectory, outputPath, s.toString(), source);
    destination = destination.replace(path.parse(destination).ext, '');
    return destination;
}

async function recurseFiles (directory) {
    const f = await fs.promises.readdir(path.join(imageDirectory, directory), { withFileTypes: true });

    for (const file of f) {
        if (file.isDirectory()) {
            const nextDirectory = path.join(directory, file.name);
            await recurseFiles(nextDirectory);
        } else {
            const ext = path.parse(file.name).ext;

            switch (ext) {
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.webp':
                    const sourcePath = path.join(directory, file.name);

                    const webP = sourcePath.replace(/.jpg$|.jpeg$|.png$/, '.webp');
                    const info = {
                        path: sourcePath,
                        webP: webP
                    };
        
                    const fullPath = path.join(imageDirectory, info.path);
                    const fullDestination = path.join(workingDirectory, outputPath, 'x', info.path);
                    const modified = fs.statSync(fullPath).mtime;
        
                    const destinationModified = fs.existsSync(fullDestination)
                        ? fs.statSync(fullDestination).mtime
                        : new Date(0);
        
                    if (destinationModified < modified) {
                        filesToProcess.push(info);
                    }
                break;
            }
        }
    }
}

await recurseFiles('');

console.log(`Found ${filesToProcess.length} files to process`);

const imagePool = new ImagePool(1);

async function processImage(src, options) {
    const file = await fs.promises.readFile(src);
    const image = imagePool.ingestImage(file);
    await image.encode(options);
    return image;
}

for (const file of filesToProcess) {
    console.log(file.path);
    const source = path.join(imageDirectory, file.path);
    const destination = getDestinationFolder(file.path, 'x');
    
    const ext = path.parse(source).ext;

   let image;
   let rawEncodedImage;
    
   switch (ext) {
       case '.png':
            image = await processImage(source, { oxipng: {} });
            rawEncodedImage = (await image.encodedWith.oxipng).binary;
            await fs.promises.writeFile(destination + '.png', rawEncodedImage);
            break;
        case '.jpg':
        case '.jpeg':
            image = await processImage(source, { mozjpeg: {} });
            rawEncodedImage = (await image.encodedWith.mozjpeg).binary;
            await fs.promises.writeFile(destination + '.jpg', rawEncodedImage);
            break;
        case '.webp':
            image = await processImage(source, { webp: {} });
            rawEncodedImage = (await image.encodedWith.webp).binary;
            await fs.promises.writeFile(destination + '.webp', rawEncodedImage);
            break;
    }

    for (const key in size) {
        const resizeDestination =  getDestinationFolder(file.path, size[key]);

        const imgFile = await fs.promises.readFile(source);
        const image = imagePool.ingestImage(imgFile);
        
        const preprocessOptions = {
            resize: {
                width: size[key]
            }
        };

        await image.preprocess(preprocessOptions);
        await image.encode({ webp: {} });

        rawEncodedImage = (await image.encodedWith.webp).binary;
        await fs.promises.writeFile(resizeDestination + '.webp', rawEncodedImage);
    }
}

await imagePool.close();

console.log(`Finished`);
