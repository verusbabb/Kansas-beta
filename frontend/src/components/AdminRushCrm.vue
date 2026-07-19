<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h2 class="text-xl font-semibold text-surface-900 flex items-center gap-2">
        <i class="pi pi-users text-[#6F8FAF]"></i>
        Rush CRM
        <span
          v-if="!store.loading && store.list.length > 0"
          class="text-sm font-normal text-surface-500 ml-1"
        >
          {{ filteredProspects.length }} prospect{{ filteredProspects.length !== 1 ? 's' : '' }}
        </span>
      </h2>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-surface-600 shrink-0">Pledge Class Year:</label>
        <Select
          v-model="selectedYear"
          :options="yearOptions"
          option-label="label"
          option-value="value"
          class="w-32"
          @change="onYearChange"
        />
      </div>
    </div>

    <!-- Stage stats bar -->
    <div v-if="stageStats.length > 0" class="flex flex-wrap gap-2">
      <button
        v-for="stat in stageStats"
        :key="stat.stage"
        type="button"
        v-tooltip.bottom="stageDescriptionMap[stat.stage]"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
          stageFilter === stat.stage
            ? 'bg-[#6F8FAF] text-white border-[#6F8FAF]'
            : 'bg-surface-0 text-surface-700 border-surface-200 hover:border-[#6F8FAF] hover:text-[#6F8FAF]'
        ]"
        @click="toggleStageFilter(stat.stage)"
      >
        <span>{{ stat.label }}</span>
        <span
          :class="[
            'rounded-full px-1.5 py-0.5 text-xs font-bold',
            stageFilter === stat.stage
              ? 'bg-white text-[#6F8FAF]'
              : 'bg-surface-100 text-surface-600'
          ]"
        >
          {{ stat.count }}
        </span>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <IconField class="flex-1">
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchQuery" placeholder="Search by name or email…" class="w-full" />
      </IconField>
      <Select
        v-model="stageFilter"
        :options="stageFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="All stages"
        class="w-full sm:w-48"
      >
        <template #option="{ option }">
          <div class="flex flex-col py-0.5">
            <span class="font-medium">{{ option.label }}</span>
            <span v-if="option.value" class="text-xs text-surface-500 leading-snug max-w-xs">
              {{ stageDescriptionMap[option.value] }}
            </span>
          </div>
        </template>
      </Select>
      <Select
        v-model="assignedChairFilter"
        :options="chairFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="All chairs"
        class="w-full sm:w-48"
      />
      <Button
        v-if="isFiltered"
        icon="pi pi-times"
        label="Clear"
        severity="secondary"
        outlined
        @click="clearFilters"
      />
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center py-16">
      <ProgressSpinner style="width: 48px; height: 48px" />
    </div>

    <!-- Empty state -->
    <div v-else-if="store.list.length === 0" class="text-center py-16 text-surface-500">
      <i class="pi pi-users text-5xl mb-4 block text-surface-300"></i>
      <p class="text-lg font-medium">No prospects for Pledge Class {{ selectedYear }}</p>
      <p class="text-sm mt-1">Applications submitted via /rush/apply will appear here.</p>
    </div>

    <div v-else-if="filteredProspects.length === 0" class="text-center py-12 text-surface-500">
      <i class="pi pi-search text-4xl mb-4 block text-surface-300"></i>
      <p>No prospects match your filters.</p>
      <Button label="Clear filters" text severity="secondary" class="mt-2" @click="clearFilters" />
    </div>

    <!-- DataTable -->
    <DataTable
      v-else
      :value="filteredProspects"
      :rows="25"
      :rows-per-page-options="[10, 25, 50]"
      paginator
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      sort-field="createdAt"
      :sort-order="-1"
      row-hover
      class="text-sm"
      @row-click="openDetail($event.data)"
    >
      <Column field="lastName" header="Name" sortable>
        <template #body="{ data }">
          <button
            type="button"
            class="font-medium text-[#6F8FAF] hover:underline text-left"
            @click.stop="openDetail(data)"
          >
            {{ data.lastName }}, {{ data.firstName }}
          </button>
        </template>
      </Column>

      <Column field="email" header="Email">
        <template #body="{ data }">
          <a
            :href="`mailto:${data.email}?subject=Kansas Beta Rush&body=Hi ${data.firstName},%0A%0A`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[#6F8FAF] hover:underline"
            @click.stop
          >
            {{ data.email }}
          </a>
        </template>
      </Column>

      <Column field="classYear" header="Class Year" sortable>
        <template #body="{ data }">
          {{ data.classYear ? classYearLabels[data.classYear] : '—' }}
        </template>
      </Column>

      <Column field="enrollmentSemester" header="KU Start" sortable>
        <template #body="{ data }">
          <span v-if="data.enrollmentSemester && data.enrollmentYear">
            {{ data.enrollmentSemester === 'fall' ? 'Fall' : 'Spring' }} {{ data.enrollmentYear }}
          </span>
          <span v-else class="text-surface-400">—</span>
        </template>
      </Column>

      <Column field="pipelineStage" header="Stage" sortable>
        <template #body="{ data }">
          <Tag
            :value="stageLabelMap[data.pipelineStage]"
            :severity="stageSeverityMap[data.pipelineStage]"
          />
        </template>
      </Column>

      <Column field="internalRating" header="Rating" sortable>
        <template #body="{ data }">
          <span v-if="data.internalRating" class="flex items-center gap-0.5">
            <i
              v-for="n in 5"
              :key="n"
              :class="[
                'pi text-sm',
                n <= data.internalRating
                  ? 'pi-star-fill text-yellow-400'
                  : 'pi-star text-surface-300'
              ]"
            />
          </span>
          <span v-else class="text-surface-400">—</span>
        </template>
      </Column>

      <Column field="assignedToPersonName" header="Assigned To" sortable>
        <template #body="{ data }">
          <span v-if="data.assignedToPersonName" class="text-sm">{{
            data.assignedToPersonName
          }}</span>
          <span v-else class="text-surface-400">—</span>
        </template>
      </Column>

      <Column header="Days in stage">
        <template #body="{ data }">
          <span class="text-surface-500">{{ daysInStage(data) }}</span>
        </template>
      </Column>

      <Column header="" style="width: 80px">
        <template #body="{ data }">
          <div class="flex items-center gap-1" @click.stop>
            <Button
              :icon="canEditProspects ? 'pi pi-pencil' : 'pi pi-eye'"
              size="small"
              text
              severity="secondary"
              v-tooltip.top="canEditProspects ? 'Edit prospect' : 'View prospect'"
              @click="openDetail(data)"
            />
            <Button
              v-if="canEditProspects"
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              v-tooltip.top="'Delete prospect'"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Prospect Detail Dialog -->
    <Dialog
      v-model:visible="detailVisible"
      modal
      :style="{ width: '76rem', maxWidth: '95vw' }"
      :header="`${currentProspect?.firstName ?? ''} ${currentProspect?.lastName ?? ''}`"
      :closable="true"
      @hide="onDetailClose"
    >
      <div v-if="detailLoading" class="flex justify-center py-16">
        <ProgressSpinner style="width: 48px; height: 48px" />
      </div>

      <div v-else-if="fullProspect" class="flex flex-col gap-5">
        <!-- Summary strip (read-only glance) -->
        <div class="flex flex-wrap items-center gap-4 pb-4 border-b border-surface-100">
          <!-- Initials avatar -->
          <div
            class="h-12 w-12 rounded-full bg-gradient-to-br from-[#6F8FAF] to-[#4d6b8a] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm"
          >
            {{ initials }}
          </div>

          <!-- Status + meta -->
          <div class="flex flex-col gap-2 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <Tag
                :value="stageLabelMap[fullProspect.pipelineStage]"
                :severity="stageSeverityMap[fullProspect.pipelineStage]"
              />
              <div
                class="flex items-center gap-0.5 bg-surface-50 rounded-full px-2 py-1 border border-surface-100"
              >
                <i
                  v-for="n in 5"
                  :key="n"
                  :class="[
                    'pi text-sm',
                    (fullProspect.internalRating ?? 0) >= n
                      ? 'pi-star-fill text-yellow-400'
                      : 'pi-star text-surface-300'
                  ]"
                />
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                v-tooltip.bottom="fullProspect.applicationSubmittedAt ? 'Application received' : 'Added to pipeline'"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-surface-600 bg-surface-100 rounded-full px-2.5 py-1"
              >
                <i class="pi pi-calendar-plus text-[#6F8FAF]" />
                Applied {{ formatDateShort(fullProspect.applicationSubmittedAt ?? fullProspect.createdAt) }}
              </span>
              <span
                v-if="fullProspect.hometown"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-surface-600 bg-surface-100 rounded-full px-2.5 py-1"
              >
                <i class="pi pi-map-marker text-[#6F8FAF]" /> {{ fullProspect.hometown }}
              </span>
              <span
                v-if="fullProspect.gpa != null"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-surface-700 bg-surface-100 rounded-full px-2.5 py-1"
              >
                <span class="text-surface-400 font-semibold uppercase tracking-wide">GPA</span>
                {{ fullProspect.gpa }}
              </span>
              <span
                v-if="fullProspect.actScore != null"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-surface-700 bg-surface-100 rounded-full px-2.5 py-1"
              >
                <span class="text-surface-400 font-semibold uppercase tracking-wide">ACT</span>
                {{ fullProspect.actScore }}
              </span>
              <span
                v-if="fullProspect.satScore != null"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-surface-700 bg-surface-100 rounded-full px-2.5 py-1"
              >
                <span class="text-surface-400 font-semibold uppercase tracking-wide">SAT</span>
                {{ fullProspect.satScore }}
              </span>
            </div>
          </div>

          <!-- Contact actions -->
          <div class="flex items-center gap-2 ml-auto shrink-0">
            <a
              :href="mailtoLink"
              target="_blank"
              rel="noopener noreferrer"
              v-tooltip.bottom="'Email'"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-surface-200 text-[#6F8FAF] hover:bg-[#6F8FAF] hover:text-white hover:border-[#6F8FAF] transition-colors"
            >
              <i class="pi pi-envelope" />
            </a>
            <a
              v-if="fullProspect.phone"
              :href="`tel:${fullProspect.phone}`"
              v-tooltip.bottom="fullProspect.phone"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-surface-200 text-[#6F8FAF] hover:bg-[#6F8FAF] hover:text-white hover:border-[#6F8FAF] transition-colors"
            >
              <i class="pi pi-phone" />
            </a>
          </div>
        </div>

        <!-- Status / progress band -->
        <div
          class="relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-md p-5 flex flex-col gap-5"
        >
          <span
            class="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#6F8FAF] via-[#9DB6CC] to-[#6F8FAF]"
          />

          <!-- Pipeline stage (hero) -->
          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xl font-bold text-surface-900">
                    {{ stageLabelMap[fullProspect.pipelineStage] }}
                  </span>
                  <Tag v-if="isTerminalStage" value="Off track" severity="secondary" class="text-xs" />
                  <span
                    v-else
                    class="text-xs font-semibold text-[#6F8FAF] bg-[#6F8FAF]/10 rounded-full px-2 py-0.5"
                  >
                    Step {{ happyPathIndex + 1 }} of {{ happyPathStages.length }}
                  </span>
                </div>
                <p class="text-xs text-surface-500 leading-snug">
                  {{ stageDescriptionMap[fullProspect.pipelineStage] }}
                </p>
              </div>
              <span
                v-if="statusSavedField === 'stage'"
                class="shrink-0 text-xs text-green-600 flex items-center gap-1"
              >
                <i class="pi pi-check" /> Saved
              </span>
              <i
                v-else-if="statusSaving === 'stage'"
                class="shrink-0 pi pi-spin pi-spinner text-surface-400 text-xs"
              />
            </div>

            <!-- Happy-path stepper -->
            <div class="flex items-center pt-1">
              <template v-for="(s, i) in happyPathStages" :key="s">
                <div
                  v-tooltip.top="stageLabelMap[s]"
                  :class="[
                    'flex items-center justify-center rounded-full shrink-0 transition-all',
                    i === happyPathIndex ? 'h-6 w-6' : 'h-5 w-5',
                    stepClass(i),
                  ]"
                >
                  <i v-if="i < happyPathIndex" class="pi pi-check text-[10px]" />
                  <span v-else-if="i === happyPathIndex" class="h-2 w-2 rounded-full bg-white" />
                </div>
                <div
                  v-if="i < happyPathStages.length - 1"
                  :class="[
                    'h-1 flex-1 rounded-full transition-colors',
                    happyPathIndex > i ? 'bg-[#6F8FAF]' : 'bg-surface-200',
                  ]"
                />
              </template>
            </div>

            <!-- Stage selector -->
            <div class="flex items-center gap-2">
              <Select
                v-if="canEditProspects"
                v-model="editForm.pipelineStage"
                :options="pipelineStageOptions"
                option-label="label"
                option-value="value"
                class="flex-1"
                v-tooltip.bottom="stageDescriptionMap[editForm.pipelineStage]"
                @change="autoSaveStatus('stage', { pipelineStage: editForm.pipelineStage })"
              >
                <template #option="{ option }">
                  <div class="flex flex-col py-0.5">
                    <span class="font-medium">{{ option.label }}</span>
                    <span class="text-xs text-surface-500 leading-snug max-w-xs">
                      {{ option.description }}
                    </span>
                  </div>
                </template>
              </Select>
              <Tag
                v-else
                :value="stageLabelMap[fullProspect.pipelineStage]"
                :severity="stageSeverityMap[fullProspect.pipelineStage]"
              />
            </div>
          </div>

          <!-- Rush chair + rating (stat tiles) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-xl border border-surface-100 bg-surface-50 p-3 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5"
                >
                  <i class="pi pi-user-edit text-[#6F8FAF]" /> Rush Chair
                </span>
                <span
                  v-if="statusSavedField === 'chair'"
                  class="text-xs text-green-600 flex items-center gap-1"
                >
                  <i class="pi pi-check" /> Saved
                </span>
                <i
                  v-else-if="statusSaving === 'chair'"
                  class="pi pi-spin pi-spinner text-surface-400 text-xs"
                />
              </div>
              <Select
                v-if="canEditProspects"
                v-model="editForm.assignedToPersonId"
                :options="rushChairOptions"
                option-label="label"
                option-value="value"
                placeholder="Unassigned"
                show-clear
                class="w-full"
                @change="
                  autoSaveStatus('chair', { assignedToPersonId: editForm.assignedToPersonId })
                "
              >
                <template #option="{ option }">
                  <div class="flex flex-col py-0.5">
                    <span class="font-medium">{{ option.label }}</span>
                    <span class="text-xs text-surface-500 leading-snug">{{
                      option.termLabel
                    }}</span>
                  </div>
                </template>
              </Select>
              <p v-else class="text-sm text-surface-700">
                {{ fullProspect.assignedToPersonName ?? 'Unassigned' }}
              </p>
            </div>

            <div class="rounded-xl border border-surface-100 bg-surface-50 p-3 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5"
                >
                  <i class="pi pi-star text-[#6F8FAF]" /> Internal Rating
                </span>
                <span
                  v-if="statusSavedField === 'rating'"
                  class="text-xs text-green-600 flex items-center gap-1"
                >
                  <i class="pi pi-check" /> Saved
                </span>
                <i
                  v-else-if="statusSaving === 'rating'"
                  class="pi pi-spin pi-spinner text-surface-400 text-xs"
                />
              </div>
              <div class="flex gap-1.5">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="text-2xl transition-transform hover:scale-110"
                  :class="canEditProspects ? '' : 'cursor-default hover:scale-100'"
                  :disabled="!canEditProspects"
                  @click="setRating(n)"
                >
                  <i
                    :class="[
                      'pi',
                      (editForm.internalRating ?? 0) >= n
                        ? 'pi-star-fill text-yellow-400'
                        : 'pi-star text-surface-300'
                    ]"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity (dominant) + profile rail -->
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Activity -->
          <div class="flex-1 flex flex-col gap-4 min-w-0">
            <h3 class="font-semibold text-surface-700 border-b border-surface-100 pb-2">
              Activity
            </h3>

            <!-- Composer -->
            <div
              v-if="canLogActivities"
              class="flex flex-col gap-2 p-3 bg-surface-50 rounded-lg border border-surface-100"
            >
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in manualActivityTypeOptions"
                  :key="opt.value"
                  type="button"
                  :class="[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    newActivityType === opt.value
                      ? 'bg-[#6F8FAF] text-white border-[#6F8FAF]'
                      : 'bg-surface-0 text-surface-700 border-surface-200 hover:border-[#6F8FAF] hover:text-[#6F8FAF]'
                  ]"
                  @click="newActivityType = opt.value"
                >
                  <i :class="opt.icon" />
                  {{ opt.label }}
                </button>
              </div>
              <Textarea
                v-model="newNote"
                placeholder="Add a note, call log, or activity…"
                rows="3"
                class="w-full text-sm"
                auto-resize
              />
              <div class="flex justify-end">
                <Button
                  label="Log"
                  icon="pi pi-plus"
                  size="small"
                  :loading="addingActivity"
                  :disabled="!newNote.trim()"
                  class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
                  @click="logActivity"
                />
              </div>
            </div>

            <!-- Activity feed -->
            <div class="flex flex-col gap-3 overflow-y-auto max-h-[520px] pr-1">
              <div
                v-for="activity in fullProspect.activities"
                :key="activity.id"
                class="flex gap-2.5 text-sm"
              >
                <div class="mt-0.5 shrink-0">
                  <i
                    :class="[activityTypeIcons[activity.activityType], 'text-[#6F8FAF] text-base']"
                  />
                </div>
                <div class="flex flex-col gap-0.5 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-medium text-surface-800">
                      {{ activityTypeLabels[activity.activityType] }}
                    </span>
                    <span
                      v-if="
                        activity.activityType === 'stage_change' &&
                        activity.fromStage &&
                        activity.toStage
                      "
                      class="text-surface-500 text-xs"
                    >
                      {{ stageLabelMap[activity.fromStage] ?? activity.fromStage }}
                      <i class="pi pi-arrow-right mx-1" />
                      {{ stageLabelMap[activity.toStage] ?? activity.toStage }}
                    </span>
                  </div>
                  <p v-if="activity.note" class="text-surface-600 break-words">
                    {{ activity.note }}
                  </p>
                  <p v-if="activity.rushEventTitle" class="text-surface-500 italic text-xs">
                    {{ activity.rushEventTitle }}
                  </p>
                  <p class="text-surface-400 text-xs">
                    {{ formatDate(activity.createdAt) }}
                    <span v-if="activity.createdByName"> · {{ activity.createdByName }}</span>
                  </p>
                </div>
              </div>

              <p
                v-if="fullProspect.activities.length === 0"
                class="text-surface-400 text-sm text-center py-4"
              >
                No activity yet.
              </p>
            </div>
          </div>

          <!-- Profile rail -->
          <div class="w-full lg:w-80 flex flex-col gap-3 min-w-0">
            <div class="flex items-center justify-between border-b border-surface-100 pb-2">
              <h3 class="font-semibold text-surface-700">Profile</h3>
              <Button
                v-if="canEditProspects && !profileEditMode"
                label="Edit"
                icon="pi pi-pencil"
                text
                size="small"
                @click="profileEditMode = true"
              />
            </div>

            <!-- Read mode -->
            <div v-if="!profileEditMode" class="flex flex-col gap-3 text-sm">
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Name</span>
                <span class="text-surface-700">{{ fullProspect.firstName }} {{ fullProspect.lastName }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Email</span>
                <a
                  :href="mailtoLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#6F8FAF] hover:underline break-words"
                >
                  {{ fullProspect.email }}
                </a>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Phone</span>
                <span :class="fullProspect.phone ? 'text-surface-700' : 'text-surface-400'">
                  {{ fullProspect.phone || '—' }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Class Year</span>
                  <span :class="fullProspect.classYear ? 'text-surface-700' : 'text-surface-400'">
                    {{ fullProspect.classYear ? classYearLabels[fullProspect.classYear] : '—' }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Enrollment</span>
                  <span
                    :class="
                      fullProspect.enrollmentSemester && fullProspect.enrollmentYear
                        ? 'text-surface-700'
                        : 'text-surface-400'
                    "
                  >
                    <template v-if="fullProspect.enrollmentSemester && fullProspect.enrollmentYear">
                      {{ fullProspect.enrollmentSemester === 'fall' ? 'Fall' : 'Spring' }}
                      {{ fullProspect.enrollmentYear }}
                    </template>
                    <template v-else>—</template>
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Hometown</span>
                  <span :class="fullProspect.hometown ? 'text-surface-700 break-words' : 'text-surface-400'">
                    {{ fullProspect.hometown || '—' }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">High School</span>
                  <span :class="fullProspect.highSchool ? 'text-surface-700 break-words' : 'text-surface-400'">
                    {{ fullProspect.highSchool || '—' }}
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">GPA</span>
                  <span :class="fullProspect.gpa != null ? 'text-surface-700' : 'text-surface-400'">
                    {{ fullProspect.gpa != null ? fullProspect.gpa : '—' }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">ACT</span>
                  <span :class="fullProspect.actScore != null ? 'text-surface-700' : 'text-surface-400'">
                    {{ fullProspect.actScore != null ? fullProspect.actScore : '—' }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">SAT</span>
                  <span :class="fullProspect.satScore != null ? 'text-surface-700' : 'text-surface-400'">
                    {{ fullProspect.satScore != null ? fullProspect.satScore : '—' }}
                  </span>
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Major</span>
                <span :class="fullProspect.major ? 'text-surface-700' : 'text-surface-400'">
                  {{ fullProspect.major || '—' }}
                </span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Alpha Nu Legacy</span>
                <span
                  :class="
                    fullProspect.legacyRelativeFullName || fullProspect.legacyRelativeName
                      ? 'text-surface-700'
                      : 'text-surface-400'
                  "
                >
                  <template v-if="fullProspect.legacyRelativeFullName || fullProspect.legacyRelativeName">
                    {{ fullProspect.legacyRelativeFullName ?? fullProspect.legacyRelativeName }}
                    <span v-if="fullProspect.legacyRelationship" class="text-surface-500">
                      ({{ legacyRelationshipLabels[fullProspect.legacyRelationship] }})
                    </span>
                  </template>
                  <template v-else>—</template>
                </span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Referral Source</span>
                <span :class="fullProspect.referralSource ? 'text-surface-700' : 'text-surface-400'">
                  {{ fullProspect.referralSource || '—' }}
                </span>
              </div>
            </div>

            <!-- Edit mode -->
            <div v-else class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >First Name</label
                  >
                  <InputText v-model="editForm.firstName" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >Last Name</label
                  >
                  <InputText v-model="editForm.lastName" class="w-full" />
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                  >Phone</label
                >
                <InputText v-model="editForm.phone" placeholder="e.g. (913) 555-0182" class="w-full" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >Class Year</label
                  >
                  <Select
                    v-model="editForm.classYear"
                    :options="classYearOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Select"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >Major</label
                  >
                  <InputText v-model="editForm.major" class="w-full" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >Enrollment Semester</label
                  >
                  <Select
                    v-model="editForm.enrollmentSemester"
                    :options="semesterOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Semester"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >Enrollment Year</label
                  >
                  <Select
                    v-model="editForm.enrollmentYear"
                    :options="enrollmentYearOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Year"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >Hometown</label
                  >
                  <InputText v-model="editForm.hometown" placeholder="e.g. Overland Park, KS" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >High School</label
                  >
                  <InputText v-model="editForm.highSchool" class="w-full" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >GPA</label
                  >
                  <InputText v-model="editForm.gpaStr" placeholder="e.g. 3.65" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >ACT</label
                  >
                  <InputText v-model="editForm.actScoreStr" placeholder="e.g. 32" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide"
                    >SAT</label
                  >
                  <InputText v-model="editForm.satScoreStr" placeholder="e.g. 1420" class="w-full" />
                </div>
              </div>
              <div class="flex justify-end gap-2 pt-2 border-t border-surface-100">
                <Button
                  label="Cancel"
                  text
                  severity="secondary"
                  size="small"
                  @click="cancelProfileEdit"
                />
                <Button
                  label="Save"
                  icon="pi pi-check"
                  size="small"
                  :loading="savingProfile"
                  class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
                  @click="saveProfile"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Confirm delete -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import { useRushProspectStore } from '@/stores/rushProspect'
import { useAuthStore } from '@/stores/auth'
import type {
  RushProspectSummary,
  RushProspectResponse,
  PipelineStage,
  ClassYear,
  UpdateRushProspectPayload
} from '@/types/rushProspect'
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_SEVERITY,
  PIPELINE_STAGE_DESCRIPTIONS,
  CLASS_YEAR_LABELS,
  LEGACY_RELATIONSHIP_LABELS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ALL_PIPELINE_STAGES
} from '@/types/rushProspect'

const store = useRushProspectStore()
const authStore = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

/**
 * Full Rush CRM editing (edit details, change stage, assign chairs, rate, delete):
 * admins, editors, and rush chairs. Members are read-only here.
 */
const canEditProspects = computed(() => authStore.isEditor || authStore.isRushChair)

/** Logging notes/activities: everyone who can reach the CRM, including members. */
const canLogActivities = computed(() => canEditProspects.value || authStore.isMember)

// ── Year selector ────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1 // 1-indexed

/**
 * Default to the next upcoming Fall pledge class year.
 * If we're in August or later (fall semester underway), the active rush
 * is recruiting for NEXT year's class. Before August we're still working
 * toward the current calendar year's fall class.
 */
const defaultPledgeClassYear = currentMonth >= 8 ? currentYear + 1 : currentYear

const selectedYear = ref(defaultPledgeClassYear)

const yearOptions = computed(() =>
  [-1, 0, 1, 2]
    .map((offset) => ({
      label: String(defaultPledgeClassYear + offset),
      value: defaultPledgeClassYear + offset
    }))
    .sort((a, b) => b.value - a.value)
)

const enrollmentYearOptions = computed(() =>
  [0, 1, 2].map((offset) => ({
    label: String(currentYear + offset),
    value: currentYear + offset
  }))
)

function onYearChange() {
  store.fetchProspects(selectedYear.value)
}

onMounted(() => {
  store.fetchProspects(selectedYear.value)
  if (canEditProspects.value) {
    store.fetchRushChairs()
  }
})

// ── Label/severity maps ──────────────────────────────────────────────────────

const stageLabelMap: Record<string, string> = PIPELINE_STAGE_LABELS
const stageSeverityMap: Record<string, string> = PIPELINE_STAGE_SEVERITY
const stageDescriptionMap: Record<string, string> = PIPELINE_STAGE_DESCRIPTIONS
const classYearLabels: Record<string, string> = CLASS_YEAR_LABELS
const legacyRelationshipLabels: Record<string, string> = LEGACY_RELATIONSHIP_LABELS
const activityTypeLabels: Record<string, string> = ACTIVITY_TYPE_LABELS
const activityTypeIcons: Record<string, string> = ACTIVITY_TYPE_ICONS

// ── Filters ──────────────────────────────────────────────────────────────────

const searchQuery = ref('')
const stageFilter = ref<PipelineStage | null>(null)
const assignedChairFilter = ref<string | null>(null)

const isFiltered = computed(
  () =>
    searchQuery.value.trim() !== '' ||
    stageFilter.value !== null ||
    assignedChairFilter.value !== null
)

const filteredProspects = computed(() => {
  let rows = store.list
  if (stageFilter.value) rows = rows.filter((p) => p.pipelineStage === stageFilter.value)
  if (assignedChairFilter.value) {
    if (assignedChairFilter.value === '__unassigned__') {
      rows = rows.filter((p) => !p.assignedToPersonId)
    } else {
      rows = rows.filter((p) => p.assignedToPersonId === assignedChairFilter.value)
    }
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    rows = rows.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    )
  }
  return rows
})

const stageFilterOptions = computed(() => [
  { label: 'All stages', value: null },
  ...ALL_PIPELINE_STAGES.map((s) => ({
    label: PIPELINE_STAGE_LABELS[s],
    value: s
  }))
])

const chairFilterOptions = computed(() => [
  { label: 'All chairs', value: null },
  { label: 'Unassigned', value: '__unassigned__' },
  ...store.rushChairs.map((rc) => ({
    label: `${rc.firstName} ${rc.lastName}`,
    value: rc.id
  }))
])

const stageStats = computed(() => {
  const counts: Partial<Record<PipelineStage, number>> = {}
  store.list.forEach((p) => {
    counts[p.pipelineStage] = (counts[p.pipelineStage] ?? 0) + 1
  })
  return ALL_PIPELINE_STAGES.filter((s) => (counts[s] ?? 0) > 0).map((s) => ({
    stage: s,
    label: PIPELINE_STAGE_LABELS[s],
    count: counts[s]!
  }))
})

function toggleStageFilter(stage: PipelineStage) {
  stageFilter.value = stageFilter.value === stage ? null : stage
}

function clearFilters() {
  searchQuery.value = ''
  stageFilter.value = null
  assignedChairFilter.value = null
}

// ── Utilities ────────────────────────────────────────────────────────────────

function daysInStage(p: RushProspectSummary): string {
  const from = p.lastStageChangedAt ?? p.createdAt
  const days = Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000)
  return days === 0 ? 'Today' : `${days}d`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/** Date-only formatter (e.g. "Jul 12, 2026") for at-a-glance chips. */
function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ── Prospect detail dialog ───────────────────────────────────────────────────

const detailVisible = ref(false)
const detailLoading = ref(false)
const currentProspect = ref<RushProspectSummary | null>(null)
const fullProspect = ref<RushProspectResponse | null>(null)

// Profile rail edit mode (rail is read-only until the user opts in)
const profileEditMode = ref(false)
const savingProfile = ref(false)

// Auto-save state for the status controls (stage / chair / rating)
type StatusField = 'stage' | 'chair' | 'rating'
const statusSaving = ref<StatusField | null>(null)
const statusSavedField = ref<StatusField | null>(null)
let statusSavedTimer: ReturnType<typeof setTimeout> | null = null

// Happy-path pipeline stages (terminal/negative stages live off this track)
const HAPPY_PATH_STAGES: PipelineStage[] = [
  'inquiry',
  'screened',
  'active',
  'priority',
  'bid_pending',
  'bid_extended',
  'bid_accepted'
]
const happyPathStages = HAPPY_PATH_STAGES

const happyPathIndex = computed(() =>
  fullProspect.value ? HAPPY_PATH_STAGES.indexOf(fullProspect.value.pipelineStage) : -1
)

const isTerminalStage = computed(() =>
  fullProspect.value ? !HAPPY_PATH_STAGES.includes(fullProspect.value.pipelineStage) : false
)

function stepClass(i: number): string {
  const idx = happyPathIndex.value
  if (idx < 0) return 'bg-surface-200 text-surface-400'
  if (i < idx) return 'bg-[#6F8FAF] text-white'
  if (i === idx) return 'bg-[#6F8FAF] text-white ring-4 ring-[#6F8FAF]/25'
  return 'bg-surface-200 text-surface-400'
}

const mailtoLink = computed(() =>
  fullProspect.value
    ? `mailto:${fullProspect.value.email}?subject=Kansas Beta Rush&body=Hi ${fullProspect.value.firstName},%0A%0A`
    : ''
)

const initials = computed(() => {
  const p = fullProspect.value
  if (!p) return ''
  return `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase()
})

const editForm = ref({
  firstName: '',
  lastName: '',
  phone: '',
  classYear: null as ClassYear | null,
  enrollmentSemester: null as 'fall' | 'spring' | null,
  enrollmentYear: null as number | null,
  hometown: '',
  highSchool: '',
  major: '',
  gpaStr: '',
  actScoreStr: '',
  satScoreStr: '',
  pipelineStage: 'inquiry' as PipelineStage,
  internalRating: null as number | null,
  assignedToPersonId: null as string | null
})

async function openDetail(prospect: RushProspectSummary) {
  currentProspect.value = prospect
  detailVisible.value = true
  detailLoading.value = true
  profileEditMode.value = false
  statusSavedField.value = null
  await store.fetchOne(prospect.id)
  if (store.current) {
    fullProspect.value = store.current
    populateEditForm(store.current)
  }
  detailLoading.value = false
}

function populateEditForm(p: RushProspectResponse) {
  editForm.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone ?? '',
    classYear: p.classYear,
    enrollmentSemester: p.enrollmentSemester,
    enrollmentYear: p.enrollmentYear,
    hometown: p.hometown ?? '',
    highSchool: p.highSchool ?? '',
    major: p.major ?? '',
    gpaStr: p.gpa != null ? String(p.gpa) : '',
    actScoreStr: p.actScore != null ? String(p.actScore) : '',
    satScoreStr: p.satScore != null ? String(p.satScore) : '',
    pipelineStage: p.pipelineStage,
    internalRating: p.internalRating,
    assignedToPersonId: p.assignedToPersonId
  }
}

function onDetailClose() {
  fullProspect.value = null
  currentProspect.value = null
  newNote.value = ''
  profileEditMode.value = false
  statusSavedField.value = null
  statusSaving.value = null
  if (statusSavedTimer) {
    clearTimeout(statusSavedTimer)
    statusSavedTimer = null
  }
}

/**
 * Auto-save a single status control (pipeline stage, assigned chair, rating).
 * Sends a partial PATCH, keeps the dialog open, and flashes an inline "Saved".
 * On failure, the edited field is reverted to the last known server value.
 */
async function autoSaveStatus(field: StatusField, payload: UpdateRushProspectPayload) {
  if (!fullProspect.value || !canEditProspects.value) return
  statusSaving.value = field
  try {
    await store.updateProspect(fullProspect.value.id, payload)
    // Refresh from the server response — this also pulls in any newly
    // generated stage_change activity so the timeline updates instantly.
    fullProspect.value = store.current!
    statusSavedField.value = field
    if (statusSavedTimer) clearTimeout(statusSavedTimer)
    statusSavedTimer = setTimeout(() => {
      statusSavedField.value = null
    }, 2000)
  } catch {
    const p = fullProspect.value
    if (p) {
      if (field === 'stage') editForm.value.pipelineStage = p.pipelineStage
      else if (field === 'chair') editForm.value.assignedToPersonId = p.assignedToPersonId
      else if (field === 'rating') editForm.value.internalRating = p.internalRating
    }
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save change', life: 4000 })
  } finally {
    statusSaving.value = null
  }
}

function setRating(n: number) {
  if (!canEditProspects.value) return
  const next = editForm.value.internalRating === n ? null : n
  editForm.value.internalRating = next
  autoSaveStatus('rating', { internalRating: next })
}

/** Save the profile rail (reference fields only — status controls auto-save). */
async function saveProfile() {
  if (!fullProspect.value) return
  savingProfile.value = true
  try {
    const ef = editForm.value
    await store.updateProspect(fullProspect.value.id, {
      firstName: ef.firstName.trim() || undefined,
      lastName: ef.lastName.trim() || undefined,
      phone: ef.phone.trim() || undefined,
      classYear: ef.classYear ?? undefined,
      enrollmentSemester: ef.enrollmentSemester ?? null,
      enrollmentYear: ef.enrollmentYear ?? null,
      hometown: ef.hometown.trim() || undefined,
      highSchool: ef.highSchool.trim() || undefined,
      major: ef.major.trim() || undefined,
      gpa: ef.gpaStr ? parseFloat(ef.gpaStr) : null,
      actScore: ef.actScoreStr ? parseInt(ef.actScoreStr, 10) : null,
      satScore: ef.satScoreStr ? parseInt(ef.satScoreStr, 10) : null
    })
    fullProspect.value = store.current!
    profileEditMode.value = false
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Profile updated', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save changes', life: 4000 })
  } finally {
    savingProfile.value = false
  }
}

function cancelProfileEdit() {
  if (fullProspect.value) populateEditForm(fullProspect.value)
  profileEditMode.value = false
}

// ── Activity log ─────────────────────────────────────────────────────────────

const newNote = ref('')
const newActivityType = ref<'note' | 'event_attended' | 'call_logged'>('note')
const addingActivity = ref(false)

const manualActivityTypeOptions = [
  { label: 'Note', value: 'note', icon: 'pi pi-comment' },
  { label: 'Call', value: 'call_logged', icon: 'pi pi-phone' },
  { label: 'Event', value: 'event_attended', icon: 'pi pi-star' }
] as const

async function logActivity() {
  if (!fullProspect.value || !newNote.value.trim()) return
  addingActivity.value = true
  try {
    await store.addActivity(fullProspect.value.id, {
      activityType: newActivityType.value,
      note: newNote.value.trim()
    })
    fullProspect.value = store.current!
    newNote.value = ''
    newActivityType.value = 'note'
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to log activity', life: 4000 })
  } finally {
    addingActivity.value = false
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

function confirmDelete(prospect: RushProspectSummary) {
  confirm.require({
    message: `Remove ${prospect.firstName} ${prospect.lastName} from the pipeline? This cannot be undone.`,
    header: 'Delete Prospect',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.deleteProspect(prospect.id)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Prospect removed',
          life: 3000
        })
        if (detailVisible.value && currentProspect.value?.id === prospect.id) {
          detailVisible.value = false
        }
      } catch {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete prospect',
          life: 4000
        })
      }
    }
  })
}

// ── Select options ───────────────────────────────────────────────────────────

const classYearOptions = [
  { label: 'Freshman', value: 'freshman' },
  { label: 'Sophomore', value: 'sophomore' },
  { label: 'Junior', value: 'junior' },
  { label: 'Senior', value: 'senior' },
  { label: 'Other', value: 'other' }
]

const semesterOptions = [
  { label: 'Fall', value: 'fall' },
  { label: 'Spring', value: 'spring' }
]

const pipelineStageOptions = ALL_PIPELINE_STAGES.map((s) => ({
  label: PIPELINE_STAGE_LABELS[s],
  description: PIPELINE_STAGE_DESCRIPTIONS[s],
  value: s
}))

const rushChairOptions = computed(() =>
  store.rushChairs.map((rc) => ({
    label: `${rc.firstName} ${rc.lastName}`,
    value: rc.id,
    termLabel: rc.isCurrent ? `${rc.termLabel} (Current)` : `${rc.termLabel} (Upcoming)`
  }))
)
</script>
