<template>
  <!-- Admin embeds MemberSearch under Admin.vue, which already mounts ConfirmDialog. A second
       instance would receive the same bus events (group undefined) and stack two modals — e.g.
       "Keep editing" needs two clicks. Public directory pages only use this component's dialog. -->
  <ConfirmDialog v-if="variant === 'public'" />
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-search text-[#6F8FAF]"></i>
        <span>{{ variant === 'admin' ? 'Directory (manage)' : 'Member and Parent Directory' }}</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <div class="text-surface-600">
          <template v-if="variant === 'public'">
            Browse everyone in the directory. Expand a row to see legacy and parent connections. Editors
            can manage entries in the Admin panel.
          </template>
          <template v-else>
            Search and update directory entries. Expand a row for legacy and parent connections; use
            <strong>Edit</strong> to
            change profile fields. To add someone new, open <strong>Add A Member or Parent</strong> above.
          </template>
        </div>

        <div v-if="peopleStore.loading" class="text-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <p class="mt-4 text-surface-600">Loading directory…</p>
        </div>

        <Message v-else-if="peopleStore.error" severity="error" :closable="false" class="w-full">
          {{ peopleStore.error }}
        </Message>

        <template v-else>
          <div class="flex flex-col lg:flex-row lg:items-end gap-4">
            <div class="flex-1 min-w-0">
              <label class="block text-xs font-medium text-surface-600 mb-1.5">Search</label>
              <InputText
                v-model="searchQuery"
                placeholder="Search by name, email, phone, address, or city…"
                class="w-full"
                size="small"
              />
            </div>
            <div class="flex flex-col sm:flex-row flex-wrap gap-4 shrink-0">
              <div class="w-full sm:w-48">
                <label class="block text-xs font-medium text-surface-600 mb-1.5">Directory role</label>
                <Select
                  v-model="roleFilter"
                  :options="roleFilterOptions"
                  optionLabel="label"
                  optionValue="value"
                  size="small"
                  class="w-full"
                />
              </div>
              <div class="w-full sm:w-40">
                <label class="block text-xs font-medium text-surface-600 mb-1.5">Class year</label>
                <Select
                  v-model="yearFilter"
                  :options="yearOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Any year"
                  showClear
                  size="small"
                  class="w-full"
                />
              </div>
              <div class="w-full sm:w-auto">
                <label
                  for="legacy-members-only-filter"
                  class="block text-xs font-medium text-surface-600 mb-1.5 cursor-pointer select-none"
                >
                  Legacy Members Only
                </label>
                <div class="flex items-center min-h-[2.125rem]">
                  <ToggleSwitch
                    v-model="showLegacyTiesOnly"
                    inputId="legacy-members-only-filter"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="filteredPeople.length > 0" class="overflow-x-auto -mx-1">
            <DataTable
              v-model:expandedRows="expandedRows"
              v-model:first="directoryTableFirst"
              v-model:rows="directoryTableRows"
              :value="filteredPeople"
              dataKey="id"
              stripedRows
              sortField="lastName"
              :sortOrder="1"
              removableSort
              paginator
              :rowsPerPageOptions="[10, 25, 50, 100]"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
              class="member-directory-datatable text-sm"
              :pt="memberDirectoryDataTablePt"
            >
              <Column expander class="w-12 min-w-[2.75rem]">
                <template #header>
                  <span
                    class="inline-flex w-full justify-center"
                    v-tooltip.top="'Expand or collapse every row on this page'"
                  >
                    <Checkbox
                      inputId="directory-expand-page"
                      binary
                      :modelValue="directoryExpandHeaderChecked"
                      :indeterminate="directoryExpandHeaderIndeterminate"
                      aria-label="Expand or collapse every row on this page"
                      @update:modelValue="onDirectoryExpandHeaderCheckbox"
                    />
                  </span>
                </template>
              </Column>
              <Column field="lastName" header="Name" sortable>
                <template #body="{ data }">
                  <RouterLink
                    :to="{ name: 'person-profile', params: { id: data.id } }"
                    class="font-medium text-[#6F8FAF] hover:underline"
                  >
                    {{ data.firstName }} {{ data.lastName }}
                  </RouterLink>
                </template>
              </Column>
              <Column field="email" header="Email" sortable>
                <template #body="{ data }">
                  <a
                    v-if="data.email"
                    :href="`mailto:${data.email}`"
                    class="text-[#6F8FAF] hover:underline break-all"
                  >
                    {{ data.email }}
                  </a>
                  <span
                    v-else-if="data.hasEmailOnFile"
                    v-tooltip.top="contactHiddenTooltip"
                    class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default max-w-full"
                    role="img"
                    :aria-label="contactHiddenTooltip"
                  >
                    <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                    <span class="select-none blur-sm text-surface-500 truncate" aria-hidden="true"
                      >email on file</span
                    >
                  </span>
                  <span v-else class="text-surface-400">—</span>
                </template>
              </Column>
              <Column header="Phones" :sortable="false">
                <template #body="{ data }">
                  <span
                    v-if="formatPhonesDisplay(data)"
                    class="text-surface-800 whitespace-normal text-sm inline-block max-w-full"
                  >
                    {{ formatPhonesDisplay(data) }}
                  </span>
                  <span
                    v-else-if="data.hasMobilePhone || data.hasHomePhone"
                    v-tooltip.top="contactHiddenTooltip"
                    class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default max-w-full"
                    role="img"
                    :aria-label="contactHiddenTooltip"
                  >
                    <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                    <span class="shrink-0">Phone on file</span>
                    <span
                      class="inline-block h-3 min-w-[5.5rem] flex-1 max-w-[7rem] rounded bg-surface-200"
                      aria-hidden="true"
                    />
                  </span>
                  <span v-else class="text-surface-400">—</span>
                </template>
              </Column>
              <Column header="Address" :sortable="false">
                <template #body="{ data }">
                  <span
                    v-if="formatAddress(data) !== '—'"
                    class="text-surface-700 whitespace-normal"
                    >{{ formatAddress(data) }}</span
                  >
                  <span
                    v-else-if="data.hasAddressOnFile"
                    v-tooltip.top="contactHiddenTooltip"
                    class="inline-flex items-center gap-2 text-surface-600 text-sm cursor-default max-w-full"
                    role="img"
                    :aria-label="contactHiddenTooltip"
                  >
                    <i class="pi pi-lock text-xs opacity-70 shrink-0" aria-hidden="true" />
                    <span class="select-none blur-sm text-surface-500" aria-hidden="true"
                      >address on file</span
                    >
                  </span>
                  <span v-else class="text-surface-400">—</span>
                </template>
              </Column>
              <Column field="pledgeClassYear" header="PC Class" sortable>
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
              <template #expansion="{ data: row }">
                <div
                  class="px-4 py-3 ml-2 border-l-4 border-[#6F8FAF] bg-surface-50 rounded-r-md text-sm"
                >
                  <div
                    v-if="rowRelState[row.id]?.status === 'loading'"
                    class="pl-5 text-surface-600 flex items-center gap-2 text-sm"
                  >
                    <i class="pi pi-spin pi-spinner"></i>
                    Loading…
                  </div>
                  <p v-else-if="rowRelState[row.id]?.error" class="text-red-600 m-0 pl-5 text-sm">
                    {{ rowRelState[row.id]?.error }}
                  </p>
                  <template v-else>
                    <template
                      v-if="(rowRelState[row.id]?.list?.length ?? 0) > 0"
                    >
                      <div class="font-bold text-surface-900 mb-1.5 pl-5">Connections</div>
                      <ul class="m-0 list-none space-y-1.5 p-0 pl-5 text-sm text-surface-800">
                        <li
                          v-for="rel in rowRelState[row.id]!.list"
                          :key="rel.id"
                          class="m-0 flex items-start gap-2 py-0 leading-tight"
                        >
                          <span
                            class="shrink-0 select-none text-[#6F8FAF] leading-tight"
                            aria-hidden="true"
                          >•</span>
                          <div
                            class="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-2 gap-y-1"
                          >
                            <span class="min-w-0 flex-1 pr-2 leading-tight">
                              <span class="font-medium text-surface-900">
                                {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                              </span>
                              <template v-if="rel.counterpart.pledgeClassYear != null">
                                <span class="text-surface-600"
                                  >, PC {{ rel.counterpart.pledgeClassYear }}</span
                                >
                              </template>
                              <span class="text-surface-700"
                                >, {{ rel.viewerCounterpartRoleLabel ?? 'Connection' }}</span
                              >
                            </span>
                            <span class="flex shrink-0 flex-wrap items-center gap-1">
                              <Tag
                                v-for="tag in rel.connectionTags ?? []"
                                :key="tag"
                                :value="tag === 'legacy' ? 'Legacy' : 'Family'"
                                :severity="tag === 'legacy' ? 'secondary' : 'success'"
                                class="text-xs"
                              />
                              <Button
                                v-if="canEdit"
                                type="button"
                                icon="pi pi-times"
                                severity="danger"
                                rounded
                                text
                                size="small"
                                class="shrink-0 !h-7 !min-h-0 !p-0 w-7"
                                v-tooltip.top="'Remove connection'"
                                :disabled="!!removingRelKey"
                                :loading="removingRelKey === relRemoveKey(row.id, rel.id)"
                                @click="confirmRemoveRowRelationship(row, rel)"
                              />
                            </span>
                          </div>
                        </li>
                      </ul>
                    </template>
                    <p v-else class="text-surface-600 m-0 pl-5 text-sm">No connections listed yet.</p>

                    <div
                      v-if="canEdit"
                      class="mt-4 pt-3 border-t border-surface-200 border-dashed"
                    >
                      <Button
                        type="button"
                        :icon="rowExpandAddOpen[row.id] ? 'pi pi-minus' : 'pi pi-plus'"
                        :label="rowExpandAddOpen[row.id] ? 'Hide add form' : 'Add connection'"
                        size="small"
                        severity="secondary"
                        outlined
                        :disabled="!!rowExpandAddSaving[row.id]"
                        @click="toggleRowExpandAdd(row.id)"
                      />
                      <div
                        v-if="rowExpandAddOpen[row.id]"
                        class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 md:items-end"
                      >
                          <div class="flex flex-col gap-1 min-w-0">
                            <label class="text-xs font-medium text-surface-600">Other person</label>
                            <Select
                              :modelValue="rowExpandAddForm[row.id]?.otherPersonId ?? ''"
                              :options="rowCounterpartSelectOptions(row.id)"
                              optionLabel="label"
                              optionValue="value"
                              placeholder="Select person"
                              filter
                              filterPlaceholder="Search name or email"
                              size="small"
                              class="w-full"
                              :disabled="!!rowExpandAddSaving[row.id]"
                              @update:modelValue="(v: string) => setRowExpandAddOther(row.id, v)"
                            />
                          </div>
                          <div class="flex flex-col gap-1 min-w-0">
                            <label class="text-xs font-medium text-surface-600">Relationship</label>
                            <Select
                              :modelValue="rowExpandAddForm[row.id]?.relationshipType ?? null"
                              :options="PERSON_RELATIONSHIP_TYPE_OPTIONS"
                              optionLabel="label"
                              optionValue="value"
                              :placeholder="rowExpandRelationshipPlaceholder(row)"
                              showClear
                              filter
                              size="small"
                              class="w-full"
                              :disabled="!!rowExpandAddSaving[row.id]"
                              @update:modelValue="(v: string | null) => setRowExpandAddType(row.id, v)"
                            />
                          </div>
                          <div class="md:col-span-2 flex justify-end">
                            <Button
                              type="button"
                              label="Add link"
                              icon="pi pi-check"
                              size="small"
                              class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                              :loading="!!rowExpandAddSaving[row.id]"
                              :disabled="!rowExpandAddForm[row.id]?.otherPersonId || !!rowExpandAddSaving[row.id]"
                              @click="submitRowExpandAdd(row)"
                            />
                          </div>
                        </div>
                    </div>
                  </template>
                </div>
              </template>
            </DataTable>
          </div>

          <div
            v-else-if="peopleStore.list.length > 0"
            class="text-center py-16"
          >
            <i class="pi pi-filter-slash text-6xl text-surface-400 mb-4"></i>
            <h3 class="text-2xl font-bold text-surface-700 mb-2">No matches</h3>
            <p class="text-surface-600">
              Try a different search, or turn off filters (role, class year, Legacy Members Only).
            </p>
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
    :visible="editDialogVisible"
    modal
    header="Edit directory person"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '95vw' }"
    :dismissableMask="true"
    @update:visible="onEditDialogVisibleUpdate"
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
          Street address
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
            City
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
            State
          </label>
          <Select
            id="edit-person-state"
            v-model="editForm.state"
            :options="US_STATE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            filter
            filterMatchMode="startsWith"
            :filterFields="['label', 'value']"
            filterPlaceholder="Search state"
            placeholder="Optional"
            :class="{ 'p-invalid': editErrors.state }"
            class="w-full"
          />
          <small v-if="editErrors.state" class="p-error">{{ editErrors.state }}</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-person-zip" class="font-semibold text-surface-700">
            ZIP
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
        <label for="edit-person-linkedin" class="font-semibold text-surface-700">LinkedIn</label>
        <InputText
          id="edit-person-linkedin"
          v-model="editForm.linkedinProfileUrl"
          type="url"
          placeholder="https://www.linkedin.com/in/…"
          :class="{ 'p-invalid': editErrors.linkedinProfileUrl }"
          class="w-full"
          autocomplete="url"
        />
        <small v-if="editErrors.linkedinProfileUrl" class="p-error">{{
          editErrors.linkedinProfileUrl
        }}</small>
        <small v-else class="text-surface-500">Optional — leave blank to remove.</small>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="flex flex-col gap-2">
          <label for="edit-person-mobile" class="font-semibold text-surface-700">Mobile phone</label>
          <InputText id="edit-person-mobile" v-model="editForm.mobilePhone" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-person-home" class="font-semibold text-surface-700">Home phone</label>
          <InputText id="edit-person-home" v-model="editForm.homePhone" class="w-full" />
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t border-surface-200 pt-4">
        <p class="font-semibold text-surface-700 m-0">Visible to other signed-in members</p>
        <p class="text-sm text-surface-600 m-0">
          Turn off to hide that field from viewers (guests never see contact info). Editors still see full
          rows in this admin directory.
        </p>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label for="edit-share-email" class="text-surface-800">Email</label>
          <ToggleSwitch v-model="editForm.shareEmailWithLoggedInMembers" inputId="edit-share-email" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label for="edit-share-phones" class="text-surface-800">Phone numbers</label>
          <ToggleSwitch v-model="editForm.sharePhonesWithLoggedInMembers" inputId="edit-share-phones" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label for="edit-share-address" class="text-surface-800">Mailing address</label>
          <ToggleSwitch v-model="editForm.shareAddressWithLoggedInMembers" inputId="edit-share-address" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label for="edit-share-li" class="text-surface-800">LinkedIn</label>
          <ToggleSwitch v-model="editForm.shareLinkedInWithLoggedInMembers" inputId="edit-share-li" />
        </div>
      </div>

      <div v-if="showEditPledgeField" class="flex flex-col gap-2 md:max-w-xs">
        <label for="edit-person-pledge" class="font-semibold text-surface-700">
          Pledge Class
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
            @click="onEditDialogVisibleUpdate(false)"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { isAxiosRejection } from '@/services/api'
import { usePeopleStore } from '@/stores/people'
import { useAuthStore } from '@/stores/auth'
import type { PersonResponse, PersonKind, UpdatePersonPayload } from '@/types/person'
import type { PersonRelationshipResponse } from '@/types/personRelationship'
import { usePersonRelationshipsStore } from '@/stores/personRelationships'
import { PERSON_RELATIONSHIP_TYPE_OPTIONS } from '@/constants/relationshipTypes'
import { US_STATE_CODE_SET, US_STATE_OPTIONS, normalizeUsStateForSelect } from '@/constants/usStates'
import { formatUsPhoneForDisplay, usPhoneDigits } from '@/utils/usPhone'
import { directoryContactHiddenTooltip } from '@/utils/directoryPrivacy'
import { registerAdminUnsaved } from '@/utils/adminUnsavedRegistry'

const props = withDefaults(
  defineProps<{
    /** `public` = view-only table (Members page). `admin` = editors can edit rows. */
    variant?: 'public' | 'admin'
  }>(),
  { variant: 'public' },
)

const toast = useToast()
const confirm = useConfirm()
const peopleStore = usePeopleStore()
const authStore = useAuthStore()
const contactHiddenTooltip = computed(() =>
  directoryContactHiddenTooltip(authStore.isAuthenticated),
)
const personRelStore = usePersonRelationshipsStore()

/** DataTable row expansion: keyed by person id when `dataKey` is set */
const expandedRows = ref<Record<string, boolean>>({})

type RowRelEntry = {
  status: 'loading' | 'loaded'
  list: PersonRelationshipResponse[]
  error: string | null
}

const rowRelState = ref<Record<string, RowRelEntry>>({})

async function ensureRowRelationshipsLoaded(personId: string) {
  const cur = rowRelState.value[personId]
  if (cur?.status === 'loading' || cur?.status === 'loaded') return
  rowRelState.value = {
    ...rowRelState.value,
    [personId]: { status: 'loading', list: [], error: null },
  }
  try {
    const list = await personRelStore.fetchForPerson(personId)
    rowRelState.value = {
      ...rowRelState.value,
      [personId]: { status: 'loaded', list, error: null },
    }
  } catch {
    rowRelState.value = {
      ...rowRelState.value,
      [personId]: {
        status: 'loaded',
        list: [],
        error: 'Could not load connections.',
      },
    }
  }
}

/** After mutations, sync people from the server and reload connections for any expanded rows. */
async function refreshDirectoryAndConnections() {
  await peopleStore.fetchPeople({ silent: true })
  const expanded = expandedRows.value
  rowRelState.value = {}
  const expandedIds = Object.keys(expanded).filter((id) => expanded[id])
  await Promise.all(expandedIds.map((id) => ensureRowRelationshipsLoaded(id)))
}

const removingRelKey = ref<string | null>(null)

function relRemoveKey(anchorId: string, relId: string) {
  return `${anchorId}:${relId}`
}

function confirmRemoveRowRelationship(anchor: PersonResponse, rel: PersonRelationshipResponse) {
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
      void runRemoveRowRelationship(anchor.id, rel.id)
    },
  })
}

