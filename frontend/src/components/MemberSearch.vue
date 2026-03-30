<template>
  <ConfirmDialog />
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-search text-[#6F8FAF]"></i>
        <span>Member Search</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <div class="text-surface-600">
          Browse everyone in the directory. Use search or class year to narrow the list.
        </div>

        <div v-if="peopleStore.loading" class="text-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <p class="mt-4 text-surface-600">Loading directory…</p>
        </div>

        <Message v-else-if="peopleStore.error" severity="error" :closable="false" class="w-full">
          {{ peopleStore.error }}
        </Message>

        <template v-else>
          <div class="flex flex-col md:flex-row md:items-center gap-4">
            <div class="flex-1 min-w-0">
              <InputText
                v-model="searchQuery"
                placeholder="Search by name, email, phone, address, or city…"
                class="w-full"
                size="small"
              />
            </div>
            <div class="w-full md:w-52 shrink-0">
              <Select
                v-model="yearFilter"
                :options="yearOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Class year"
                showClear
                size="small"
                class="w-full"
              />
            </div>
          </div>

          <div v-if="filteredPeople.length > 0" class="overflow-x-auto -mx-1">
            <DataTable
              :value="filteredPeople"
              dataKey="id"
              stripedRows
              sortField="lastName"
              :sortOrder="1"
              removableSort
              :paginator="filteredPeople.length > 15"
              :rows="25"
              :rowsPerPageOptions="[25, 50, 100]"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              class="text-sm"
              :pt="{
                table: { class: canEdit ? 'min-w-[920px]' : 'min-w-[860px]' },
              }"
            >
              <Column field="lastName" header="Name" sortable>
                <template #body="{ data }">
                  <span class="font-medium text-surface-900">
                    {{ data.firstName }} {{ data.lastName }}
                  </span>
                </template>
              </Column>
              <Column field="email" header="Email" sortable>
                <template #body="{ data }">
                  <a
                    :href="`mailto:${data.email}`"
                    class="text-[#6F8FAF] hover:underline break-all"
                  >
                    {{ data.email }}
                  </a>
                </template>
              </Column>
              <Column field="phone" header="Phone" sortable>
                <template #body="{ data }">
                  <a
                    v-if="data.phone && String(data.phone).trim()"
                    :href="`tel:${String(data.phone).replace(/\s/g, '')}`"
                    class="text-[#6F8FAF] hover:underline whitespace-nowrap"
                  >
                    {{ data.phone }}
                  </a>
                  <span v-else class="text-surface-400">—</span>
                </template>
              </Column>
              <Column header="Address" :sortable="false">
                <template #body="{ data }">
                  <span class="text-surface-700 whitespace-normal">{{ formatAddress(data) }}</span>
                </template>
              </Column>
              <Column
                field="isMember"
                header="Member"
                sortable
                dataType="boolean"
                class="whitespace-nowrap w-[1%] text-center"
                headerClass="!text-center"
              >
                <template #body="{ data }">
                  <span :class="data.isMember ? 'text-surface-800' : 'text-surface-400'">
                    {{ data.isMember ? 'Yes' : 'No' }}
                  </span>
                </template>
              </Column>
              <Column
                field="isParent"
                header="Parent"
                sortable
                dataType="boolean"
                class="whitespace-nowrap w-[1%] text-center"
                headerClass="!text-center"
              >
                <template #body="{ data }">
                  <span :class="data.isParent ? 'text-surface-800' : 'text-surface-400'">
                    {{ data.isParent ? 'Yes' : 'No' }}
                  </span>
                </template>
              </Column>
              <Column field="pledgeClassYear" header="Year" sortable>
                <template #body="{ data }">
                  <span v-if="data.pledgeClassYear != null" class="text-surface-800">
                    {{ data.pledgeClassYear }}
                  </span>
                  <span v-else class="text-surface-400">—</span>
                </template>
              </Column>
              <Column v-if="canEdit" header="" :sortable="false" class="w-[1%] whitespace-nowrap">
                <template #body="{ data }">
                  <Button
                    type="button"
                    icon="pi pi-pencil"
                    severity="secondary"
                    rounded
                    text
                    v-tooltip.top="'Edit'"
                    :disabled="editSaving || deleteSaving"
                    @click="openEditDialog(data)"
                  />
                </template>
              </Column>
            </DataTable>
          </div>

          <div
            v-else-if="peopleStore.list.length > 0"
            class="text-center py-16"
          >
            <i class="pi pi-filter-slash text-6xl text-surface-400 mb-4"></i>
            <h3 class="text-2xl font-bold text-surface-700 mb-2">No matches</h3>
            <p class="text-surface-600">Try a different search or clear the class year filter.</p>
          </div>

          <div v-else class="text-center py-16">
            <i class="pi pi-users text-6xl text-surface-400 mb-4"></i>
            <h3 class="text-2xl font-bold text-surface-700 mb-2">No one listed yet</h3>
            <p class="text-surface-600">Directory entries will appear here once they are added.</p>
          </div>
        </template>
      </div>
    </template>
  </Card>

  <Dialog
    v-model:visible="editDialogVisible"
    modal
    header="Edit directory person"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '95vw' }"
    :dismissableMask="true"
    @hide="resetEditForm"
  >
    <form novalidate @submit.prevent="submitEdit" class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label for="edit-person-kind" class="font-semibold text-surface-700">
          Role <span class="text-red-500">*</span>
        </label>
        <Select
          id="edit-person-kind"
          v-model="editForm.kind"
          :options="kindOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select role"
          :class="{ 'p-invalid': editErrors.kind }"
          class="w-full md:max-w-md"
        />
        <small v-if="editErrors.kind" class="p-error">{{ editErrors.kind }}</small>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="flex flex-col gap-2">
          <label for="edit-person-first-name" class="font-semibold text-surface-700">
            First Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-person-first-name"
            v-model="editForm.firstName"
            :class="{ 'p-invalid': editErrors.firstName }"
            class="w-full"
          />
          <small v-if="editErrors.firstName" class="p-error">{{ editErrors.firstName }}</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-person-last-name" class="font-semibold text-surface-700">
            Last Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-person-last-name"
            v-model="editForm.lastName"
            :class="{ 'p-invalid': editErrors.lastName }"
            class="w-full"
          />
          <small v-if="editErrors.lastName" class="p-error">{{ editErrors.lastName }}</small>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="edit-person-address" class="font-semibold text-surface-700">
          Street address <span class="text-red-500">*</span>
        </label>
        <InputText
          id="edit-person-address"
          v-model="editForm.addressLine1"
          :class="{ 'p-invalid': editErrors.addressLine1 }"
          class="w-full"
        />
        <small v-if="editErrors.addressLine1" class="p-error">{{ editErrors.addressLine1 }}</small>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="flex flex-col gap-2">
          <label for="edit-person-city" class="font-semibold text-surface-700">
            City <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-person-city"
            v-model="editForm.city"
            :class="{ 'p-invalid': editErrors.city }"
            class="w-full"
          />
          <small v-if="editErrors.city" class="p-error">{{ editErrors.city }}</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-person-state" class="font-semibold text-surface-700">
            State <span class="text-red-500">*</span>
          </label>
          <Select
            id="edit-person-state"
            v-model="editForm.state"
            :options="US_STATE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            filter
            filterPlaceholder="Search state"
            placeholder="Select state"
            :class="{ 'p-invalid': editErrors.state }"
            class="w-full"
          />
          <small v-if="editErrors.state" class="p-error">{{ editErrors.state }}</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-person-zip" class="font-semibold text-surface-700">
            ZIP <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-person-zip"
            v-model="editForm.zip"
            :class="{ 'p-invalid': editErrors.zip }"
            class="w-full"
          />
          <small v-if="editErrors.zip" class="p-error">{{ editErrors.zip }}</small>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="flex flex-col gap-2">
          <label for="edit-person-email" class="font-semibold text-surface-700">
            Email <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-person-email"
            v-model="editForm.email"
            type="email"
            :class="{ 'p-invalid': editErrors.email }"
            class="w-full"
          />
          <small v-if="editErrors.email" class="p-error">{{ editErrors.email }}</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-person-phone" class="font-semibold text-surface-700">Phone</label>
          <InputText id="edit-person-phone" v-model="editForm.phone" class="w-full" />
        </div>
      </div>

      <div v-if="showEditPledgeField" class="flex flex-col gap-2 md:max-w-xs">
        <label for="edit-person-pledge" class="font-semibold text-surface-700">
          Pledge / graduation year
        </label>
        <InputNumber
          id="edit-person-pledge"
          v-model="editForm.pledgeClassYear"
          :useGrouping="false"
          :min="1900"
          :max="2100"
          placeholder="Optional"
          :class="{ 'p-invalid': editErrors.pledgeClassYear }"
          class="w-full"
        />
        <small v-if="editErrors.pledgeClassYear" class="p-error">{{ editErrors.pledgeClassYear }}</small>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <Button
          type="button"
          label="Remove from directory"
          icon="pi pi-trash"
          severity="danger"
          outlined
          :disabled="editSaving || deleteSaving"
          :loading="deleteSaving"
          class="sm:mr-auto"
          @click="confirmDeletePerson"
        />
        <div class="flex justify-end gap-3">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            :disabled="editSaving || deleteSaving"
            @click="editDialogVisible = false"
          />
          <Button
            type="submit"
            label="Save"
            icon="pi pi-check"
            :loading="editSaving"
            :disabled="editSaving || deleteSaving"
            class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
          />
        </div>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { isAxiosRejection } from '@/services/api'
