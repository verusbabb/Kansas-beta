import { defineStore } from 'pinia'
// import apiClient from '@/services/api'

export interface RushEvent {
  id: string
  title: string
  date: string
  description: string
  icon: string
  location?: string
  time?: string
}

export const useRushStore = defineStore('rush', {
  state: () => ({
    events: [] as RushEvent[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchRushEvents() {
      this.loading = true
      this.error = null
      try {
        // TODO: Connect to backend API
        // const response = await apiClient.get<RushEvent[]>('/rush/events')
        // this.events = response.data
        
        // Placeholder data for now
        this.events = [
          {
            id: '1',
            title: 'Rush Week Begins',
            date: 'Fall 2024',
            description: 'Join us for our first rush event and meet the brothers of Alpha Nu.',
            icon: 'pi pi-calendar',
            location: 'Chapter House',
            time: '6:00 PM'
          },
          {
            id: '2',
            title: 'House Tours',
            date: 'TBD',
            description: 'Come see our chapter house and learn about our facilities.',
            icon: 'pi pi-home',
            location: 'Chapter House',
            time: 'TBD'
          },
          {
            id: '3',
            title: 'Meet the Brothers',
            date: 'TBD',
            description: 'Social events to get to know our active members.',
            icon: 'pi pi-users',
            location: 'TBD',
            time: 'TBD'
          },
          {
            id: '4',
            title: 'Bid Day',
            date: 'TBD',
            description: 'The exciting conclusion of rush week.',
            icon: 'pi pi-star',
            location: 'Chapter House',
            time: 'TBD'
          }
        ]
      } catch (error) {
        this.error = 'Failed to fetch rush events'
        console.error('Error fetching rush events:', error)
      } finally {
        this.loading = false
      }
    },
  },
})