async function runRemoveRowRelationship(anchorId: string, relationshipId: string) {
  const key = relRemoveKey(anchorId, relationshipId)
  removingRelKey.value = key
  try {
    await personRelStore.remove(anchorId, relationshipId)
    toast.add({
      severity: 'success',
      summary: 'Removed',
      detail: 'Connection removed.',
      life: 3000,
    })
    await refreshDirectoryAndConnections()
  } catch (err: unknown) {
    if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not remove.',
        life: 5000,
      })
    }
  } finally {
    removingRelKey.value = null
  }
}

const rowExpandAddOpen = ref<Record<string, boolean>>({})
const rowExpandAddForm = ref<
  Record<string, { otherPersonId: string; relationshipType: string | null }>
>({})
const rowExpandAddSaving = ref<Record<string, boolean>>({})

function ensureRowExpandFormRow(anchorId: string) {
  if (!rowExpandAddForm.value[anchorId]) {
    rowExpandAddForm.value = {
      ...rowExpandAddForm.value,
      [anchorId]: { otherPersonId: '', relationshipType: null },
    }
  }
}

function toggleRowExpandAdd(anchorId: string) {
  ensureRowExpandFormRow(anchorId)
  rowExpandAddOpen.value = {
    ...rowExpandAddOpen.value,
    [anchorId]: !rowExpandAddOpen.value[anchorId],
  }
}

