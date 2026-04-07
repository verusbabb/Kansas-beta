<template>
  <div class="bg-surface-0 min-h-screen">
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-12 px-6">
      <div class="max-w-4xl mx-auto">
        <Button
          type="button"
          label="Back to directory"
          icon="pi pi-arrow-left"
          severity="secondary"
          class="mb-4 !bg-white/10 !border-white/30 !text-white hover:!bg-white/20"
          @click="goBackToDirectory"
        />
        <div v-if="loading" class="flex items-center gap-3 text-lg">
          <i class="pi pi-spin pi-spinner" />
          Loading profile…
        </div>
        <template v-else-if="profile">
          <div class="flex flex-col sm:flex-row sm:items-end gap-6">
            <div
              v-if="profile.headshotUrl"
              class="profile-hero-photo shrink-0 overflow-hidden bg-white/10 ring-2 ring-white/35"
            >
              <img
                :src="profile.headshotUrl"
                :alt="`${profile.person.firstName} ${profile.person.lastName}`"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-3xl md:text-4xl font-bold">
                {{ profile.person.firstName }} {{ profile.person.lastName }}
              </h1>
              <p class="text-gray-200 mt-2 text-lg">
                {{ directoryRoleLine(profile.person) }}
                <template v-if="profile.person.pledgeClassYear != null">
                  · PC {{ profile.person.pledgeClassYear }}
                </template>
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
      <ConfirmDialog />
      <Dialog
        v-model:visible="leaveEditDialogVisible"
        modal
        header="Unsaved changes"
        :closable="false"
        :dismissableMask="false"
        class="max-w-md"
      >
        <p class="text-surface-700 text-sm m-0">
          You have <span class="font-medium text-surface-900">Edit My Information</span> open. Your directory
          fields and visibility settings are not saved until you use
          <span class="font-medium text-surface-900">Save my profile</span>. Save now, discard changes and
          leave, or stay on this page.
        </p>
        <template #footer>
          <div class="flex flex-wrap justify-end gap-2 w-full">
            <Button
              type="button"
              label="Stay on page"
              severity="secondary"
              outlined
              :disabled="!!myProfileSaving"
              @click="onLeaveEditStay"
            />
            <Button
              type="button"
              label="Discard changes"
              severity="danger"
              outlined
              :disabled="!!myProfileSaving"
              @click="onLeaveEditDiscard"
            />
            <Button
              type="button"
              label="Save and leave"
              icon="pi pi-check"
              class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
              :loading="!!myProfileSaving"
              :disabled="!!myProfileSaving"
              @click="onLeaveEditSave"
            />
          </div>
        </template>
      </Dialog>
      <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

      <template v-if="profile && !loading">
        <Card>
          <template #title>Contact</template>
          <template #content>
            <dl class="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm m-0">
              <dt class="text-surface-500 font-medium">Email</dt>
              <dd class="m-0">
                <div v-if="profile.person.email" class="flex flex-col gap-1">
                  <a
                    :href="`mailto:${profile.person.email}`"
                    class="text-[#6F8FAF] hover:underline break-all"
                  >
                    {{ profile.person.email }}
                  </a>
                  <p v-if="isMyProfile" class="text-surface-500 text-xs m-0 max-w-xl">
                    Used for sign-in and your directory record. It cannot be changed on this page; contact
                    an administrator if your login email needs to be updated.
                  </p>
                </div>
                <span
                  v-else-if="profile.person.hasEmailOnFile"
                  v-tooltip.top="contactHiddenTooltip"
                  class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default"
                  role="img"
                  :aria-label="contactHiddenTooltip"
                >
                  <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                  <span class="select-none blur-sm text-surface-500" aria-hidden="true">email on file</span>
                </span>
                <span v-else class="text-surface-400">—</span>
              </dd>
              <dt class="text-surface-500 font-medium">Mobile</dt>
              <dd class="m-0 text-surface-800">
                <span
                  v-if="formatUsPhoneForDisplay(profile.person.mobilePhone)"
                  class="whitespace-nowrap inline-block"
                >
                  {{ formatUsPhoneForDisplay(profile.person.mobilePhone) }}
                </span>
                <span
                  v-else-if="profile.person.hasMobilePhone"
                  v-tooltip.top="contactHiddenTooltip"
                  class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default"
                  role="img"
                  :aria-label="contactHiddenTooltip"
                >
                  <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                  <span>Phone on file</span>
                  <span class="inline-block h-3 w-20 rounded bg-surface-200" aria-hidden="true" />
                </span>
                <span v-else class="text-surface-400">—</span>
              </dd>
              <dt class="text-surface-500 font-medium">Home</dt>
              <dd class="m-0 text-surface-800">
                <span
                  v-if="formatUsPhoneForDisplay(profile.person.homePhone)"
                  class="whitespace-nowrap inline-block"
                >
                  {{ formatUsPhoneForDisplay(profile.person.homePhone) }}
                </span>
                <span
                  v-else-if="profile.person.hasHomePhone"
                  v-tooltip.top="contactHiddenTooltip"
                  class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default"
                  role="img"
                  :aria-label="contactHiddenTooltip"
                >
                  <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                  <span>Phone on file</span>
                  <span class="inline-block h-3 w-20 rounded bg-surface-200" aria-hidden="true" />
                </span>
                <span v-else class="text-surface-400">—</span>
              </dd>
              <dt class="text-surface-500 font-medium">Address</dt>
              <dd class="m-0 text-surface-800 whitespace-normal">
                <template v-if="formatAddress(profile.person) !== '—'">
                  {{ formatAddress(profile.person) }}
                </template>
                <span
                  v-else-if="profile.person.hasAddressOnFile"
                  v-tooltip.top="contactHiddenTooltip"
                  class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default"
                  role="img"
                  :aria-label="contactHiddenTooltip"
                >
                  <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                  <span class="select-none blur-sm text-surface-500" aria-hidden="true">address on file</span>
                </span>
                <span v-else class="text-surface-400">—</span>
              </dd>
              <dt class="text-surface-500 font-medium">LinkedIn</dt>
              <dd class="m-0 text-surface-800">
                <a
                  v-if="linkedInHref"
                  :href="linkedInHref"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#6F8FAF] hover:underline break-all inline-flex items-center gap-1.5"
                >
                  <i class="pi pi-linkedin text-base shrink-0" aria-hidden="true" />
                  <span>View profile</span>
                </a>
                <span
                  v-else-if="profile.person.hasLinkedInOnFile"
                  v-tooltip.top="contactHiddenTooltip"
                  class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default"
                  role="img"
                  :aria-label="contactHiddenTooltip"
                >
                  <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                  <span class="select-none blur-sm text-surface-500" aria-hidden="true">profile link on file</span>
                </span>
                <span v-else class="text-surface-400">—</span>
              </dd>
            </dl>
          </template>
        </Card>


        <Card v-if="isMyProfile && !isLinkedToMe">
          <template #title>Who can see my contact info</template>
          <template #content>
            <Message severity="info" :closable="false" class="mb-4 w-full">
              Your login email matches this profile, but your account is not linked yet (no
              <code class="text-xs">personId</code>). Try signing out and back in. Until then you can only
              update visibility below; contact an administrator to edit address and phone.
            </Message>
            <p class="text-surface-600 text-sm m-0 mb-4">
              When each option is on, other signed-in chapter members who browse the directory can see that
              field. Guests only see names and roles, not contact info.
            </p>
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-surface-800 font-medium">Email</span>
                <ToggleSwitch v-model="privacyShareEmail" inputId="unlinked-share-email" />
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-surface-800 font-medium">Phone numbers</span>
                <ToggleSwitch v-model="privacySharePhones" inputId="unlinked-share-phones" />
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-surface-800 font-medium">Mailing address</span>
                <ToggleSwitch v-model="privacyShareAddress" inputId="unlinked-share-addr" />
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-surface-800 font-medium">LinkedIn</span>
                <ToggleSwitch v-model="privacyShareLinkedIn" inputId="unlinked-share-li" />
              </div>
            </div>
            <Button
              type="button"
              label="Save visibility"
              icon="pi pi-check"
              class="mt-5 bg-[#6F8FAF] hover:bg-[#5A7A9F]"
              :loading="privacySaving"
              :disabled="privacySaving"
              @click="savePrivacySettings"
            />
          </template>
        </Card>

        <Card>
          <template #title>Executive offices</template>
          <template #content>
            <p class="text-surface-600 text-sm m-0 mb-3">
              Chapter roles by term (for example President, Rush Chair). When your account is linked to this
              profile, open
              <span class="font-medium text-surface-800">Edit My Information</span>
              below to add, review, or remove offices you held.
            </p>
            <p v-if="profile.execHistory.length === 0" class="text-surface-600 m-0">
              No executive offices recorded.
            </p>
            <ul v-else class="m-0 list-none space-y-2 p-0">
              <li
                v-for="(row, idx) in profile.execHistory"
                :key="`${row.term.id}-${row.position.id}-${idx}`"
                class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-surface-800"
              >
                <span class="font-medium text-surface-900">{{ row.position.displayName }}</span>
                <span class="text-surface-600">· {{ termDisplayLabel(row.term) }}</span>
                <Tag v-if="row.term.isCurrent" value="Current term" severity="success" class="text-xs" />
              </li>
            </ul>
          </template>
        </Card>

        <Card>
          <template #title>Connections</template>
          <template #content>
            <p class="text-surface-600 text-sm m-0 mb-3">
              Help us document legacy and family relationships among members and parents at Alpha Nu. When
              your account is linked to this profile, open
              <span class="font-medium text-surface-800">Edit My Information</span>
              below to add, review, or remove connections.
            </p>
            <p v-if="profile.relationships.length === 0" class="text-surface-600 m-0">
              No connections listed.
            </p>
            <ul v-else class="m-0 list-none space-y-3 p-0">
              <li
                v-for="rel in profile.relationships"
                :key="rel.id"
                class="border-b border-surface-100 last:border-0 pb-3 last:pb-0"
              >
                <div class="flex flex-wrap items-start gap-2 min-w-0">
                  <template v-if="counterpartProfileLinkable(rel)">
                    <RouterLink
                      :to="{ name: 'person-profile', params: { id: rel.counterpart.id } }"
                      class="font-medium text-[#6F8FAF] hover:underline"
                    >
                      {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                    </RouterLink>
                  </template>
                  <span v-else class="font-medium text-surface-900">
                    {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                  </span>
                  <template v-if="rel.counterpart.pledgeClassYear != null">
                    <span class="text-surface-600">, PC {{ rel.counterpart.pledgeClassYear }}</span>
                  </template>
                  <span class="text-surface-700">, {{ rel.viewerCounterpartRoleLabel }}</span>
                  <span class="flex flex-wrap gap-1">
                    <Tag
                      v-for="tag in rel.connectionTags"
                      :key="tag"
                      :value="tag === 'legacy' ? 'Legacy' : 'Family'"
                      :severity="tag === 'legacy' ? 'secondary' : 'success'"
                      class="text-xs"
                    />
                  </span>
                </div>
                <p v-if="rel.notes?.trim()" class="text-surface-600 text-sm mt-1 mb-0">
                  {{ rel.notes.trim() }}
                </p>
              </li>
            </ul>
          </template>
        </Card>

        <Card>
          <template #title>Directory information</template>
          <template #content>
            <p class="text-surface-600 text-sm m-0 mb-4">
              {{ directoryInfoCardHint }}
            </p>
            <div class="flex flex-wrap items-center gap-3 mb-2">
              <span
                v-if="editMyInfoButtonDisabled"
                v-tooltip.top="editMyInfoDisabledTooltip"
                class="inline-block"
              >
                <Button
                  type="button"
                  label="Edit My Information"
                  icon="pi pi-pencil"
                  disabled
                  class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                  :aria-label="editMyInfoDisabledTooltip"
                />
              </span>
              <template v-else>
                <Button
                  v-if="!myDirectoryFormOpen"
                  type="button"
                  label="Edit My Information"
                  icon="pi pi-pencil"
                  class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                  @click="openMyDirectoryForm"
                />
                <Button
                  v-else
                  type="button"
                  label="Cancel editing"
                  icon="pi pi-times"
                  severity="secondary"
                  outlined
                  :disabled="myProfileSaving"
                  @click="cancelMyDirectoryForm"
                />
              </template>
            </div>

            <form
              v-if="myDirectoryFormOpen && isLinkedToMe"
              class="flex flex-col gap-4 border-t border-surface-200 pt-4 mt-2"
              @submit.prevent="saveMyDirectoryProfile"
            >
              <p class="text-surface-600 text-sm m-0">
                Changes apply to your chapter directory listing. Visibility toggles control what other
                signed-in members see; guests never see contact details.
              </p>

              <div
                class="rounded-lg border border-surface-200 bg-surface-50/90 p-4 flex flex-col gap-3"
              >
                <div class="flex flex-col gap-1">
                  <h4 class="text-sm font-semibold text-surface-900 m-0">Profile photo (optional)</h4>
                  <p class="text-surface-600 text-sm m-0 leading-relaxed">
                    This is the picture on your directory profile—meant to look like you
                    <span class="font-medium text-surface-800">now</span>. If you held an executive office, you
                    can add a separate era photo for the roster in the section below.
                  </p>
                </div>
                <div class="flex flex-wrap items-start gap-4">
                  <div
                    v-if="profile.headshotUrl"
                    class="exec-roster-thumb-preview shrink-0 overflow-hidden bg-surface-200 ring-1 ring-surface-300"
                  >
                    <img
                      :src="profile.headshotUrl"
                      :alt="`Profile photo for ${profile.person.firstName} ${profile.person.lastName}`"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <div class="flex flex-col gap-2 min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        :label="profile.person.hasProfileHeadshot ? 'Replace profile photo' : 'Upload profile photo'"
                        icon="pi pi-upload"
                        size="small"
                        severity="secondary"
                        outlined
                        :loading="!!profileHeadshotUploading"
                        :disabled="!!profileHeadshotUploading || !!profileHeadshotClearing"
                        @click="triggerProfileHeadshotPick"
                      />
                      <Button
                        v-if="profile.person.hasProfileHeadshot"
                        type="button"
                        label="Remove profile photo"
                        icon="pi pi-times"
                        size="small"
                        severity="danger"
                        text
                        :loading="!!profileHeadshotClearing"
                        :disabled="!!profileHeadshotUploading || !!profileHeadshotClearing"
                        @click="confirmRemoveProfileHeadshot"
                      />
                    </div>
                    <p class="text-surface-500 text-xs m-0">JPEG, PNG, WebP, or GIF · up to 10&nbsp;MB</p>
                  </div>
                  <input
                    ref="profileHeadshotInputRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    class="hidden"
                    @change="onProfileHeadshotFile"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="me-first" class="font-medium text-surface-800 text-sm">First name</label>
                  <InputText
                    id="me-first"
                    v-model="editFirstName"
                    class="w-full"
                    :class="{ 'p-invalid': editFieldErrors.firstName }"
                  />
                  <small v-if="editFieldErrors.firstName" class="p-error">{{ editFieldErrors.firstName }}</small>
                </div>
                <div class="flex flex-col gap-2">
                  <label for="me-last" class="font-medium text-surface-800 text-sm">Last name</label>
                  <InputText
                    id="me-last"
                    v-model="editLastName"
                    class="w-full"
                    :class="{ 'p-invalid': editFieldErrors.lastName }"
                  />
                  <small v-if="editFieldErrors.lastName" class="p-error">{{ editFieldErrors.lastName }}</small>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label for="me-addr" class="font-medium text-surface-800 text-sm">Street address</label>
                <InputText id="me-addr" v-model="editAddressLine1" class="w-full" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="me-city" class="font-medium text-surface-800 text-sm">City</label>
                  <InputText id="me-city" v-model="editCity" class="w-full" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="me-state" class="font-medium text-surface-800 text-sm">State</label>
                  <Select
                    id="me-state"
                    v-model="editState"
                    :options="US_STATE_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    filter
                    filterPlaceholder="Search"
                    placeholder="Optional"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="me-zip" class="font-medium text-surface-800 text-sm">ZIP</label>
                  <InputText id="me-zip" v-model="editZip" class="w-full" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="me-mobile" class="font-medium text-surface-800 text-sm">Mobile phone</label>
                  <InputText id="me-mobile" v-model="editMobilePhone" class="w-full" />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="me-home" class="font-medium text-surface-800 text-sm">Home phone</label>
                  <InputText id="me-home" v-model="editHomePhone" class="w-full" />
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label for="me-li" class="font-medium text-surface-800 text-sm">LinkedIn URL</label>
                <InputText
                  id="me-li"
                  v-model="editLinkedin"
                  type="url"
                  placeholder="https://www.linkedin.com/in/…"
                  class="w-full"
                  :class="{ 'p-invalid': editFieldErrors.linkedin }"
                />
                <small v-if="editFieldErrors.linkedin" class="p-error">{{ editFieldErrors.linkedin }}</small>
                <small v-else class="text-surface-500 text-xs">Leave blank to remove.</small>
              </div>
              <div v-if="profile.person.isMember" class="flex flex-col gap-2 max-w-xs">
                <label for="me-pledge" class="font-medium text-surface-800 text-sm">Pledge class year</label>
                <InputNumber
                  id="me-pledge"
                  v-model="editPledgeYear"
                  :useGrouping="false"
                  :min="1900"
                  :max="2100"
                  placeholder="Optional"
                  class="w-full"
                  :class="{ 'p-invalid': editFieldErrors.pledge }"
                />
                <small v-if="editFieldErrors.pledge" class="p-error">{{ editFieldErrors.pledge }}</small>
              </div>

              <div class="border-t border-surface-200 pt-4 flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                  <p class="font-medium text-surface-800 m-0">
                    The following information is not visible to the general public.
                  </p>
                  <p class="text-surface-600 text-sm m-0">
                    Switches default to on so other signed-in chapter members can see each item. Turn a switch
                    off to hide that item from members (guests never see these fields either way).
                  </p>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-surface-800">Email</span>
                  <ToggleSwitch v-model="privacyShareEmail" inputId="me-share-email" />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-surface-800">Phone numbers</span>
                  <ToggleSwitch v-model="privacySharePhones" inputId="me-share-phones" />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-surface-800">Mailing address</span>
                  <ToggleSwitch v-model="privacyShareAddress" inputId="me-share-addr" />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-surface-800">LinkedIn</span>
                  <ToggleSwitch v-model="privacyShareLinkedIn" inputId="me-share-li" />
                </div>
              </div>

              <div
                v-if="profile.person.isMember"
                class="border-t border-surface-200 pt-4 flex flex-col gap-4"
              >
                <div>
                  <h3 class="text-base font-semibold text-surface-900 m-0 mb-1">Add an office held</h3>
                  <p class="text-surface-600 text-sm m-0">
                    Help us build out our records of past officers at Alpha Nu. If you held an office during
                    your time at the house, please add your information by selecting the term and the office
                    you held (you can add multiple). If you don't see your term in the dropdown list, choose
                    the last option and enter the year and Fall or Spring to create that term.
                  </p>
                </div>

                <div
                  class="rounded-lg border border-surface-200 bg-surface-50/90 p-4 flex flex-col gap-3"
                >
                  <div class="flex flex-col gap-1">
                    <h4 class="text-sm font-semibold text-surface-900 m-0">Photo for the executive roster (optional)</h4>
                    <p class="text-surface-600 text-sm m-0 leading-relaxed">
                      If you don't have a roster photo on file yet, upload one we can show next to your name when
                      you're listed as an officer. Ideally, pick a picture of yourself from back in the day at
                      the house—though a current photo is fine too.
                    </p>
                  </div>
                  <div class="flex flex-wrap items-start gap-4">
                    <div
                      v-if="profile.execRosterHeadshotUrl"
                      class="exec-roster-thumb-preview shrink-0 overflow-hidden bg-surface-200 ring-1 ring-surface-300"
                    >
                      <img
                        :src="profile.execRosterHeadshotUrl"
                        :alt="`Roster photo for ${profile.person.firstName} ${profile.person.lastName}`"
                        class="h-full w-full object-cover"
                      />
                    </div>
                    <div class="flex flex-col gap-2 min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          :label="
                            profile.person.hasExecRosterHeadshot ? 'Replace roster photo' : 'Upload roster photo'
                          "
                          icon="pi pi-upload"
                          size="small"
                          severity="secondary"
                          outlined
                          :loading="!!execRosterHeadshotUploading"
                          :disabled="!!execRosterHeadshotUploading || !!execRosterHeadshotClearing"
                          @click="triggerExecRosterHeadshotPick"
                        />
                        <Button
                          v-if="profile.person.hasExecRosterHeadshot"
                          type="button"
                          label="Remove roster photo"
                          icon="pi pi-times"
                          size="small"
                          severity="danger"
                          text
                          :loading="!!execRosterHeadshotClearing"
                          :disabled="!!execRosterHeadshotUploading || !!execRosterHeadshotClearing"
                          @click="confirmRemoveExecRosterHeadshot"
                        />
                      </div>
                      <p class="text-surface-500 text-xs m-0">JPEG, PNG, WebP, or GIF · up to 10&nbsp;MB</p>
                    </div>
                    <input
                      ref="execRosterHeadshotInputRef"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                      class="hidden"
                      @change="onExecRosterHeadshotFile"
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <p class="font-medium text-surface-800 text-sm m-0">Your current offices</p>
                  <p v-if="profile.execHistory.length === 0" class="text-surface-600 text-sm m-0">
                    None yet — add one below.
                  </p>
                  <ul v-else class="m-0 list-none space-y-2 p-0">
                    <li
                      v-for="(row, idx) in profile.execHistory"
                      :key="`edit-exec-${row.term.id}-${row.position.id}-${idx}`"
                      class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-surface-800 justify-between border-b border-surface-100 last:border-0 pb-2 last:pb-0"
                    >
                      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
                        <span class="font-medium text-surface-900">{{ row.position.displayName }}</span>
                        <span class="text-surface-600">· {{ termDisplayLabel(row.term) }}</span>
                        <Tag
                          v-if="row.term.isCurrent"
                          value="Current term"
                          severity="success"
                          class="text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        icon="pi pi-times"
                        severity="danger"
                        rounded
                        text
                        size="small"
                        class="shrink-0 !h-7 !min-h-0 !p-0 w-7"
                        v-tooltip.top="'Remove this office from my profile'"
                        :disabled="!!execOfficeRemovingKey"
                        :loading="execOfficeRemovingKey === execOfficeRowKey(row)"
                        @click="confirmRemoveExecOffice(row)"
                      />
                    </li>
                  </ul>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-end">
                  <div class="flex flex-col gap-2 md:col-span-2">
                    <label for="profile-exec-term" class="font-medium text-surface-800 text-sm">Term</label>
                    <Select
                      id="profile-exec-term"
                      v-model="execOfficeTermChoice"
                      :options="execOfficeTermSelectOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select a term"
                      showClear
                      class="w-full"
                      :disabled="!!execOfficeSaving"
                    />
                  </div>
                  <template v-if="execOfficeTermChoice === EXEC_NEW_TERM_VALUE">
                    <div class="flex flex-col gap-2">
                      <label for="profile-exec-year" class="font-medium text-surface-800 text-sm">Year</label>
                      <InputNumber
                        id="profile-exec-year"
                        v-model="execOfficeNewYear"
                        :useGrouping="false"
                        :min="1990"
                        :max="2100"
                        class="w-full"
                        :disabled="!!execOfficeSaving"
                      />
                    </div>
                    <div class="flex flex-col gap-2">
                      <label for="profile-exec-season" class="font-medium text-surface-800 text-sm">Season</label>
                      <Select
                        id="profile-exec-season"
                        v-model="execOfficeNewSeason"
                        :options="EXEC_SEASON_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        :disabled="!!execOfficeSaving"
                      />
                    </div>
                  </template>
                  <div class="flex flex-col gap-2 md:col-span-2">
                    <label for="profile-exec-position" class="font-medium text-surface-800 text-sm"
                      >Office</label
                    >
                    <Select
                      id="profile-exec-position"
                      v-model="execOfficePositionId"
                      :options="execPositionSelectOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select office"
                      filter
                      filterPlaceholder="Search"
                      class="w-full"
                      :disabled="!!execOfficeSaving || execPositionsList.length === 0"
                    />
                  </div>
                  <div class="md:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      label="Add office"
                      icon="pi pi-check"
                      class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                      :loading="!!execOfficeSaving"
                      :disabled="!canSubmitExecOfficeAdd || !!execOfficeSaving"
                      @click="submitProfileAddExecOffice"
                    />
                  </div>
                </div>
              </div>

              <div class="border-t border-surface-200 pt-4 flex flex-col gap-4">
                <div>
                  <h3 class="text-base font-semibold text-surface-900 m-0 mb-1">Add a connection</h3>
                  <p class="text-surface-600 text-sm m-0">
                    Help us identify your legacy and family relationships among members and parents at Alpha Nu.
                    Search the directory for the other person, then choose how they relate to you (e.g. dad,
                    grandfather, parent, etc.).
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <p class="font-medium text-surface-800 text-sm m-0">Your current connections</p>
                  <p v-if="profile.relationships.length === 0" class="text-surface-600 text-sm m-0">
                    None yet — add one below.
                  </p>
                  <ul v-else class="m-0 list-none space-y-3 p-0">
                    <li
                      v-for="rel in profile.relationships"
                      :key="rel.id"
                      class="border-b border-surface-100 last:border-0 pb-3 last:pb-0"
                    >
                      <div class="flex flex-wrap items-start gap-2 justify-between">
                        <div class="flex flex-wrap items-start gap-2 min-w-0">
                          <template v-if="counterpartProfileLinkable(rel)">
                            <RouterLink
                              :to="{ name: 'person-profile', params: { id: rel.counterpart.id } }"
                              class="font-medium text-[#6F8FAF] hover:underline"
                            >
                              {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                            </RouterLink>
                          </template>
                          <span v-else class="font-medium text-surface-900">
                            {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                          </span>
                          <template v-if="rel.counterpart.pledgeClassYear != null">
                            <span class="text-surface-600">, PC {{ rel.counterpart.pledgeClassYear }}</span>
                          </template>
                          <span class="text-surface-700">, {{ rel.viewerCounterpartRoleLabel }}</span>
                          <span class="flex flex-wrap gap-1">
                            <Tag
                              v-for="tag in rel.connectionTags"
                              :key="tag"
                              :value="tag === 'legacy' ? 'Legacy' : 'Family'"
                              :severity="tag === 'legacy' ? 'secondary' : 'success'"
                              class="text-xs"
                            />
                          </span>
                        </div>
                        <Button
                          type="button"
                          icon="pi pi-times"
                          severity="danger"
                          rounded
                          text
                          size="small"
                          class="shrink-0 !h-7 !min-h-0 !p-0 w-7"
                          v-tooltip.top="'Remove connection'"
                          :disabled="!!removingProfileRelId"
                          :loading="removingProfileRelId === rel.id"
                          @click="confirmRemoveProfileConnection(rel)"
                        />
                      </div>
                      <p v-if="rel.notes?.trim()" class="text-surface-600 text-sm mt-1 mb-0">
                        {{ rel.notes.trim() }}
                      </p>
                    </li>
                  </ul>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-end">
                  <div class="flex flex-col gap-2">
                    <label for="profile-conn-person" class="font-medium text-surface-800 text-sm"
                      >Other person</label
                    >
                    <Select
                      id="profile-conn-person"
                      v-model="profileConnectionOtherId"
                      :options="profileConnectionSelectOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select from directory"
                      filter
                      filterPlaceholder="Search name or email"
                      class="w-full"
                      :disabled="!!profileAddSaving"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label for="profile-conn-type" class="font-medium text-surface-800 text-sm"
                      >Relation to you</label
                    >
                    <Select
                      id="profile-conn-type"
                      v-model="profileConnectionType"
                      :options="PERSON_RELATIONSHIP_TYPE_OPTIONS"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="They are your..."
                      showClear
                      filter
                      class="w-full"
                      :disabled="!!profileAddSaving"
                    />
                  </div>
                  <div class="md:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      label="Add connection"
                      icon="pi pi-check"
                      class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                      :loading="!!profileAddSaving"
                      :disabled="!profileConnectionOtherId || !!profileAddSaving"
                      @click="submitProfileAddConnection"
                    />
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  label="Save my profile"
                  icon="pi pi-check"
                  class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                  :loading="myProfileSaving"
                  :disabled="myProfileSaving"
                />
              </div>
            </form>
          </template>
        </Card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { usePeopleStore } from '@/stores/people'
import { usePersonRelationshipsStore } from '@/stores/personRelationships'
import { PERSON_RELATIONSHIP_TYPE_OPTIONS } from '@/constants/relationshipTypes'
import type { AxiosError } from 'axios'
import apiClient, { isAxiosRejection } from '@/services/api'
import type { PersonProfileResponse, PersonExecHistoryEntry } from '@/types/personProfile'
import type { PersonResponse, UpdatePersonPayload } from '@/types/person'
import type { PersonRelationshipResponse } from '@/types/personRelationship'
import type { ExecPositionPublic, ExecTermPublic } from '@/types/execTeam'
import { formatUsPhoneForDisplay } from '@/utils/usPhone'
import { directoryContactHiddenTooltip } from '@/utils/directoryPrivacy'
import { useAuthStore } from '@/stores/auth'
import { US_STATE_OPTIONS, US_STATE_CODE_SET, normalizeUsStateForSelect } from '@/constants/usStates'

const EXEC_NEW_TERM_VALUE = '__new__' as const

const EXEC_SEASON_OPTIONS = [
  { label: 'Fall', value: 'fall' as const },
  { label: 'Spring', value: 'spring' as const },
]

const route = useRoute()
const router = useRouter()
const peopleStore = usePeopleStore()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const personRelStore = usePersonRelationshipsStore()

const contactHiddenTooltip = computed(() =>
  directoryContactHiddenTooltip(authStore.isAuthenticated),
)

const loading = ref(true)
const loadError = ref<string | null>(null)
const profile = ref<PersonProfileResponse | null>(null)

const linkedInHref = computed(() => {
  const raw = profile.value?.person.linkedinProfileUrl?.trim()
  if (!raw) return ''
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.href
  } catch {
    return ''
  }
})

const isMyProfile = computed(() => {
  const u = authStore.user
  const p = profile.value?.person
  if (!u || !p || !authStore.isAuthenticated) return false
  if (u.personId && u.personId === p.id) return true
  const pe = p.email?.trim().toLowerCase()
  if (pe && u.email?.trim().toLowerCase() === pe) return true
  return false
})

/** Same check as backend: linked `users.personId` required to edit contact fields. */
const isLinkedToMe = computed(() => {
  const u = authStore.user
  const p = profile.value?.person
  return !!(u?.personId && p && authStore.isAuthenticated && u.personId === p.id)
})

const editMyInfoButtonDisabled = computed(() => !isLinkedToMe.value)

const editMyInfoDisabledTooltip = computed(() => {
  if (isLinkedToMe.value) return ''
  if (!authStore.isAuthenticated) {
    return 'Sign in to edit your directory profile. Your account must be linked to this profile (same person record).'
  }
  if (isMyProfile.value && !isLinkedToMe.value) {
    return 'Your account is not linked to this profile yet. Try signing out and back in, or contact an administrator. Until then you can only change visibility below.'
  }
  return 'Only the member or parent who owns this profile can edit this information.'
})

const profileConnectionSelectOptions = computed(() => {
  const me = profile.value?.person.id
  if (!me) return []
  return peopleStore.list
    .filter((p) => p.id !== me)
    .map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}${p.email ? ` · ${p.email}` : ''}`.trim(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const directoryInfoCardHint = computed(() => {
  if (isLinkedToMe.value) {
    return 'Use Edit My Information when you want to change your listing or who can see each part of it.'
  }
  if (!authStore.isAuthenticated) {
    return 'If this is your profile, sign in to edit your information once your account is linked to this directory entry.'
  }
  if (isMyProfile.value && !isLinkedToMe.value) {
    return 'Your login matches this profile, but your account must finish linking before you can edit contact details. You can still change visibility in the section below.'
  }
  return 'Only the person who owns this directory profile can edit their information here.'
})

const myDirectoryFormOpen = ref(false)

const leaveEditDialogVisible = ref(false)
/** Resolves `true` to allow navigation, `false` to stay. */
let routeLeaveResolver: ((allow: boolean) => void) | null = null

const profileConnectionOtherId = ref('')
const profileConnectionType = ref<string | null>(null)
const profileAddSaving = ref(false)
const removingProfileRelId = ref<string | null>(null)

const execPositionsList = ref<ExecPositionPublic[]>([])
const execTermsList = ref<ExecTermPublic[]>([])
const execOfficeTermChoice = ref<string | null>(null)
const execOfficeNewYear = ref<number>(new Date().getFullYear())
const execOfficeNewSeason = ref<'fall' | 'spring'>('spring')
const execOfficePositionId = ref<string | null>(null)
const execOfficeSaving = ref(false)
const execOfficeRemovingKey = ref<string | null>(null)

const profileHeadshotInputRef = ref<HTMLInputElement | null>(null)
const profileHeadshotUploading = ref(false)
const profileHeadshotClearing = ref(false)

const execRosterHeadshotInputRef = ref<HTMLInputElement | null>(null)
const execRosterHeadshotUploading = ref(false)
const execRosterHeadshotClearing = ref(false)

const execOfficeTermSelectOptions = computed(() => {
  const sorted = [...execTermsList.value].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.season.localeCompare(a.season)
  })
  const fromTerms = sorted.map((t) => ({
    label: termDisplayLabel(t),
    value: t.id,
  }))
  return [
    ...fromTerms,
    {
      label: 'Term not created yet — add Fall/Spring & year',
      value: EXEC_NEW_TERM_VALUE,
    },
  ]
})

const execPositionSelectOptions = computed(() =>
  [...execPositionsList.value]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({ label: p.displayName, value: p.id })),
)

function execOfficeRowKey(row: PersonExecHistoryEntry): string {
  return `${row.term.year}-${row.term.season}-${row.position.id}`
}

function resolveExecOfficeYearSeason(): { year: number; season: 'fall' | 'spring' } | null {
  const choice = execOfficeTermChoice.value
  if (!choice) return null
  if (choice === EXEC_NEW_TERM_VALUE) {
    const y = execOfficeNewYear.value
    if (y == null || y < 1990 || y > 2100) return null
    return { year: y, season: execOfficeNewSeason.value }
  }
  const t = execTermsList.value.find((x) => x.id === choice)
  return t ? { year: t.year, season: t.season } : null
}

const canSubmitExecOfficeAdd = computed(() => {
  if (!execOfficePositionId.value) return false
  return resolveExecOfficeYearSeason() != null
})

const privacySaving = ref(false)
const myProfileSaving = ref(false)
const privacyShareEmail = ref(true)
const privacySharePhones = ref(true)
const privacyShareAddress = ref(true)
const privacyShareLinkedIn = ref(true)

const editFirstName = ref('')
const editLastName = ref('')
const editAddressLine1 = ref('')
const editCity = ref('')
const editState = ref('')
const editZip = ref('')
const editMobilePhone = ref('')
const editHomePhone = ref('')
const editLinkedin = ref('')
const editPledgeYear = ref<number | null>(null)

const editFieldErrors = ref({
  firstName: '',
  lastName: '',
  linkedin: '',
  pledge: '',
})

function clearEditFieldErrors() {
  editFieldErrors.value = { firstName: '', lastName: '', linkedin: '', pledge: '' }
}

function hydratePrivacySharesFromPerson(person: PersonResponse) {
  privacyShareEmail.value = person.shareEmailWithLoggedInMembers ?? true
  privacySharePhones.value = person.sharePhonesWithLoggedInMembers ?? true
  privacyShareAddress.value = person.shareAddressWithLoggedInMembers ?? true
  privacyShareLinkedIn.value = person.shareLinkedInWithLoggedInMembers ?? true
}

function hydrateContactEditFieldsFromPerson(person: PersonResponse) {
  editFirstName.value = person.firstName
  editLastName.value = person.lastName
  editAddressLine1.value = person.addressLine1 ?? ''
  editCity.value = person.city ?? ''
  editState.value = normalizeUsStateForSelect(person.state)
  editZip.value = person.zip ?? ''
  editMobilePhone.value = formatUsPhoneForDisplay(person.mobilePhone ?? '')
  editHomePhone.value = formatUsPhoneForDisplay(person.homePhone ?? '')
  editLinkedin.value = person.linkedinProfileUrl ?? ''
  editPledgeYear.value = person.pledgeClassYear ?? null
  clearEditFieldErrors()
}

function resetProfileConnectionForm() {
  profileConnectionOtherId.value = ''
  profileConnectionType.value = null
}

function resetExecOfficeForm(): void {
  execOfficeTermChoice.value = null
  execOfficeNewYear.value = new Date().getFullYear()
  execOfficeNewSeason.value = 'spring'
  execOfficePositionId.value = null
}

async function loadExecMetaForProfile(): Promise<void> {
  try {
    const [posRes, termsRes] = await Promise.all([
      apiClient.get<ExecPositionPublic[]>('/exec-team/positions'),
      apiClient.get<ExecTermPublic[]>('/exec-team/terms'),
    ])
    execPositionsList.value = Array.isArray(posRes.data) ? posRes.data : []
    execTermsList.value = Array.isArray(termsRes.data) ? termsRes.data : []
  } catch {
    execPositionsList.value = []
    execTermsList.value = []
    execOfficeTermChoice.value = null
  }
}

async function openMyDirectoryForm() {
  if (!isLinkedToMe.value) return
  const p = profile.value?.person
  if (p) hydrateContactEditFieldsFromPerson(p)
  void peopleStore.fetchPeople({ silent: true })
  await loadExecMetaForProfile()
  resetExecOfficeForm()
  myDirectoryFormOpen.value = true
}

function cancelMyDirectoryForm() {
  myDirectoryFormOpen.value = false
  resetProfileConnectionForm()
  resetExecOfficeForm()
  const p = profile.value?.person
  if (p && isLinkedToMe.value) {
    hydratePrivacySharesFromPerson(p)
    hydrateContactEditFieldsFromPerson(p)
  }
}

async function refreshProfileRelationships() {
  const pid = profile.value?.person.id
  if (!pid) return
  const relationships = await personRelStore.fetchForPerson(pid)
  if (profile.value) {
    profile.value = { ...profile.value, relationships }
  }
}

async function submitProfileAddConnection() {
  const pid = profile.value?.person.id
  if (!pid || !profileConnectionOtherId.value) return
  profileAddSaving.value = true
  try {
    await personRelStore.create(pid, {
      otherPersonId: profileConnectionOtherId.value,
      direction: 'other_is_from',
      relationshipType: profileConnectionType.value || null,
    })
    await refreshProfileRelationships()
    resetProfileConnectionForm()
    toast.add({
      severity: 'success',
      summary: 'Added',
      detail: 'Connection added.',
      life: 3500,
    })
  } catch (err: unknown) {
    if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not add connection (it may already exist).',
        life: 5000,
      })
    }
  } finally {
    profileAddSaving.value = false
  }
}

function confirmRemoveProfileConnection(rel: PersonRelationshipResponse) {
  const pid = profile.value?.person.id
  if (!pid) return
  const cn = `${rel.counterpart.firstName} ${rel.counterpart.lastName}`.trim()
  confirm.require({
    message: `Remove the connection with ${cn}?`,
    header: 'Remove connection',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => {
      void runRemoveProfileConnection(pid, rel.id)
    },
  })
}

async function runRemoveProfileConnection(personId: string, relationshipId: string) {
  removingProfileRelId.value = relationshipId
  try {
    await personRelStore.remove(personId, relationshipId)
    await refreshProfileRelationships()
    toast.add({
      severity: 'success',
      summary: 'Removed',
      detail: 'Connection removed.',
      life: 3500,
    })
  } catch (err: unknown) {
    if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not remove connection.',
        life: 5000,
      })
    }
  } finally {
    removingProfileRelId.value = null
  }
}

function apiErrorDetail(err: unknown, fallback: string): string {
  if (!isAxiosRejection(err)) return fallback
  const d = (err as AxiosError<{ message?: string | string[] }>).response?.data
  const m = d?.message
  if (Array.isArray(m)) return m.join(', ')
  if (typeof m === 'string' && m.trim()) return m
  return fallback
}

function triggerProfileHeadshotPick() {
  profileHeadshotInputRef.value?.click()
}

async function onProfileHeadshotFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const pid = profile.value?.person.id
  if (!file || !pid) return

  profileHeadshotUploading.value = true
  try {
    await peopleStore.uploadProfileHeadshot(pid, file)
    profile.value = await peopleStore.fetchPersonProfile(pid)
    toast.add({
      severity: 'success',
      summary: 'Photo saved',
      detail: 'Your profile photo was updated.',
      life: 3500,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Upload failed',
      detail: 'Could not upload that image. Try a JPEG or PNG under 10 MB.',
      life: 5000,
    })
  } finally {
    profileHeadshotUploading.value = false
  }
}

function confirmRemoveProfileHeadshot() {
  const pid = profile.value?.person.id
  if (!pid) return
  confirm.require({
    message:
      'Remove your profile photo? Your directory profile will show no picture until you upload a new one.',
    header: 'Remove profile photo',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => {
      void runRemoveProfileHeadshot(pid)
    },
  })
}

async function runRemoveProfileHeadshot(personId: string) {
  profileHeadshotClearing.value = true
  try {
    await peopleStore.clearProfileHeadshot(personId)
    profile.value = await peopleStore.fetchPersonProfile(personId)
    toast.add({
      severity: 'success',
      summary: 'Removed',
      detail: 'Your profile photo was removed.',
      life: 3500,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not remove the photo.',
      life: 5000,
    })
  } finally {
    profileHeadshotClearing.value = false
  }
}

function triggerExecRosterHeadshotPick() {
  execRosterHeadshotInputRef.value?.click()
}

async function onExecRosterHeadshotFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const pid = profile.value?.person.id
  if (!file || !pid) return

  execRosterHeadshotUploading.value = true
  try {
    await peopleStore.uploadExecRosterHeadshot(pid, file)
    profile.value = await peopleStore.fetchPersonProfile(pid)
    toast.add({
      severity: 'success',
      summary: 'Photo saved',
      detail: 'Your executive roster photo was updated.',
      life: 3500,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Upload failed',
      detail: 'Could not upload that image. Try a JPEG or PNG under 10 MB.',
      life: 5000,
    })
  } finally {
    execRosterHeadshotUploading.value = false
  }
}

function confirmRemoveExecRosterHeadshot() {
  const pid = profile.value?.person.id
  if (!pid) return
  confirm.require({
    message:
      'Remove your executive roster photo? The roster will show no image for you until you upload a new one.',
    header: 'Remove roster photo',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => {
      void runRemoveExecRosterHeadshot(pid)
    },
  })
}

async function runRemoveExecRosterHeadshot(personId: string) {
  execRosterHeadshotClearing.value = true
  try {
    await peopleStore.clearExecRosterHeadshot(personId)
    profile.value = await peopleStore.fetchPersonProfile(personId)
    toast.add({
      severity: 'success',
      summary: 'Removed',
      detail: 'Your executive roster photo was removed.',
      life: 3500,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not remove the photo.',
      life: 5000,
    })
  } finally {
    execRosterHeadshotClearing.value = false
  }
}

async function submitProfileAddExecOffice() {
  const prof = profile.value
  const pid = prof?.person.id
  if (!pid || !prof.person.isMember || !canSubmitExecOfficeAdd.value) return
  const ys = resolveExecOfficeYearSeason()
  const posId = execOfficePositionId.value
  if (!ys || !posId) return

  const dup = prof.execHistory.some(
    (r) => r.position.id === posId && r.term.year === ys.year && r.term.season === ys.season,
  )
  if (dup) {
    toast.add({
      severity: 'info',
      summary: 'Already listed',
      detail: 'That office for that term is already on your profile.',
      life: 4000,
    })
    return
  }

  execOfficeSaving.value = true
  try {
    await apiClient.post('/exec-team/my-exec-assignment', {
      positionId: posId,
      year: ys.year,
      season: ys.season,
    })
    profile.value = await peopleStore.fetchPersonProfile(pid)
    await loadExecMetaForProfile()
    execOfficePositionId.value = null
    toast.add({
      severity: 'success',
      summary: 'Added',
      detail: 'Executive office saved.',
      life: 3500,
    })
  } catch (err: unknown) {
    if (isAxiosRejection(err) && (err as AxiosError).response?.status === 409) {
      toast.add({
        severity: 'warn',
        summary: 'Could not add',
        detail: apiErrorDetail(err, 'That office is already assigned for this term.'),
        life: 8000,
      })
    } else if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: apiErrorDetail(err, 'Could not add executive office.'),
        life: 5000,
      })
    }
  } finally {
    execOfficeSaving.value = false
  }
}

function confirmRemoveExecOffice(row: PersonExecHistoryEntry) {
  const pid = profile.value?.person.id
  if (!pid) return
  const office = row.position.displayName
  const term = termDisplayLabel(row.term)
  confirm.require({
    message: `Remove ${office} (${term}) from your profile? The roster slot stays; others can be assigned by an administrator.`,
    header: 'Remove office',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => {
      void runRemoveExecOffice(pid, row)
    },
  })
}

async function runRemoveExecOffice(personId: string, row: PersonExecHistoryEntry) {
  const key = execOfficeRowKey(row)
  execOfficeRemovingKey.value = key
  try {
    await apiClient.delete('/exec-team/my-exec-assignment', {
      data: {
        positionId: row.position.id,
        year: row.term.year,
        season: row.term.season,
      },
    })
    profile.value = await peopleStore.fetchPersonProfile(personId)
    await loadExecMetaForProfile()
    toast.add({
      severity: 'success',
      summary: 'Removed',
      detail: 'Office removed from your profile.',
      life: 3500,
    })
  } catch (err: unknown) {
    if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: apiErrorDetail(err, 'Could not remove that office.'),
        life: 5000,
      })
    }
  } finally {
    execOfficeRemovingKey.value = null
  }
}

watch(
  () => ({ person: profile.value?.person, linked: isLinkedToMe.value }),
  ({ person, linked }) => {
    if (!person) return
    hydratePrivacySharesFromPerson(person)
    if (linked) {
      hydrateContactEditFieldsFromPerson(person)
    }
  },
  { immediate: true },
)

watch(
  () => route.params.id,
  () => {
    myDirectoryFormOpen.value = false
    resetProfileConnectionForm()
    resetExecOfficeForm()
  },
)

watch(isLinkedToMe, (linked) => {
  if (!linked) myDirectoryFormOpen.value = false
})

async function savePrivacySettings() {
  const id = profile.value?.person.id
  if (!id) return
  privacySaving.value = true
  try {
    const person = await peopleStore.updatePerson(id, {
      shareEmailWithLoggedInMembers: privacyShareEmail.value,
      sharePhonesWithLoggedInMembers: privacySharePhones.value,
      shareAddressWithLoggedInMembers: privacyShareAddress.value,
      shareLinkedInWithLoggedInMembers: privacyShareLinkedIn.value,
    })
    if (profile.value) {
      profile.value = { ...profile.value, person }
    }
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Visibility settings updated.', life: 3500 })
  } finally {
    privacySaving.value = false
  }
}

function validateMyDirectoryForm(): boolean {
  clearEditFieldErrors()
  let ok = true
  if (!editFirstName.value.trim()) {
    editFieldErrors.value.firstName = 'First name is required'
    ok = false
  }
  if (!editLastName.value.trim()) {
    editFieldErrors.value.lastName = 'Last name is required'
    ok = false
  }
  const li = editLinkedin.value.trim()
  if (li) {
    try {
      const u = new URL(li)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        editFieldErrors.value.linkedin = 'Use a link starting with http:// or https://'
        ok = false
      }
    } catch {
      editFieldErrors.value.linkedin = 'Enter a valid URL'
      ok = false
    }
  }
  if (profile.value?.person.isMember && editPledgeYear.value != null) {
    const y = editPledgeYear.value
    if (y < 1900 || y > 2100) {
      editFieldErrors.value.pledge = 'Year must be between 1900 and 2100'
      ok = false
    }
  }
  if (editState.value && !US_STATE_CODE_SET.has(editState.value)) {
    ok = false
    toast.add({
      severity: 'error',
      summary: 'Invalid state',
      detail: 'Choose a valid state from the list or clear it.',
      life: 5000,
    })
  }
  return ok
}

/** Persists directory form + visibility toggles. Returns whether the API save succeeded. */
async function runDirectoryProfileSave(): Promise<boolean> {
  const id = profile.value?.person.id
  if (!id || !validateMyDirectoryForm()) return false
  myProfileSaving.value = true
  try {
    const p = profile.value!.person
    const payload: UpdatePersonPayload = {
      firstName: editFirstName.value.trim(),
      lastName: editLastName.value.trim(),
      addressLine1: editAddressLine1.value.trim() || null,
      city: editCity.value.trim() || null,
      state:
        editState.value && US_STATE_CODE_SET.has(editState.value)
          ? editState.value.trim().toUpperCase()
          : null,
      zip: editZip.value.trim() || null,
      linkedinProfileUrl: editLinkedin.value.trim() ? editLinkedin.value.trim() : null,
      mobilePhone: editMobilePhone.value.trim() || null,
      homePhone: editHomePhone.value.trim() || null,
      shareEmailWithLoggedInMembers: privacyShareEmail.value,
      sharePhonesWithLoggedInMembers: privacySharePhones.value,
      shareAddressWithLoggedInMembers: privacyShareAddress.value,
      shareLinkedInWithLoggedInMembers: privacyShareLinkedIn.value,
    }
    if (p.isMember) {
      payload.pledgeClassYear = editPledgeYear.value
    }
    const person = await peopleStore.updatePerson(id, payload)
    if (profile.value) {
      profile.value = { ...profile.value, person }
    }
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Your directory profile was updated.',
      life: 3500,
    })
    return true
  } catch {
    // Global API handling typically surfaces errors; avoid duplicate toasts here.
    return false
  } finally {
    myProfileSaving.value = false
  }
}

async function saveMyDirectoryProfile() {
  const ok = await runDirectoryProfileSave()
  if (ok) {
    myDirectoryFormOpen.value = false
    resetProfileConnectionForm()
    resetExecOfficeForm()
  }
}

function onLeaveEditStay() {
  leaveEditDialogVisible.value = false
  routeLeaveResolver?.(false)
  routeLeaveResolver = null
}

function onLeaveEditDiscard() {
  cancelMyDirectoryForm()
  leaveEditDialogVisible.value = false
  routeLeaveResolver?.(true)
  routeLeaveResolver = null
}

async function onLeaveEditSave() {
  const ok = await runDirectoryProfileSave()
  if (!ok) {
    leaveEditDialogVisible.value = false
    routeLeaveResolver?.(false)
    routeLeaveResolver = null
    return
  }
  myDirectoryFormOpen.value = false
  resetProfileConnectionForm()
  resetExecOfficeForm()
  leaveEditDialogVisible.value = false
  routeLeaveResolver?.(true)
  routeLeaveResolver = null
}

function warnBeforeUnload(e: BeforeUnloadEvent) {
  if (myDirectoryFormOpen.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (!myDirectoryFormOpen.value) return true
  leaveEditDialogVisible.value = true
  return new Promise<boolean>((resolve) => {
    routeLeaveResolver = resolve
  })
})

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload)
  if (routeLeaveResolver) {
    routeLeaveResolver(false)
    routeLeaveResolver = null
  }
})

function directoryRoleLine(p: PersonResponse): string {
  if (p.isMember && p.isParent) return 'Member and parent'
  if (p.isMember) return 'Member'
  return 'Parent'
}

function formatAddress(p: PersonResponse): string {
  const line = [p.addressLine1 ?? '', [p.city, p.state].filter(Boolean).join(', '), p.zip ?? '']
    .filter((s) => s && String(s).trim())
    .join(', ')
  return line || '—'
}

function termDisplayLabel(term: ExecTermPublic): string {
  if (term.label?.trim()) return term.label.trim()
  const s = term.season === 'fall' ? 'Fall' : 'Spring'
  return `${s} ${term.year}`
}

function counterpartProfileLinkable(rel: PersonRelationshipResponse): boolean {
  return !rel.counterpart.removedFromDirectory
}

function goBackToDirectory() {
  router.push({ path: '/members', query: { section: 'member-search' } })
}

async function load(id: string) {
  loading.value = true
  loadError.value = null
  profile.value = null
  try {
    profile.value = await peopleStore.fetchPersonProfile(id)
  } catch (e: unknown) {
    if (isAxiosRejection(e) && (e as AxiosError).response?.status === 404) {
      loadError.value = 'This person is not in the directory (or was removed).'
    } else {
      loadError.value = 'Unable to load this profile.'
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => ({ id: route.params.id, authed: authStore.isAuthenticated }),
  async ({ id, authed }) => {
    if (typeof id !== 'string' || !id) return
    if (authed) await authStore.fetchUserProfile()
    void load(id)
  },
  { immediate: true },
)
</script>

<style scoped>
/* Align with exec roster oval framing */
.profile-hero-photo {
  width: 8.5rem;
  height: 10.5rem;
  border-radius: 50%;
}

.exec-roster-thumb-preview {
  width: 4.5rem;
  height: 5.5rem;
  border-radius: 50%;
}
</style>
