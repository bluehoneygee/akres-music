import { NextRequest, NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { auth } from "@/auth";
import {
  createRecord,
  distinctRecordValues,
  isResourceName,
  listRecordsPage,
  listRecordsProjected,
} from "@/lib/db";
import { getMongoDb } from "@/lib/mongodb";
import type { ResourceName } from "@/lib/models";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import { filterRecordsForSession, mongoScopeFilterForSession } from "@/lib/visibility";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = sessionRole(session) ?? "";
  if (!canAccessResource({ role, resource, action: "read" })) {
    return NextResponse.json({ error: "You do not have access to this menu" }, { status: 403 });
  }

  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
  const projectedFields = parseCsv(request.nextUrl.searchParams.get("fields"));

  if (projectedFields.length === 0) {
    const scopedFilter = await mongoScopeFilterForSession(resource, session);
    const baseFilter = mergeMongoFilters(
      scopedFilter,
      buildFacetFilter(parseFilters(request.nextUrl.searchParams.get("filters"))),
    );
    const filter = mergeMongoFilters(
      baseFilter,
      await buildResourceQueryFilter({
        filters: parseFilters(request.nextUrl.searchParams.get("filters")),
        resource,
        search: request.nextUrl.searchParams.get("search") ?? "",
      }),
    );
    const result = await listRecordsPage({
      fields: projectedFields,
      filter,
      limit: limit || 50,
      page: page || 1,
      resource,
      sort: sortForResource(resource, request.nextUrl.searchParams.get("sort") ?? ""),
    });
    const data = shouldPostFilterAfterMongo(role)
      ? await filterRecordsForSession(resource, result.data, session)
      : result.data;
    const facetFields = parseCsv(request.nextUrl.searchParams.get("facetFields"));
    const facets = facetFields.length > 0
      ? await distinctRecordValues(resource, baseFilter, facetFields)
      : undefined;
    return NextResponse.json({ ...result, data, facets, role });
  }

  if (projectedFields.length > 0) {
    const scopedFilter = await mongoScopeFilterForSession(resource, session);
    const filter = mergeMongoFilters(
      scopedFilter,
      buildFacetFilter(parseFilters(request.nextUrl.searchParams.get("filters"))),
    );
    const records = await listRecordsProjected(resource, projectedFields, filter);
    const data = shouldPostFilterAfterMongo(role)
      ? await filterRecordsForSession(resource, records, session)
      : records;
    return NextResponse.json({ data, role });
  }

  return NextResponse.json({ error: "Invalid resource query" }, { status: 400 });
}

function shouldPostFilterAfterMongo(role: string) {
  return role === "Parent Portal User" || role === "Student Portal User";
}

function parseCsv(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z0-9_-]+$/.test(item));
}

function buildFacetFilter(filters: Record<string, string>): Filter<Document> {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => {
      if (key === "dateMonth") return ["date", { $regex: `^${escapeRegex(value)}` }];
      if (key === "attendanceMonth") return ["attendanceDate", { $regex: `^${escapeRegex(value)}` }];
      return [key, normalizeFilterValue(value)];
    }),
  ) as Filter<Document>;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session) ?? "", resource, action: "create" })) {
    return NextResponse.json({ error: "You do not have permission to create records here" }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const record = await createRecord(resource, payload);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create record" },
      { status: 400 },
    );
  }
}

function parseFilters(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return Object.fromEntries(Object.entries(parsed).filter(([, filterValue]) => Boolean(filterValue)));
  } catch {
    return {};
  }
}

function mergeMongoFilters(...filters: Array<Filter<Document>>) {
  const activeFilters = filters.filter((filter) => Object.keys(filter).length > 0);
  if (activeFilters.length === 0) return {};
  if (activeFilters.length === 1) return activeFilters[0];
  return { $and: activeFilters };
}

async function buildResourceQueryFilter({
  filters,
  resource,
  search,
}: {
  filters: Record<string, string>;
  resource: ResourceName;
  search: string;
}): Promise<Filter<Document>> {
  const directFilters = Object.fromEntries(
    Object.entries(filters).map(([key, value]) => {
      if (key === "dateMonth") return ["date", { $regex: `^${escapeRegex(value)}` }];
      if (key === "attendanceMonth") return ["attendanceDate", { $regex: `^${escapeRegex(value)}` }];
      return [key, normalizeFilterValue(value)];
    }),
  ) as Filter<Document>;
  const searchFields = searchFieldsForResource(resource);
  const query = search.trim();

  if (!query || searchFields.length === 0) return directFilters;
  const relationSearchFilters = await relationSearchFiltersForResource(resource, query);

  return {
    ...directFilters,
    $or: [
      ...searchFields.map((field) => ({
        [field]: { $regex: escapeRegex(query), $options: "i" },
      })),
      ...relationSearchFilters,
    ],
  };
}

async function relationSearchFiltersForResource(resource: ResourceName, query: string) {
  if (resource !== "lesson-packages") return [];

  const db = await getMongoDb();
  const regex = { $regex: escapeRegex(query), $options: "i" };
  const [students, courses, instructors, instruments] = await Promise.all([
    db
      .collection("students")
      .find({ $or: [{ firstName: regex }, { lastName: regex }] })
      .project({ id: 1 })
      .limit(50)
      .toArray(),
    db.collection("courses").find({ courseName: regex }).project({ id: 1 }).limit(50).toArray(),
    db.collection("instructors").find({ instructorName: regex }).project({ id: 1 }).limit(50).toArray(),
    db.collection("instruments").find({ instrumentName: regex }).project({ id: 1 }).limit(50).toArray(),
  ]);
  const filters: Filter<Document>[] = [];
  if (students.length > 0) filters.push({ studentId: { $in: students.map((row) => String(row.id)) } });
  if (courses.length > 0) filters.push({ courseId: { $in: courses.map((row) => String(row.id)) } });
  if (instructors.length > 0) filters.push({ instructorId: { $in: instructors.map((row) => String(row.id)) } });
  if (instruments.length > 0) filters.push({ instrumentId: { $in: instruments.map((row) => String(row.id)) } });
  return filters;
}

function normalizeFilterValue(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function searchFieldsForResource(resource: ResourceName) {
  const fields: Partial<Record<ResourceName, string[]>> = {
    courses: ["id", "courseName", "courseLevel", "lessonType"],
    guardians: ["id", "guardianName", "mobileNumber"],
    instruments: ["id", "instrumentName", "instrumentCategory"],
    instructors: ["id", "instructorName"],
    "lesson-packages": ["id", "billingPeriod", "studentId", "courseId", "instructorId", "instrumentId"],
    repertoires: ["id", "title", "composer", "level"],
    rooms: ["id", "roomName"],
    students: ["id", "firstName", "lastName", "skillLevel", "learningGoal"],
    users: ["id", "name", "email", "role"],
  } as Partial<Record<ResourceName | "users", string[]>>;

  return fields[resource] ?? ["id"];
}

function sortForResource(resource: ResourceName, direction: string): Record<string, 1 | -1> {
  const order = direction === "asc" ? 1 : direction === "desc" ? -1 : -1;
  if (direction) {
    if (resource === "instructors") return { instructorName: order };
    if (resource === "students") return { firstName: order, lastName: order };
    if (resource === "guardians") return { guardianName: order };
  }

  return { createdAt: -1 };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
