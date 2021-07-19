import db from './db';
import {scan} from './scanner';

function clear(): void {
    db.run(`DELETE FROM media`);
}

export default {clear, scan};
