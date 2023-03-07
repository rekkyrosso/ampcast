import React, {useCallback, useEffect, useRef, useState} from 'react';
import {formatMonth} from 'utils';
import {DatePickerProps} from './DatePicker';
import YearPicker from './YearPicker';

const monthNames = (() => {
    const applyFormat = new Intl.DateTimeFormat(navigator.language, {month: 'short'}).format;
    return [...Array(12).keys()].map((month) => applyFormat(new Date(2022, month, 2)));
})();

export default function MonthPicker({
    min = '1970-01',
    max = formatMonth(),
    value = max,
    onSelect,
}: DatePickerProps) {
    const ref = useRef<HTMLSelectElement>(null);
    const [year, setYear] = useState(() => String(new Date(value).getFullYear()));
    const [month, setMonth] = useState(() => new Date(value).getMonth());
    const months = useMonths(year, min, max);

    useEffect(() => {
        const month = months[0];
        if (month !== undefined) {
            ref.current!.value = String(month);
            setMonth(month);
        }
    }, [months]);

    useEffect(() => {
        if (month !== -1) {
            onSelect?.(`${year}-${String(month + 1).padStart(2, '0')}`);
        }
    }, [onSelect, year, month]);

    const handleYearSelect = useCallback((year: string) => {
        setMonth(-1);
        setYear(year);
    }, []);

    const handleMonthChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(Number(event.target.value));
    }, []);

    return (
        <span className="month-picker">
            <YearPicker min={min} max={max} value={year} onSelect={handleYearSelect} />
            <select defaultValue={month} onChange={handleMonthChange} key={year} ref={ref}>
                {months.map((month) => (
                    <option value={month} key={month}>
                        {monthNames[month]}
                    </option>
                ))}
            </select>
        </span>
    );
}

function useMonths(year: string, min: number | string, max: number | string): number[] {
    const [months, setMonths] = useState<number[]>([]);

    useEffect(() => {
        const months: number[] = [];
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const minMonth = Number(year) === minDate.getFullYear() ? minDate.getMonth() : 0;
        let month = Number(year) === maxDate.getFullYear() ? maxDate.getMonth() : 11;
        while (month >= minMonth) {
            months.push(month);
            month--;
        }
        setMonths(months);
    }, [year, min, max]);

    return months;
}
