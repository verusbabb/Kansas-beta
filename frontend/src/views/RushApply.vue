<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-3xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Apply to Rush Beta Theta Pi</h1>
        <p class="text-xl text-gray-300 mb-2">Alpha Nu Chapter — University of Kansas</p>
        <div class="w-32 h-1 bg-gray-400 mx-auto mt-4"></div>
      </div>
    </div>

    <!-- Form / Success -->
    <div class="max-w-3xl mx-auto px-6 py-12">

      <!-- Success state -->
      <div v-if="submitted" class="text-center py-16">
        <i class="pi pi-check-circle text-6xl text-green-500 mb-6 block"></i>
        <h2 class="text-2xl font-bold text-surface-900 mb-3">Application Received!</h2>
        <p class="text-surface-600 text-lg mb-8">
          Thank you, {{ submittedName }}. A rush chair will be in touch with you soon.
        </p>
        <Button
          label="Back to Rush Page"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="$router.push('/rush')"
        />
      </div>

      <!-- Application form -->
      <form v-else @submit.prevent="handleSubmit" novalidate>
        <!-- Section 1: Contact Information -->
        <Card class="mb-6">
          <template #title>
            <span class="flex items-center gap-2 text-lg font-semibold">
              <i class="pi pi-user text-[#6F8FAF]"></i>
              Contact Information
            </span>
          </template>
          <template #content>
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="firstName" class="font-semibold text-surface-700">
                    First Name <span class="text-red-500">*</span>
                  </label>
                  <InputText
                    id="firstName"
                    v-model="form.firstName"
                    :class="{ 'p-invalid': errors.firstName }"
                    class="w-full"
                  />
                  <small v-if="errors.firstName" class="p-error">{{ errors.firstName }}</small>
                </div>
                <div class="flex flex-col gap-2">
                  <label for="lastName" class="font-semibold text-surface-700">
                    Last Name <span class="text-red-500">*</span>
                  </label>
                  <InputText
                    id="lastName"
                    v-model="form.lastName"
                    :class="{ 'p-invalid': errors.lastName }"
                    class="w-full"
                  />
                  <small v-if="errors.lastName" class="p-error">{{ errors.lastName }}</small>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="email" class="font-semibold text-surface-700">
                    Email <span class="text-red-500">*</span>
                  </label>
                  <InputText
                    id="email"
                    v-model="form.email"
                    type="email"
                    :class="{ 'p-invalid': errors.email }"
                    class="w-full"
                  />
                  <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
                </div>
                <div class="flex flex-col gap-2">
                  <label for="phone" class="font-semibold text-surface-700">
                    Phone <span class="text-red-500">*</span>
                  </label>
                  <InputText
                    id="phone"
                    v-model="form.phone"
                    placeholder="913-555-0100"
                    :class="{ 'p-invalid': errors.phone }"
                    class="w-full"
                  />
                  <small v-if="errors.phone" class="p-error">{{ errors.phone }}</small>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="hometown" class="font-semibold text-surface-700">Hometown</label>
                  <InputText
                    id="hometown"
                    v-model="form.hometown"
                    placeholder="Overland Park, KS"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="highSchool" class="font-semibold text-surface-700">High School</label>
                  <InputText
                    id="highSchool"
                    v-model="form.highSchool"
                    class="w-full"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="classYear" class="font-semibold text-surface-700">
                    Class Year <span class="text-red-500">*</span>
                  </label>
                  <Select
                    id="classYear"
                    v-model="form.classYear"
                    :options="classYearOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Select year"
                    :class="{ 'p-invalid': errors.classYear }"
                    class="w-full"
                  />
                  <small v-if="errors.classYear" class="p-error">{{ errors.classYear }}</small>
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-semibold text-surface-700">Planned KU Start</label>
                  <div class="flex gap-2">
                    <Select
                      v-model="form.enrollmentSemester"
                      :options="semesterOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Semester"
                      class="flex-1"
                    />
                    <Select
                      v-model="form.enrollmentYear"
                      :options="enrollmentYearOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Year"
                      class="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Section 2: Academic & Background -->
        <Card class="mb-6">
          <template #title>
            <span class="flex items-center gap-2 text-lg font-semibold">
              <i class="pi pi-book text-[#6F8FAF]"></i>
              Academic &amp; Background
              <span class="text-sm font-normal text-surface-500">(optional)</span>
            </span>
          </template>
          <template #content>
            <div class="flex flex-col gap-5">
              <div class="flex flex-col gap-2">
                <label for="major" class="font-semibold text-surface-700">Major (declared or intended)</label>
                <InputText
                  id="major"
                  v-model="form.major"
                  class="w-full"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="gpa" class="font-semibold text-surface-700">GPA</label>
                  <InputText
                    id="gpa"
                    v-model="form.gpaStr"
                    placeholder="3.85"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="actScore" class="font-semibold text-surface-700">ACT Score</label>
                  <InputText
                    id="actScore"
                    v-model="form.actScoreStr"
                    placeholder="32"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="satScore" class="font-semibold text-surface-700">SAT Score</label>
                  <InputText
                    id="satScore"
                    v-model="form.satScoreStr"
                    placeholder="1420"
                    class="w-full"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <label for="sportsActivities" class="font-semibold text-surface-700">
                  Sports &amp; Activities
                </label>
                <Textarea
                  id="sportsActivities"
                  v-model="form.sportsActivities"
                  placeholder="Basketball varsity, Student Council president, Chess club…"
                  rows="3"
                  class="w-full"
                  auto-resize
                />
              </div>

              <div class="flex flex-col gap-2">
                <label for="honorsAwards" class="font-semibold text-surface-700">
                  Honors &amp; Awards
                </label>
                <Textarea
                  id="honorsAwards"
                  v-model="form.honorsAwards"
                  placeholder="National Honor Society, Eagle Scout, AP Scholar…"
                  rows="3"
                  class="w-full"
                  auto-resize
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Section 3: Alpha Nu Legacy -->
        <Card class="mb-6">
          <template #title>
            <span class="flex items-center gap-2 text-lg font-semibold">
              <i class="pi pi-users text-[#6F8FAF]"></i>
              Alpha Nu Legacy
              <span class="text-sm font-normal text-surface-500">(optional)</span>
            </span>
          </template>
          <template #content>
            <div class="flex flex-col gap-4">
              <p class="text-surface-600 text-sm">
                If you have a relative who is a member of the Alpha Nu chapter, you can search for them
                below or enter their name manually.
              </p>

              <!-- Member search -->
              <div v-if="!manualLegacyMode" class="flex flex-col gap-2">
                <label class="font-semibold text-surface-700">Search for a member by name</label>

                <!-- Selected member display -->
                <div v-if="selectedLegacyMember" class="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <i class="pi pi-check-circle text-green-600"></i>
                  <span class="font-medium text-green-800">
                    {{ selectedLegacyMember.firstName }} {{ selectedLegacyMember.lastName }}
                  </span>
                  <Button
                    icon="pi pi-times"
                    size="small"
                    text
                    severity="secondary"
                    class="ml-auto"
                    @click="clearLegacyMember"
                  />
                </div>

                <AutoComplete
                  v-else
                  v-model="legacySearchQuery"
                  :suggestions="legacySearchResults"
                  option-label="fullName"
                  placeholder="Search by first or last name…"
                  class="w-full"
                  :delay="300"
                  :min-length="2"
                  empty-search-message="No members found"
                  @complete="onLegacySearch"
                  @option-select="onLegacySelect"
                />

                <button
                  type="button"
                  class="text-sm text-[#6F8FAF] hover:underline text-left mt-1 w-fit"
                  @click="manualLegacyMode = true"
                >
                  Can't find them? Enter name manually →
                </button>
              </div>

              <!-- Manual fallback -->
              <div v-else class="flex flex-col gap-2">
                <label for="legacyRelativeName" class="font-semibold text-surface-700">
                  Relative's full name
                </label>
                <InputText
                  id="legacyRelativeName"
                  v-model="form.legacyRelativeName"
                  class="w-full"
                />
                <button
                  type="button"
                  class="text-sm text-[#6F8FAF] hover:underline text-left mt-1 w-fit"
                  @click="switchToMemberSearch"
                >
                  ← Search the member directory instead
                </button>
              </div>

              <!-- Relationship selector (shown when either path has a value) -->
              <div
                v-if="selectedLegacyMember || form.legacyRelativeName"
                class="flex flex-col gap-2"
              >
                <label for="legacyRelationship" class="font-semibold text-surface-700">
                  Relationship
                </label>
                <Select
                  id="legacyRelationship"
                  v-model="form.legacyRelationship"
                  :options="legacyRelationshipOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select relationship"
                  class="w-full sm:w-64"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Section 4: Referral -->
        <Card class="mb-8">
          <template #title>
            <span class="flex items-center gap-2 text-lg font-semibold">
              <i class="pi pi-megaphone text-[#6F8FAF]"></i>
              How did you hear about us?
              <span class="text-sm font-normal text-surface-500">(optional)</span>
            </span>
          </template>
          <template #content>
            <InputText
              v-model="form.referralSource"
              placeholder="A current member, social media, campus event…"
              class="w-full"
            />
          </template>
        </Card>

        <!-- Error banner -->
        <Message v-if="submitError" severity="error" class="mb-4">
          {{ submitError }}
        </Message>

        <!-- Submit -->
        <div class="flex justify-end">
          <Button
            type="submit"
            label="Submit Application"
            icon="pi pi-send"
            :loading="store.submitting"
            class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
            size="large"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import Message from 'primevue/message'
