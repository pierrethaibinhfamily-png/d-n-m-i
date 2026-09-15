const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'));
const tabPanels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
const entryHero = document.querySelector('#entry-hero');
const capabilityHero = document.querySelector('#capability-hero');
const planScreen = document.querySelector('#plan-screen');
const routeMapLanding = document.querySelector('#route-map-landing');
const siteHeader = document.querySelector('.site-header');
const mainContent = document.querySelector('#main-content');
const returnToCoverButton = document.querySelector('#return-to-cover');
const returnLabel = document.querySelector('#return-label');
const planFooter = document.querySelector('#plan-footer');
const workspaceNav = document.querySelector('#plan-sidebar');
const productFullscreenPage = document.querySelector('[data-company-fullscreen-trigger]');
const companyFullscreenButton = document.querySelector('[data-company-fullscreen]');
const companyFullscreenExitButton = document.querySelector('[data-company-fullscreen-exit]');
const companyFullscreenIcon = document.querySelector('[data-company-fullscreen-icon]');
const companyFullscreenLabel = document.querySelector('[data-company-fullscreen-label]');
const productDetailCards = Array.from(document.querySelectorAll('.company-product-detail'));
const productFocusBackdrop = document.querySelector('[data-product-focus-backdrop]');
const guidesProcessPages = Array.from(document.querySelectorAll('[data-guides-page]'));
const guidesPagePrevious = document.querySelector('[data-guides-page-prev]');
const guidesPageNext = document.querySelector('[data-guides-page-next]');
const guidesPageCurrent = document.querySelector('[data-guides-page-current]');
const privacyLock = document.querySelector('#privacy-lock');
const privacyLockForm = document.querySelector('#privacy-lock-form');
const privacyLockCode = document.querySelector('#privacy-lock-code');
const privacyLockFeedback = document.querySelector('#privacy-lock-feedback');
const lockableContent = Array.from(document.querySelectorAll('[data-lockable-content]'));let currentScreen = 'cover';
let fullscreenRequestPending = false;
let activeProductDetailCard = null;
let activeGuidesPage = 0;
let isRouteMapLandingOpen = false;
let mapReturnTab = 'company';

const PRIVACY_LOCK_SESSION_KEY = 'onbird-tour-plan-view-unlocked';