function setRowExpandAddOther(anchorId: string, v: string) {
  ensureRowExpandFormRow(anchorId)
  rowExpandAddForm.value = {
    ...rowExpandAddForm.value,
    [anchorId]: {
      ...rowExpandAddForm.value[anchorId],
      otherPersonId: v,
    },
  }
}

function setRowExpandAddType(anchorId: string, v: string | null) {
  ensureRowExpandFormRow(anchorId)
  rowExpandAddForm.value = {
    ...rowExpandAddForm.value,
    [anchorId]: {
      ...rowExpandAddForm.value[anchorId],
      relationshipType: v,
    },
  }
}

function rowCounterpartSelectOptions(anchorId: string) {
  return peopleStore.list
    .filter((p) => p.id !== anchorId)
    .map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} · ${p.email}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function rowExpandRelationshipPlaceholder(row: PersonResponse) {
  const f = rowExpandAddForm.value[row.id]
  const otherId = f?.otherPersonId
  const other = otherId ? peopleStore.list.find((p) => p.id === otherId) : null
  const on = other ? `${other.firstName} ${other.lastName}` : 'They'
  return `${on} is ${row.firstName}'s… (e.g. parent)`
}

async function submitRowExpandAdd(anchor: PersonResponse) {
  const id = anchor.id
  const form = rowExpandAddForm.value[id]
  if (!form?.otherPersonId) {
    toast.add({
      severity: 'warn',
      summary: 'Select a person',
      detail: 'Choose the other person first.',
      life: 2800,
    })
    return
  }
  rowExpandAddSaving.value = { ...rowExpandAddSaving.value, [id]: true }
  try {
    await personRelStore.create(id, {
      otherPersonId: form.otherPersonId,
      direction: 'other_is_from',
      relationshipType: form.relationshipType || null,
    })
    toast.add({
      severity: 'success',
      summary: 'Added',
      detail: 'Connection added.',
      life: 3000,
    })
    rowExpandAddForm.value = {
      ...rowExpandAddForm.value,
      [id]: { otherPersonId: '', relationshipType: null },
    }
    rowExpandAddOpen.value = { ...rowExpandAddOpen.value, [id]: false }
    await refreshDirectoryAndConnections()
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
    rowExpandAddSaving.value = { ...rowExpandAddSaving.value, [id]: false }
  }
}

