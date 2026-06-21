const money = {
  format(value, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(value || 0));
  }
};

const DATA_VERSION = "ametopia-operable-storefront-2026-06-07";
const baseProducts = Array.isArray(window.AMETOPIA_PRODUCTS) ? window.AMETOPIA_PRODUCTS : [];

function safeJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Static file previews may block storage; the storefront still renders.
  }
}

function defaultStoreSettings() {
  return {
    discounts: [
      { code: "AME10", type: "Percent", value: 10, minimum: 0, active: true, starts: "", ends: "" },
      { code: "WELCOME10", type: "Percent", value: 10, minimum: 100, active: true, starts: "", ends: "" },
    ],
    shipping: {
      standardRate: 9.7,
      expressRate: 12.7,
      freeThreshold: 100,
      standardLabel: "Standard Australia Post",
      expressLabel: "Express Australia Post",
      processingDays: "1-3 business days",
    },
    sales: [
      { title: "Weekend charm edit", copy: "Seasonal favourites selected for gifting and everyday charm stacks.", cta: "Shop sale edit", active: true },
    ],
    pageSections: [
      { id: "newArrivals", title: "New Arrivals", copy: "Fresh charms and chains for the newest Ametopia looks.", active: true },
      { id: "sales", title: "Sales", copy: "Limited-time promotions and seasonal offers.", active: true },
      { id: "sets", title: "Sets", copy: "Ready-to-style combinations. More sets can be uploaded by admin later.", active: true },
    ],
    sets: [
      {
        id: "starter-charm-set",
        title: "Starter Charm Set",
        price: 68,
        stock: 0,
        image: "assets/products/uniform/heart-stars-charm-chain-necklace.jpg",
        description: "Coming soon. Admin can update photos, price, stock and copy when set products arrive.",
        active: true,
      },
    ],
    builderBases: [
      { id: "gold-bead-ball-chain-bracelet", type: "bracelet", title: "Gold Bead Ball Chain Bracelet", price: 16.99, stock: 10, image: "assets/products/uniform/gold-bead-ball-chain-bracelet.jpg" },
      { id: "red-rope-gold-chain-bracelet", type: "bracelet", title: "Red Rope Gold Chain Bracelet", price: 19.99, stock: 10, image: "assets/products/uniform/red-rope-gold-chain-bracelet.jpg" },
      { id: "gold-curb-chain-carabiner-necklace", type: "necklace", title: "Gold Curb Chain Carabiner Necklace", price: 29.99, stock: 10, image: "assets/products/uniform/gold-curb-chain-carabiner-necklace.jpg" },
      { id: "gold-snake-chain-ring-clasp-necklace", type: "necklace", title: "Gold Snake Chain Ring Clasp Necklace", price: 29.99, stock: 10, image: "assets/products/uniform/gold-snake-chain-ring-clasp-necklace.jpg" },
      { id: "custom-key-chain-base", type: "key-chain", title: "Gold Key Chain Base", price: 12.99, stock: 20, image: "assets/products/uniform/golden-key-heart-charm.jpg" },
      { id: "custom-bag-chain-base", type: "bag-chain", title: "Gold Bag Chain Base", price: 18.99, stock: 20, image: "assets/products/uniform/gold-curb-chain-carabiner-necklace.jpg" },
    ],
    builderCharms: [
      { id: "sweet-cherry-pair-charm", title: "Sweet Cherry Pair Charm", price: 24.99, stock: 10, image: "assets/products/uniform/sweet-cherry-pair-charm.jpg" },
      { id: "pink-bow-sparkle-charm", title: "Pink Bow Sparkle Charm", price: 24.99, stock: 10, image: "assets/products/uniform/pink-bow-sparkle-charm.jpg" },
      { id: "aqua-star-crystal-charm", title: "Aqua Star Crystal Charm", price: 5.99, stock: 10, image: "assets/products/uniform/aqua-star-crystal-charm.jpg" },
      { id: "golden-key-heart-charm", title: "Golden Key & Heart Charm", price: 24.99, stock: 10, image: "assets/products/uniform/golden-key-heart-charm.jpg" },
    ],
    builderButtonEffect: "magic",
  };
}

function inferBaseType(item) {
  const text = `${item?.title || ""} ${item?.id || ""}`.toLowerCase();
  if (text.includes("bracelet")) return "bracelet";
  if (text.includes("key")) return "key-chain";
  if (text.includes("bag")) return "bag-chain";
  return "necklace";
}

function normalizedBuilderBases(storedBases, defaultBases) {
  const source = Array.isArray(storedBases) && storedBases.length ? storedBases : defaultBases;
  const merged = [...source];
  defaultBases.forEach((base) => {
    if (!merged.some((item) => item.id === base.id)) merged.push(base);
  });
  return merged.map((item) => ({ ...item, type: item.type || inferBaseType(item) }));
}

function readStoreSettings() {
  const defaults = defaultStoreSettings();
  const stored = safeJson("ametopiaSettings", {});
  return {
    ...defaults,
    ...stored,
    shipping: { ...defaults.shipping, ...(stored.shipping || {}) },
    discounts: stored.discounts || defaults.discounts,
    sales: stored.sales || defaults.sales,
    pageSections: stored.pageSections || defaults.pageSections,
    sets: stored.sets || defaults.sets,
    builderBases: normalizedBuilderBases(stored.builderBases, defaults.builderBases),
    builderCharms: stored.builderCharms || defaults.builderCharms,
    builderButtonEffect: stored.builderButtonEffect || defaults.builderButtonEffect,
  };
}