import { usePeopleStore } from '@/stores/people'
import { useAuthStore } from '@/stores/auth'
import type { PersonResponse, PersonKind, UpdatePersonPayload } from '@/types/person'
import { US_STATE_CODE_SET, US_STATE_OPTIONS, normalizeUsStateForSelect } from '@/constants/usStates'

const toast = useToast()
const confirm = useConfirm()
const peopleStore = usePeopleStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const yearFilter = ref<number | null>(null)

const canEdit = computed(() => authStore.isEditor)

const kindOptions = [
  { label: 'Member', value: 'member' as PersonKind },
  { label: 'Parent', value: 'parent' as PersonKind },
  { label: 'Member and parent', value: 'both' as PersonKind },
]

const editDialogVisible = ref(false)
const editSaving = ref(false)
const deleteSaving = ref(false)
const editingId = ref<string | null>(null)

const editForm = ref({
  kind: 'member' as PersonKind,
  firstName: '',
  lastName: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  email: '',
  phone: '',
  pledgeClassYear: null as number | null,
})

const editErrors = ref({
  kind: '',
  firstName: '',
  lastName: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  email: '',
  pledgeClassYear: '',
})

const showEditPledgeField = computed(
  () => editForm.value.kind === 'member' || editForm.value.kind === 'both',
)

