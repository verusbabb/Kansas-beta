<template>
  <div class="flex flex-col gap-6">
    <!-- Header: title + add button outside any card -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-surface-900 flex items-center gap-2">
        <i class="pi pi-user-plus text-[#6F8FAF]"></i>
        Add A Member or Parent
      </h2>
      <div class="flex items-center gap-2">
        <Button
          v-if="!formOpen"
          label="Add A Member or Parent"
          icon="pi pi-plus"
          @click="formOpen = true"
          class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
        />
        <Button
          v-else
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          outlined
          :disabled="submitting"
          @click="cancelForm"
        />
      </div>
    </div>

  <Card v-show="formOpen" class="mb-6" :pt="cardPassThrough">
    <template #content>
      <div class="flex flex-col gap-6">
        <div
          id="add-member-parent-panel"
          class="flex flex-col gap-6"
          role="region"
        >
        <div class="text-surface-600">
          Add a member, parent, or both to the chapter directory. Email must be unique.
        </div>

        <form
          class="admin-add-person-form flex flex-col gap-5"
          @submit.prevent="handleSubmit"
        >
          <div class="flex flex-col gap-2">
            <label for="person-kind" class="font-semibold text-surface-700">
              Directory type <span class="text-red-500">*</span>
            </label>
            <Select
              id="person-kind"
              v-model="form.kind"
              :options="kindOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select type"
              :class="{ 'p-invalid': errors.kind }"
              class="w-full md:max-w-md"
            />
            <small v-if="errors.kind" class="p-error">{{ errors.kind }}</small>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label for="person-first-name" class="font-semibold text-surface-700">
                First Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="person-first-name"
                v-model="form.firstName"
                placeholder="John"
                :class="{ 'p-invalid': errors.firstName }"
                class="w-full"
              />
              <small v-if="errors.firstName" class="p-error">{{ errors.firstName }}</small>
            </div>
            <div class="flex flex-col gap-2">
              <label for="person-last-name" class="font-semibold text-surface-700">
                Last Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="person-last-name"
                v-model="form.lastName"
                placeholder="Doe"
                :class="{ 'p-invalid': errors.lastName }"
                class="w-full"
              />
              <small v-if="errors.lastName" class="p-error">{{ errors.lastName }}</small>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="person-address" class="font-semibold text-surface-700">
              Street address
            </label>
            <InputText
              id="person-address"
              v-model="form.addressLine1"
              placeholder="1234 Jayhawk Blvd"
              :class="{ 'p-invalid': errors.addressLine1 }"
              class="w-full"
            />
            <small v-if="errors.addressLine1" class="p-error">{{ errors.addressLine1 }}</small>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="flex flex-col gap-2 md:col-span-1">
              <label for="person-city" class="font-semibold text-surface-700">
                City
              </label>
              <InputText
                id="person-city"
                v-model="form.city"
                placeholder="Lawrence"
                :class="{ 'p-invalid': errors.city }"
                class="w-full"
              />
              <small v-if="errors.city" class="p-error">{{ errors.city }}</small>
            </div>
            <div class="flex flex-col gap-2">
              <label for="person-state" class="font-semibold text-surface-700">
                State
              </label>
              <Select
                id="person-state"
                v-model="form.state"
                :options="US_STATE_OPTIONS"
                optionLabel="label"
                optionValue="value"
                filter
                filterMatchMode="startsWith"
                :filterFields="['label', 'value']"
                filterPlaceholder="Search state"
                placeholder="Optional"
                :class="{ 'p-invalid': errors.state }"
                class="w-full"
              />
              <small v-if="errors.state" class="p-error">{{ errors.state }}</small>
            </div>
            <div class="flex flex-col gap-2">
              <label for="person-zip" class="font-semibold text-surface-700">
                ZIP
              </label>
              <InputText
                id="person-zip"
                v-model="form.zip"
                placeholder="66045"
                :class="{ 'p-invalid': errors.zip }"
                class="w-full"
              />
              <small v-if="errors.zip" class="p-error">{{ errors.zip }}</small>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="person-email" class="font-semibold text-surface-700">
              Personal Email (sign-in email) <span class="text-red-500">*</span>
            </label>
            <InputText
              id="person-email"
              v-model="form.personalEmail"
              type="email"
              placeholder="name@example.com"
              :class="{ 'p-invalid': errors.personalEmail }"
              class="w-full md:max-w-xl"
            />
            <small v-if="errors.personalEmail" class="p-error">{{ errors.personalEmail }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="person-work-email" class="font-semibold text-surface-700">Work Email</label>
            <InputText
              id="person-work-email"
              v-model="form.workEmail"
              type="email"
              placeholder="name@company.com"
              :class="{ 'p-invalid': errors.workEmail }"
              class="w-full md:max-w-xl"
            />
            <small v-if="errors.workEmail" class="p-error">{{ errors.workEmail }}</small>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label for="person-employer" class="font-semibold text-surface-700">Employer</label>
              <InputText
                id="person-employer"
                v-model="form.employer"
                placeholder="Acme Corp"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="person-job-title" class="font-semibold text-surface-700">Job Title</label>
              <InputText
                id="person-job-title"
                v-model="form.jobTitle"
                placeholder="Software Engineer"
                class="w-full"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="person-linkedin" class="font-semibold text-surface-700">
              LinkedIn
            </label>
            <InputText
              id="person-linkedin"
              v-model="form.linkedinProfileUrl"
              type="text"
              placeholder="https://www.linkedin.com/in/…"
              :class="{ 'p-invalid': errors.linkedinProfileUrl }"
              class="w-full md:max-w-xl"
              autocomplete="url"
            />
            <small v-if="errors.linkedinProfileUrl" class="p-error">{{ errors.linkedinProfileUrl }}</small>
            <small v-else class="text-surface-500">Optional — public profile URL only.</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="person-external-contact-id" class="font-semibold text-surface-700">
              CRM Contact ID
            </label>
            <InputText
              id="person-external-contact-id"
              v-model="form.externalContactId"
              placeholder="Optional — from import / Salesforce"
              class="w-full md:max-w-xl font-mono text-sm"
            />
            <small class="text-surface-500">Used to match future spreadsheet imports; leave blank if unknown.</small>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label for="person-mobile" class="font-semibold text-surface-700">Mobile phone</label>
              <InputText
                id="person-mobile"
                v-model="form.mobilePhone"
                placeholder="Optional"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="person-home-phone" class="font-semibold text-surface-700">Home phone</label>
              <InputText
                id="person-home-phone"
                v-model="form.homePhone"
                placeholder="Optional"
                class="w-full"
              />
            </div>
          </div>

          <div v-if="showPledgeField" class="flex flex-col gap-2 md:max-w-xs">
            <label for="person-pledge" class="font-semibold text-surface-700">
              Pledge Class
            </label>
            <InputNumber
              id="person-pledge"
              v-model="form.pledgeClassYear"
              :useGrouping="false"
              :min="1900"
              :max="2100"
              placeholder="e.g. 2027"
              :class="{ 'p-invalid': errors.pledgeClassYear }"
              class="w-full"
            />
            <small v-if="errors.pledgeClassYear" class="p-error">{{ errors.pledgeClassYear }}</small>
          </div>

          <div class="flex flex-col gap-2 border-t border-surface-200 pt-5">
            <label for="person-app-role" class="font-semibold text-surface-700">
              App access <span class="text-red-500">*</span>
            </label>
            <Select
              id="person-app-role"
              v-model="form.appRole"
              :options="appRoleOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full md:max-w-md"
            />
            <small class="text-surface-500">
              An account will be created and a password-set invite sent to their email. Viewer is the standard access level for members.
            </small>
          </div>

          <div class="flex gap-3">
            <Button
              type="submit"
              label="Save person"
              icon="pi pi-check"
              :loading="submitting"
              :disabled="submitting || !isFormFilled"
              class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
            />
            <Button
              type="button"
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              outlined
              :disabled="submitting"
              @click="cancelForm"
            />
          </div>
        </form>
      </div>
      </div>
    </template>
  </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import apiClient from '@/services/api'
import { usePeopleStore } from '@/stores/people'
import { useUserStore } from '@/stores/user'
import { UserRole } from '@/types/user'
import { ROLE_OPTIONS_WITH_SUMMARY } from '@/constants/roles'
import type { CreatePersonPayload, PersonKind, PersonResponse } from '@/types/person'
import { US_STATE_CODE_SET, US_STATE_OPTIONS } from '@/constants/usStates'

const toast = useToast()
const confirm = useConfirm()
const peopleStore = usePeopleStore()
const userStore = useUserStore()

const formOpen = ref(false)

/** Avoid an empty padded body when the form is collapsed. */
const cardPassThrough = computed(() =>
  formOpen.value
    ? {}
    : {
        body: { class: '!p-0' },
        content: { class: '!p-0' },
      },
)

const kindOptions = [
  { label: 'Member', value: 'member' as PersonKind },
  { label: 'Parent', value: 'parent' as PersonKind },
  { label: 'Member and parent', value: 'both' as PersonKind },
]

const appRoleOptions = ROLE_OPTIONS_WITH_SUMMARY

const form = ref({
  kind: 'member' as PersonKind,
  firstName: '',
  lastName: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  personalEmail: '',
  workEmail: '',
  employer: '',
  jobTitle: '',
  linkedinProfileUrl: '',
  externalContactId: '',
  homePhone: '',
  mobilePhone: '',
  pledgeClassYear: null as number | null,
  appRole: UserRole.VIEWER as UserRole,
})

const errors = ref({
  kind: '',
  firstName: '',
  lastName: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  personalEmail: '',
  workEmail: '',
  linkedinProfileUrl: '',
  pledgeClassYear: '',
})

const submitting = ref(false)

const showPledgeField = computed(
  () => form.value.kind === 'member' || form.value.kind === 'both',
)

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isFormFilled = computed(() => {
  const f = form.value
  return (
    f.kind &&
    f.firstName.trim() !== '' &&
    f.lastName.trim() !== '' &&
    f.personalEmail.trim() !== '' &&
    emailRegex.test(f.personalEmail) &&
    (f.state === '' || US_STATE_CODE_SET.has(f.state))
  )
})

function clearErrors() {
  errors.value = {
    kind: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    personalEmail: '',
    workEmail: '',
    linkedinProfileUrl: '',
    pledgeClassYear: '',
  }
}


function validate(): boolean {
  clearErrors()
  let ok = true
  const f = form.value

  if (!f.kind) {
    errors.value.kind = 'Role is required'
    ok = false
  }
  if (!f.firstName.trim()) {
    errors.value.firstName = 'First name is required'
    ok = false
  }
  if (!f.lastName.trim()) {
    errors.value.lastName = 'Last name is required'
    ok = false
  }
  if (f.state !== '' && !US_STATE_CODE_SET.has(f.state)) {
    errors.value.state = 'Select a valid state or leave blank'
    ok = false
  }
  if (!f.personalEmail.trim()) {
    errors.value.personalEmail = 'Personal email is required'
    ok = false
  } else if (!emailRegex.test(f.personalEmail)) {
    errors.value.personalEmail = 'Enter a valid email'
    ok = false
  }
  if (f.workEmail.trim() && !emailRegex.test(f.workEmail)) {
    errors.value.workEmail = 'Enter a valid email'
    ok = false
  }

  const li = f.linkedinProfileUrl.trim()
  if (li) {
    const normalized = /^https?:\/\//i.test(li) ? li : `https://${li}`
    try {
      new URL(normalized)
      form.value.linkedinProfileUrl = normalized
    } catch {
      errors.value.linkedinProfileUrl = 'Enter a valid LinkedIn URL'
      ok = false
    }
  }

  if (showPledgeField.value && f.pledgeClassYear != null) {
    const y = f.pledgeClassYear
    if (y < 1900 || y > 2100) {
      errors.value.pledgeClassYear = 'Year must be between 1900 and 2100'
      ok = false
    }
  }

  return ok
}

function resetForm() {
  form.value = {
    kind: 'member',
    firstName: '',
    lastName: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    personalEmail: '',
    workEmail: '',
    employer: '',
    jobTitle: '',
    linkedinProfileUrl: '',
    externalContactId: '',
    homePhone: '',
    mobilePhone: '',
    pledgeClassYear: null,
    appRole: UserRole.VIEWER,
  }
  clearErrors()
}

/** True when the user has entered anything beyond the blank defaults. */
const isFormDirty = computed(() => {
  const f = form.value
  return (
    f.firstName.trim() !== '' ||
    f.lastName.trim() !== '' ||
    f.personalEmail.trim() !== '' ||
    f.workEmail.trim() !== '' ||
    f.employer.trim() !== '' ||
    f.jobTitle.trim() !== '' ||
    f.addressLine1.trim() !== '' ||
    f.city.trim() !== '' ||
    f.state !== '' ||
    f.zip.trim() !== '' ||
    f.linkedinProfileUrl.trim() !== '' ||
    f.externalContactId.trim() !== '' ||
    f.mobilePhone.trim() !== '' ||
    f.homePhone.trim() !== '' ||
    f.pledgeClassYear !== null ||
    f.appRole !== UserRole.VIEWER
  )
})

function cancelForm() {
  if (!isFormDirty.value) {
    resetForm()
    formOpen.value = false
    return
  }
  confirm.require({
    message: 'Discard your changes and close the form?',
    header: 'Discard changes',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Keep editing',
    acceptLabel: 'Discard',
    acceptClass: 'p-button-danger',
    accept: () => {
      resetForm()
      formOpen.value = false
    },
  })
}

async function handleSubmit() {
  if (!validate()) return

  submitting.value = true
  try {
    const payload: CreatePersonPayload = {
      kind: form.value.kind,
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      personalEmail: form.value.personalEmail.trim(),
    }
    const we = form.value.workEmail.trim()
    if (we) payload.workEmail = we
    const emp = form.value.employer.trim()
    if (emp) payload.employer = emp
    const jt = form.value.jobTitle.trim()
    if (jt) payload.jobTitle = jt
    const street = form.value.addressLine1.trim()
    if (street) payload.addressLine1 = street
    const city = form.value.city.trim()
    if (city) payload.city = city
    if (form.value.state && US_STATE_CODE_SET.has(form.value.state)) {
      payload.state = form.value.state.trim().toUpperCase()
    }
    const zip = form.value.zip.trim()
    if (zip) payload.zip = zip
    const linkedin = form.value.linkedinProfileUrl.trim()
    if (linkedin) payload.linkedinProfileUrl = linkedin
    const ext = form.value.externalContactId.trim()
    if (ext) payload.externalContactId = ext
    const mobile = form.value.mobilePhone.trim()
    if (mobile) payload.mobilePhone = mobile
    const home = form.value.homePhone.trim()
    if (home) payload.homePhone = home
    if (showPledgeField.value && form.value.pledgeClassYear != null) {
      payload.pledgeClassYear = form.value.pledgeClassYear
    }

    const { data } = await apiClient.post<PersonResponse>('/people', payload)

    // Create the user account and send the invite
    try {
      await userStore.assignDirectoryPersonRole(data.id, form.value.appRole)
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: `${data.firstName} ${data.lastName} was added to the directory and an invite was sent to ${data.personalEmail}.`,
        life: 5000,
      })
    } catch (inviteErr: unknown) {
      // Person was saved successfully; only the invite step failed — surface it as a warning
      const ax = inviteErr as { response?: { data?: { message?: string | string[] } } }
      const raw = ax.response?.data?.message
      const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Person added, but invite could not be sent.'
      toast.add({
        severity: 'warn',
        summary: 'Person added',
        detail,
        life: 6000,
      })
    }

    resetForm()
    formOpen.value = false
    void peopleStore.fetchPeople({ silent: true })
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string | string[] } } }
    const raw = ax.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Could not save person'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail,
      life: 5000,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* Muted placeholders so hints read as hints, not filled values */
.admin-add-person-form :deep(.p-inputtext::placeholder) {
  color: var(--p-text-muted-color, #9ca3af);
  opacity: 0.45;
}

.admin-add-person-form :deep(.p-select .p-select-label.p-placeholder) {
  color: var(--p-text-muted-color, #9ca3af);
  opacity: 0.45;
}
</style>