function getPrivacyLockSession() {
  try {
    return window.sessionStorage.getItem(PRIVACY_LOCK_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function setPrivacyLockSession() {
  try {
    window.sessionStorage.setItem(PRIVACY_LOCK_SESSION_KEY, 'true');
  } catch {
    // The page remains usable when browser storage is unavailable.
  }
}

function setPrivacyLock(isLocked) {
  if (!privacyLock) return;

  privacyLock.hidden = !isLocked;
  document.body.classList.toggle('is-content-locked', isLocked);
  lockableContent.forEach((element) => {
    element.inert = isLocked;
  });

  if (isLocked) {
    window.requestAnimationFrame(() => privacyLockCode?.focus());
  }
}

function initialisePrivacyLock() {
  if (!privacyLock || !privacyLockForm || !privacyLockCode || !privacyLockFeedback) return;

  setPrivacyLock(!getPrivacyLockSession());

  privacyLockForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (privacyLockCode.value.trim() !== '1234') {
      privacyLockFeedback.textContent = 'Mã chưa đúng. Hãy thử lại.';
      privacyLockCode.select();
      return;
    }

    setPrivacyLockSession();
    privacyLockFeedback.textContent = '';
    privacyLockCode.value = '';
    setPrivacyLock(false);
    entryHero?.focus({ preventScroll: true });
  });
}
function isPresentationDesktop() {
  return window.matchMedia('(min-width: 821px)').matches;
}

function isPresentationFullscreen() {
  return document.fullscreenElement === mainContent;
}

function updateFullscreenNavigationLabel() {
  if (!companyFullscreenExitButton) return;

  const returnsToProduct = isRouteMapLandingOpen;
  companyFullscreenIcon.textContent = returnsToProduct ? '←' : '→';
  companyFullscreenLabel.textContent = returnsToProduct ? 'Trang trước' : 'Next page';
  companyFullscreenExitButton.setAttribute(
    'aria-label',
    returnsToProduct
      ? 'Trang trước: quay lại nội dung cuộc họp'
      : 'Next page: mở bản đồ hành trình 3 đảo',
  );
}

function showRouteMapLanding() {
  if (!routeMapLanding || !isPresentationFullscreen()) return;

  closeProductDetailCard({ restoreFocus: false });
  mapReturnTab = tabButtons.find((button) => button.getAttribute('aria-selected') === 'true')?.dataset.tab || 'company';
  planScreen.hidden = true;
  routeMapLanding.hidden = false;
  mainContent.classList.add('is-route-map-landing');
  isRouteMapLandingOpen = true;
  updateFullscreenNavigationLabel();
  routeMapLanding.focus({ preventScroll: true });
}

function returnToProductLanding({ focus = true } = {}) {
  if (!isRouteMapLandingOpen) return;

  routeMapLanding.hidden = true;
  planScreen.hidden = false;
  mainContent.classList.remove('is-route-map-landing');
  isRouteMapLandingOpen = false;

  const returnTab = tabButtons.find((button) => button.dataset.tab === mapReturnTab);
  if (returnTab) {
    activateTab(returnTab);
  }

  updateFullscreenNavigationLabel();

  if (focus) {
    planScreen.focus({ preventScroll: true });
  }
}

function setFullscreenSidebarOpen(isOpen) {
  if (!isPresentationFullscreen() || currentScreen !== 'plan') return;

  planScreen.classList.toggle('is-fullscreen-sidebar-open', isOpen);
  setSidebarInteractive(isOpen);
}

function syncPresentationFullscreenControls() {
  const isFullscreen = isPresentationFullscreen();

  if (!isFullscreen && isRouteMapLandingOpen) {
    returnToProductLanding({ focus: false });
  }

  mainContent.classList.toggle('is-native-fullscreen', isFullscreen);
  planScreen.classList.toggle('is-fullscreen-presentation', isFullscreen);
  companyFullscreenButton?.setAttribute('aria-pressed', String(isFullscreen));
  updateFullscreenNavigationLabel();

  if (companyFullscreenExitButton) {
    companyFullscreenExitButton.hidden = !isFullscreen;
  }

  if (isFullscreen && currentScreen === 'plan' && !isRouteMapLandingOpen) {
    setFullscreenSidebarOpen(false);
    return;
  }

  planScreen.classList.remove('is-fullscreen-sidebar-open');
  setSidebarInteractive(true);
}

function requestPresentationFullscreen() {
  if (!mainContent || isPresentationFullscreen() || !mainContent.requestFullscreen) {
    return Promise.resolve(isPresentationFullscreen());
  }

  if (fullscreenRequestPending) {
    return Promise.resolve(null);
  }

  fullscreenRequestPending = true;

  return mainContent.requestFullscreen()
    .then(() => {
      fullscreenRequestPending = false;
      return isPresentationFullscreen();
    })
    .catch(() => {
      fullscreenRequestPending = false;
      return false;
    });
}

function exitPresentationFullscreen() {
  if (!isPresentationFullscreen() || !document.exitFullscreen) {
    return Promise.resolve();
  }

  return document.exitFullscreen().catch(() => {});
}

function setSidebarInteractive(isInteractive) {
  workspaceNav.toggleAttribute('inert', !isInteractive);
  workspaceNav.setAttribute('aria-hidden', String(!isInteractive));
}

function closeProductDetailCard({ restoreFocus = true } = {}) {
  if (!activeProductDetailCard) return;

  const card = activeProductDetailCard;
  activeProductDetailCard = null;
  card.classList.remove('is-product-focus-active');
  card.setAttribute('aria-expanded', 'false');
  card.querySelector('.company-product-focus-close')?.remove();
  productFullscreenPage?.classList.remove('is-product-card-focus-open');

  if (productFocusBackdrop) {
    productFocusBackdrop.hidden = true;
  }

  if (restoreFocus && card.isConnected) {
    card.focus({ preventScroll: true });
  }
}

function openProductDetailCard(card) {
  if (!card || activeProductDetailCard === card) return;

  closeProductDetailCard({ restoreFocus: false });
  activeProductDetailCard = card;
  setFullscreenSidebarOpen(false);
  productFullscreenPage?.classList.add('is-product-card-focus-open');
  card.classList.add('is-product-focus-active');
  card.setAttribute('aria-expanded', 'true');

  if (productFocusBackdrop) {
    productFocusBackdrop.hidden = false;
  }

  const closeButton = document.createElement('button');
  closeButton.className = 'company-product-focus-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Thu nhỏ thẻ nội dung');
  closeButton.innerHTML = '<span aria-hidden="true">×</span><span>Thu nhỏ · Esc</span>';
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    closeProductDetailCard();
  });
  card.append(closeButton);
  closeButton.focus({ preventScroll: true });
}

