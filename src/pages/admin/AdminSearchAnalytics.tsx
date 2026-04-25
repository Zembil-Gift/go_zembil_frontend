import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  searchAnalyticsService,
  SearchAnalyticsRetrieveFilters,
} from "@/services/searchAnalyticsService";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const defaultFrom = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 16);
const defaultTo = new Date().toISOString().slice(0, 16);

export default function AdminSearchAnalytics() {
  const [fromTime, setFromTime] = useState(defaultFrom);
  const [toTime, setToTime] = useState(defaultTo);
  const [pageType, setPageType] = useState<string>("all");
  const [searchSource, setSearchSource] = useState<string>("all");
  const [authenticated, setAuthenticated] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [bucket, setBucket] = useState<"DAY" | "HOUR" | "WEEK" | "MONTH">(
    "DAY"
  );
  const [eventsPage, setEventsPage] = useState(0);
  const [size, setSize] = useState(20);

  const filters = useMemo<SearchAnalyticsRetrieveFilters>(() => {
    const resolvedAuthenticated =
      authenticated === "all" ? null : authenticated === "true";

    return {
      fromTime: fromTime ? new Date(fromTime).toISOString() : undefined,
      toTime: toTime ? new Date(toTime).toISOString() : undefined,
      pageType: pageType === "all" ? undefined : pageType,
      searchSource: searchSource === "all" ? undefined : searchSource,
      authenticated: resolvedAuthenticated,
      searchTerm: searchTerm.trim() || undefined,
      bucket,
      limit: 20,
      page: eventsPage,
      size,
    };
  }, [
    authenticated,
    bucket,
    eventsPage,
    fromTime,
    pageType,
    searchSource,
    searchTerm,
    size,
    toTime,
  ]);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["admin", "search-analytics", "overview", filters],
    queryFn: () => searchAnalyticsService.getOverview(filters),
  });

  const { data: topTerms, isLoading: loadingTopTerms } = useQuery({
    queryKey: ["admin", "search-analytics", "top-terms", filters],
    queryFn: () => searchAnalyticsService.getTopTerms(filters),
  });

  const { data: timeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ["admin", "search-analytics", "timeline", filters],
    queryFn: () => searchAnalyticsService.getTimeline(filters),
  });

  const { data: eventsPageData, isLoading: loadingEvents } = useQuery({
    queryKey: ["admin", "search-analytics", "events", filters],
    queryFn: () => searchAnalyticsService.getEvents(filters),
  });

  const isLoading =
    loadingOverview || loadingTopTerms || loadingTimeline || loadingEvents;

  return (
    <AdminLayout
      title="Search Analytics"
      description="Track search behavior across storefront pages."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">From</label>
                <Input
                  type="datetime-local"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">To</label>
                <Input
                  type="datetime-local"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Page Type
                </label>
                <Select value={pageType} onValueChange={setPageType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="PRODUCT_LIST">Product List</SelectItem>
                    <SelectItem value="SERVICE_LIST">Service List</SelectItem>
                    <SelectItem value="EVENT_LIST">Event List</SelectItem>
                    <SelectItem value="PACKAGE_LIST">Package List</SelectItem>
                    <SelectItem value="CUSTOM_ORDER_LIST">
                      Custom Order List
                    </SelectItem>
                    <SelectItem value="LANDING_SEARCH">
                      Landing Search
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Search Source
                </label>
                <Select value={searchSource} onValueChange={setSearchSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="PAGE_SEARCH_BAR">
                      Page Search Bar
                    </SelectItem>
                    <SelectItem value="HERO_SEARCH_BAR">
                      Hero Search Bar
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Authenticated
                </label>
                <Select value={authenticated} onValueChange={setAuthenticated}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Authenticated</SelectItem>
                    <SelectItem value="false">Anonymous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Search Term
                </label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="gift"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Timeline Bucket
                </label>
                <Select
                  value={bucket}
                  onValueChange={(value: "DAY" | "HOUR" | "WEEK" | "MONTH") =>
                    setBucket(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOUR">Hour</SelectItem>
                    <SelectItem value="DAY">Day</SelectItem>
                    <SelectItem value="WEEK">Week</SelectItem>
                    <SelectItem value="MONTH">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Events Page Size
                </label>
                <Select
                  value={String(size)}
                  onValueChange={(value) => setSize(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading analytics...
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Searches</p>
              <p className="text-2xl font-bold">
                {overview?.totalSearches ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Distinct Users</p>
              <p className="text-2xl font-bold">
                {overview?.distinctUserCount ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Distinct Sessions</p>
              <p className="text-2xl font-bold">
                {overview?.distinctSessionCount ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Authenticated</p>
              <p className="text-2xl font-bold">
                {overview?.authenticatedSearches ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Anonymous</p>
              <p className="text-2xl font-bold">
                {overview?.anonymousSearches ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(topTerms || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : null}
              {(topTerms || []).map((term) => (
                <div
                  key={`${term.term}-${term.lastSearchedAt}`}
                  className="flex items-center justify-between border rounded-md p-2"
                >
                  <div>
                    <p className="font-medium">{term.term}</p>
                    <p className="text-xs text-muted-foreground">
                      Last searched: {formatDateTime(term.lastSearchedAt)}
                    </p>
                  </div>
                  <Badge>{term.searchCount}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(timeline || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : null}
              {(timeline || []).map((bucketItem) => (
                <div
                  key={bucketItem.bucketStart}
                  className="flex items-center justify-between border rounded-md p-2"
                >
                  <p className="text-sm">
                    {formatDateTime(bucketItem.bucketStart)}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">
                      {bucketItem.searchCount} searches
                    </Badge>
                    <Badge variant="outline">
                      {bucketItem.distinctUserCount} users
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(eventsPageData?.content || []).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {formatDateTime(
                        event.createdAt || event.backendReceivedAt
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.searchTerm}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{event.pageName}</span>
                        <span className="text-xs text-muted-foreground">
                          {event.pageType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{event.searchSource}</TableCell>
                    <TableCell>{event.resultCount ?? "-"}</TableCell>
                    <TableCell>
                      {typeof event.authenticated === "boolean"
                        ? event.authenticated
                          ? "Yes"
                          : "No"
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {event.sessionId || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {eventsPageData?.page ?? eventsPage} of{" "}
                {eventsPageData?.totalPages ?? 1} • Total{" "}
                {eventsPageData?.totalElements ?? 0}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(eventsPageData?.page ?? eventsPage) <= 0}
                  onClick={() => setEventsPage((prev) => Math.max(0, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    (eventsPageData?.page ?? eventsPage) + 1 >=
                    (eventsPageData?.totalPages ?? 1)
                  }
                  onClick={() => setEventsPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