watch(
  expandedRows,
  (rows) => {
    if (!rows || typeof rows !== 'object') return
    for (const personId of Object.keys(rows)) {
      if (rows[personId]) void ensureRowRelationshipsLoaded(personId)
    }
  },
  { deep: true },
)

const searchQuery = ref('')
const yearFilter = ref<number | null>(null)

/** Everyone | listed as member | listed as parent (matches directory flags; “both” appears in both). */
type DirectoryRoleFilter = 'all' | 'members' | 'parents'
const roleFilter = ref<DirectoryRoleFilter>('all')

const roleFilterOptions: { label: string; value: DirectoryRoleFilter }[] = [
  { label: 'Everyone', value: 'all' },
  { label: 'Members only', value: 'members' },
  { label: 'Parents only', value: 'parents' },
]

/** “Legacy Members Only” filter: member↔member directory links only. */
const showLegacyTiesOnly = ref(false)

/** First row index for client-side DataTable pagination (reset when filters change). */
const directoryTableFirst = ref(0)

/** Page size for directory DataTable (synced with paginator). */
const directoryTableRows = ref(25)

watch([searchQuery, yearFilter, roleFilter, showLegacyTiesOnly], () => {
  expandedRows.value = {}
  rowExpandAddOpen.value = {}
  rowExpandAddForm.value = {}
  directoryTableFirst.value = 0
})

