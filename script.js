/**
 * ============================================================================
 * VISUAL GALLERY - COMPLETE JAVASCRIPT APP MODULE
 * Pure Vanilla JavaScript implementation without external libraries or frameworks.
 * Features:
 *   1. LocalStorage Persistence (Theme, Custom Categories, Favorites, Added/Deleted Images)
 *   2. Dark / Light Theme Toggle
 *   3. Real-Time Search & Multiple Sorting Options
 *   4. Category Filtering & Custom Category Creation (+ Add Category)
 *   5. Favorites System (❤️ Add / Remove Favorites)
 *   6. Responsive Lightbox Modal with Fixed Close Button & Counter
 *   7. Dynamic Add & Delete Image Functionality
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------------------------
  // DOM ELEMENT REFERENCES
  // --------------------------------------------------------------------------

  // Navigation & Theme Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  const navLinkItems = document.querySelectorAll('.nav-link');

  // Controls: Search, Sort, Filter
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const filterContainer = document.getElementById('filterContainer');
  const galleryGrid = document.getElementById('galleryGrid');
  const emptyResults = document.getElementById('emptyResults');

  // Lightbox Modal Elements
  const lightbox = document.getElementById('lightbox');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCategory = document.getElementById('lightboxCategory');
  const lightboxCounter = document.getElementById('lightboxCounter');

  // Add Image Modal Elements
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const addModal = document.getElementById('addModal');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addImageForm = document.getElementById('addImageForm');
  const imageFileInput = document.getElementById('imageFileInput');
  const imageTitleInput = document.getElementById('imageTitleInput');
  const imageCategorySelect = document.getElementById('imageCategorySelect');
  const dropzoneContent = document.getElementById('dropzoneContent');
  const filePreviewWrapper = document.getElementById('filePreviewWrapper');
  const imagePreview = document.getElementById('imagePreview');
  const changeFileBtn = document.getElementById('changeFileBtn');

  // Add Category Modal Elements
  const openAddCategoryBtn = document.getElementById('openAddCategoryBtn');
  const addCategoryModal = document.getElementById('addCategoryModal');
  const closeAddCategoryModalBtn = document.getElementById('closeAddCategoryModalBtn');
  const cancelAddCategoryBtn = document.getElementById('cancelAddCategoryBtn');
  const addCategoryForm = document.getElementById('addCategoryForm');
  const categoryNameInput = document.getElementById('categoryNameInput');

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT & LOCAL STORAGE KEYS
  // --------------------------------------------------------------------------
  const STORAGE_KEYS = {
    THEME: 'vg_theme',
    CATEGORIES: 'vg_categories',
    FAVORITES: 'vg_favorites',
    CUSTOM_IMAGES: 'vg_custom_images',
    DELETED_IMAGES: 'vg_deleted_static_images'
  };

  let currentFilter = 'all';
  let searchQuery = '';
  let currentSort = 'newest';
  let activeVisibleCards = [];
  let currentImageIndex = 0;
  let uploadedImageDataUrl = null;

  // Local Storage Data Collections
  let customCategories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
  let favorites = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES)) || []);
  let customImages = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_IMAGES)) || [];
  let deletedStaticImages = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_IMAGES)) || []);

  // Utility to capitalize strings
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // --------------------------------------------------------------------------
  // 1. THEME TOGGLE (DARK / LIGHT MODE)
  // --------------------------------------------------------------------------
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  });

  // --------------------------------------------------------------------------
  // 2. INITIALIZATION & RECOVERY FROM LOCAL STORAGE
  // --------------------------------------------------------------------------

  // Restore Custom Categories
  customCategories.forEach(category => {
    createCategoryFilterButton(category);
    createCategorySelectOption(category);
  });

  // Remove previously deleted static cards
  deletedStaticImages.forEach(cardId => {
    const cardToDelete = document.querySelector(`.gallery-card[data-id="${cardId}"]`);
    if (cardToDelete) {
      cardToDelete.remove();
    }
  });

  // Restore Custom User-Uploaded Images
  customImages.forEach(imgData => {
    const card = renderGalleryCardDOM(imgData);
    galleryGrid.insertBefore(card, galleryGrid.firstChild);
  });

  // Restore Favorites State on Cards
  document.querySelectorAll('.gallery-card').forEach(card => {
    const cardId = getCardIdentifier(card);
    if (favorites.has(cardId)) {
      const favBtn = card.querySelector('.favorite-btn');
      if (favBtn) {
        favBtn.classList.add('active');
        favBtn.textContent = '❤️';
      }
    }
    attachCardHandlers(card);
  });

  // Run initial filter and sort pipeline
  applyFiltersAndSearch();

  // --------------------------------------------------------------------------
  // 3. CARD INTERACTION & EVENT ATTACHMENT
  // --------------------------------------------------------------------------

  function getCardIdentifier(card) {
    return card.getAttribute('data-id') || card.querySelector('.card-title').textContent.trim();
  }

  function attachCardHandlers(card) {
    // Open Lightbox on card click (unless favorite or delete was clicked)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn') || e.target.closest('.favorite-btn')) return;
      openLightbox(card);
    });

    // Favorite Button Click Handler
    const favBtn = card.querySelector('.favorite-btn');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = getCardIdentifier(card);

        if (favorites.has(cardId)) {
          favorites.delete(cardId);
          favBtn.classList.remove('active');
          favBtn.textContent = '🤍';
        } else {
          favorites.add(cardId);
          favBtn.classList.add('active');
          favBtn.textContent = '❤️';
        }

        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favorites)));
        
        // If viewing favorites filter, refresh view
        if (currentFilter === 'favorites') {
          applyFiltersAndSearch();
        }
      });
    }

    // Delete Button Click Handler
    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = getCardIdentifier(card);

        // Track deleted item in localStorage
        if (card.hasAttribute('data-custom')) {
          customImages = customImages.filter(item => item.id !== cardId);
          localStorage.setItem(STORAGE_KEYS.CUSTOM_IMAGES, JSON.stringify(customImages));
        } else {
          deletedStaticImages.add(cardId);
          localStorage.setItem(STORAGE_KEYS.DELETED_IMAGES, JSON.stringify(Array.from(deletedStaticImages)));
        }

        // Also remove from favorites if present
        if (favorites.has(cardId)) {
          favorites.delete(cardId);
          localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favorites)));
        }

        // Smooth shrink & fade transition
        card.classList.add('hidden');
        setTimeout(() => {
          card.remove();
          applyFiltersAndSearch();
        }, 300);
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. UNIFIED FILTERING, SEARCHING, AND SORTING PIPELINE
  // --------------------------------------------------------------------------

  function applyFiltersAndSearch() {
    const allCards = Array.from(document.querySelectorAll('.gallery-card'));

    // Step A: Filter by Category and Search Query
    let visibleCount = 0;

    allCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const title = card.querySelector('.card-title').textContent.toLowerCase();
      const cardId = getCardIdentifier(card);
      const isFav = favorites.has(cardId);

      // Category match check
      let categoryMatch = false;
      if (currentFilter === 'all') {
        categoryMatch = true;
      } else if (currentFilter === 'favorites') {
        categoryMatch = isFav;
      } else {
        categoryMatch = (category === currentFilter);
      }

      // Search match check
      const searchMatch = !searchQuery || title.includes(searchQuery.toLowerCase());

      if (categoryMatch && searchMatch) {
        card.classList.remove('hidden');
        visibleCount++;
      } else {
        card.classList.add('hidden');
      }
    });

    // Step B: Sort Visible Cards
    const visibleCards = allCards.filter(card => !card.classList.contains('hidden'));

    visibleCards.sort((a, b) => {
      const titleA = a.querySelector('.card-title').textContent.trim().toLowerCase();
      const titleB = b.querySelector('.card-title').textContent.trim().toLowerCase();
      const timestampA = parseInt(a.getAttribute('data-timestamp') || '0', 10);
      const timestampB = parseInt(b.getAttribute('data-timestamp') || '0', 10);
      const isFavA = favorites.has(getCardIdentifier(a)) ? 1 : 0;
      const isFavB = favorites.has(getCardIdentifier(b)) ? 1 : 0;

      switch (currentSort) {
        case 'oldest':
          return timestampA - timestampB;
        case 'name-asc':
          return titleA.localeCompare(titleB);
        case 'name-desc':
          return titleB.localeCompare(titleA);
        case 'favorites':
          return isFavB - isFavA;
        case 'newest':
        default:
          return timestampB - timestampA;
      }
    });

    // Re-append cards in sorted order to grid
    visibleCards.forEach(card => galleryGrid.appendChild(card));

    // Show/Hide Empty State Message
    if (visibleCount === 0) {
      emptyResults.classList.remove('hidden');
    } else {
      emptyResults.classList.add('hidden');
    }

    // Update activeVisibleCards list for Lightbox navigation
    activeVisibleCards = visibleCards;
  }

  // Event Listener: Filter Buttons
  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    const selectedFilter = btn.getAttribute('data-filter');
    if (selectedFilter === currentFilter) return;

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    currentFilter = selectedFilter;
    applyFiltersAndSearch();
  });

  // Event Listener: Real-Time Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    
    if (searchQuery.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    applyFiltersAndSearch();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    applyFiltersAndSearch();
  });

  // Event Listener: Sort Dropdown
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndSearch();
  });

  // --------------------------------------------------------------------------
  // 5. LIGHTBOX MODAL LOGIC (FIXED CLOSE BUTTON & IMAGE COUNTER)
  // --------------------------------------------------------------------------

  function displayLightboxItem(index) {
    if (activeVisibleCards.length === 0) return;

    if (index < 0) {
      currentImageIndex = activeVisibleCards.length - 1;
    } else if (index >= activeVisibleCards.length) {
      currentImageIndex = 0;
    } else {
      currentImageIndex = index;
    }

    const targetCard = activeVisibleCards[currentImageIndex];
    const imgElement = targetCard.querySelector('img');
    const titleElement = targetCard.querySelector('.card-title');
    const categoryElement = targetCard.querySelector('.card-category');

    lightboxImage.classList.add('fade');

    setTimeout(() => {
      lightboxImage.src = imgElement.src;
      lightboxImage.alt = imgElement.alt || titleElement.textContent;
      lightboxTitle.textContent = titleElement.textContent;
      lightboxCategory.textContent = categoryElement.textContent;
      lightboxCounter.textContent = `${currentImageIndex + 1} / ${activeVisibleCards.length}`;

      lightboxImage.classList.remove('fade');
    }, 150);
  }

  function openLightbox(cardElement) {
    const indexInVisible = activeVisibleCards.indexOf(cardElement);
    if (indexInVisible === -1) return;

    displayLightboxItem(indexInVisible);

    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');

    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function showNextImage() {
    displayLightboxItem(currentImageIndex + 1);
  }

  function showPreviousImage() {
    displayLightboxItem(currentImageIndex - 1);
  }

  lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    showNextImage();
  });

  lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    showPreviousImage();
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxBackdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('active')) return;

    if (event.key === 'ArrowRight') {
      showNextImage();
    } else if (event.key === 'ArrowLeft') {
      showPreviousImage();
    } else if (event.key === 'Escape') {
      closeLightbox();
    }
  });

  // --------------------------------------------------------------------------
  // 6. ADD CUSTOM CATEGORY MODAL (+ ADD CATEGORY)
  // --------------------------------------------------------------------------

  function openAddCategoryModal() {
    addCategoryModal.classList.add('active');
    addCategoryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    categoryNameInput.focus();
  }

  function closeAddCategoryModal() {
    addCategoryModal.classList.remove('active');
    addCategoryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    addCategoryForm.reset();
  }

  function createCategoryFilterButton(categoryName) {
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
    
    // Check if button already exists
    if (document.querySelector(`.filter-btn[data-filter="${slug}"]`)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.setAttribute('data-filter', slug);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = capitalize(categoryName);

    // Insert before "+ Category" button
    filterContainer.insertBefore(btn, openAddCategoryBtn);
  }

  function createCategorySelectOption(categoryName) {
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
    
    if (imageCategorySelect.querySelector(`option[value="${slug}"]`)) return;

    const option = document.createElement('option');
    option.value = slug;
    option.textContent = capitalize(categoryName);
    imageCategorySelect.appendChild(option);
  }

  addCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawCategory = categoryNameInput.value.trim();
    if (!rawCategory) return;

    const slug = rawCategory.toLowerCase().replace(/\s+/g, '-');

    if (!customCategories.includes(slug)) {
      customCategories.push(slug);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(customCategories));

      createCategoryFilterButton(rawCategory);
      createCategorySelectOption(rawCategory);
    }

    closeAddCategoryModal();

    // Auto-select newly added category
    const newBtn = document.querySelector(`.filter-btn[data-filter="${slug}"]`);
    if (newBtn) {
      newBtn.click();
    }
  });

  openAddCategoryBtn.addEventListener('click', openAddCategoryModal);
  closeAddCategoryModalBtn.addEventListener('click', closeAddCategoryModal);
  cancelAddCategoryBtn.addEventListener('click', closeAddCategoryModal);
  addCategoryModal.addEventListener('click', (e) => {
    if (e.target === addCategoryModal) closeAddCategoryModal();
  });

  // --------------------------------------------------------------------------
  // 7. ADD DYNAMIC IMAGE MODAL & UPLOAD LOGIC
  // --------------------------------------------------------------------------

  function openAddModal() {
    addModal.classList.add('active');
    addModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    imageTitleInput.focus();
  }

  function closeAddModal() {
    addModal.classList.remove('active');
    addModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    resetAddImageForm();
  }

  function resetAddImageForm() {
    addImageForm.reset();
    uploadedImageDataUrl = null;
    imagePreview.src = '';
    filePreviewWrapper.classList.add('hidden');
    dropzoneContent.style.display = 'flex';
  }

  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedImageDataUrl = event.target.result;
        imagePreview.src = uploadedImageDataUrl;
        dropzoneContent.style.display = 'none';
        filePreviewWrapper.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  changeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageFileInput.click();
  });

  function renderGalleryCardDOM(imgData) {
    const newCard = document.createElement('article');
    newCard.className = 'gallery-card';
    newCard.setAttribute('data-category', imgData.category);
    newCard.setAttribute('data-id', imgData.id);
    newCard.setAttribute('data-timestamp', imgData.timestamp || Date.now());
    newCard.setAttribute('data-custom', 'true');

    newCard.innerHTML = `
      <div class="card-image-wrapper">
        <button type="button" class="favorite-btn" aria-label="Add to favorites" title="Favorite">🤍</button>
        <button type="button" class="delete-btn" aria-label="Delete image" title="Delete Image">🗑️</button>
        <img src="${imgData.src}" alt="${imgData.title}" loading="lazy">
        <div class="card-overlay">
          <span class="card-category">${capitalize(imgData.category)}</span>
          <h3 class="card-title">${imgData.title}</h3>
          <button type="button" class="view-btn" aria-label="View ${imgData.title} in lightbox">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <span>View</span>
          </button>
        </div>
      </div>
    `;

    return newCard;
  }

  addImageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!uploadedImageDataUrl) {
      alert('Please select an image file from your computer.');
      return;
    }

    const title = imageTitleInput.value.trim() || 'Untitled Image';
    const category = imageCategorySelect.value || 'nature';
    const timestamp = Date.now();
    const id = `custom-${timestamp}`;

    const imgData = { id, src: uploadedImageDataUrl, title, category, timestamp };

    // Save to LocalStorage
    customImages.unshift(imgData);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_IMAGES, JSON.stringify(customImages));

    // Render & Attach Handlers
    const newCard = renderGalleryCardDOM(imgData);
    attachCardHandlers(newCard);
    galleryGrid.insertBefore(newCard, galleryGrid.firstChild);

    // Apply Filter & Sort Pipeline
    applyFiltersAndSearch();

    closeAddModal();
  });

  openAddModalBtn.addEventListener('click', openAddModal);
  closeAddModalBtn.addEventListener('click', closeAddModal);
  cancelAddBtn.addEventListener('click', closeAddModal);
  addModal.addEventListener('click', (e) => {
    if (e.target === addModal) closeAddModal();
  });

  // --------------------------------------------------------------------------
  // 8. RESPONSIVE MOBILE MENU
  // --------------------------------------------------------------------------

  function toggleMobileMenu() {
    const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
    mobileToggle.setAttribute('aria-expanded', !isExpanded);
    mobileToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  }

  mobileToggle.addEventListener('click', toggleMobileMenu);

  navLinkItems.forEach(link => {
    link.addEventListener('click', () => {
      if (navLinks.classList.contains('active')) {
        toggleMobileMenu();
      }
    });
  });

  // Scrollspy
  const sections = document.querySelectorAll('section, header');
  window.addEventListener('scroll', () => {
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 200;

    sections.forEach(section => {
      if (section.id && scrollPosition >= section.offsetTop) {
        currentSectionId = section.id;
      }
    });

    if (currentSectionId) {
      navLinkItems.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });

});
