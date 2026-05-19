<template>
  <div class="history-page">

    <!-- Hero -->
    <section class="history-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="hero-eyebrow">Alpha Nu Chapter &bull; Beta Theta Pi</p>
        <h1 class="hero-title">Since 1873</h1>
        <p class="hero-subtitle">
          The first fraternity established at the University of Kansas — and more than a century
          and a half later, still setting the standard.
        </p>
      </div>
    </section>

    <!-- Founding -->
    <section class="content-section bg-white">
      <div class="section-inner two-col">
        <div class="text-col">
          <p class="eyebrow">The Beginning</p>
          <h2 class="section-title">A Chapter Born With the University</h2>
          <p class="body-text">
            In the spring of 1873, a small group of students at the fledgling University of Kansas
            gathered with a shared conviction: that college brotherhood, intellectual pursuit, and
            principled character could coexist — and indeed reinforce one another. They founded the
            Alpha Nu chapter of Beta Theta Pi, becoming the very first Greek-letter organization to
            plant roots in Lawrence.
          </p>
          <p class="body-text">
            The University itself had opened only four years earlier. The town of Lawrence was still
            rebuilding from the wounds of the Civil War. Yet those founding brothers chose this
            moment — one of uncertainty and possibility in equal measure — to build something
            lasting. Their bet proved sound. While dozens of fraternity chapters have come and gone
            at KU over the intervening 150 years, Alpha Nu has endured every one of them.
          </p>
          <p class="body-text">
            Beta Theta Pi, founded at Miami University in 1839, was already one of America's
            oldest fraternities when Alpha Nu was chartered. The values the founders embedded in
            the Fraternity — Men of Principle, cultivating the whole person — found fertile ground
            in Lawrence, and Alpha Nu has spent fifteen decades proving it.
          </p>
        </div>
        <div class="stat-col">
          <div class="founding-card">
            <span class="founding-year">1873</span>
            <span class="founding-label">Year Established</span>
            <div class="founding-divider"></div>
            <p class="founding-note">First fraternity at the University of Kansas</p>
            <p class="founding-note">One of the oldest continuous Greek chapters west of the Mississippi</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Photo Gallery -->
    <section class="content-section bg-slate-50">
      <div class="section-inner">
        <p class="eyebrow text-center">Through the Years</p>
        <h2 class="section-title text-center">A Glimpse of History</h2>
        <p class="body-text text-center max-w-2xl mx-auto mb-10">
          Images from the archive — the mansion, the brothers, the moments that became memory.
        </p>

        <div v-if="imageStore.loading" class="flex justify-center py-16">
          <ProgressSpinner />
        </div>

        <div v-else-if="imageStore.images.length === 0" class="empty-gallery">
          <i class="pi pi-images empty-gallery-icon"></i>
          <p>Historical photos coming soon.</p>
        </div>

        <div v-else class="gallery-grid">
          <div
            v-for="img in imageStore.images"
            :key="img.id"
            class="gallery-item"
            @click="openLightbox(img)"
          >
            <img
              v-if="signedUrls[img.id]"
              :src="signedUrls[img.id]"
              :alt="img.altText || img.caption || 'Chapter history photo'"
              class="gallery-img"
              loading="lazy"
            />
            <div v-else class="gallery-img-loading">
              <i class="pi pi-image gallery-img-placeholder-icon"></i>
            </div>
            <div v-if="img.caption" class="gallery-caption-overlay">
              <span>{{ img.caption }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Usher Mansion -->
    <section class="content-section bg-white">
      <div class="section-inner">
        <p class="eyebrow text-center">The Chapter House</p>
        <h2 class="section-title text-center">The Usher Mansion</h2>
        <p class="body-text text-center max-w-3xl mx-auto mb-12">
          For generations of Beta men, a single address has meant home: the Usher Mansion at
          1425 Tennessee Street, Lawrence, Kansas. The house is not just a building — it is a
          living monument to the chapter's history.
        </p>

        <div class="mansion-grid">
          <div class="mansion-text">
            <h3 class="subsection-title">An Architectural Landmark</h3>
            <p class="body-text">
              The Usher Mansion stands as one of the finest examples of late Victorian residential
              architecture in Douglas County. Its ornate façade, wraparound porch, and commanding
              presence on Tennessee Street have made it a recognizable landmark on the Hill for
              over a century. Listed on the National Register of Historic Places, the mansion
              represents an architectural heritage that the chapter is entrusted to preserve.
            </p>
            <h3 class="subsection-title mt-6">Named for a Founding Family</h3>
            <p class="body-text">
              The mansion takes its name from the Usher family, prominent figures in early
              Lawrence civic and political life. Cyrus K. Usher, for whom the estate is named,
              was a successful Kansas businessman whose family was deeply connected to the
              university community. When the chapter acquired the property, it inherited not just
              a house but a piece of Lawrence history — a stewardship Alpha Nu takes seriously to
              this day.
            </p>
            <h3 class="subsection-title mt-6">Preserving What Matters</h3>
            <p class="body-text">
              Maintaining a 150-year-old structure is no small undertaking. The Usher Mansion
              Historical Foundation was established specifically to fund the preservation and
              restoration of the property — ensuring that future generations of Beta men inherit
              a home worthy of the chapter's legacy. Ongoing restoration projects have addressed
              the original woodwork, the historic staircase, and the exterior detailing that makes
              the mansion irreplaceable.
            </p>
          </div>
          <div class="mansion-callout">
            <div class="callout-card">
              <i class="pi pi-building callout-icon"></i>
              <h4 class="callout-title">National Register of Historic Places</h4>
              <p class="callout-body">
                The Usher Mansion's historic designation reflects its architectural and cultural
                significance to Lawrence and to the State of Kansas.
              </p>
            </div>
            <div class="callout-card mt-4">
              <i class="pi pi-heart callout-icon"></i>
              <h4 class="callout-title">Usher Mansion Historical Foundation</h4>
              <p class="callout-body">
                A dedicated foundation supports the ongoing preservation of the property,
                protecting it for future chapters of brothers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Centennial Video -->
    <section class="content-section bg-slate-50">
      <div class="section-inner">
        <p class="eyebrow text-center">100 Years</p>
        <h2 class="section-title text-center">The Centennial Celebration</h2>
        <p class="body-text text-center max-w-2xl mx-auto mb-10">
          In 2013, Alpha Nu marked 100 years at the Usher Mansion. Brothers spanning
          generations returned to Lawrence for a weekend of reunion, remembrance, and
          celebration of the house that has been home to so many.
        </p>
        <div class="video-wrapper">
          <iframe
            src="https://www.youtube-nocookie.com/embed/eWb5Z-Gp5G0"
            title="100 Years of Alpha Nu at Usher Mansion 1913–2013"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </section>

    <!-- Timeline / Milestones -->
    <section class="content-section bg-white">
      <div class="section-inner">
        <p class="eyebrow text-center">A Century and a Half</p>
        <h2 class="section-title text-center">Chapter Milestones</h2>
        <p class="body-text text-center max-w-2xl mx-auto mb-12">
          A century and a half of brotherhood leaves a long trail of achievement. Here are a
          few of the moments that have defined Alpha Nu.
        </p>

        <div class="timeline-list">
          <div v-for="milestone in milestones" :key="milestone.year" class="timeline-item">
            <div class="timeline-year">{{ milestone.year }}</div>
            <div class="timeline-connector"><span class="timeline-dot"></span></div>
            <div class="timeline-content">
              <h4 class="timeline-title">{{ milestone.title }}</h4>
              <p class="timeline-body">{{ milestone.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Academic Excellence -->
    <section class="content-section excellence-section">
      <div class="section-inner two-col reverse">
        <div class="stat-col">
          <div class="excellence-card">
            <span class="excellence-num">94</span>
            <span class="excellence-denom">of 100</span>
            <span class="excellence-label">Semesters Atop the KU IFC GPA Rankings</span>
            <div class="founding-divider"></div>
            <p class="founding-note">Highest grade point average among all recognized organizations on campus — fraternities, sororities, and all others.</p>
          </div>
        </div>
        <div class="text-col">
          <p class="eyebrow">Academic Identity</p>
          <h2 class="section-title">Scholarship Is Not a Footnote</h2>
          <p class="body-text">
            At many fraternities, academic achievement is an afterthought — a box to check. At
            Alpha Nu, it is foundational. Beta Theta Pi's Seven Values are not a list of
            aspirations posted on a wall; they are the organizing principle of chapter life, and
            scholarship sits at the center of them.
          </p>
          <p class="body-text">
            The results speak plainly. Alpha Nu has held the highest grade point average among all
            recognized organizations at the University of Kansas — not just the Greek community,
            but every fraternity, sorority, honor society, and student organization — for 94 of
            the last 100 semesters. That is not a streak. That is a culture.
          </p>
          <p class="body-text">
            Brothers support one another academically through chapter study hours, alumni mentorship,
            and a genuine expectation that intellectual excellence and fraternity membership are
            not in tension — they are inseparable.
          </p>
        </div>
      </div>
    </section>

    <!-- Traditions -->
    <section class="content-section bg-slate-50">
      <div class="section-inner">
        <p class="eyebrow text-center">Living History</p>
        <h2 class="section-title text-center">Traditions That Endure</h2>
        <p class="body-text text-center max-w-2xl mx-auto mb-12">
          The measure of a chapter's health is not only what it accomplishes but what it
          carries forward. Alpha Nu's traditions are living threads connecting every generation
          of brothers.
        </p>

        <div class="traditions-grid">
          <div v-for="tradition in traditions" :key="tradition.name" class="tradition-card">
            <div class="tradition-icon-wrap">
              <i :class="tradition.icon" class="tradition-icon"></i>
            </div>
            <h3 class="tradition-name">{{ tradition.name }}</h3>
            <p class="tradition-body">{{ tradition.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Lightbox -->
    <Dialog
      v-model:visible="lightboxVisible"
      modal
      :header="lightboxCaption || 'Chapter History'"
      class="history-lightbox"
      :style="{ width: '90vw', maxWidth: '900px' }"
    >
      <img
        v-if="lightboxUrl"
        :src="lightboxUrl"
        :alt="lightboxCaption || 'Chapter history photo'"
        class="w-full rounded-lg"
      />
    </Dialog>

    <!-- Closing Band -->
    <section class="closing-band">
      <div class="closing-inner">
        <h2 class="closing-title">Be Part of What Comes Next</h2>
        <p class="closing-body">
          Every brother who has passed through Alpha Nu has added a line to this story.
          The chapter that was founded in 1873 is still writing — and the best chapters
          are still ahead.
        </p>
        <router-link to="/rush">
          <Button label="Learn About Rush" icon="pi pi-arrow-right" iconPos="right" class="closing-btn" />
        </router-link>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { useHistoryImageStore } from '@/stores/historyImage'
import type { HistoryImage } from '@/stores/historyImage'

const imageStore = useHistoryImageStore()
const signedUrls = ref<Record<string, string>>({})
const lightboxVisible = ref(false)
const lightboxUrl = ref('')
const lightboxCaption = ref('')

onMounted(async () => {
  await imageStore.fetchPublic()
  for (const img of imageStore.images) {
    loadSignedUrl(img)
  }
})

async function loadSignedUrl(img: HistoryImage) {
  try {
    signedUrls.value[img.id] = await imageStore.getSignedUrl(img.id)
  } catch {
    // silent — placeholder stays visible
  }
}

async function openLightbox(img: HistoryImage) {
  if (!signedUrls.value[img.id]) {
    await loadSignedUrl(img)
  }
  lightboxUrl.value = signedUrls.value[img.id] || ''
  lightboxCaption.value = img.caption || ''
  lightboxVisible.value = true
}

const milestones = [
  {
    year: '1873',
    title: 'Charter Established',
    body: 'Alpha Nu chapter is founded, becoming the first Greek-letter fraternity at the University of Kansas. Lawrence is still a frontier town; the University itself is barely four years old.',
  },
  {
    year: '1890s',
    title: 'The Usher Mansion',
    body: 'The chapter acquires the storied Usher Mansion on Tennessee Street, one of the finest Victorian residences in Douglas County. It becomes the beating heart of Alpha Nu life.',
  },
  {
    year: '1900s–1920s',
    title: 'Growth Through the Progressive Era',
    body: "As KU's enrollment expands, Alpha Nu grows with it — drawing members who go on to distinguish themselves in Kansas politics, business, law, and medicine. Alumni networks deepen across the state.",
  },
  {
    year: '1940s',
    title: 'Service in World War II',
    body: 'Dozens of Alpha Nu brothers answer the call during World War II. The chapter honors their service and welcomes the survivors home, rebuilding chapter life in the postwar boom with renewed purpose.',
  },
  {
    year: '1960s–1970s',
    title: 'Through the Counterculture',
    body: 'A turbulent era for Greek life nationally; Alpha Nu adapts without abandoning its identity. The chapter emerges with its traditions intact and a sharper sense of what makes Beta Beta different.',
  },
  {
    year: '2000s',
    title: 'Academic Dominance Formalized',
    body: 'The chapter begins regularly topping the KU IFC GPA rankings, a streak that will reach 94 of 100 semesters. Scholarship becomes the most visible proof of Alpha Nu\'s commitment to the Seven Values.',
  },
  {
    year: '2010s',
    title: 'The Usher Mansion Historical Foundation',
    body: 'Alumni establish a dedicated foundation to fund the long-term preservation of the historic chapter house, protecting an irreplaceable piece of Lawrence architectural heritage for future generations.',
  },
  {
    year: 'Today',
    title: 'Still Setting the Standard',
    body: "One hundred and fifty years after its founding, Alpha Nu leads the KU Greek community in academics, campus involvement, and brotherhood. The chapter that started first is still finishing first.",
  },
]

const traditions = [
  {
    name: 'The German',
    icon: 'pi pi-star',
    body: 'One of the oldest social traditions in the chapter, the German is a formal brotherhood gathering that traces its roots to the early twentieth century. It remains a highlight of the chapter calendar — a chance for brothers across generations to celebrate what they share.',
  },
  {
    name: 'Turkey Pull',
    icon: 'pi pi-trophy',
    body: "An Alpha Nu institution, the Turkey Pull is the friendly athletic competition that turns autumn into something memorable. Brothers compete with the kind of effort usually reserved for the intramural fields — because at Beta, everything worth doing is worth winning.",
  },
  {
    name: 'Rock Chalk Revue',
    icon: 'pi pi-heart',
    body: "KU's premiere campus talent show, and a stage Alpha Nu knows well. Brothers pair with a sorority partner to write, choreograph, design sets for, and perform an original show from scratch. The work is serious; the performance is something no one in the house forgets.",
  },
  {
    name: 'Intramural Excellence',
    icon: 'pi pi-flag',
    body: "Alpha Nu competes — and wins. Perennial intramural champions across multiple sports, the chapter brings to the IM fields the same competitive DNA that marks its academic record. Brotherhood built under pressure is brotherhood that lasts.",
  },
  {
    name: 'Pledge Class Bond',
    icon: 'pi pi-users',
    body: "With intentionally sized pledge classes of around 25 men, every Alpha Nu member spends four years in close quarters with their pledge brothers. That proximity forges friendships that don't fade at graduation — they show up at weddings, reunions, and the moments that matter most.",
  },
  {
    name: 'Campus Leadership',
    icon: 'pi pi-id-card',
    body: "From the student senate to student body presidents, Alpha Nu men have shaped the University of Kansas from within. Campus leadership is not an occasional achievement — it is an expectation, one the chapter has met in virtually every generation.",
  },
]
</script>

<style scoped>
.history-page {
  font-family: 'Georgia', 'Times New Roman', serif;
}

/* ── Hero ─────────────────────────────────────────────── */
.history-hero {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f1923 0%, #1a2a3a 40%, #2c3e50 100%);
  overflow: hidden;
}
.history-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 20% 80%, rgba(111, 143, 175, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 90, 43, 0.1) 0%, transparent 50%);
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%);
}
.hero-content {
  position: relative;
  text-align: center;
  padding: 4rem 2rem;
  max-width: 800px;
}
.hero-eyebrow {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(111, 143, 175, 0.9);
  margin-bottom: 1rem;
}
.hero-title {
  font-size: clamp(3.5rem, 10vw, 7rem);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 1.5rem;
}
.hero-subtitle {
  font-size: clamp(1rem, 2.5vw, 1.35rem);
  color: rgba(255,255,255,0.8);
  line-height: 1.7;
  max-width: 600px;
  margin: 0 auto;
  font-style: italic;
}

/* ── Shared section layout ────────────────────────────── */
.content-section {
  padding: 5rem 1.5rem;
}
.section-inner {
  max-width: 1100px;
  margin: 0 auto;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: start;
}
.two-col.reverse {
  direction: rtl;
}
.two-col.reverse > * {
  direction: ltr;
}
@media (max-width: 768px) {
  .two-col, .two-col.reverse {
    grid-template-columns: 1fr;
    direction: ltr;
    gap: 2.5rem;
  }
}
.eyebrow {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6F8FAF;
  margin-bottom: 0.5rem;
}
.section-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: #1a2a3a;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}
.subsection-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a2a3a;
  margin-bottom: 0.5rem;
  font-family: 'Inter', sans-serif;
}
.body-text {
  color: #4a5568;
  line-height: 1.8;
  margin-bottom: 1.25rem;
  font-size: 1rem;
}

/* ── Founding card ────────────────────────────────────── */
.founding-card {
  background: linear-gradient(135deg, #1a2a3a 0%, #2c3e50 100%);
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  text-align: center;
  color: white;
  position: sticky;
  top: 6rem;
}
.founding-year {
  display: block;
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  color: #6F8FAF;
  margin-bottom: 0.25rem;
}
.founding-label {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
  margin-bottom: 1.5rem;
}
.founding-divider {
  width: 3rem;
  height: 2px;
  background: #6F8FAF;
  margin: 0 auto 1.25rem;
}
.founding-note {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.75);
  line-height: 1.6;
  margin-bottom: 0.75rem;
  font-style: italic;
}

/* ── Usher Mansion ────────────────────────────────────── */
.mansion-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 3rem;
  align-items: start;
}
@media (max-width: 900px) {
  .mansion-grid {
    grid-template-columns: 1fr;
  }
}
.callout-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #6F8FAF;
  border-radius: 0.75rem;
  padding: 1.5rem;
}
.callout-icon {
  font-size: 1.5rem;
  color: #6F8FAF;
  margin-bottom: 0.75rem;
  display: block;
}
.callout-title {
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a2a3a;
  margin-bottom: 0.5rem;
}
.callout-body {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.6;
}