try {
  if (localStorage.getItem("ametopiaDataVersion") !== DATA_VERSION) {
    localStorage.removeItem("ametopiaProducts");
    localStorage.setItem("ametopiaDataVersion", DATA_VERSION);
  }
} catch {
  // Ignore storage migration failures.
}

const state = {
  products: safeJson("ametopiaProducts", null) || baseProducts,
  cart: safeJson("ametopiaCart", []),
  orders: safeJson("ametopiaOrders", []),
  account: safeJson("ametopiaAccount", null),
  wishlist: safeJson("ametopiaWishlist", []),
  restockSubscriptions: safeJson("ametopiaRestockSubscriptions", []),
  subscribers: safeJson("ametopiaSubscribers", []),
  settings: readStoreSettings(),
  filter: "all",
  promo: "",
  delivery: "standard",
  builder: { baseId: "", baseType: "bracelet", charms: [], swapIndex: null },
};

const initialFilter = new URLSearchParams(window.location.search).get("filter");
if (initialFilter) state.filter = initialFilter;

const selectors = {
  productGrid: document.querySelector("#productGrid"),
  resultCount: document.querySelector("#resultCount"),
  collectionTitle: document.querySelector("#collectionTitle"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  priceRange: document.querySelector("#priceRange"),
  priceLabel: document.querySelector("#priceLabel"),
  inStockOnly: document.querySelector("#inStockOnly"),
  cartDrawer: document.querySelector("#cartDrawer"),
  cartItems: document.querySelector("#cartItems"),
  cartCount: document.querySelector("#cartCount"),
  scrim: document.querySelector("#scrim"),
  productDialog: document.querySelector("#productDialog"),
  checkoutDialog: document.querySelector("#checkoutDialog"),
  accountDialog: document.querySelector("#accountDialog"),
};

const heroSlides = [
  [
    { id: "heroMainImage", src: "assets/products/uniform/gold-curb-chain-carabiner-necklace.jpg", alt: "Gold Curb Chain Carabiner Necklace" },
    { id: "heroSideImageOne", src: "assets/products/uniform/sweet-cherry-pair-charm.jpg", alt: "Sweet Cherry Pair Charm" },
    { id: "heroSideImageTwo", src: "assets/products/uniform/golden-key-heart-charm.jpg", alt: "Golden Key & Heart Charm" }
  ],
  [
    { id: "heroMainImage", src: "assets/products/uniform/heart-stars-charm-chain-necklace.jpg", alt: "Heart & Stars Charm Chain Necklace" },
    { id: "heroSideImageOne", src: "assets/products/uniform/mystic-potion-heart-charm.jpg", alt: "Mystic Potion Heart Charm" },
    { id: "heroSideImageTwo", src: "assets/products/uniform/pink-bow-sparkle-charm.jpg", alt: "Pink Bow Sparkle Charm" }
  ],
  [
    { id: "heroMainImage", src: "assets/products/uniform/gold-bead-ball-chain-bracelet.jpg", alt: "Gold Bead Ball Chain Bracelet" },
    { id: "heroSideImageOne", src: "assets/products/uniform/aqua-star-crystal-charm.jpg", alt: "Aqua Star Crystal Charm" },
    { id: "heroSideImageTwo", src: "assets/products/uniform/pink-star-crystal-charm.jpg", alt: "Pink Star Crystal Charm" }
  ]
];
let activeHeroSlide = 0;

function save() {
  writeJson("ametopiaProducts", state.products);
  writeJson("ametopiaCart", state.cart);
  writeJson("ametopiaOrders", state.orders);
  writeJson("ametopiaAccount", state.account);
  writeJson("ametopiaWishlist", state.wishlist);
  writeJson("ametopiaRestockSubscriptions", state.restockSubscriptions);
  writeJson("ametopiaSubscribers", state.subscribers);
}

function refreshSettings() {
  state.settings = readStoreSettings();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getActiveSection(id) {
  refreshSettings();
  return state.settings.pageSections.find((section) => section.id === id && section.active !== false);
}

function setHeroSlide(index) {
  activeHeroSlide = index;
  heroSlides[index].forEach((item) => {
    const img = document.querySelector(`#${item.id}`);
    if (!img) return;
    img.style.opacity = "0";
    setTimeout(() => {
      img.src = item.src;
      img.alt = item.alt;
      img.style.opacity = "1";
    }, 160);
  });
  document.querySelectorAll("[data-hero-slide]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.heroSlide) === index);
  });
}

function filteredProducts(sourceProducts = state.products) {
  if (!selectors.productGrid) return [];
  const query = selectors.searchInput.value.trim().toLowerCase();
  const max = Number(selectors.priceRange.value);
  let items = sourceProducts.filter((product) => {
    const matchesCategory = state.filter === "all" || product.category === state.filter;
    const matchesQuery = !query || [product.title, product.category, product.description, product.tag].join(" ").toLowerCase().includes(query);
    const matchesStock = !selectors.inStockOnly.checked || product.stock > 0;
    return matchesCategory && matchesQuery && product.price <= max && matchesStock;
  });

  if (selectors.sortSelect.value === "new") items.sort((a, b) => b.created - a.created);
  if (selectors.sortSelect.value === "low") items.sort((a, b) => a.price - b.price);
  if (selectors.sortSelect.value === "high") items.sort((a, b) => b.price - a.price);
  return items;
}

function productCard(product) {
  const displayPrice = product.salePrice && Number(product.salePrice) > 0 ? Number(product.salePrice) : product.price;
  const priceLabel = product.salePrice && Number(product.salePrice) > 0
    ? `<strong>${money.format(displayPrice, product.currency)}</strong><s>${money.format(product.price, product.currency)}</s>`
    : `<strong>${money.format(product.price, product.currency)}</strong>`;
  return `
    <article class="product-card">
      <button class="product-image-button" data-view="${product.id}" aria-label="Open ${escapeHtml(product.title)}">
        <img src="${product.image}" alt="${escapeHtml(product.title)}">
        <span class="badge">${escapeHtml(product.tag || product.category)}</span>
      </button>
      <div class="card-body">
        <button class="product-title product-title-button" data-view="${product.id}">
          <span>${escapeHtml(product.title)}</span><span class="price-stack">${priceLabel}</span>
        </button>
        <div class="product-meta">${escapeHtml(product.description)}</div>
        <div class="rating">${product.stock <= 0 ? "Sold out" : product.stock <= 3 ? "Low in stock" : ""}</div>
        <div class="purchase-row">
          <label>Qty <input type="number" min="1" max="${Math.max(1, product.stock)}" value="1" data-card-qty="${product.id}"></label>
        </div>
        <div class="card-actions">
          <button class="quick-view ${state.wishlist.includes(product.id) ? "saved" : ""}" data-wishlist="${product.id}" aria-label="Save ${escapeHtml(product.title)} to wishlist">♡</button>
          <button class="add-cart" data-add="${product.id}" ${product.stock < 1 ? "disabled" : ""}>Add to bag</button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts() {
  if (!selectors.productGrid) return;
  const products = filteredProducts();
  selectors.collectionTitle.textContent = state.filter === "all" ? "All Products" : state.filter;
  selectors.resultCount.textContent = `${products.length} styles`;
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === state.filter));
  selectors.productGrid.innerHTML = products.map(productCard).join("") || `<div class="empty">No products found.</div>`;
}

function renderEditableSection(containerId, sectionId, products) {
  const container = document.querySelector(containerId);
  if (!container) return;
  const section = getActiveSection(sectionId);
  const wrapper = container.closest("section");
  if (wrapper) wrapper.hidden = !section;
  if (!section) return;
  const heading = wrapper?.querySelector("h2");
  const copy = wrapper?.querySelector(".section-copy");
  if (heading) heading.textContent = section.title;
  if (copy) copy.textContent = section.copy;
  container.innerHTML = products.map(productCard).join("") || `<div class="empty">Admin can add products for this section.</div>`;
}

function renderFeaturedSections() {
  if (!document.querySelector("#newArrivalsGrid")) return;
  const newest = state.products.slice().sort((a, b) => b.created - a.created).slice(0, 4);
  const saleProducts = state.products.filter((product) => product.onSale || Number(product.salePrice || 0) > 0).slice(0, 4);
  renderEditableSection("#newArrivalsGrid", "newArrivals", newest);
  renderEditableSection("#salesGrid", "sales", saleProducts);
  const salesPromoPanel = document.querySelector("#salesPromoPanel");
  if (salesPromoPanel) {
    const activeSales = state.settings.sales.filter((sale) => sale.active !== false);
    salesPromoPanel.innerHTML = activeSales.map((sale) => `
      <article>
        <strong>${escapeHtml(sale.title)}</strong>
        <p>${escapeHtml(sale.copy)}</p>
      </article>
    `).join("");
  }

  const setsSection = getActiveSection("sets");
  const setsSectionNode = document.querySelector("#setsSection");
  if (setsSectionNode) setsSectionNode.hidden = !setsSection;
  if (!setsSection) return;
  document.querySelector("#setsTitle").textContent = setsSection.title;
  document.querySelector("#setsCopy").textContent = setsSection.copy;
  const sets = state.settings.sets.filter((set) => set.active !== false);
  document.querySelector("#setsGrid").innerHTML = sets.map((set) => `
    <article class="product-card">
      <button class="product-image-button" data-set-add="${set.id}" aria-label="Open ${escapeHtml(set.title)}">
        <img src="${set.image}" alt="${escapeHtml(set.title)}">
        <span class="badge">set</span>
      </button>
      <div class="card-body">
        <div class="product-title"><span>${escapeHtml(set.title)}</span><strong>${money.format(set.price, "AUD")}</strong></div>
        <div class="product-meta">${escapeHtml(set.description)}</div>
        <div class="rating">${set.stock <= 0 ? "Coming soon" : set.stock <= 3 ? "Low in stock" : ""}</div>
        <div class="card-actions one-action">
          <button class="add-cart" data-set-add="${set.id}" ${set.stock < 1 ? "disabled" : ""}>Add set</button>
        </div>
      </div>
    </article>
  `).join("") || `<div class="empty">Sets coming soon. Admin can upload photos, prices and stock.</div>`;

  const customSections = document.querySelector("#customSections");
  if (customSections) {
    const knownIds = new Set(["newArrivals", "sales", "sets"]);
    customSections.innerHTML = state.settings.pageSections
      .filter((section) => section.active !== false && !knownIds.has(section.id))
      .map((section) => `
        <section class="featured-section">
          <div class="section-heading">
            <div>
              <p class="kicker">Ametopia page</p>
              <h2>${escapeHtml(section.title)}</h2>
              <p class="section-copy">${escapeHtml(section.copy)}</p>
            </div>
          </div>
        </section>
      `).join("");
  }
}

function cartTotals() {
  refreshSettings();
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const promo = state.promo.trim().toUpperCase();
  const discountRule = (state.settings.discounts || []).find((rule) => (
    rule.active && String(rule.code).toUpperCase() === promo && subtotal >= Number(rule.minimum || 0)
  ));
  const discount = discountRule ? subtotal * (Number(discountRule.value || 0) / 100) : 0;
  const standardRate = Number(state.settings.shipping?.standardRate ?? 9.7);
  const expressRate = Number(state.settings.shipping?.expressRate ?? 12.7);
  const freeThreshold = Number(state.settings.shipping?.freeThreshold ?? 100);
  const shipping = state.delivery === "express" ? expressRate : (subtotal >= freeThreshold || subtotal === 0 ? 0 : standardRate);
  const tax = (subtotal - discount + shipping) * 0.1;
  return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax };
}

function renderDeliverySelects() {
  refreshSettings();
  const standardLabel = `${state.settings.shipping.standardLabel} - free over ${money.format(state.settings.shipping.freeThreshold, "AUD")} or ${money.format(state.settings.shipping.standardRate, "AUD")}`;
  const expressLabel = `${state.settings.shipping.expressLabel} - ${money.format(state.settings.shipping.expressRate, "AUD")}`;
  document.querySelectorAll("[data-delivery-select]").forEach((select) => {
    select.innerHTML = `
      <option value="standard">${standardLabel}</option>
      <option value="express">${expressLabel}</option>
    `;
    select.value = state.delivery;
  });
}

function renderCart() {
  if (!selectors.cartItems) return;
  const qty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  selectors.cartCount.textContent = qty;
  selectors.cartItems.innerHTML = state.cart.map((item) => `
    <div class="cart-row">
      <img src="${item.image}" alt="${escapeHtml(item.title)}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <div>${money.format(item.price, item.currency)}</div>
        <div class="qty">
          <button data-dec="${item.id}" aria-label="Decrease ${escapeHtml(item.title)}">−</button>
          <span>${item.qty}</span>
          <button data-inc="${item.id}" aria-label="Increase ${escapeHtml(item.title)}">+</button>
        </div>
      </div>
      <button class="icon-button" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.title)}">×</button>
    </div>
  `).join("") || `<div class="empty">Your bag is empty.</div>`;
  renderDeliverySelects();
  const totals = cartTotals();
  document.querySelector("#subtotal").textContent = money.format(totals.subtotal);
  document.querySelector("#discount").textContent = totals.discount ? `-${money.format(totals.discount)}` : money.format(0);
  document.querySelector("#shipping").textContent = totals.shipping ? money.format(totals.shipping) : "Free";
  document.querySelector("#tax").textContent = money.format(totals.tax);
  document.querySelector("#total").textContent = money.format(totals.total);
}

function addToCart(productId, override, qty = 1) {
  const product = override || state.products.find((item) => item.id === productId);
  if (!product) return;
  const count = Math.max(1, Number(qty || 1));
  const cartProduct = product.salePrice && Number(product.salePrice) > 0 ? { ...product, price: Number(product.salePrice) } : product;
  const found = state.cart.find((item) => item.id === product.id);
  if (found) found.qty += count;
  else state.cart.push({ ...cartProduct, qty: count });
  save();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  const item = state.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((cartItem) => cartItem.id !== id);
  save();
  renderCart();
}

function openCart() {
  selectors.cartDrawer?.classList.add("open");
  selectors.scrim?.classList.add("open");
  selectors.cartDrawer?.setAttribute("aria-hidden", "false");
}

function closeCart() {
  selectors.cartDrawer?.classList.remove("open");
  selectors.scrim?.classList.remove("open");
  selectors.cartDrawer?.setAttribute("aria-hidden", "true");
}

function openProduct(product) {
  if (!product || !selectors.productDialog) return;
  selectors.productDialog.innerHTML = `
    <div class="product-modal">
      <button class="icon-button close-dialog" aria-label="Close">×</button>
      <div class="modal-grid">
        <div>
          <button class="zoom-trigger" data-zoom-src="${product.image}" data-zoom-alt="${escapeHtml(product.title)}">
            <img class="modal-product-image" src="${product.image}" alt="${escapeHtml(product.title)}">
          </button>
          <p class="payment-note">Click photo to zoom.</p>
        </div>
        <div>
          <p class="kicker">${escapeHtml(product.category)}</p>
          <h2>${escapeHtml(product.title)}</h2>
          <p>${escapeHtml(product.description)}</p>
          <p><strong>${money.format(product.salePrice && Number(product.salePrice) > 0 ? product.salePrice : product.price, product.currency)}</strong>${product.salePrice && Number(product.salePrice) > 0 ? ` <s>${money.format(product.price, product.currency)}</s>` : ""}</p>
          <p>${product.stock <= 0 ? "Sold out" : product.stock <= 3 ? "Low in stock" : "In stock"}</p>
          <label>Quantity <input type="number" min="1" max="${Math.max(1, product.stock)}" value="1" data-modal-qty="${product.id}"></label>
          <button class="primary-button" data-add="${product.id}" ${product.stock < 1 ? "disabled" : ""}>Add to bag</button>
        </div>
      </div>
    </div>`;
  selectors.productDialog.showModal();
}

function renderAccount() {
  const node = document.querySelector("#accountState");
  if (!node) return;
  if (!state.account) {
    node.innerHTML = `<div class="empty">Save a profile to receive wishlist back-in-stock email alerts.</div>`;
    return;
  }
  node.innerHTML = `
    <div class="order-row">
      <div><strong>${escapeHtml(state.account.name)}</strong><br><span>${escapeHtml(state.account.email)}</span></div>
      <strong>${state.wishlist.length} saved</strong>
    </div>
    ${state.wishlist.map((id) => {
      const product = state.products.find((item) => item.id === id);
      return product ? `<div class="order-row"><span>${escapeHtml(product.title)}</span><strong>${product.stock <= 0 ? "Subscribed" : "Saved"}</strong></div>` : "";
    }).join("")}
  `;
}

function renderBuilderPage() {
  const baseGrid = document.querySelector("#builderBaseGrid");
  const charmGrid = document.querySelector("#builderCharmGrid");
  if (!baseGrid || !charmGrid) return;
  refreshSettings();
  state.builder.charms = Array.isArray(state.builder.charms) ? state.builder.charms : [];
  const typeLabels = {
    bracelet: "Bracelet",
    necklace: "Necklace",
    "key-chain": "Key chain",
    "bag-chain": "Bag chain",
  };
  const baseTypes = ["bracelet", "necklace", "key-chain", "bag-chain"];
  if (!state.builder.baseType) state.builder.baseType = "bracelet";
  const basesForType = state.settings.builderBases.filter((item) => (item.type || inferBaseType(item)) === state.builder.baseType);
  if (!basesForType.some((item) => item.id === state.builder.baseId)) state.builder.baseId = basesForType[0]?.id || state.settings.builderBases[0]?.id || "";
  const typeBar = document.querySelector("#builderTypeBar");
  if (typeBar) {
    typeBar.innerHTML = baseTypes.map((type) => `
      <button type="button" class="${state.builder.baseType === type ? "active" : ""}" data-builder-type="${type}">
        ${typeLabels[type]}
      </button>
    `).join("");
  }
  baseGrid.innerHTML = basesForType.map((item) => `
    <button class="builder-choice ${state.builder.baseId === item.id ? "active" : ""}" data-builder-base="${item.id}">
      <img src="${item.image}" alt="${escapeHtml(item.title)}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${money.format(item.price, "AUD")} \u00b7 ${item.stock} available</span>
    </button>
  `).join("") || `<div class="empty">No bases in this category yet.</div>`;
  charmGrid.innerHTML = state.settings.builderCharms.map((item) => `
    <article class="builder-choice">
      <img src="${charmCutoutSrc(item)}" alt="${escapeHtml(item.title)}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${money.format(item.price, "AUD")} \u00b7 ${item.stock} available</span>
      <button type="button" data-builder-charm="${item.id}">
        ${state.builder.swapIndex !== null ? "Use to replace" : "Add charm"}
      </button>
    </article>
  `).join("");
  renderBuilderPreview();
}

function renderBuilderPreview() {
  const preview = document.querySelector("#builderPreview");
  if (!preview) return;
  refreshSettings();
  const base = state.settings.builderBases.find((item) => item.id === state.builder.baseId);
  const selectedCharms = (state.builder.charms || [])
    .map((id, index) => ({ item: state.settings.builderCharms.find((charm) => charm.id === id), index }))
    .filter(({ item }) => item);
  const total = (base?.price || 0) + selectedCharms.reduce((sum, { item }) => sum + item.price, 0);
  const typeLabel = {
    bracelet: "bracelet",
    necklace: "necklace",
    "key-chain": "key chain",
    "bag-chain": "bag chain",
  }[state.builder.baseType || "bracelet"];
  const visualType = base?.type || state.builder.baseType || inferBaseType(base);
  preview.innerHTML = `
    <div class="creation-canvas designer-canvas ${escapeHtml(visualType)}">
      ${renderBuilderBaseSvg(visualType, base)}
      <div class="creation-base-name">${base ? escapeHtml(base.title) : `Choose a ${typeLabel}`}</div>
      <div class="creation-charms" aria-label="Selected charms">
        ${renderBuilderCharmSlots(selectedCharms, visualType)}
      </div>
    </div>
    <div>
      <h3>Your creation</h3>
      <p>${base ? escapeHtml(base.title) : `Choose a ${typeLabel}`} ${selectedCharms.length ? "with " + selectedCharms.map(({ item }) => item.title).join(", ") : "ready for charms."}</p>
      ${state.builder.swapIndex !== null ? `<p class="builder-note">Choose any charm below to replace the selected charm.</p>` : ""}
      <strong>${money.format(total, "AUD")}</strong>
      <div class="builder-actions">
        <button class="primary-button" data-builder-add ${!base || !selectedCharms.length ? "disabled" : ""}>Add creation to bag</button>
        <button class="secondary-button" data-builder-clear type="button">Reset</button>
        <a class="secondary-link" href="index.html">Cancel</a>
      </div>
    </div>
  `;
}

function renderBuilderCharmSlots(selectedCharms, type) {
  const anchors = builderAnchors(type, selectedCharms.length);
  return selectedCharms.map(({ item, index }) => {
    const anchor = anchors[index] || anchors[anchors.length - 1] || { x: 50, y: 52, rotate: 0 };
    return `
      <span class="creation-item ${state.builder.swapIndex === index ? "swapping" : ""}" style="--x:${anchor.x}%; --y:${anchor.y}%; --r:${anchor.rotate || 0}deg;">
        <span class="charm-connector" aria-hidden="true"></span>
        <span class="charm-ring" aria-hidden="true"></span>
        <span class="charm-photo">
            <img src="${charmCutoutSrc(item)}" alt="${escapeHtml(item.title)}">
        </span>
            <button type="button" data-builder-remove-index="${index}" aria-label="Remove ${escapeHtml(item.title)}">\u2212</button>
            <button type="button" class="swap-button" data-builder-swap-index="${index}">Swap</button>
      </span>
    `;
  }).join("");
}

function charmCutoutSrc(item) {
  if (item.cutoutImage) return item.cutoutImage;
  return String(item.image || "")
    .replace("/uniform/", "/cutouts/")
    .replace(/\.(jpe?g|png|webp)$/i, ".png");
}

function builderAnchors(type, count) {
  const maps = {
    bracelet: [
      { x: 29, y: 48, rotate: -10 },
      { x: 41, y: 54, rotate: -5 },
      { x: 50, y: 56, rotate: 0 },
      { x: 59, y: 54, rotate: 5 },
      { x: 71, y: 48, rotate: 10 },
      { x: 36, y: 42, rotate: -8 },
      { x: 64, y: 42, rotate: 8 },
    ],
    necklace: [
      { x: 50, y: 60, rotate: 0 },
      { x: 42, y: 53, rotate: -8 },
      { x: 58, y: 53, rotate: 8 },
      { x: 35, y: 45, rotate: -14 },
      { x: 65, y: 45, rotate: 14 },
      { x: 47, y: 48, rotate: -5 },
      { x: 53, y: 48, rotate: 5 },
    ],
    "key-chain": [
      { x: 50, y: 50, rotate: 0 },
      { x: 43, y: 58, rotate: -8 },
      { x: 57, y: 58, rotate: 8 },
      { x: 50, y: 67, rotate: 0 },
    ],
    "bag-chain": [
      { x: 30, y: 47, rotate: -8 },
      { x: 42, y: 50, rotate: -3 },
      { x: 54, y: 50, rotate: 3 },
      { x: 66, y: 47, rotate: 8 },
      { x: 78, y: 43, rotate: 12 },
    ],
  };
  return (maps[type] || maps.bracelet).slice(0, Math.max(count, 1));
}

function renderBuilderBaseSvg(type, base) {
  const title = escapeHtml(base?.title || "Ametopia base");
  if (type === "necklace") {
    return `
      <svg class="builder-chain-svg necklace-chain" viewBox="0 0 360 320" role="img" aria-label="${title}">
        <path class="chain-shadow" d="M68 42 C82 150 124 226 180 250 C236 226 278 150 292 42" />
        <path class="chain-line" d="M68 42 C82 150 124 226 180 250 C236 226 278 150 292 42" />
        ${chainLinks([[68,42,-20],[86,102,-12],[112,160,-8],[146,212,-4],[180,250,0],[214,212,4],[248,160,8],[274,102,12],[292,42,20]])}
        <circle class="jump-ring" cx="180" cy="250" r="13" />
      </svg>`;
  }
  if (type === "key-chain") {
    return `
      <svg class="builder-chain-svg key-chain-svg" viewBox="0 0 360 320" role="img" aria-label="${title}">
        <circle class="chain-line" cx="180" cy="76" r="44" />
        <circle class="chain-soft" cx="180" cy="76" r="28" />
        <path class="chain-line" d="M180 120 L180 178" />
        ${chainLinks([[180,130,90],[180,154,90],[180,178,90]])}
        <circle class="jump-ring" cx="180" cy="178" r="14" />
      </svg>`;
  }
  if (type === "bag-chain") {
    return `
      <svg class="builder-chain-svg bag-chain-svg" viewBox="0 0 360 320" role="img" aria-label="${title}">
        <path class="chain-shadow" d="M46 134 C98 98 150 92 180 118 C210 92 262 98 314 134" />
        <path class="chain-line" d="M46 134 C98 98 150 92 180 118 C210 92 262 98 314 134" />
        ${chainLinks([[54,134,-25],[90,116,-18],[126,106,-10],[162,112,-4],[198,112,4],[234,106,10],[270,116,18],[306,134,25]])}
        <path class="clasp" d="M28 130 C28 104 62 104 62 130 C62 156 28 156 28 130" />
        <path class="clasp" d="M298 130 C298 104 332 104 332 130 C332 156 298 156 298 130" />
      </svg>`;
  }
  return `
    <svg class="builder-chain-svg bracelet-chain" viewBox="0 0 360 320" role="img" aria-label="${title}">
      <ellipse class="chain-shadow" cx="180" cy="150" rx="130" ry="72" />
      <ellipse class="chain-line" cx="180" cy="150" rx="130" ry="72" />
      ${chainLinks([[54,150,0],[82,102,-32],[126,84,-16],[180,78,0],[234,84,16],[278,102,32],[306,150,0],[278,198,-32],[234,216,-16],[180,222,0],[126,216,16],[82,198,32]])}
      <circle class="jump-ring" cx="180" cy="222" r="13" />
    </svg>`;
}

function chainLinks(points) {
  return points.map(([cx, cy, rotate]) => `
    <ellipse class="chain-link" cx="${cx}" cy="${cy}" rx="18" ry="9" transform="rotate(${rotate} ${cx} ${cy})" />
  `).join("");
}

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      state.filter = filterButton.dataset.filter;
      renderProducts();
      document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const addButton = event.target.closest("[data-add]");
    if (addButton) {
      const qtyInput = document.querySelector(`[data-card-qty="${addButton.dataset.add}"]`) || document.querySelector(`[data-modal-qty="${addButton.dataset.add}"]`);
      addToCart(addButton.dataset.add, null, qtyInput?.value || 1);
    }

    const setButton = event.target.closest("[data-set-add]");
    if (setButton) {
      refreshSettings();
      const set = state.settings.sets.find((item) => item.id === setButton.dataset.setAdd);
      if (set) addToCart(set.id, { ...set, category: "Sets", currency: "AUD", tag: "sets" }, 1);
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) openProduct(state.products.find((item) => item.id === viewButton.dataset.view));

    const wishlistButton = event.target.closest("[data-wishlist]");
    if (wishlistButton) {
      const productId = wishlistButton.dataset.wishlist;
      const product = state.products.find((item) => item.id === productId);
      if (!product) return;
      if (state.wishlist.includes(productId)) {
        state.wishlist = state.wishlist.filter((id) => id !== productId);
      } else {
        state.wishlist.push(productId);
        if (product.stock <= 0 && state.account?.email) {
          state.restockSubscriptions.push({ productId, email: state.account.email, createdAt: new Date().toISOString() });
          alert("Saved to wishlist. We will email you when this product is back in stock.");
        } else {
          alert("Saved to wishlist.");
        }
      }
      save();
      renderProducts();
      renderFeaturedSections();
    }

    const inc = event.target.closest("[data-inc]");
    const dec = event.target.closest("[data-dec]");
    const remove = event.target.closest("[data-remove]");
    if (inc) changeQty(inc.dataset.inc, 1);
    if (dec) changeQty(dec.dataset.dec, -1);
    if (remove) changeQty(remove.dataset.remove, -999);

    if (event.target.matches(".close-dialog")) event.target.closest("dialog").close();

    const heroDot = event.target.closest("[data-hero-slide]");
    if (heroDot) setHeroSlide(Number(heroDot.dataset.heroSlide));

    const zoomButton = event.target.closest("[data-zoom-src]");
    if (zoomButton) {
      document.querySelector("#imageZoomDialog").innerHTML = `
        <button class="icon-button close-dialog" aria-label="Close">\u00d7</button>
        <img src="${zoomButton.dataset.zoomSrc}" alt="${escapeHtml(zoomButton.dataset.zoomAlt)}">
      `;
      document.querySelector("#imageZoomDialog").showModal();
    }

    const typeButton = event.target.closest("[data-builder-type]");
    if (typeButton) {
      state.builder.baseType = typeButton.dataset.builderType;
      state.builder.baseId = "";
      renderBuilderPage();
    }

    const baseButton = event.target.closest("[data-builder-base]");
    if (baseButton) {
      state.builder.baseId = baseButton.dataset.builderBase;
      renderBuilderPage();
    }

    if (event.target.closest("[data-builder-clear]")) {
      state.builder.charms = [];
      state.builder.swapIndex = null;
      renderBuilderPage();
    }

    const removeBuilderItem = event.target.closest("[data-builder-remove-index]");
    if (removeBuilderItem) {
      state.builder.charms.splice(Number(removeBuilderItem.dataset.builderRemoveIndex), 1);
      state.builder.swapIndex = null;
      renderBuilderPage();
    }

    const swapBuilderItem = event.target.closest("[data-builder-swap-index]");
    if (swapBuilderItem) {
      state.builder.swapIndex = Number(swapBuilderItem.dataset.builderSwapIndex);
      renderBuilderPage();
    }

    const charmButton = event.target.closest("[data-builder-charm]");
    if (charmButton) {
      state.builder.charms = Array.isArray(state.builder.charms) ? state.builder.charms : [];
      if (state.builder.swapIndex !== null && state.builder.charms[state.builder.swapIndex]) {
        state.builder.charms[state.builder.swapIndex] = charmButton.dataset.builderCharm;
        state.builder.swapIndex = null;
      } else {
        state.builder.charms.push(charmButton.dataset.builderCharm);
      }
      renderBuilderPage();
    }

    if (event.target.closest("[data-builder-add]")) {
      refreshSettings();
      const base = state.settings.builderBases.find((item) => item.id === state.builder.baseId);
      const charms = (state.builder.charms || [])
        .map((id) => state.settings.builderCharms.find((item) => item.id === id))
        .filter(Boolean);
      const total = (base?.price || 0) + charms.reduce((sum, item) => sum + item.price, 0);
      const title = `Custom ${base?.title || "Ametopia"} design`;
      addToCart(`custom-${Date.now()}`, {
        id: `custom-${Date.now()}`,
        title,
        category: "Custom",
        price: total,
        currency: "AUD",
        image: base?.image || "assets/products/uniform/heart-stars-charm-chain-necklace.jpg",
        stock: 99,
        description: charms.map((item) => item.title).join(", ") || "Custom charm builder piece",
      });
    }

    const builderEffectLink = event.target.closest("[data-builder-effect]");
    if (builderEffectLink) {
      event.preventDefault();
      playBuilderEffect(builderEffectLink);
      setTimeout(() => {
        window.location.href = builderEffectLink.href;
      }, 520);
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-delivery-select]")) {
      state.delivery = event.target.value;
      renderCart();
    }
  });
}

function playBuilderEffect(target) {
  refreshSettings();
  const effect = state.settings.builderButtonEffect || "magic";
  if (effect === "off") return;
  const rect = target.getBoundingClientRect();
  const symbols = effect === "hearts" ? ["\u2665", "\u2661", "\u2665"] : effect === "paws" ? ["\u{1F43E}", "\u2726", "\u{1F43E}"] : ["\u2726", "\u2605", "\u2727", "\u{1FA84}"];
  for (let index = 0; index < 14; index += 1) {
    const particle = document.createElement("span");
    particle.className = `click-particle ${effect}`;
    particle.textContent = symbols[index % symbols.length];
    particle.style.left = `${rect.left + rect.width / 2}px`;
    particle.style.top = `${rect.top + rect.height / 2}px`;
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * 170}px`);
    particle.style.setProperty("--y", `${-40 - Math.random() * 120}px`);
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 900);
  }
}

