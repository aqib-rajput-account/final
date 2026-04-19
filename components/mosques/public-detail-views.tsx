import Link from "next/link";
import type { ElementType } from "react";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Imam, Mosque } from "@/lib/database.types";
import type { PublicManagementTeam, PublicManagementTeamMember } from "@/lib/mosques/public";

export function PublicImamDetailView({ mosque, imam }: { mosque: Mosque; imam: Imam }) {
  return (
    <div>
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Link
            href={`/mosques/${mosque.id}`}
            className="mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {mosque.name}
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {imam.title || "Imam"}
                </Badge>
                {imam.is_active ? (
                  <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                    Active appointment
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{imam.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary/70" />
                  {mosque.name}
                </span>
                {imam.appointed_date ? (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/70" />
                    Appointed {formatDate(imam.appointed_date)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {imam.email ? (
                <Button asChild className="rounded-xl">
                  <a href={`mailto:${imam.email}`}>Email Imam</a>
                </Button>
              ) : null}
              {imam.phone ? (
                <Button variant="outline" asChild className="rounded-xl">
                  <a href={`tel:${imam.phone}`}>Call</a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,2fr)_320px] lg:px-8">
        <div className="space-y-6">
          <Card className="rounded-3xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Biography</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground">
                {imam.bio || "Biography details have not been published yet."}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Areas of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard label="Experience" value={imam.experience_years ? `${imam.experience_years} years` : "Not listed"} />
                <InfoCard label="Education" value={imam.education || "Not listed"} />
              </div>
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                  Languages
                </p>
                <div className="flex flex-wrap gap-2">
                  {(imam.languages ?? []).length > 0 ? (
                    imam.languages?.map((language) => (
                      <Badge key={language} variant="outline" className="rounded-full px-3 py-1">
                        {language}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Languages not listed yet.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                  Specializations
                </p>
                <div className="flex flex-wrap gap-2">
                  {(imam.specializations ?? []).length > 0 ? (
                    imam.specializations?.map((specialization) => (
                      <Badge key={specialization} variant="secondary" className="rounded-full px-3 py-1">
                        {specialization}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Specializations not listed yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactRow label="Email" value={imam.email} href={imam.email ? `mailto:${imam.email}` : undefined} icon={Mail} />
              <ContactRow label="Phone" value={imam.phone} href={imam.phone ? `tel:${imam.phone}` : undefined} icon={Phone} />
              <Separator />
              <ContactRow label="Mosque" value={mosque.name} href={`/mosques/${mosque.id}`} icon={Building2} />
              <ContactRow
                label="Website"
                value={mosque.website}
                href={mosque.website ? normalizeExternalUrl(mosque.website) : undefined}
                icon={Globe}
                external
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PublicManagementDirectoryView({
  mosque,
  teams,
}: {
  mosque: Mosque;
  teams: PublicManagementTeam[];
}) {
  return (
    <div>
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Link
            href={`/mosques/${mosque.id}`}
            className="mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {mosque.name}
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Mosque management
              </Badge>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Management Directory
              </h1>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                Explore the teams and members working to keep {mosque.name} running smoothly.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryChip label="Teams" value={teams.length} />
              <SummaryChip label="Members" value={teams.reduce((sum, team) => sum + team.members.length, 0)} />
              <SummaryChip label="Active Teams" value={teams.filter((team) => team.is_active).length} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {teams.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border/60">
            <CardContent className="py-14 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h2 className="mt-4 text-lg font-semibold">No management teams published</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The mosque management structure will appear here once it is published.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <Card key={team.id} className="rounded-3xl border-border/50">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                      {formatLabel(team.team_type || "operations")}
                    </p>
                    <CardTitle className="mt-2 text-xl font-black tracking-tight">{team.name}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {team.description || "Team description will be added soon."}
                    </p>
                  </div>
                  {team.is_active ? (
                    <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                      Active
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Team Lead</p>
                    <p className="mt-2 font-semibold text-foreground">{team.lead?.full_name || "Lead not assigned"}</p>
                  </div>

                  {team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members published for this team yet.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {team.members.map((member) => (
                        <div key={member.id} className="rounded-2xl border border-border/40 bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{member.member_name}</p>
                              <p className="text-sm text-muted-foreground">{member.role_title}</p>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="rounded-xl">
                              <Link href={`/mosques/${mosque.id}/management/${member.id}`}>Profile</Link>
                            </Button>
                          </div>
                          {(member.responsibilities ?? []).length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {member.responsibilities?.slice(0, 3).map((responsibility) => (
                                <Badge key={responsibility} variant="outline" className="rounded-full px-3 py-1">
                                  {responsibility}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PublicManagementMemberView({
  mosque,
  team,
  member,
}: {
  mosque: Mosque;
  team: PublicManagementTeam;
  member: PublicManagementTeamMember;
}) {
  return (
    <div>
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/mosques/${mosque.id}`} className="hover:text-primary">
              {mosque.name}
            </Link>
            <span>/</span>
            <Link href={`/mosques/${mosque.id}/management`} className="hover:text-primary">
              Management
            </Link>
            <span>/</span>
            <span className="text-foreground">{member.member_name}</span>
          </div>

          <div className="space-y-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {formatLabel(team.team_type || "operations")}
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{member.member_name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary/70" />
                {member.role_title}
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary/70" />
                {team.name}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary/70" />
                Joined {formatDate(member.joined_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,2fr)_320px] lg:px-8">
        <div className="space-y-6">
          <Card className="rounded-3xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              {(member.responsibilities ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {member.responsibilities?.map((responsibility) => (
                    <Badge key={responsibility} variant="secondary" className="rounded-full px-3 py-1">
                      {responsibility}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Responsibilities have not been listed yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground">
                {member.notes || "No additional notes have been shared for this team member yet."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-black">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactRow
                label="Email"
                value={member.profile?.email || null}
                href={member.profile?.email ? `mailto:${member.profile.email}` : undefined}
                icon={Mail}
              />
              <ContactRow
                label="Phone"
                value={member.profile?.phone || null}
                href={member.profile?.phone ? `tel:${member.profile.phone}` : undefined}
                icon={Phone}
              />
              <Separator />
              <ContactRow label="Team" value={team.name} href={`/mosques/${mosque.id}/management`} icon={Users} />
              <ContactRow label="Mosque" value={mosque.name} href={`/mosques/${mosque.id}`} icon={Building2} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}

function ContactRow({
  label,
  value,
  href,
  icon: Icon,
  external,
}: {
  label: string;
  value: string | null;
  href?: string;
  icon: ElementType;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-4 rounded-2xl border border-transparent p-4 transition-colors hover:border-border/40 hover:bg-muted/30">
      <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
        <p className="mt-1 truncate font-medium text-foreground">{value || "Not available"}</p>
      </div>
      {href ? <ExternalLink className="h-4 w-4 text-muted-foreground" /> : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {content}
    </a>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
