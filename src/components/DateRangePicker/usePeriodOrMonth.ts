import {useEffect, useState} from 'react';
import {DateRangePeriod} from 'types/DateRange';
import {PeriodOrYear} from './usePeriodOrYear';

export interface PeriodOrMonth {
    value: Extract<DateRangePeriod, 'year'> | number;
    text: string;
}

const monthNames = (() => {
    const applyFormat = new Intl.DateTimeFormat(navigator.language, {month: 'long'}).format;
    return [...Array(12).keys()].map((month) => applyFormat(new Date(2022, month, 2)));
})();

console.log({monthNames});

export default function usePeriodOrMonth(year: PeriodOrYear['value'], startAt: number) {
    const [values, setValues] = useState<PeriodOrMonth[]>(() => []);

    useEffect(() => {
        const values: PeriodOrMonth[] = [];
        if (typeof year === 'number') {
            values.push({value: 'year', text: '(all year)'});
            const today = new Date();
            const start = new Date(startAt * 1000);
            const startYear = start.getUTCFullYear();
            const startMonth = start.getUTCMonth();
            let month =
                year === today.getUTCFullYear()
                    ? today.getUTCMonth()
                    : year === startYear
                    ? startMonth
                    : 11;
            while (month >= 0) {
                values.push({value: month + 1, text: monthNames[month]});
                month--;
            }
        }
        setValues(values);
    }, [year, startAt]);

    return values;
}
