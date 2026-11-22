const fs = require('fs');

const content = fs.readFileSync('src/app/portal.css', 'utf8');
const marker = '/* ─── 7. RESPONSIVE QUERIES ─────────────────────────────── */';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Marker not found!');
  process.exit(1);
}

const cleanPrefix = content.substring(0, idx);

const cleanResponsiveCSS = `/* ─── 7. COMPREHENSIVE LUXURY MOBILE & RESPONSIVE QUERIES ─── */

@media (max-width: 1024px) {
  /* Hide desktop tab row on tablet and mobile */
  .public-desktop-nav,
  .public-desktop-nav-tabs {
    display: none !important;
  }

  /* Show Bottom Navigation Bar */
  .mobile-bottom-nav-bar {
    display: flex !important;
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 9999 !important;
    height: 64px !important;
    background: rgba(8, 11, 18, 0.94) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border-top: 1.5px solid rgba(212, 175, 55, 0.3) !important;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(212, 175, 55, 0.1) !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  }

  /* Safe padding on the root container so bottom nav doesn't cover content */
  .public-portal-root {
    padding-bottom: calc(76px + env(safe-area-inset-bottom, 12px)) !important;
  }

  .hero-layout {
    grid-template-columns: 1fr;
  }

  .squares-catalog-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .portfolio-milestones-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .developers-showcase-grid,
  .specializations-grid,
  .sell-guarantees-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .four-pillars-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }

  .developers-strip-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .contact-main-grid-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .footer-content-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }

  .catalog-filter-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  /* 1. Header & Top Navigation Bar */
  .nav-inner-wrap {
    height: 62px;
  }

  .public-brand-link {
    gap: 8px;
  }

  .brand-primary-name {
    font-size: 15px;
    line-height: 1.2;
  }

  .brand-sub-tag {
    font-size: 9.5px;
  }

  .public-header-actions {
    gap: 8px;
  }

  .btn-header-consultation {
    display: none !important;
  }

  .btn-header-whatsapp {
    height: 34px;
    padding: 0 12px;
    font-size: 12px;
    gap: 4px;
    border-radius: 8px;
  }

  .mobile-hamburger-btn {
    display: none !important;
  }

  /* 2. Global Containers */
  .portal-container {
    padding: 0 16px;
  }

  /* 3. Hero Section & Landscape Background */
  .cinematic-hero-wrapper {
    min-height: auto;
    padding: 38px 0 46px 0;
  }

  .hero-landscape-bg-img {
    background-position: center 30%;
  }

  .hero-text-badge-pill {
    font-size: 10.5px;
    padding: 5px 12px;
    gap: 6px;
    max-width: 96%;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .cinematic-hero-headline {
    font-size: 24px;
    line-height: 1.38;
    margin-bottom: 12px;
    letter-spacing: normal;
  }

  .cinematic-hero-subtext {
    font-size: 13.5px;
    line-height: 1.65;
    margin-bottom: 22px;
    padding: 0 4px;
  }

  /* Floating Hero Search Box Mobile */
  .hero-floating-search-box {
    flex-direction: column;
    width: 100%;
    padding: 8px;
    gap: 8px;
    border-radius: 14px;
    margin-bottom: 22px;
  }

  .search-input-col {
    width: 100%;
    padding: 6px 10px;
  }

  .hero-search-inner-input {
    font-size: 13px;
    text-align: right;
  }

  .hero-search-action-btn {
    width: 100%;
    justify-content: center;
    padding: 11px 18px;
    font-size: 13.5px;
    border-radius: 10px;
  }

  /* Hero Actions Row Mobile */
  .hero-actions-row {
    flex-direction: column;
    width: 100%;
    gap: 10px;
    margin-bottom: 28px;
  }

  .hero-actions-row a {
    width: 100%;
    justify-content: center;
    text-align: center;
    padding: 12px 16px;
    font-size: 14px;
    border-radius: 10px;
  }

  /* Hero Stats Floating Ribbon Mobile (2x2 Grid) */
  .hero-stats-floating-ribbon {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px 12px;
    border-radius: 14px;
    width: 100%;
  }

  .ribbon-stat-divider {
    display: none;
  }

  .ribbon-stat-item {
    align-items: center;
    text-align: center;
  }

  .ribbon-stat-num {
    font-size: 21px;
    line-height: 1.2;
  }

  .ribbon-stat-label {
    font-size: 11px;
    line-height: 1.35;
  }

  /* 4. Developers Strip */
  .developers-strip-card {
    padding: 16px 14px;
    border-radius: 14px;
  }

  .developers-strip-title {
    font-size: 12.5px;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .developers-strip-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .dev-strip-item {
    padding: 10px 8px;
  }

  /* 5. Four Pillars & Highlight Cards */
  .four-pillars-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .pillar-glass-card {
    padding: 20px 16px;
    border-radius: 16px;
  }

  /* 6. Squares Catalog Grid & Cards Mobile */
  .squares-catalog-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .square-property-box {
    border-radius: 16px;
  }

  .square-cover-container {
    aspect-ratio: 16 / 10;
    width: 100%;
    max-height: 230px;
  }

  .square-card-body {
    padding: 16px 14px;
  }

  .square-title {
    font-size: 15px;
    line-height: 1.35;
  }

  .square-price-amount {
    font-size: 17px;
  }

  .square-specs-strip {
    gap: 6px;
  }

  .square-spec-chip {
    font-size: 11px;
    padding: 3px 7px;
  }

  .square-actions-row {
    gap: 8px;
  }

  .btn-square-details,
  .btn-square-whatsapp {
    padding: 10px 12px;
    font-size: 12px;
    border-radius: 8px;
  }

  /* 7. Catalog Filters Mobile */
  .catalog-filter-card {
    padding: 18px 14px;
    border-radius: 16px;
    margin-bottom: 24px;
  }

  .catalog-filter-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .filter-field-col {
    width: 100%;
  }

  /* 8. Portfolio Page Mobile */
  .portfolio-hero-banner {
    padding: 36px 0 24px 0;
  }

  .portfolio-main-heading {
    font-size: 24px;
    line-height: 1.35;
  }

  .portfolio-subheading {
    font-size: 13.5px;
    line-height: 1.65;
  }

  .portfolio-milestones-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .milestone-box-card {
    padding: 18px 12px;
    border-radius: 14px;
  }

  .milestone-value {
    font-size: 26px;
  }

  .milestone-label {
    font-size: 12.5px;
  }

  .developers-showcase-grid,
  .specializations-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .developer-card-item,
  .spec-card {
    padding: 18px 16px;
    border-radius: 14px;
  }

  .portfolio-cta-banner {
    padding: 24px 18px;
    flex-direction: column;
    text-align: center;
    gap: 16px;
    border-radius: 16px;
  }

  .portfolio-cta-banner a {
    width: 100%;
    justify-content: center;
  }

  /* 9. Sell Unit Page Mobile */
  .sell-page-hero {
    padding: 36px 0 20px 0;
  }

  .sell-guarantees-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .guarantee-box {
    padding: 18px 14px;
    border-radius: 14px;
  }

  .sell-form-wrapper-card {
    padding: 20px 14px;
    border-radius: 16px;
  }

  .grid-2-form,
  .grid-3-form,
  .grid-4-form {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .images-uploader-wrap {
    padding: 16px 12px;
    text-align: center;
  }

  /* 10. Contact Page Mobile */
  .contact-page-hero {
    padding: 36px 0 20px 0;
  }

  .contact-main-grid-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .dedicated-contact-form-card {
    padding: 20px 14px;
    border-radius: 16px;
  }

  .contact-direct-card {
    padding: 14px 14px;
    gap: 12px;
    border-radius: 12px;
  }

  .direct-card-icon {
    width: 38px;
    height: 38px;
  }

  .direct-card-val {
    font-size: 13.5px;
  }

  /* 11. Footer Mobile */
  .public-unified-footer {
    padding: 36px 0 20px 0;
    margin-top: 32px;
  }

  .footer-content-grid {
    grid-template-columns: 1fr;
    gap: 24px;
    text-align: right;
  }

  .footer-bottom-subbar {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .brand-primary-name {
    font-size: 14px;
  }

  .cinematic-hero-headline {
    font-size: 22px;
  }

  .hero-stats-floating-ribbon {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 12px 10px;
  }

  .ribbon-stat-num {
    font-size: 19px;
  }

  .bottom-nav-label {
    font-size: 10px;
  }

  .bottom-nav-item {
    padding: 4px 6px;
    min-width: 50px;
  }
}
`;

fs.writeFileSync('src/app/portal.css', cleanPrefix + cleanResponsiveCSS, 'utf8');
console.log('Successfully updated src/app/portal.css without nesting!');