import { useRushProspectStore } from '@/stores/rushProspect'
import type { MemberLegacySearchResult, ClassYear, LegacyRelationship } from '@/types/rushProspect'

const store = useRushProspectStore()

const currentYear = new Date().getFullYear()

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  classYear: null as ClassYear | null,
  hometown: '',
  highSchool: '',
  enrollmentSemester: null as 'fall' | 'spring' | null,
  enrollmentYear: null as number | null,
  major: '',
  gpaStr: '',
  actScoreStr: '',
  satScoreStr: '',
  sportsActivities: '',
  honorsAwards: '',
  legacyRelativeName: '',
  legacyRelationship: null as LegacyRelationship | null,
  referralSource: '',
})

const errors = ref<Record<string, string>>({})
const submitted = ref(false)
const submittedName = ref('')
const submitError = ref('')

// ── Legacy member search ─────────────────────────────────────────────────────

const manualLegacyMode = ref(false)
const legacySearchQuery = ref('')
const legacySearchResults = ref<(MemberLegacySearchResult & { fullName: string })[]>([])
const selectedLegacyMember = ref<MemberLegacySearchResult | null>(null)

async function onLegacySearch(event: { query: string }) {
  const results = await store.searchLegacyMembers(event.query)
  legacySearchResults.value = results.map((r) => ({ ...r, fullName: `${r.firstName} ${r.lastName}` }))
}

