import Link from "next/link";
import { ArrowRight, CheckCircle, MapPin, Users } from "lucide-react";

import { getFeaturedMosques } from "@/lib/mosques/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function NearbyMosquesPreview() {
  const mosques = await getFeaturedMosques(3);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold">Featured Mosques</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Live from the verified mosque directory
          </p>
        </div>
        <Link href="/mosques">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {mosques.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
            No verified mosques are published yet. Visit the directory to explore the latest listings as
            they go live.
          </div>
        ) : (
          mosques.map((mosque) => (
            <Link key={mosque.id} href={`/mosques/${mosque.id}`}>
              <div className="group flex gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 transition-all hover:border-primary/30 hover:bg-muted/50">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MosqueIcon className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 font-semibold text-foreground transition-colors group-hover:text-primary">
                        <span className="truncate">{mosque.name}</span>
                        {mosque.is_verified && <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {mosque.city}, {mosque.state}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      <Users className="mr-1 h-3 w-3" />
                      {mosque.capacity ?? 0}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(mosque.facilities ?? []).slice(0, 3).map((facility: string) => (
                      <Badge key={facility} variant="outline" className="text-xs font-normal">
                        {facility}
                      </Badge>
                    ))}
                    {(mosque.facilities ?? []).length > 3 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{(mosque.facilities ?? []).length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c-1.5 2-3 3.5-3 5.5a3 3 0 1 0 6 0c0-2-1.5-3.5-3-5.5z" />
      <path d="M4 21V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <path d="M3 21h18" />
      <path d="M4 10l8-6 8 6" />
    </svg>
  );
}