function resetPlanPresentation() {
  planScreen.classList.remove(
    'is-plan-entering',
    'is-sidebar-collapsed',
    'is-sidebar-overlay-ready',
    'is-sidebar-open',
    'is-fullscreen-sidebar-open',
  );
  setSidebarInteractive(true);
}

function beginPlanPresentation() {
  resetPlanPresentation();

  if (!isPresentationDesktop()) return;

  planScreen.classList.add('is-plan-entering');
}

function keepDepartmentSelectionFullscreen() {
  if (currentScreen !== 'plan' || isPresentationFullscreen()) return;

  requestPresentationFullscreen();
}

function activateGuidesPage(index) {
  if (!guidesProcessPages.length) return;

  const nextIndex = Math.max(0, Math.min(index, guidesProcessPages.length - 1));
  activeGuidesPage = nextIndex;

  guidesProcessPages.forEach((page, pageIndex) => {
    const isActive = pageIndex === nextIndex;
    page.hidden = !isActive;
    page.classList.toggle('is-active', isActive);
  });

  if (guidesPageCurrent) {
    guidesPageCurrent.textContent = String(nextIndex + 1);
  }

  if (guidesPagePrevious) {
    guidesPagePrevious.disabled = nextIndex === 0;
  }

  if (guidesPageNext) {
    guidesPageNext.disabled = nextIndex === guidesProcessPages.length - 1;
  }
}

function activateTab(nextButton, moveFocus = false) {
  const nextKey = nextButton.dataset.tab;

  if (nextKey !== 'company') {
    closeProductDetailCard({ restoreFocus: false });
  }

  planScreen.classList.toggle('is-company-deck-active', nextKey === 'company');

  tabButtons.forEach((button) => {
    const isActive = button === nextButton;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== nextKey;
  });

  if (nextKey === 'guides') {
    activateGuidesPage(0);
  }

  if (moveFocus) {
    nextButton.focus();
  }
}

function closeFullscreenSidebarAfterSelection() {
  if (!isPresentationFullscreen() || currentScreen !== 'plan') return;

  window.requestAnimationFrame(() => {
    if (!isPresentationFullscreen() || currentScreen !== 'plan') return;

    setFullscreenSidebarOpen(false);

    const activePanel = tabPanels.find((panel) => !panel.hidden);
    const heading = activePanel?.querySelector('h2, h3');

    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  });
}

function showScreen(nextScreen) {
  const companyTab = tabButtons.find((button) => button.dataset.tab === 'company');
  const isPlanScreen = nextScreen === 'plan';

  if (!isPlanScreen) {
    closeProductDetailCard({ restoreFocus: false });
  }

  if (isRouteMapLandingOpen) {
    routeMapLanding.hidden = true;
    mainContent.classList.remove('is-route-map-landing');
    isRouteMapLandingOpen = false;
    updateFullscreenNavigationLabel();
  }

  entryHero.hidden = nextScreen !== 'cover';
  capabilityHero.hidden = nextScreen !== 'capability';
  planScreen.hidden = !isPlanScreen;
  planFooter.hidden = true;
  returnToCoverButton.hidden = nextScreen === 'cover';
  siteHeader.classList.toggle('is-plan-presentation', isPlanScreen);
  mainContent.classList.toggle('is-plan-presentation', isPlanScreen);

  if (isPlanScreen && companyTab) {
    activateTab(companyTab);
  }

  if (nextScreen !== 'cover') {
    returnLabel.textContent = nextScreen === 'plan' ? 'Nền tảng OnBird' : 'Trang mở đầu';
  }

  currentScreen = nextScreen;

  if (nextScreen === 'plan') {
    beginPlanPresentation();
    setFullscreenSidebarOpen(false);
  } else {
    resetPlanPresentation();
    planScreen.classList.remove('is-company-deck-active');
  }

  window.scrollTo({ top: 0, behavior: 'auto' });

  const focusTarget = {
    cover: entryHero,
    capability: capabilityHero,
    plan: planScreen,
  }[nextScreen];

  focusTarget.focus({ preventScroll: true });
}

