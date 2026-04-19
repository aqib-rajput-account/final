import { notFound } from "next/navigation";

import { Footer, Header } from "@/components/layout";
import { PublicManagementMemberView } from "@/components/mosques/public-detail-views";
import { getPublicMosquePageData } from "@/lib/mosques/public";

interface PageProps {
  params: Promise<{
    id: string;
    memberId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id, memberId } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;
  const team = data?.managementTeams.find((entry) => entry.members.some((member) => member.id === memberId));
  const member = team?.members.find((entry) => entry.id === memberId);

  if (!mosque || !team || !member) {
    return {
      title: "Management Member Not Found | MosqueConnect",
    };
  }

  return {
    title: `${member.member_name} | ${team.name} | ${mosque.name} | MosqueConnect`,
    description: `${member.member_name} serves as ${member.role_title} in the ${team.name} team at ${mosque.name}.`,
  };
}

export default async function ManagementMemberPage({ params }: PageProps) {
  const { id, memberId } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;
  const team = data?.managementTeams.find((entry) => entry.members.some((member) => member.id === memberId));
  const member = team?.members.find((entry) => entry.id === memberId);

  if (!mosque || !team || !member) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PublicManagementMemberView mosque={mosque} team={team} member={member} />
      </main>
      <Footer />
    </div>
  );
}
