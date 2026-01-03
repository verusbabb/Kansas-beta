import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import { UserResponseDto, CreateUserDto, UpdateUserDto } from '@/types/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as UserResponseDto[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // Get only active (non-deleted) users
    activeUsers(): UserResponseDto[] {
      return this.users
    },
  },

  actions: {
    /**
     * Fetch all users
     */
    async fetchUsers() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<UserResponseDto[]>('/users')
        this.users = response.data
      } catch (error) {
        this.error = 'Failed to fetch users'
        console.error('Error fetching users:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single user by ID
     */
    async fetchUserById(id: string) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<UserResponseDto>(`/users/${id}`)
        return response.data
      } catch (error) {
        this.error = 'Failed to fetch user'
        console.error('Error fetching user:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new user
     */
    async createUser(userDto: CreateUserDto) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.post<UserResponseDto>('/users', userDto)
        const newUser = response.data
        this.users.push(newUser)
        return newUser
      } catch (error) {
        this.error = 'Failed to create user'
        console.error('Error creating user:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update an existing user
     */
    async updateUser(id: string, userDto: UpdateUserDto) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.patch<UserResponseDto>(`/users/${id}`, userDto)
        const updatedUser = response.data
        const index = this.users.findIndex(u => u.id === id)
        if (index > -1) {
          this.users[index] = updatedUser
        }
        return updatedUser
      } catch (error) {
        this.error = 'Failed to update user'
        console.error('Error updating user:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a user
     */
    async deleteUser(id: string) {
      this.loading = true
      this.error = null
      try {
        await apiClient.delete(`/users/${id}`)
        const index = this.users.findIndex(u => u.id === id)
        if (index > -1) {
          this.users.splice(index, 1)
        }
        return true
      } catch (error) {
        this.error = 'Failed to delete user'
        console.error('Error deleting user:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})

