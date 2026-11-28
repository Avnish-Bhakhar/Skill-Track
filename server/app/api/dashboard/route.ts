import { dashboardReport } from "@/lib/analytics";
import { readFilters } from "@/lib/filters";
import { adminRoute } from "@/lib/http";

export const GET = adminRoute(async (request) => dashboardReport(readFilters(request)));