const canEdit = computed(() => props.variant === 'admin' && authStore.isEditor)

const tableMinWidthClass = computed(() => {
  if (props.variant === 'admin' && canEdit.value) return 'min-w-[860px]'
  return 'min-w-[780px]'
})

/** Paginator rows-per-page control: Prime `small` size + table min-width. */
const memberDirectoryDataTablePt = computed(() => ({
  table: { class: tableMinWidthClass.value },
  pcPaginator: {
    pcRowPerPageDropdown: {
      root: { class: 'p-select-sm p-inputfield-sm' },
    },
  },
}))

const kindOptions = [
  { label: 'Member', value: 'member' as PersonKind },
  { label: 'Parent', value: 'parent' as PersonKind },
  { label: 'Member and parent', value: 'both' as PersonKind },
]

const editDialogVisible = ref(false)
/** Snapshot of `editForm` when the dialog was opened (admin only), for dirty detection. */
const editFormBaseline = ref('')
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
  linkedinProfileUrl: '',
  homePhone: '',
  mobilePhone: '',
  pledgeClassYear: null as number | null,
  shareEmailWithLoggedInMembers: true,
  sharePhonesWithLoggedInMembers: true,
  shareAddressWithLoggedInMembers: true,
  shareLinkedInWithLoggedInMembers: true,
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
  linkedinProfileUrl: '',
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
  const line = [p.addressLine1 ?? '', [p.city, p.state].filter(Boolean).join(', '), p.zip ?? '']
    .filter((s) => s && String(s).trim())
    .join(', ')
  return line || '—'
}