const yearOptions = computed(() => {
  const years = new Set<number>()
  for (const p of peopleStore.list) {
    if (p.pledgeClassYear != null) years.add(p.pledgeClassYear)
  }
  const sorted = [...years].sort((a, b) => b - a)
  return sorted.map((y) => ({ label: String(y), value: y }))
})

function kindFromPerson(p: PersonResponse): PersonKind {
  if (p.isMember && p.isParent) return 'both'
  if (p.isMember) return 'member'
  return 'parent'
}

function formatAddress(p: PersonResponse): string {
  const line = [p.addressLine1, [p.city, p.state].filter(Boolean).join(', '), p.zip]
    .filter((s) => s && String(s).trim())
    .join(', ')
  return line || '—'
}

function matchesSearch(person: PersonResponse, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase().trim()
  const hay = [
    person.firstName,
    person.lastName,
    `${person.firstName} ${person.lastName}`,
    person.email,
    person.phone ?? '',
    person.city,
    person.state,
    person.zip,
    person.addressLine1,
    formatAddress(person),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

const filteredPeople = computed(() => {
  let rows = peopleStore.list
  if (yearFilter.value != null) {
    rows = rows.filter((p) => p.pledgeClassYear === yearFilter.value)
  }
  const q = searchQuery.value
  if (q.trim()) {
    rows = rows.filter((p) => matchesSearch(p, q))
  }
  return rows
})

function clearEditErrors() {
  editErrors.value = {
    kind: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    pledgeClassYear: '',
  }
}

function resetEditForm() {
  editingId.value = null
  editForm.value = {
    kind: 'member',
    firstName: '',
    lastName: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    phone: '',
    pledgeClassYear: null,
  }
  clearEditErrors()
}

function openEditDialog(p: PersonResponse) {
  editingId.value = p.id
  editForm.value = {
    kind: kindFromPerson(p),
    firstName: p.firstName,
    lastName: p.lastName,
    addressLine1: p.addressLine1,
    city: p.city,
    state: normalizeUsStateForSelect(p.state),
    zip: p.zip,
    email: p.email,
    phone: p.phone ?? '',
    pledgeClassYear: p.pledgeClassYear ?? null,
  }
  clearEditErrors()
  editDialogVisible.value = true
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEditForm(): boolean {
  clearEditErrors()
  let ok = true
  const f = editForm.value
  if (!f.kind) {
    editErrors.value.kind = 'Role is required'
    ok = false
  }
  if (!f.firstName.trim()) {
    editErrors.value.firstName = 'First name is required'
    ok = false
  }
  if (!f.lastName.trim()) {
    editErrors.value.lastName = 'Last name is required'
    ok = false
  }
  if (!f.addressLine1.trim()) {
    editErrors.value.addressLine1 = 'Address is required'
    ok = false
  }
  if (!f.city.trim()) {
    editErrors.value.city = 'City is required'
    ok = false
  }
  if (!f.state || !US_STATE_CODE_SET.has(f.state)) {
    editErrors.value.state = 'Select a state'
    ok = false
  }
  if (!f.zip.trim()) {
    editErrors.value.zip = 'ZIP is required'
    ok = false
  }
  if (!f.email.trim()) {
    editErrors.value.email = 'Email is required'
    ok = false
  } else if (!emailRegex.test(f.email)) {
    editErrors.value.email = 'Enter a valid email'
    ok = false
  }
  if (showEditPledgeField.value && f.pledgeClassYear != null) {
    const y = f.pledgeClassYear
    if (y < 1900 || y > 2100) {
      editErrors.value.pledgeClassYear = 'Year must be between 1900 and 2100'
      ok = false
    }
  }
  return ok
}

async function submitEdit() {
  const personId = editingId.value
  if (!personId || !validateEditForm()) return

  editSaving.value = true
  try {
    const f = editForm.value
    const payload: UpdatePersonPayload = {
      kind: f.kind,
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      addressLine1: f.addressLine1.trim(),
      city: f.city.trim(),
      state: f.state.trim().toUpperCase(),
      zip: f.zip.trim(),
      email: f.email.trim(),
      phone: f.phone.trim() || null,
    }
    if (showEditPledgeField.value) {
      payload.pledgeClassYear = f.pledgeClassYear
    } else {
      payload.pledgeClassYear = null
    }

    await peopleStore.updatePerson(personId, payload)

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Directory entry was updated.',
      life: 3500,
    })
    editDialogVisible.value = false
    resetEditForm()
  } catch (err: unknown) {
    // Global api interceptor already toasts for Axios errors; avoid duplicate error toasts.
    if (!isAxiosRejection(err)) {
      const ax = err as { response?: { data?: { message?: string | string[] } } }
      const raw = ax.response?.data?.message
      const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Could not save changes'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail,
        life: 5000,
      })
    }
  } finally {
    editSaving.value = false
  }
}

