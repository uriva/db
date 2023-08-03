import { Map } from "https://deno.land/x/immutable@4.0.0-rc.14-deno/mod.ts";
import { reduce } from "https://deno.land/x/gamla@12.0.0/src/index.ts";

type Reducer<T, S> = (state: S, element: T) => S;

const setter = <K, V>(obj: Map<K, V>, key: K, value: V) => obj.set(key, value);

const getter =
  <K, V>(constructor: () => V) =>
  (index: Index<K, V>, key: K): V => {
    const val = index.get(key);
    return val === undefined ? constructor() : (val as V);
  };

const nonterminalGetter = <K, Terminal>(index: Index<K, Terminal>, key: K) =>
  getter<K, Index<K, Terminal>>(() => Map<K, Index<K, Terminal>>())(
    index as Index<K, Index<K, Terminal>>,
    key,
  );

type KeyFn<T, K> = (_: T) => K;

const dbReducer =
  <T, K, Terminal>(
    [key, ...keys]: KeyFn<T, K>[],
    reducer: Reducer<T, Terminal>,
    terminalGetter: (db: Index<K, Terminal>, k: K) => Terminal,
    setter: (
      wrappingDb: Index<K, Terminal>,
      k: K,
      innerDb: Index<K, Terminal> | Terminal,
    ) => Index<K, Terminal>,
    nonterminalGetter: (db: Index<K, Terminal>, key: K) => Index<K, Terminal>,
  ) =>
  (state: Index<K, Terminal>, current: T): Index<K, Terminal> =>
    setter(
      state,
      key(current),
      keys.length
        ? dbReducer(
            keys,
            reducer,
            terminalGetter,
            setter,
            nonterminalGetter,
          )(nonterminalGetter(state, key(current)), current)
        : reducer(terminalGetter(state, key(current)), current),
    );

const query =
  <Terminal, K>(leafConstructor: () => Terminal) =>
  (index: Index<K, Terminal>) =>
  ([key, ...keys]: K[]): Terminal =>
    keys.length
      ? query(leafConstructor)(nonterminalGetter(index, key))(keys)
      : getter(leafConstructor)(index, key);

type Index<K, Terminal> = Map<K, Index<K, Terminal> | Terminal>;
type NonEmptyArray<T> = [T, ...T[]];

export const index = <T, K, Terminal>(
  keys: NonEmptyArray<(x: T) => K>,
  reducer: Reducer<T, Terminal>,
  leafConstructor: () => Terminal,
) => ({
  build: () => Map() as Index<K, Terminal>,
  query: query(leafConstructor),
  insert: (index: Index<K, Terminal>, xs: T[]): Index<K, Terminal> =>
    reduce(
      dbReducer<T, K, Terminal>(
        keys,
        reducer,
        getter(leafConstructor),
        setter,
        nonterminalGetter,
      ),
      () => index,
    )(xs),
});
