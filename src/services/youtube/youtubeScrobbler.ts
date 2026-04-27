import {EMPTY, distinctUntilChanged, filter, mergeMap, switchMap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import ScrobbleData from 'types/ScrobbleData';
import {Logger, exists} from 'utils';
import {createMediaItemFromTitle, dispatchMetadataChanges} from 'services/metadata';
import {observeCurrentItem} from 'services/playlist';
import {observeScrobblingEnabled} from 'services/mediaServices/servicesSettings';
import youtube from './youtube';

const logger = new Logger('youtubeScrobbler');

export async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (item.itemType !== ItemType.Media) {
        return item;
    }
    if (item.scrobbleAs) {
        return item;
    }
    const title = sanitizeTitle(item.title);
    let foundItem = await createMediaItemFromTitle(title);
    if (foundItem === null) {
        const owner = item.owner?.name;
        if (owner?.includes(' - ')) {
            const [artist] = owner.split(' - ');
            foundItem = await createMediaItemFromTitle(`${artist} - ${item.title}`);
        }
    }
    const scrobbleAs: ScrobbleData = {
        artist: foundItem?.artists?.[0] || '',
        title: foundItem?.title || '',
        album: foundItem?.album || '',
    };
    dispatchMetadataChanges({
        match: (object) => object.src === item.src,
        values: {scrobbleAs},
    });
    return {...item, scrobbleAs};
}

export function scrobble(): void {
    // Add metadata for scrobbling.
    observeScrobblingEnabled()
        .pipe(
            switchMap((enabled) => (enabled ? observeCurrentItem() : EMPTY)),
            distinctUntilChanged((a, b) => a?.src === b?.src),
            filter(exists),
            filter((item) => item.src.startsWith('youtube:video:') && !item.scrobbleAs),
            mergeMap((item) => youtube.addMetadata!(item))
        )
        .subscribe(logger);
}

function sanitizeTitle(title: string): string {
    title = removeEmojis(title);
    title = web_scrobbler_sanitizeTitle(title);
    title = title.replace(/\(visuali[sz]er?\)/i, '');
    title = title.replace(/\|.*$/, '');
    title = title.replace(/\s+/g, ' ');
    return title.trim();
}

function removeEmojis(title: string): string {
    return title
        .replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
            ''
        )
        .replace(/\s+/g, ' ');
}

// From: https://github.com/web-scrobbler/web-scrobbler/blob/master/src/core/content/util.ts
function web_scrobbler_sanitizeTitle(title: string): string {
    // Remove [genre] or 【genre】 from the beginning of the title
    title = title.replace(/^((\[[^\]]+\])|(【[^】]+】))\s*-*\s*/i, '');

    // Remove track (CD and vinyl) numbers from the beginning of the title
    title = title.replace(/^\s*([a-zA-Z]{1,2}|[0-9]{1,2})[1-9]?\.\s+/i, '');

    // Remove - preceding opening bracket
    title = title.replace(/-\s*([「【『])/, '$1');

    // 【/(*Music Video/MV/PV*】/)
    title = title.replace(/[(［【][^(［【]*?((Music Video)|(MV)|(PV)).*?[】］)]/i, '');

    // 【/(東方/オリジナル*】/)
    title = title.replace(/[(［【]((オリジナル)|(東方)).*?[】］)]+?/, '');

    // MV/PV if followed by an opening/closing bracket
    title = title.replace(/((?:Music Video)|MV|PV)([「［【『』】］」])/i, '$2');

    // MV/PV if ending and with whitespace in front
    title = title.replace(/\s+(MV|PV)$/i, '');

    return title;
}
