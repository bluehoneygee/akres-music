import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { isResourceName, listRecordsProjected } from "@/lib/db";
import type { ResourceName } from "@/lib/models";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import { filterRecordsForSession, mongoScopeFilterForSession } from "@/lib/visibility";

type ResourceRequirement = {
  fields?: string[];
  resource: string;
};

export async function GET(request: NextRequest) {
  const requestedResources = request.nextUrl.searchParams
    .get("resources")
    ?.split(",")
    .map((resource) => resource.trim())
    .filter(Boolean) ?? [];

  return handleResourceOptions(
    requestedResources.map((resource) => ({ resource })),
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    resources?: ResourceRequirement[];
  };

  return handleResourceOptions(body.resources ?? []);
}

async function handleResourceOptions(requirements: ResourceRequirement[]) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = sessionRole(session) ?? "";
  const fieldsByResource = new Map<ResourceName, Set<string>>();

  for (const requirement of requirements) {
    if (!isResourceName(requirement.resource)) continue;
    const resource = requirement.resource as ResourceName;
    const fields = fieldsByResource.get(resource) ?? new Set<string>();
    for (const field of requirement.fields ?? []) {
      if (/^[A-Za-z0-9_-]+$/.test(field)) fields.add(field);
    }
    fieldsByResource.set(resource, fields);
  }

  const entries = await Promise.all(
    Array.from(fieldsByResource.entries()).map(async ([resource, fields]) => {
      if (!canAccessResource({ role, resource, action: "read" })) {
        return [resource, []] as const;
      }

      const scopeFilter = await mongoScopeFilterForSession(resource, session);
      const records = await listRecordsProjected(resource, [...fields], scopeFilter);
      const data = await filterRecordsForSession(resource, records, session);
      return [resource, data] as const;
    }),
  );

  return NextResponse.json({ data: Object.fromEntries(entries) });
}