function formatPhonesDisplay(p: PersonResponse): string {
  const m = formatUsPhoneForDisplay(p.mobilePhone ?? '')
  const h = formatUsPhoneForDisplay(p.homePhone ?? '')
  const parts: string[] = []
  if (m) parts.push(`M ${m}`)
  if (h) parts.push(`H ${h}`)
  return parts.join(' · ')
}

/** When the API redacts digits, still allow “phone” searches to find those rows. */
function phoneRedactedSearchHint(person: PersonResponse): string {
  if (!person.hasMobilePhone && !person.hasHomePhone) return ''
  if (formatUsPhoneForDisplay(person.mobilePhone ?? '') || formatUsPhoneForDisplay(person.homePhone ?? '')) {
    return ''
  }
  return 'phone on file'
}

function matchesSearch(person: PersonResponse, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase().trim()
  const mobileRaw = person.mobilePhone ?? ''
  const homeRaw = person.homePhone ?? ''
  const phoneDigits = [usPhoneDigits(mobileRaw), usPhoneDigits(homeRaw)].filter(Boolean).join(' ')
  const phoneFormatted = [formatUsPhoneForDisplay(mobileRaw), formatUsPhoneForDisplay(homeRaw)]
    .filter(Boolean)
    .join(' ')
  const emailHint =
    person.hasEmailOnFile && !(person.email && String(person.email).trim()) ? 'email on file' : ''
  const addressHint =
    person.hasAddressOnFile && formatAddress(person) === '—' ? 'address on file' : ''

  const hay = [
    person.firstName,
    person.lastName,
    `${person.firstName} ${person.lastName}`,
    person.email ?? '',
    emailHint,
    person.externalContactId ?? '',
    person.linkedinProfileUrl ?? '',
    person.hasLinkedInOnFile && !person.linkedinProfileUrl?.trim() ? 'linkedin on file' : '',
    mobileRaw,
    homeRaw,
    phoneDigits,
    phoneFormatted,
    phoneRedactedSearchHint(person),
    person.city,
    person.state,
    person.zip,
    person.addressLine1,
    formatAddress(person),
    addressHint,
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

const filteredPeople = computed(() => {
  let rows = peopleStore.list
  if (roleFilter.value === 'members') {
    rows = rows.filter((p) => p.isMember)
  } else if (roleFilter.value === 'parents') {
    rows = rows.filter((p) => p.isParent)
  }
  if (showLegacyTiesOnly.value) {
    rows = rows.filter((p) => p.hasLegacyMemberLink)
  }
  if (yearFilter.value != null) {
    rows = rows.filter((p) => p.pledgeClassYear === yearFilter.value)
  }
  const q = searchQuery.value
  if (q.trim()) {
    rows = rows.filter((p) => matchesSearch(p, q))
  }
  return rows
})

/** Rows on the current directory table page (for expand-all checkbox). */
const visibleDirectoryPage = computed(() => {
  const list = filteredPeople.value
  const first = directoryTableFirst.value
  const perPage = directoryTableRows.value
  return list.slice(first, Math.min(first + perPage, list.length))
})

const directoryExpandHeaderChecked = computed(() => {
  const vis = visibleDirectoryPage.value
  if (vis.length === 0) return false
  return vis.every((p) => expandedRows.value[p.id])
})

const directoryExpandHeaderIndeterminate = computed(() => {
  const vis = visibleDirectoryPage.value
  if (vis.length === 0) return false
  const n = vis.filter((p) => expandedRows.value[p.id]).length
  return n > 0 && n < vis.length
})

function expandDirectoryPageRows() {
  const next = { ...expandedRows.value }
  for (const p of visibleDirectoryPage.value) {
    next[p.id] = true
  }
  expandedRows.value = next
}

function collapseDirectoryVisiblePage() {
  const ids = visibleDirectoryPage.value.map((p) => p.id)
  if (ids.length === 0) return
  const next = { ...expandedRows.value }
  for (const id of ids) delete next[id]
  expandedRows.value = next
}

function onDirectoryExpandHeaderCheckbox(checked: boolean) {
  if (checked) expandDirectoryPageRows()
  else collapseDirectoryVisiblePage()
}

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
    linkedinProfileUrl: '',
    pledgeClassYear: '',
  }
}

