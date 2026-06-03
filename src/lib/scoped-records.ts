import type { Session } from "next-auth";
import type { Document, Filter } from "mongodb";

import { listRecordsProjected } from "@/lib/db";
import type { AnyRecord, ResourceName } from "@/lib/models";
import { filterRecordsForSession, mongoScopeFilterForSession } from "@/lib/visibility";

export async function listScopedRecordsProjected<T extends AnyRecord>(
  resource: ResourceName,
  fields: string[],
  session: Session | null,
  options?: {
    filter?: Filter<Document>;
    limit?: number;
    sort?: Record<string, 1 | -1>;
  },
) {
  const scopedFilter = session ? await mongoScopeFilterForSession(resource, session) : {};
  const records = await listRecordsProjected(
    resource,
    fields,
    mergeMongoFilters(scopedFilter, options?.filter ?? {}),
    {
      limit: options?.limit,
      sort: options?.sort,
    },
  );

  if (!session) return records as T[];
  return (await filterRecordsForSession(resource, records, session)) as T[];
}

function mergeMongoFilters(...filters: Array<Filter<Document>>) {
  const activeFilters = filters.filter((filter) => Object.keys(filter).length > 0);
  if (activeFilters.length === 0) return {};
  if (activeFilters.length === 1) return activeFilters[0];
  return { $and: activeFilters };
}