function bindHeroEntry(hero, nextScreen) {
  const advanceFromHero = () => {
    if (hero === entryHero && !isPresentationFullscreen()) {
      requestPresentationFullscreen().then((didEnterFullscreen) => {
        // Keep the Hero as slide one when fullscreen is available. If the browser
        // refuses fullscreen, continue the meeting instead of trapping the user.
        if (didEnterFullscreen === false) {
          showScreen(nextScreen);
        }
      });
      return;
    }

    showScreen(nextScreen);
  };

  hero.addEventListener('click', advanceFromHero);
  hero.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) {
      return;
    }

    event.preventDefault();
    advanceFromHero();
  });
}

tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    keepDepartmentSelectionFullscreen();
    activateTab(button);
    closeFullscreenSidebarAfterSelection();
  });

  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    let nextIndex = index;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabButtons.length - 1;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      nextIndex = (index + 1) % tabButtons.length;
    }
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
    }

    activateTab(tabButtons[nextIndex], true);
    keepDepartmentSelectionFullscreen();
    closeFullscreenSidebarAfterSelection();
  });
});

guidesPagePrevious?.addEventListener('click', () => {
  activateGuidesPage(activeGuidesPage - 1);
});

guidesPageNext?.addEventListener('click', () => {
  activateGuidesPage(activeGuidesPage + 1);
});

productDetailCards.forEach((card) => {
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-expanded', 'false');
  card.setAttribute('aria-label', `${card.querySelector('h3')?.textContent?.trim() || 'Nội dung'} — bấm để phóng to`);

  card.addEventListener('click', (event) => {
    if (event.target.closest('.company-product-focus-close')) return;

    event.stopPropagation();
    openProductDetailCard(card);
  });

  card.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key) || activeProductDetailCard === card) return;

    event.preventDefault();
    event.stopPropagation();
    openProductDetailCard(card);
  });
});

productFocusBackdrop?.addEventListener('click', (event) => {
  event.stopPropagation();
  closeProductDetailCard();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !activeProductDetailCard) return;

  event.preventDefault();
  closeProductDetailCard();
});

companyFullscreenButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  requestPresentationFullscreen();
});

companyFullscreenExitButton?.addEventListener('click', () => {
  if (isRouteMapLandingOpen) {
    returnToProductLanding();
    return;
  }

  showRouteMapLanding();
});

productFullscreenPage?.addEventListener('click', (event) => {
  if (isPresentationFullscreen()) return;
  if (event.target.closest('button, a, input, textarea, select, label, [contenteditable="true"]')) return;
  if (window.getSelection()?.toString()) return;

  requestPresentationFullscreen();
});

planScreen?.addEventListener('pointermove', (event) => {
  if (!isPresentationFullscreen() || currentScreen !== 'plan') return;
  if (activeProductDetailCard) return;

  const sidebarWidth = workspaceNav.getBoundingClientRect().width || 320;
  const openThreshold = 48;
  const closeThreshold = Math.max(sidebarWidth + 96, 420);

  if (event.clientX <= openThreshold) {
    setFullscreenSidebarOpen(true);
  } else if (event.clientX >= closeThreshold) {
    setFullscreenSidebarOpen(false);
  }
});

planScreen?.addEventListener('pointerleave', () => {
  if (isPresentationFullscreen() && currentScreen === 'plan') {
    setFullscreenSidebarOpen(false);
  }
});

document.addEventListener('fullscreenchange', () => {
  fullscreenRequestPending = false;
  syncPresentationFullscreenControls();
});

bindHeroEntry(entryHero, 'capability');
bindHeroEntry(capabilityHero, 'plan');
initialisePrivacyLock();

returnToCoverButton.addEventListener('click', () => {
  showScreen(currentScreen === 'plan' ? 'capability' : 'cover');
});
