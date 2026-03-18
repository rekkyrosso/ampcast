import {Primitive} from 'type-fest';
import {Logger, getRandomValue, uniq, uniqBy} from 'utils';

const logger = new Logger('radioBrowserInfoApi');

let countries: RadioBrowserInfo.Country[];
async function getCountries(): Promise<readonly RadioBrowserInfo.Country[]> {
    if (!countries) {
        countries = await get('/countries', {hidebroken: true});
        countries.sort((a, b) =>
            a.name.replace(/^The\s/i, '').localeCompare(b.name.replace(/^The\s/i, ''), undefined, {
                sensitivity: 'base',
            })
        );
        countries = [
            {
                iso_3166_1: '',
                name: '(any)',
                stationcount: 0,
            },
        ].concat(countries);
    }
    return countries;
}

async function reportClick(stationuuid: string): Promise<void> {
    await get(`/url/${stationuuid}`);
}

async function search(
    q: string,
    countryCode: string,
    offset: number,
    limit: number
): Promise<readonly RadioBrowserInfo.Station[]> {
    countryCode = countryCode.toLowerCase();
    const params: Record<string, Primitive> = {
        offset,
        limit,
        order: 'clicktrend',
        reverse: true,
        hidebroken: true,
    };
    if (q) {
        if (countryCode) {
            params.countrycode = countryCode;
        }
        const result = await Promise.all([
            get<RadioBrowserInfo.Station[]>('/stations/search', {...params, name: q}),
            get<RadioBrowserInfo.Station[]>('/stations/search', {...params, tag: q}),
        ]);
        // Sort by `clickcount` when we have a search string.
        return uniqBy('stationuuid', result.flat()).sort((a, b) => b.clickcount - a.clickcount);
    } else {
        if (countryCode) {
            return get(`/stations/bycountrycodeexact/${countryCode}`, params);
        } else {
            return get('/stations', params);
        }
    }
}

async function get<T>(path: string, params?: Record<string, Primitive> | undefined): Promise<T> {
    const host = await getApiHost();
    path = params ? `${path}?${new URLSearchParams(params as any)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    const response = await fetch(`${host}/json/${path}`, {
        headers: {Accept: 'application/json'},
    });
    if (!response.ok) {
        throw response;
    }
    const data = await response.json();
    return data;
}

let apiHost = '';
async function getApiHost(): Promise<string> {
    if (!apiHost) {
        try {
            const response = await fetch('//all.api.radio-browser.info/json/servers', {
                headers: {Accept: 'application/json'},
            });
            if (!response.ok) {
                throw response;
            }
            const hosts: {name: string}[] = await response.json();
            const name = getRandomValue(uniq(hosts.map((host) => host.name)));
            apiHost = `//${name}`;
        } catch (err) {
            logger.error(err);
            apiHost = '//de1.api.radio-browser.info';
        }
    }
    return apiHost;
}

export default {
    getCountries,
    reportClick,
    search,
};
