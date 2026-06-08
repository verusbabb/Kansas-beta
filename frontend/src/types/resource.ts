export enum ResourceTag {
  LEGAL = 'legal',
  INSURANCE = 'insurance',
  NATIONAL = 'national',
  OTHER = 'other',
}

export interface ResourceVersionDto {
  id: string
  resourceId: string
  filePath: string
  originalFilename: string
  contentType: string
  fileSize: number
  versionNumber: number
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export interface ResourceResponseDto {
  id: string
  title: string
  description?: string | null
  tag: ResourceTag
  uploadedBy: string
  createdAt: string
  updatedAt: string
  currentVersion?: ResourceVersionDto | null
  versions?: ResourceVersionDto[]
}

export interface CreateResourceDto {
  title: string
  description?: string
  tag: ResourceTag
}

export interface UpdateResourceDto {
  title?: string
  description?: string
  tag?: ResourceTag
}

export const RESOURCE_TAG_LABELS: Record<ResourceTag, string> = {
  [ResourceTag.LEGAL]: 'Legal',
  [ResourceTag.INSURANCE]: 'Insurance',
  [ResourceTag.NATIONAL]: 'National',
  [ResourceTag.OTHER]: 'Other',
}
