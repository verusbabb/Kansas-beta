import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import type {
  CreatePersonRelationshipPayload,
  PersonRelationshipResponse,
  UpdatePersonRelationshipPayload,
} from '@/types/personRelationship'

export const usePersonRelationshipsStore = defineStore('personRelationships', {
  actions: {
    async fetchForPerson(personId: string): Promise<PersonRelationshipResponse[]> {
      const { data } = await apiClient.get<PersonRelationshipResponse[]>(
        `/people/${personId}/relationships`,
      )
      return Array.isArray(data) ? data : []
    },

    async create(
      personId: string,
      payload: CreatePersonRelationshipPayload,
    ): Promise<PersonRelationshipResponse> {
      const { data } = await apiClient.post<PersonRelationshipResponse>(
        `/people/${personId}/relationships`,
        payload,
      )
      return data
    },

    async update(
      personId: string,
      relationshipId: string,
      payload: UpdatePersonRelationshipPayload,
    ): Promise<PersonRelationshipResponse> {
      const { data } = await apiClient.patch<PersonRelationshipResponse>(
        `/people/${personId}/relationships/${relationshipId}`,
        payload,
      )
      return data
    },

    async remove(personId: string, relationshipId: string): Promise<void> {
      await apiClient.delete(`/people/${personId}/relationships/${relationshipId}`)
    },
  },
})