function bindPageForms() {
  [selectors.searchInput, selectors.sortSelect, selectors.priceRange, selectors.inStockOnly].filter(Boolean).forEach((control) => {
    control.addEventListener("input", () => {
      selectors.priceLabel.textContent = `Up to ${money.format(Number(selectors.priceRange.value))}`;
      renderProducts();
    });
  });

  document.querySelector("#cartButton")?.addEventListener("click", openCart);
  document.querySelector("#closeCart")?.addEventListener("click", closeCart);
  selectors.scrim?.addEventListener("click", closeCart);
  document.querySelector("#promoInput")?.addEventListener("input", (event) => {
    state.promo = event.target.value;
    renderCart();
  });

  document.querySelector("#checkoutButton")?.addEventListener("click", () => {
    if (!state.cart.length) return;
    closeCart();
    renderDeliverySelects();
    selectors.checkoutDialog.showModal();
  });

  document.querySelector("#checkoutForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.delivery) state.delivery = data.delivery;
    const totals = cartTotals();
    const cardDigits = String(data.cardNumber || "").replace(/\D/g, "");
    const order = {
      id: `AM-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      email: data.email,
      name: data.name,
      address: data.address,
      delivery: state.delivery,
      paymentProvider: "Stripe",
      paymentMethod: `Credit card ending ${cardDigits.slice(-4) || "0000"}`,
      paymentStatus: "Paid",
      fulfillmentStatus: "Unfulfilled",
      note: data.note,
      items: state.cart.reduce((sum, item) => sum + item.qty, 0),
      total: totals.total,
      lines: state.cart,
    };
    state.orders.push(order);
    state.products = state.products.map((product) => {
      const line = state.cart.find((item) => item.id === product.id);
      return line ? { ...product, stock: Math.max(0, product.stock - line.qty) } : product;
    });
    state.cart = [];
    save();
    selectors.checkoutDialog.close();
    renderAll();
    alert(`Order ${order.id} placed. Confirmation saved locally.`);
  });

  document.querySelector("#accountButton")?.addEventListener("click", () => {
    renderAccount();
    selectors.accountDialog.showModal();
  });

  document.querySelector("#accountForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.account = Object.fromEntries(new FormData(event.currentTarget));
    save();
    renderAccount();
  });

  document.querySelector("#subscribeForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const email = data.email.trim().toLowerCase();
    if (!state.subscribers.includes(email)) state.subscribers.push(email);
    state.account = { ...(state.account || {}), email, name: state.account?.name || "" };
    save();
    document.querySelector("#subscribeMessage").textContent = "Subscribed. Use code WELCOME10 for 10% off your first order over A$100.";
    document.querySelector("#promoInput").value = "WELCOME10";
    state.promo = "WELCOME10";
    renderCart();
  });
}

function renderAll() {
  renderProducts();
  renderFeaturedSections();
  renderBuilderPage();
  renderCart();
}

bindGlobalEvents();
bindPageForms();
renderAll();

if (document.querySelector("#heroMainImage")) {
  setInterval(() => {
    setHeroSlide((activeHeroSlide + 1) % heroSlides.length);
  }, 5200);
}