/**
 * PrimeVue ConfirmDialog calls `accept()` without awaiting. It then sets `visible = false` synchronously.
 * Running the async delete in the same turn can interact badly with dialog teardown; defer with `nextTick`.
 */
async function runDeletePersonAfterConfirm(personId: string, displayName: string) {
  deleteSaving.value = true
  try {
    if (typeof peopleStore.deletePerson !== 'function') {
      console.error('peopleStore.deletePerson is not available')
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not remove this entry (store action missing). Try refreshing the page.',
        life: 5000,
      })
      return
    }
    await peopleStore.deletePerson(personId)
    toast.add({
      severity: 'success',
      summary: 'Removed',
      detail: `${displayName} was removed from the directory.`,
      life: 3500,
    })
    editDialogVisible.value = false
    resetEditForm()
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.error('Remove directory entry failed:', err)
    }
    if (!isAxiosRejection(err)) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string }
      const raw = ax.response?.data?.message
      const detail =
        (Array.isArray(raw) ? raw.join(', ') : raw) ||
        (typeof ax.message === 'string' ? ax.message : null) ||
        'Could not remove this entry'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail,
        life: 5000,
      })
    }
  } finally {
    deleteSaving.value = false
  }
}

function confirmDeletePerson() {
  const personId = editingId.value
  if (!personId) return

  const name = `${editForm.value.firstName} ${editForm.value.lastName}`.trim() || 'this person'
  confirm.require({
    message: `Remove ${name} from the directory? They will no longer appear in the public list. This can be undone only by re-adding them.`,
    header: 'Remove directory entry',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => {
      void nextTick(() => {
        void runDeletePersonAfterConfirm(personId, name)
      })
    },
  })
}

onMounted(async () => {
  void peopleStore.fetchPeople()
  if (authStore.isAuthenticated) {
    await authStore.fetchUserProfile()
  }
})

watch(
  () => authStore.isAuthenticated,
  async (authed) => {
    if (authed) await authStore.fetchUserProfile()
  },
)

watch(
  () => peopleStore.list,
  () => {
    if (yearFilter.value != null && !yearOptions.value.some((o) => o.value === yearFilter.value)) {
      yearFilter.value = null
    }
  },
  { deep: true },
)
</script>