function snapshotEditFormState(): string {
  return JSON.stringify(editForm.value)
}

function isAdminEditDialogDirty(): boolean {
  if (props.variant !== 'admin' || !editDialogVisible.value) return false
  return snapshotEditFormState() !== editFormBaseline.value
}

function onEditDialogVisibleUpdate(next: boolean) {
  if (next) {
    editDialogVisible.value = true
    return
  }
  if (!editDialogVisible.value) return
  if (props.variant !== 'admin' || !isAdminEditDialogDirty()) {
    editDialogVisible.value = false
    resetEditForm()
    return
  }
  confirm.require({
    message: 'Discard unsaved changes to this directory entry?',
    header: 'Unsaved changes',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Keep editing',
    acceptLabel: 'Discard',
    accept: () => {
      editDialogVisible.value = false
      resetEditForm()
    },
  })
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
    linkedinProfileUrl: '',
    homePhone: '',
    mobilePhone: '',
    pledgeClassYear: null,
    shareEmailWithLoggedInMembers: true,
    sharePhonesWithLoggedInMembers: true,
    shareAddressWithLoggedInMembers: true,
    shareLinkedInWithLoggedInMembers: true,
  }
  clearEditErrors()
}

function openEditDialog(p: PersonResponse) {
  editingId.value = p.id
  editForm.value = {
    kind: kindFromPerson(p),
    firstName: p.firstName,
    lastName: p.lastName,
    addressLine1: p.addressLine1 ?? '',
    city: p.city ?? '',
    state: normalizeUsStateForSelect(p.state),
    zip: p.zip ?? '',
    email: p.email ?? '',
    linkedinProfileUrl: p.linkedinProfileUrl ?? '',
    mobilePhone: formatUsPhoneForDisplay(p.mobilePhone ?? ''),
    homePhone: formatUsPhoneForDisplay(p.homePhone ?? ''),
    pledgeClassYear: p.pledgeClassYear ?? null,
    shareEmailWithLoggedInMembers: p.shareEmailWithLoggedInMembers ?? true,
    sharePhonesWithLoggedInMembers: p.sharePhonesWithLoggedInMembers ?? true,
    shareAddressWithLoggedInMembers: p.shareAddressWithLoggedInMembers ?? true,
    shareLinkedInWithLoggedInMembers: p.shareLinkedInWithLoggedInMembers ?? true,
  }
  clearEditErrors()
  editFormBaseline.value = snapshotEditFormState()
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
  if (f.state !== '' && !US_STATE_CODE_SET.has(f.state)) {
    editErrors.value.state = 'Select a valid state or leave blank'
    ok = false
  }
  if (!f.email.trim()) {
    editErrors.value.email = 'Email is required'
    ok = false
  } else if (!emailRegex.test(f.email)) {
    editErrors.value.email = 'Enter a valid email'
    ok = false
  }
  const li = f.linkedinProfileUrl.trim()
  if (li) {
    try {
      const u = new URL(li)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        editErrors.value.linkedinProfileUrl = 'Use a link starting with http:// or https://'
        ok = false
      }
    } catch {
      editErrors.value.linkedinProfileUrl = 'Enter a valid URL'
      ok = false
    }
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
      addressLine1: f.addressLine1.trim() || null,
      city: f.city.trim() || null,
      state:
        f.state && US_STATE_CODE_SET.has(f.state) ? f.state.trim().toUpperCase() : null,
      zip: f.zip.trim() || null,
      email: f.email.trim(),
      linkedinProfileUrl: f.linkedinProfileUrl.trim() ? f.linkedinProfileUrl.trim() : null,
      mobilePhone: f.mobilePhone.trim() || null,
      homePhone: f.homePhone.trim() || null,
    }
    if (showEditPledgeField.value) {
      payload.pledgeClassYear = f.pledgeClassYear
    } else {
      payload.pledgeClassYear = null
    }

    payload.shareEmailWithLoggedInMembers = f.shareEmailWithLoggedInMembers
    payload.sharePhonesWithLoggedInMembers = f.sharePhonesWithLoggedInMembers
    payload.shareAddressWithLoggedInMembers = f.shareAddressWithLoggedInMembers
    payload.shareLinkedInWithLoggedInMembers = f.shareLinkedInWithLoggedInMembers

    await peopleStore.updatePerson(personId, payload)

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Directory entry was updated.',
      life: 3500,
    })
    editDialogVisible.value = false
    resetEditForm()
    await refreshDirectoryAndConnections()
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
    const ex = { ...expandedRows.value }
    delete ex[personId]
    expandedRows.value = ex
    await refreshDirectoryAndConnections()
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

