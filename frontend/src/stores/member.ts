import { defineStore } from 'pinia'
// import apiClient from '@/services/api'

export interface Member {
  id: string
  name: string
  initials: string
  image?: string
  position?: string
  graduationYear: number
  major?: string
  email?: string
  isActive: boolean
  profession?: string // For alumni
}

export const useMemberStore = defineStore('member', {
  state: () => ({
    activeMembers: [] as Member[],
    alumni: [] as Member[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    allMembers(): Member[] {
      return [...this.activeMembers, ...this.alumni]
    },
  },

  actions: {
    async fetchMembers() {
      this.loading = true
      this.error = null
      try {
        // TODO: Connect to backend API
        // const response = await apiClient.get<{ active: Member[], alumni: Member[] }>('/members')
        // this.activeMembers = response.data.active
        // this.alumni = response.data.alumni
        
        // Placeholder data for now
        this.activeMembers = []
        this.alumni = []
      } catch (error) {
        this.error = 'Failed to fetch members'
        console.error('Error fetching members:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchMemberById(id: string) {
      this.loading = true
      this.error = null
      try {
        // TODO: Connect to backend API
        // const response = await apiClient.get<Member>(`/members/${id}`)
        // return response.data
        
        return this.allMembers.find(m => m.id === id) || null
      } catch (error) {
        this.error = 'Failed to fetch member'
        console.error('Error fetching member:', error)
        return null
      } finally {
        this.loading = false
      }
    },
  },
})

