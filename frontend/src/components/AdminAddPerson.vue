<template>
  <Card class="mb-6" :pt="cardPassThrough">
    <template #title>
      <button
        id="add-member-parent-trigger"
        type="button"
        class="add-member-parent-header flex flex-wrap items-center justify-between gap-3 w-full text-left text-xl font-semibold leading-normal rounded-md border-0 bg-transparent p-1 -m-1 cursor-pointer text-surface-900 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F8FAF]"
        :aria-expanded="formOpen"
        aria-controls="add-member-parent-panel"
        :aria-label="formOpen ? 'Hide add member or parent form' : 'Show add member or parent form'"
        v-tooltip.top="formOpen ? 'Hide form' : 'Show form'"
        @click="formOpen = !formOpen"
      >
        <span class="flex items-center gap-2 min-w-0">
          <i class="pi pi-user-plus ml-3 text-xl text-[#6F8FAF] shrink-0" aria-hidden="true"></i>
          <span>Add A Member or Parent</span>
        </span>
        <i
          :class="[
            'pi shrink-0 text-xl text-[#6F8FAF]',
            formOpen ? 'pi-minus' : 'pi-plus',
          ]"
          aria-hidden="true"
        />
      </button>
    </template>
    <template #content>
      <div
        id="add-member-parent-panel"
        v-show="formOpen"
        class="flex flex-col gap-6"
        role="region"
        aria-labelledby="add-member-parent-trigger"
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
              Role <span class="text-red-500">*</span>
            </label>
            <Select
              id="person-kind"
              v-model="form.kind"
              :options="kindOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select role"
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
              Email <span class="text-red-500">*</span>
            </label>
            <InputText
              id="person-email"
              v-model="form.email"
              type="email"
              placeholder="name@example.com"
              :class="{ 'p-invalid': errors.email }"
              class="w-full md:max-w-xl"
            />
            <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="person-linkedin" class="font-semibold text-surface-700">
              LinkedIn
            </label>
            <InputText
              id="person-linkedin"
              v-model="form.linkedinProfileUrl"
              type="url"
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

          <div class="flex gap-3">
            <Button
              type="submit"
              label="Save person"
              icon="pi pi-check"
              :loading="submitting"
              :disabled="submitting || !isFormFilled"
              class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
            />
          </div>
        </form>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import apiClient from '@/services/api'
import { usePeopleStore } from '@/stores/people'
import type { CreatePersonPayload, PersonKind, PersonResponse } from '@/types/person'
import { US_STATE_CODE_SET, US_STATE_OPTIONS } from '@/constants/usStates'

const toast = useToast()
const peopleStore = usePeopleStore()

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

const form = ref({
  kind: 'member' as PersonKind,
  firstName: '',
  lastName: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  email: '',
  linkedinProfileUrl: '',
  externalContactId: '',
  homePhone: '',
  mobilePhone: '',
  pledgeClassYear: null as number | null,
})

const errors = ref({
  kind: '',
  firstName: '',
  lastName: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  email: '',
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
    f.email.trim() !== '' &&
    emailRegex.test(f.email) &&
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
    email: '',
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
  if (!f.email.trim()) {
    errors.value.email = 'Email is required'
    ok = false
  } else if (!emailRegex.test(f.email)) {
    errors.value.email = 'Enter a valid email'
    ok = false
  }

  const li = f.linkedinProfileUrl.trim()
  if (li) {
    try {
      const u = new URL(li)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        errors.value.linkedinProfileUrl = 'Use a link starting with http:// or https://'
        ok = false
      }
    } catch {
      errors.value.linkedinProfileUrl = 'Enter a valid URL'
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
    email: '',
    linkedinProfileUrl: '',
    externalContactId: '',
    homePhone: '',
    mobilePhone: '',
    pledgeClassYear: null,
  }
  clearErrors()
}

async function handleSubmit() {
  if (!validate()) return

  submitting.value = true
  try {
    const payload: CreatePersonPayload = {
      kind: form.value.kind,
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      email: form.value.email.trim(),
    }
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

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${data.firstName} ${data.lastName} was added to the directory.`,
      life: 4000,
    })
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