let unregisterMemberSearchUnsaved: (() => void) | null = null

function registerMemberSearchUnsaved() {
  unregisterMemberSearchUnsaved?.()
  unregisterMemberSearchUnsaved = null
  if (props.variant !== 'admin') return
  unregisterMemberSearchUnsaved = registerAdminUnsaved({
    id: 'member-search-directory-edit',
    isDirty: () => isAdminEditDialogDirty(),
    discard: () => {
      editDialogVisible.value = false
      resetEditForm()
    },
  })
}

watch(() => props.variant, registerMemberSearchUnsaved, { immediate: true })
onUnmounted(() => {
  unregisterMemberSearchUnsaved?.()
})

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
    void peopleStore.fetchPeople({ silent: true })
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

<style scoped>
/*
 * Theme tokens on Select can still read larger than paginator links; force match to text-sm bar.
 */
.member-directory-datatable :deep(.p-paginator .p-paginator-rpp-dropdown) {
  font-size: 0.875rem !important;
  line-height: 1.25rem !important;
}

.member-directory-datatable :deep(.p-paginator .p-paginator-rpp-dropdown .p-select-label) {
  font-size: inherit !important;
  line-height: inherit !important;
}

.member-directory-datatable :deep(.p-paginator .p-paginator-rpp-dropdown .p-select-dropdown) {
  font-size: inherit !important;
}

.member-directory-datatable :deep(.p-paginator .p-paginator-rpp-dropdown .p-select-dropdown-icon) {
  font-size: 0.75rem !important;
}
</style>
