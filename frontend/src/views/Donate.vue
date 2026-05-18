<template>
  <div class="bg-white min-h-screen">

    <!-- Hero -->
    <div class="donate-hero">
      <div class="max-w-4xl mx-auto text-center px-6">
        <p class="donate-hero-eyebrow">Support Alpha Nu</p>
        <h1 class="donate-hero-title">Give Back to Beta</h1>
        <p class="donate-hero-sub">
          Your generosity preserves an extraordinary piece of American history and invests
          in the brothers — past, present, and future — of Alpha Nu.
        </p>
        <div class="w-16 h-1 bg-white/30 rounded-full mx-auto mt-8"></div>
      </div>
    </div>

    <!-- Foundation Cards -->
    <div class="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

      <!-- Usher Mansion Historical Foundation -->
      <div class="foundation-card">
        <div class="foundation-card-header mansion-header">
          <div class="foundation-badge">National Register of Historic Places</div>
          <i class="pi pi-building foundation-header-icon"></i>
          <h2 class="foundation-title">Usher Mansion Historical Foundation</h2>
          <p class="foundation-subtitle">Preserving a Piece of American History</p>
        </div>

        <div class="foundation-body">
          <p class="foundation-desc">
            Built in 1873 by John Palmer Usher — Abraham Lincoln's Secretary of the Interior —
            our chapter house is one of the most historically significant Greek houses in America.
            Home to Alpha Nu since 1913, Usher Mansion has hosted American legends and sheltered
            over a century of brotherhood. It deserves to stand for centuries more.
          </p>

          <ul class="foundation-facts">
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Built by Lincoln's Secretary of the Interior, John Palmer Usher (1863–1865)</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Vermont limestone walls 18 inches thick — Italian Renaissance architecture</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Walt Whitman was a guest in September 1879, composing a poem about Mt. Oread</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Lincoln artifacts on display: a clock gifted by Lincoln and a marble fireplace donated by his Cabinet</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Gold-leafed walnut woodwork by the Pullman Palace Car Company — still intact today</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Home to Alpha Nu brothers continuously since 1913</span>
            </li>
          </ul>

          <a
            href="https://betaumhf.causevox.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="foundation-cta mansion-cta"
          >
            <span>Donate to Preservation</span>
            <i class="pi pi-external-link text-sm"></i>
          </a>
          <p class="foundation-cta-note">Opens our secure donation portal on CauseVox</p>
        </div>
      </div>

      <!-- Alpha Nu Education Foundation -->
      <div class="foundation-card">
        <div class="foundation-card-header education-header">
          <div class="foundation-badge">Alpha Nu Education Foundation</div>
          <i class="pi pi-graduation-cap foundation-header-icon"></i>
          <h2 class="foundation-title">Alpha Nu Education Foundation</h2>
          <p class="foundation-subtitle">Investing in the Next Generation</p>
        </div>

        <div class="foundation-body">
          <p class="foundation-desc">
            The Alpha Nu Education Foundation supports the academic excellence, leadership
            development, and character formation that define the Beta experience at the
            University of Kansas. Your gift directly impacts the lives of our brothers
            and the strength of the chapter for generations to come.
          </p>

          <ul class="foundation-facts">
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Scholarship funding for academically deserving members</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Leadership development programs and workshops</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Academic support resources and mentorship initiatives</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Programming that advances Beta's seven core values</span>
            </li>
            <li>
              <i class="pi pi-star-fill fact-icon"></i>
              <span>Supporting the chapter that has held the #1 GPA at KU for 20+ years</span>
            </li>
          </ul>

          <a
            href="https://betaanef.causevox.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="foundation-cta education-cta"
          >
            <span>Donate to the Foundation</span>
            <i class="pi pi-external-link text-sm"></i>
          </a>
          <p class="foundation-cta-note">Opens our secure donation portal on CauseVox</p>
        </div>
      </div>
    </div>

    <!-- Donate by Mail -->
    <div class="max-w-6xl mx-auto px-6 pb-4">
      <div class="mail-section">
        <div class="mail-icon-wrap">
          <i class="pi pi-envelope mail-icon"></i>
        </div>
        <div class="mail-body">
          <h3 class="mail-title">Prefer to Give by Mail?</h3>
          <p class="mail-desc">
            Make your check payable to the foundation of your choice —
            <strong>Usher Mansion Historical Foundation (UMHF)</strong> or the
            <strong>Alpha Nu Education Foundation (ANEF)</strong> — and mail to the address below.
          </p>
          <div class="mail-address">
            <p>Beta Theta Pi, Alpha Nu Chapter</p>
            <p>P.O. Box 2187</p>
            <p>Columbus, GA 31902-2187</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Closing Band -->
    <div class="donate-closing-band">
      <div class="max-w-3xl mx-auto text-center px-6">
        <i class="pi pi-heart text-3xl text-[#6F8FAF] mb-4 block"></i>
        <h2 class="text-2xl font-bold text-slate-800 mb-3">Every Gift Matters</h2>
        <p class="text-slate-600 leading-relaxed">
          From preserving 150-year-old limestone walls to funding a brother's scholarship,
          your contribution to Alpha Nu leaves a legacy that outlasts any one chapter or pledge class.
          Thank you for being part of the brotherhood.
        </p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
  /* ── Hero ── */
  .donate-hero {
    background: linear-gradient(135deg, #1e3449 0%, #2c4a66 50%, #1e3449 100%);
    padding: 5rem 1.5rem 4.5rem;
    position: relative;
    overflow: hidden;
  }

  .donate-hero::before {
    content: '';
    position: absolute;
    top: -40%;
    right: -10%;
    width: 50%;
    height: 200%;
    background: radial-gradient(ellipse at center, rgba(111,143,175,0.15) 0%, transparent 65%);
    pointer-events: none;
  }

  .donate-hero-eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 0.75rem;
  }

  .donate-hero-title {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    font-weight: 800;
    color: #ffffff;
    line-height: 1.1;
    margin-bottom: 1.25rem;
  }

  .donate-hero-sub {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.72);
    line-height: 1.7;
    max-width: 600px;
    margin: 0 auto;
  }

  /* ── Foundation Cards ── */
  .foundation-card {
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.25s, transform 0.25s;
  }

  .foundation-card:hover {
    box-shadow: 0 12px 40px rgba(0,0,0,0.13);
    transform: translateY(-3px);
  }

  .foundation-card-header {
    padding: 2.25rem 2rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .mansion-header {
    background: linear-gradient(140deg, #2c4a66 0%, #3d5f7e 100%);
  }

  .education-header {
    background: linear-gradient(140deg, #334155 0%, #475569 100%);
  }

  .foundation-badge {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 9999px;
    padding: 0.25rem 0.85rem;
    margin-bottom: 1.25rem;
  }

  .foundation-header-icon {
    display: block;
    font-size: 2.5rem;
    color: rgba(255,255,255,0.25);
    position: absolute;
    top: 1.5rem;
    right: 1.75rem;
  }

  .foundation-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.25;
    margin-bottom: 0.4rem;
  }

  .foundation-subtitle {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.65);
    font-style: italic;
  }

  .foundation-body {
    padding: 2rem;
    background: #ffffff;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .foundation-desc {
    font-size: 0.95rem;
    color: #475569;
    line-height: 1.75;
    margin-bottom: 1.5rem;
  }

  /* ── Fact List ── */
  .foundation-facts {
    list-style: none;
    padding: 0;
    margin: 0 0 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .foundation-facts li {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    font-size: 0.875rem;
    color: #334155;
    line-height: 1.5;
  }

  .fact-icon {
    font-size: 0.55rem;
    color: #6F8FAF;
    flex-shrink: 0;
    margin-top: 0.45rem;
  }

  /* ── CTA ── */
  .foundation-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1.5rem;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
    margin-top: auto;
  }

  .mansion-cta {
    background: linear-gradient(135deg, #3d5f7e, #2c4a66);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(44, 74, 102, 0.35);
  }

  .mansion-cta:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(44, 74, 102, 0.45);
  }

  .education-cta {
    background: linear-gradient(135deg, #475569, #334155);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(51, 65, 85, 0.3);
  }

  .education-cta:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(51, 65, 85, 0.4);
  }

  .foundation-cta-note {
    font-size: 0.75rem;
    color: #94a3b8;
    text-align: center;
    margin-top: 0.5rem;
  }

  .foundation-coming-soon {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 0.5rem;
    padding: 0.6rem 0.875rem;
    margin-bottom: 1rem;
  }

  /* ── Mail Section ── */
  .mail-section {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 5px solid #6F8FAF;
    border-radius: 1rem;
    padding: 1.75rem 2rem;
    flex-wrap: wrap;
  }

  .mail-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #7a9bbf, #4e6e8e);
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(111, 143, 175, 0.35);
  }

  .mail-icon {
    font-size: 1.25rem;
    color: #ffffff;
  }

  .mail-body {
    flex: 1;
    min-width: 220px;
  }

  .mail-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .mail-desc {
    font-size: 0.9rem;
    color: #475569;
    line-height: 1.65;
    margin-bottom: 1rem;
  }

  .mail-address {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.8;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    display: inline-block;
  }

  /* ── Closing ── */
  .donate-closing-band {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 4rem 1.5rem;
  }
</style>
