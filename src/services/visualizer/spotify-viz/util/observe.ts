export function isPrimitive(val: any): boolean {
    const type = typeof val;
    return val == null || (type !== 'object' && type !== 'function');
}

/**
 * @function Observe – Returns a Proxy allowing mutation observation on objects.
 * @param {Object} target – Object to observe.
 *
 * NOTE: Doesn't do deep watching. Any nested objects need to be wrapped as well.
 *
 * const obj = Observe({
 *   foo: 'bar'
 * })
 *
 * Watch all keys:
 * obj.watch((val, old) => console.log(val, old))
 *
 * Watch single key:
 * obj.watch('foo', (val, old) => console.log(val, old))
 *
 * obj.foo = 'lmao'
 * // => 'lmao', 'bar'
 */

type Observer<T> = (value: T, prevValue?: T) => void;

export type Observable<T> = T & {
    watch: <K extends keyof T>(key: K, callback: Observer<T[K]>) => void;
};

export default function Observe<T>(target: T) {
    const _target = Object.seal({...target});

    /** Store observers for the entire object. */
    const _observers: Record<string, Observer<T>[]> = {
        __all__: [],
    };

    /** Store observers for individual keys. */
    Object.keys(_target).forEach((key) => {
        _observers[key] = [];
    });

    /** Hijack the `set` method for sweet interception action. */
    const traps = {
        set(obj: any, key: string, val: any) {
            let old: any;

            if (isPrimitive(obj[key])) {
                old = obj[key];
            } else if (Array.isArray(obj[key])) {
                old = [...obj[key]];
            } else {
                old = {...obj[key]};
            }

            obj[key] = val;

            if (_observers[key]) {
                _observers[key].map((observer) => observer(val, old));
                _observers.__all__.map((observer) => observer(val, old));
            }

            return true;
        },
    };

    return new Proxy(
        {
            ..._target,
            watch(key: string, callback: Observer<T>) {
                /** Watch a single key. */
                if (key in _observers) {
                    _observers[key].push(callback);
                }
            },
        },
        {
            set: traps.set,
        }
    );
}
