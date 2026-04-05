"use client"

import { use } from 'react'
import { notFound } from 'next/navigation'
import { getMosqueById, getManagementMemberById } from '@/lib/data'
import { ManagementMemberDetailView } from '@/components/mosques/management-member-detail-view'

interface PageProps {
  params: Promise<{
    id: string
    memberId: string
  }>
}

export default function ManagementMemberPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const mosque = getMosqueById(resolvedParams.id)
  const member = getManagementMemberById(resolvedParams.memberId)

  if (!mosque || !member || member.mosqueId !== mosque.id) {
    notFound()
  }

  return <ManagementMemberDetailView mosque={mosque} member={member} />
}

