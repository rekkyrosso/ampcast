import {readdir} from 'fs/promises';
import {resolve} from 'path';
import musicMetadata from 'music-metadata-browser';
import {partition} from 'lodash'
import {chunk} from './chunker'
import db from './db';

const mediaExtension = /\.(aac|avi|flac|m4a|m4v|mkv|mov|mp3|mp4|mpeg|mpg|oga|ogg|ogv|wav|webm|wma|wmv)$/;

export async function scan(dir: string) {
    //dir = dir.replace(/[\/\\]$/, '');
    console.time(`Scan ${dir}`);
    const fileNames = scanDir(dir);
    for await (const chunk of fileNames) {
        console.log({chunk});
        // for (const fileName of chunk) {
        //     console.log({fileName});
        // }

        // db.serialize(() => {
        //     const sql = `INSERT INTO media (src,artist,title,duration) VALUES (?,?,?,?)`;
        //     const statement = db.prepare(sql);
        //     items.forEach((item) => {
        //         statement.run(item.src, item.artist, item.title, item.duration);
        //     });
        //     statement.finalize();
        //     console.log(`Scan complete.`);
        // });
    }
    console.timeEnd(`Scan ${dir}`);
}

async function* scanDir(dir: string): AsyncGenerator<string[], void>  {
    const entries = await readdir(dir, {withFileTypes: true});
    const [directories, files] = partition(entries, (entry) => entry.isDirectory());
    const mediaFiles = files
        .filter((file) => file.isFile() && mediaExtension.test(file.name))
        .map((file) => resolve(dir, file.name));

    yield* chunk(mediaFiles);

    for (const directory of directories) {
        yield* scanDir(resolve(dir, directory.name));
    }
}

export default {scan};