/* ── Timeline ─────────────────────────────────────────── */
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.timeline-item {
  display: grid;
  grid-template-columns: 100px 40px 1fr;
  gap: 0 1rem;
  align-items: start;
  padding-bottom: 2.5rem;
}
@media (max-width: 600px) {
  .timeline-item {
    grid-template-columns: 70px 32px 1fr;
    gap: 0 0.5rem;
  }
}
.timeline-year {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #6F8FAF;
  padding-top: 0.125rem;
  text-align: right;
}
.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6F8FAF;
  border: 2px solid white;
  outline: 2px solid #6F8FAF;
  flex-shrink: 0;
  margin-top: 0.2rem;
}
.timeline-item:not(:last-child) .timeline-connector::after {
  content: '';
  flex: 1;
  width: 2px;
  background: #e2e8f0;
  margin-top: 4px;
}
.timeline-title {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #1a2a3a;
  margin-bottom: 0.375rem;
}
.timeline-body {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.7;
}

/* ── Excellence ───────────────────────────────────────── */
.excellence-section {
  background: linear-gradient(135deg, #f0f4f8 0%, #e8eef4 100%);
}
.excellence-card {
  background: linear-gradient(135deg, #1a2a3a 0%, #2c3e50 100%);
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  text-align: center;
  color: white;
  position: sticky;
  top: 6rem;
}
.excellence-num {
  display: block;
  font-size: 5rem;
  font-weight: 800;
  color: #6F8FAF;
  line-height: 1;
}
.excellence-denom {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  margin-bottom: 1rem;
}
.excellence-label {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

/* ── Traditions ───────────────────────────────────────── */
.traditions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
@media (max-width: 900px) {
  .traditions-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .traditions-grid { grid-template-columns: 1fr; }
}
.tradition-card {
  background: white;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  padding: 2rem 1.5rem;
  transition: box-shadow 0.2s, transform 0.2s;
}
.tradition-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  transform: translateY(-3px);
}
.tradition-icon-wrap {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6F8FAF22 0%, #6F8FAF44 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}
.tradition-icon {
  font-size: 1.4rem;
  color: #6F8FAF;
}
.tradition-name {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #1a2a3a;
  margin-bottom: 0.625rem;
}
.tradition-body {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.7;
}

/* ── Centennial Video ─────────────────────────────────── */
.video-wrapper {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  aspect-ratio: 16 / 9;
}
.video-wrapper iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── Photo Gallery ────────────────────────────────────── */
.empty-gallery {
  text-align: center;
  color: #94a3b8;
  padding: 4rem 2rem;
}
.empty-gallery-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  opacity: 0.4;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
@media (max-width: 768px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .gallery-grid { grid-template-columns: 1fr; }
}
.gallery-item {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 0.75rem;
  cursor: pointer;
  background: #f1f5f9;
}
.gallery-item:hover .gallery-caption-overlay {
  opacity: 1;
}
.gallery-item:hover .gallery-img {
  transform: scale(1.04);
}
.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}
.gallery-img-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
}
.gallery-img-placeholder-icon {
  font-size: 2rem;
  color: #cbd5e1;
}
.gallery-caption-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
  padding: 2rem 1rem 0.875rem;
  color: white;
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0;
  transition: opacity 0.25s ease;
}

/* ── Closing Band ─────────────────────────────────────── */
.closing-band {
  background: linear-gradient(135deg, #1a2a3a 0%, #2c3e50 100%);
  padding: 5rem 2rem;
}
.closing-inner {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
}
.closing-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: white;
  margin-bottom: 1.25rem;
}
.closing-body {
  color: rgba(255,255,255,0.75);
  font-size: 1.1rem;
  line-height: 1.8;
  margin-bottom: 2rem;
  font-style: italic;
}
.closing-btn {
  background: #6F8FAF !important;
  border-color: #6F8FAF !important;
  color: white !important;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  padding: 0.875rem 2rem;
}
.closing-btn:hover {
  background: #5a7a9a !important;
  border-color: #5a7a9a !important;
}
</style>
