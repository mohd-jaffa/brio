import type { SupabaseClient } from "@supabase/supabase-js";

/** One query as a data function built it: the table, then each builder call in order. */
export interface RecordedQuery {
  table: string;
  calls: [string, ...unknown[]][];
}

export interface FakeAnswer {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/**
 * A Supabase client for a data-layer test. Every builder method records its
 * call and chains; awaiting the query at any point answers with what `answer`
 * says the database returned for it. Tests read `queries` to see what was
 * asked, and `find` to pick one out by a call it made.
 */
export function fakeSupabase(answer: (query: RecordedQuery) => FakeAnswer = () => ({ data: [] })) {
  const queries: RecordedQuery[] = [];
  const client = {
    from(table: string) {
      const query: RecordedQuery = { table, calls: [] };
      queries.push(query);
      const builder: object = new Proxy(
        {},
        {
          get(_, property) {
            if (property === "then") {
              return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
                Promise.resolve()
                  .then(() => ({ data: null, error: null, count: null, ...answer(query) }))
                  .then(resolve, reject);
            }
            return (...args: unknown[]) => {
              query.calls.push([String(property), ...args]);
              return builder;
            };
          },
        },
      );
      return builder;
    },
  };

  /** The arguments of each call a query made to `method`. */
  const argsOf = (query: RecordedQuery, method: string) =>
    query.calls.filter(([name]) => name === method).map(([, ...args]) => args);

  /** The first query on `table` whose calls include `method` with these leading arguments. */
  const find = (table: string, method: string, ...args: unknown[]) =>
    queries.find(
      (query) =>
        query.table === table &&
        argsOf(query, method).some((given) =>
          args.every(
            (arg, index) => Object.is(given[index], arg) || JSON.stringify(given[index]) === JSON.stringify(arg),
          ),
        ),
    );

  return { client: client as unknown as SupabaseClient, queries, argsOf, find };
}

/** Whether a query asked for `select` with these columns first. */
export function selects(query: RecordedQuery, columns: string): boolean {
  return query.calls.some(([name, first]) => name === "select" && first === columns);
}