function onLegacySelect(event: { value: MemberLegacySearchResult & { fullName: string } }) {
  selectedLegacyMember.value = event.value
  legacySearchQuery.value = ''
}

function clearLegacyMember() {
  selectedLegacyMember.value = null
  legacySearchQuery.value = ''
  form.value.legacyRelationship = null
}

function switchToMemberSearch() {
  manualLegacyMode.value = false
  form.value.legacyRelativeName = ''
  form.value.legacyRelationship = null
}

// ── Select options ───────────────────────────────────────────────────────────

const classYearOptions = [
  { label: 'Freshman', value: 'freshman' },
  { label: 'Sophomore', value: 'sophomore' },
  { label: 'Junior', value: 'junior' },
  { label: 'Senior', value: 'senior' },
  { label: 'Other', value: 'other' },
]

const semesterOptions = [
  { label: 'Fall', value: 'fall' },
  { label: 'Spring', value: 'spring' },
]

const enrollmentYearOptions = computed(() =>
  [0, 1, 2].map((offset) => ({
    label: String(currentYear + offset),
    value: currentYear + offset,
  })),
)

const legacyRelationshipOptions = [
  { label: 'Father', value: 'father' },
  { label: 'Grandfather', value: 'grandfather' },
  { label: 'Great-grandfather', value: 'great_grandfather' },
  { label: 'Uncle', value: 'uncle' },
  { label: 'Brother', value: 'brother' },
  { label: 'Cousin', value: 'cousin' },
]

// ── Validation ───────────────────────────────────────────────────────────────

function validate(): boolean {
  errors.value = {}
  const f = form.value

  if (!f.firstName.trim()) errors.value['firstName'] = 'First name is required'
  if (!f.lastName.trim()) errors.value['lastName'] = 'Last name is required'
  if (!f.email.trim()) {
    errors.value['email'] = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    errors.value['email'] = 'Enter a valid email address'
  }
  if (!f.phone.trim()) errors.value['phone'] = 'Phone is required'
  if (!f.classYear) errors.value['classYear'] = 'Class year is required'

  return Object.keys(errors.value).length === 0
}

// ── Submit ───────────────────────────────────────────────────────────────────

async function handleSubmit() {
  submitError.value = ''
  if (!validate()) return

  const f = form.value
  const gpa = f.gpaStr ? parseFloat(f.gpaStr) : undefined
  const actScore = f.actScoreStr ? parseInt(f.actScoreStr, 10) : undefined
  const satScore = f.satScoreStr ? parseInt(f.satScoreStr, 10) : undefined

  try {
    await store.submitApplication({
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      email: f.email.trim().toLowerCase(),
      phone: f.phone.trim(),
      classYear: f.classYear!,
      hometown: f.hometown.trim() || undefined,
      highSchool: f.highSchool.trim() || undefined,
      enrollmentSemester: f.enrollmentSemester ?? undefined,
      enrollmentYear: f.enrollmentYear ?? undefined,
      major: f.major.trim() || undefined,
      gpa: !isNaN(gpa!) ? gpa : undefined,
      actScore: !isNaN(actScore!) ? actScore : undefined,
      satScore: !isNaN(satScore!) ? satScore : undefined,
      sportsActivities: f.sportsActivities.trim() || undefined,
      honorsAwards: f.honorsAwards.trim() || undefined,
      legacyRelativePersonId: selectedLegacyMember.value?.id ?? undefined,
      legacyRelativeName: !selectedLegacyMember.value && f.legacyRelativeName.trim()
        ? f.legacyRelativeName.trim()
        : undefined,
      legacyRelationship: f.legacyRelationship ?? undefined,
      referralSource: f.referralSource.trim() || undefined,
    })
    submittedName.value = f.firstName.trim()
    submitted.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    submitError.value = 'Something went wrong submitting your application. Please try again.'
  }
}
</script>
