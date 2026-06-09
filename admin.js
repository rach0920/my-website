const adminMoney = {
  format(value, currency = "AUD") {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(Number(value || 0));
  }
};

const DATA_VERSION = "ametopia-operable-storefront-2026-06-07";
const baseProducts = Array.isArray(window.AMETOPIA_PRODUCTS) ? window.AMETOPIA_PRODUCTS : [];

function readJson(key, fallback) {
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
    // File URLs or privacy settings may block storage; admin still works in memory.
  }
}

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Login should still proceed even when session storage is blocked.
  }
}

function removeSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // No-op.
  }
}

try {
  if (localStorage.getItem("ametopiaDataVersion") !== DATA_VERSION) {
    localStorage.removeItem("ametopiaProducts");
    localStorage.setItem("ametopiaDataVersion", DATA_VERSION);
  }
} catch {
  // Ignore storage migration failures.
}

function defaultSettings() {
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
      { id: "gold-curb-chain-carabiner-necklace", title: "Gold Curb Chain Carabiner Necklace", price: 29.99, stock: 10, image: "assets/products/uniform/gold-curb-chain-carabiner-necklace.jpg" },
      { id: "gold-bead-ball-chain-bracelet", title: "Gold Bead Ball Chain Bracelet", price: 16.99, stock: 10, image: "assets/products/uniform/gold-bead-ball-chain-bracelet.jpg" },
      { id: "red-rope-gold-chain-bracelet", title: "Red Rope Gold Chain Bracelet", price: 19.99, stock: 10, image: "assets/products/uniform/red-rope-gold-chain-bracelet.jpg" },
    ],
    builderCharms: [
      { id: "sweet-cherry-pair-charm", title: "Sweet Cherry Pair Charm", price: 24.99, stock: 10, image: "assets/products/uniform/sweet-cherry-pair-charm.jpg" },
      { id: "pink-bow-sparkle-charm", title: "Pink Bow Sparkle Charm", price: 24.99, stock: 10, image: "assets/products/uniform/pink-bow-sparkle-charm.jpg" },
      { id: "aqua-star-crystal-charm", title: "Aqua Star Crystal Charm", price: 5.99, stock: 10, image: "assets/products/uniform/aqua-star-crystal-charm.jpg" },
      { id: "golden-key-heart-charm", title: "Golden Key & Heart Charm", price: 24.99, stock: 10, image: "assets/products/uniform/golden-key-heart-charm.jpg" },
    ],
    builderButtonEffect: "magic",
    payments: {
      provider: "Stripe",
      methods: "Credit card only",
      paypal: false,
      publishableKey: "pk_test_replace_with_live_key",
      mode: "Test mode",
    },
    store: {
      name: "Ametopia",
      currency: "AUD",
      market: "Australia",
      supportEmail: "hello@ametopia.com",
    },
    policies: {
      returns: "Customer rights under Australian Consumer Law are not excluded. Faulty goods may be eligible for repair, replacement, refund, or other remedy.",
      privacy: "Customer details are used to process orders, wishlist alerts, restock emails, and customer support.",
      shipping: "Orders over A$100 ship free within Australia via standard Australia Post. Express Australia Post is available at the current configured rate.",
    },
  };
}

function mergedSettings() {
  const defaults = defaultSettings();
  const stored = readJson("ametopiaSettings", {});
  return {
    ...defaults,
    ...stored,
    shipping: { ...defaults.shipping, ...(stored.shipping || {}) },
    payments: { ...defaults.payments, ...(stored.payments || {}) },
    store: { ...defaults.store, ...(stored.store || {}) },
    policies: { ...defaults.policies, ...(stored.policies || {}) },
    discounts: stored.discounts || defaults.discounts,
    sales: stored.sales || defaults.sales,
    pageSections: stored.pageSections || defaults.pageSections,
    sets: stored.sets || defaults.sets,
    builderBases: stored.builderBases || defaults.builderBases,
    builderCharms: stored.builderCharms || defaults.builderCharms,
    builderButtonEffect: stored.builderButtonEffect || defaults.builderButtonEffect,
  };
}

const adminState = {
  products: readJson("ametopiaProducts", null) || baseProducts,
  orders: readJson("ametopiaOrders", []),
  wishlist: readJson("ametopiaWishlist", []),
  restockSubscriptions: readJson("ametopiaRestockSubscriptions", []),
  subscribers: readJson("ametopiaSubscribers", []),
  settings: mergedSettings(),
  ui: {
    activePanel: "overview",
    selectedProduct: 0,
    productQuery: "",
    productFilter: "all",
    builderType: "builderBases",
    selectedBuilderItem: 0,
    builderQuery: "",
  },
};

function saveAdminState() {
  writeJson("ametopiaProducts", adminState.products);
  writeJson("ametopiaOrders", adminState.orders);
  writeJson("ametopiaWishlist", adminState.wishlist);
  writeJson("ametopiaRestockSubscriptions", adminState.restockSubscriptions);
  writeJson("ametopiaSubscribers", adminState.subscribers);
  writeJson("ametopiaSettings", adminState.settings);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function customers() {
  return Array.from(new Set([
    ...adminState.orders.map((order) => order.email).filter(Boolean),
    ...adminState.subscribers,
  ]));
}

function filteredAdminProducts() {
  const query = adminState.ui.productQuery.trim().toLowerCase();
  const filter = adminState.ui.productFilter;
  return adminState.products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => {
      const text = [product.title, product.category, product.tag, product.id, product.handle].join(" ").toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesFilter =
        filter === "all" ||
        product.category === filter ||
        (filter === "low" && product.stock > 0 && product.stock <= 3) ||
        (filter === "sale" && (product.onSale || Number(product.salePrice || 0) > 0));
      return matchesQuery && matchesFilter;
    });
}

function renderProductEditor() {
  const editor = document.querySelector("#productEditor");
  if (!editor) return;
  const product = adminState.products[adminState.ui.selectedProduct];
  if (!product) {
    editor.innerHTML = `<div class="empty">Select a product to edit details.</div>`;
    return;
  }
  const index = adminState.ui.selectedProduct;
  editor.innerHTML = `
    <div class="admin-card-head">
      <strong>Edit product</strong>
      <button type="button" data-delete-product="${index}">Delete product</button>
    </div>
    <img class="admin-editor-image" src="${product.image}" alt="${escapeHtml(product.title)}">
    <label>Product title ${field(`products.${index}.title`, product.title)}</label>
    <label>Product ID / SKU ${field(`products.${index}.id`, product.id)}</label>
    <label>Category ${field(`products.${index}.category`, product.category)}</label>
    <label>Tag ${field(`products.${index}.tag`, product.tag)}</label>
    <label>Image path ${field(`products.${index}.image`, product.image)}</label>
    <label>Description ${field(`products.${index}.description`, product.description, "textarea")}</label>
    <div class="admin-edit-grid">
      <label>Price ${field(`products.${index}.price`, product.price, "number")}</label>
      <label>Stock amount ${field(`products.${index}.stock`, product.stock, "number")}</label>
      <label>Sale price ${field(`products.${index}.salePrice`, product.salePrice || "", "number")}</label>
      <label>New arrival ${field(`products.${index}.isNew`, product.isNew || false, "checkbox")}</label>
      <label>On sale ${field(`products.${index}.onSale`, product.onSale || false, "checkbox")}</label>
    </div>
  `;
}

function field(path, value, type = "text") {
  const escaped = escapeHtml(value);
  if (type === "textarea") return `<textarea data-edit="${path}">${escaped}</textarea>`;
  if (type === "checkbox") return `<input type="checkbox" data-edit="${path}" ${value ? "checked" : ""}>`;
  return `<input type="${type}" data-edit="${path}" value="${escaped}">`;
}

function renderAdmin() {
  const totalSales = adminState.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalUnits = adminState.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const lowStock = adminState.products.filter((product) => product.stock > 0 && product.stock <= 3).length;
  const customerEmails = customers();
  const promoCount = adminState.settings.discounts.length + adminState.settings.sales.length;
  const builderCount = adminState.settings.builderBases.length + adminState.settings.builderCharms.length;

  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== adminState.ui.activePanel;
  });
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === adminState.ui.activePanel);
  });
  const counts = {
    navProductCount: adminState.products.length,
    navOrderCount: adminState.orders.length,
    navCustomerCount: customerEmails.length,
    navPromoCount: promoCount,
    navContentCount: adminState.settings.pageSections.length,
    navSetCount: adminState.settings.sets.length,
    navBuilderCount: builderCount,
  };
  Object.entries(counts).forEach(([id, value]) => {
    const node = document.querySelector(`#${id}`);
    if (node) node.textContent = value;
  });

  document.querySelector("#adminKpis").innerHTML = `
    <div><strong>${adminMoney.format(totalSales, "AUD")}</strong><span>Total sales</span></div>
    <div><strong>${adminState.orders.length}</strong><span>Orders</span></div>
    <div><strong>${customerEmails.length}</strong><span>Customers</span></div>
    <div><strong>${lowStock}</strong><span>Low stock</span></div>
    <div><strong>${totalUnits}</strong><span>Units in stock</span></div>
  `;
  document.querySelector("#adminQuickActions").innerHTML = `
    <button type="button" data-admin-tab="products"><strong>Add or edit products</strong><span>${adminState.products.length} products in catalogue</span></button>
    <button type="button" data-admin-tab="orders"><strong>Manage orders</strong><span>${adminState.orders.length} orders in the system</span></button>
    <button type="button" data-admin-tab="promotions"><strong>Update promotions</strong><span>${promoCount} discount and sale tools</span></button>
    <button type="button" data-admin-tab="builder"><strong>Edit Charm Builder</strong><span>${builderCount} bases and charms</span></button>
    <button type="button" data-admin-tab="settings"><strong>Shipping, payment, policies</strong><span>Stripe, AU Post and legal copy</span></button>
  `;

  document.querySelector("#pageSectionsPanel").innerHTML = adminState.settings.pageSections.map((section, index) => `
    <div class="admin-edit-card">
      <label>Visible ${field(`settings.pageSections.${index}.active`, section.active, "checkbox")}</label>
      <label>Section ID ${field(`settings.pageSections.${index}.id`, section.id)}</label>
      <label>Title ${field(`settings.pageSections.${index}.title`, section.title)}</label>
      <label>Copy ${field(`settings.pageSections.${index}.copy`, section.copy, "textarea")}</label>
      <button type="button" data-delete="settings.pageSections.${index}">Delete section</button>
    </div>
  `).join("");

  const productRows = filteredAdminProducts();
  document.querySelector("#adminProducts").innerHTML = productRows.map(({ product, index }) => `
    <button type="button" class="admin-list-row ${index === adminState.ui.selectedProduct ? "active" : ""}" data-select-product="${index}">
      <span><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(product.category)} \u00b7 ${escapeHtml(product.id)}</small></span>
      <span>${product.stock <= 0 ? "Sold out" : product.stock <= 3 ? "Low" : product.stock}</span>
      <span>${adminMoney.format(product.salePrice || product.price, product.currency)}</span>
    </button>
  `).join("") || `<div class="empty">No matching products.</div>`;
  renderProductEditor();

  document.querySelector("#ordersList").innerHTML = adminState.orders.slice().reverse().map((order) => `
    <div class="order-row">
      <div>
        <strong>${escapeHtml(order.name)}</strong>
        <br>
        <span>${escapeHtml(order.id)} - ${order.items} items - ${escapeHtml(order.email)}</span>
        <br>
        <span>${escapeHtml(order.delivery || "standard")} - ${escapeHtml(order.paymentStatus || "Paid")} - ${escapeHtml(order.fulfillmentStatus || "Unfulfilled")}</span>
      </div>
      <div class="admin-actions">
        <strong>${adminMoney.format(order.total, "AUD")}</strong>
        <button type="button" data-fulfill="${order.id}">Fulfil</button>
        <button type="button" data-refund="${order.id}">Refund</button>
      </div>
    </div>
  `).join("") || `<div class="empty">No orders yet.</div>`;

  document.querySelector("#customersList").innerHTML = customerEmails.map((email) => {
    const customerOrders = adminState.orders.filter((order) => order.email === email);
    const spent = customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return `<div class="order-row"><div><strong>${escapeHtml(email)}</strong><br><span>${customerOrders.length} orders - ${adminMoney.format(spent, "AUD")} spent</span></div><strong>${adminState.subscribers.includes(email) ? "Subscribed" : "Customer"}</strong></div>`;
  }).join("") || `<div class="empty">No customers yet.</div>`;

  const restockRows = adminState.restockSubscriptions.map((item) => {
    const product = adminState.products.find((candidate) => candidate.id === item.productId);
    return `<div class="order-row"><div><strong>${escapeHtml(product?.title || item.productId)}</strong><br><span>${escapeHtml(item.email)}</span></div><strong>Email alert</strong></div>`;
  }).join("");
  const subscriberRows = adminState.subscribers.map((email) => `<div class="order-row"><div><strong>${escapeHtml(email)}</strong><br><span>WELCOME10 first-order subscriber</span></div><strong>10% off</strong></div>`).join("");
  document.querySelector("#wishlistAlerts").innerHTML = restockRows + subscriberRows || `<div class="empty">No wishlist or email subscriptions yet.</div>`;

  document.querySelector("#discountsPanel").innerHTML = adminState.settings.discounts.map((discount, index) => `
    <div class="admin-edit-card">
      <div class="admin-card-head"><strong>${escapeHtml(discount.code)}</strong><button type="button" data-delete="settings.discounts.${index}">Delete</button></div>
      <div class="admin-edit-grid">
        <label>Code ${field(`settings.discounts.${index}.code`, discount.code)}</label>
        <label>Value % ${field(`settings.discounts.${index}.value`, discount.value, "number")}</label>
        <label>Minimum ${field(`settings.discounts.${index}.minimum`, discount.minimum, "number")}</label>
        <label>Start ${field(`settings.discounts.${index}.starts`, discount.starts || "", "date")}</label>
        <label>End ${field(`settings.discounts.${index}.ends`, discount.ends || "", "date")}</label>
        <label>Active ${field(`settings.discounts.${index}.active`, discount.active, "checkbox")}</label>
      </div>
    </div>
  `).join("");

  document.querySelector("#salesPanel").innerHTML = adminState.settings.sales.map((sale, index) => `
    <div class="admin-edit-card">
      <div class="admin-card-head"><strong>${escapeHtml(sale.title)}</strong><button type="button" data-delete="settings.sales.${index}">Delete</button></div>
      <label>Title ${field(`settings.sales.${index}.title`, sale.title)}</label>
      <label>Copy ${field(`settings.sales.${index}.copy`, sale.copy, "textarea")}</label>
      <label>CTA ${field(`settings.sales.${index}.cta`, sale.cta)}</label>
      <label>Active ${field(`settings.sales.${index}.active`, sale.active, "checkbox")}</label>
    </div>
  `).join("");

  document.querySelector("#shippingPanel").innerHTML = `
    <label>Standard label ${field("settings.shipping.standardLabel", adminState.settings.shipping.standardLabel)}</label>
    <label>Standard AU Post cost ${field("settings.shipping.standardRate", adminState.settings.shipping.standardRate, "number")}</label>
    <label>Express label ${field("settings.shipping.expressLabel", adminState.settings.shipping.expressLabel)}</label>
    <label>Express AU Post cost ${field("settings.shipping.expressRate", adminState.settings.shipping.expressRate, "number")}</label>
    <label>Free standard threshold ${field("settings.shipping.freeThreshold", adminState.settings.shipping.freeThreshold, "number")}</label>
    <label>Processing time ${field("settings.shipping.processingDays", adminState.settings.shipping.processingDays)}</label>
  `;

  document.querySelector("#paymentsPanel").innerHTML = `
    <div class="admin-row"><div><strong>Stripe</strong><br><span>Credit card payments only</span></div><strong>Enabled</strong></div>
    <div class="admin-row"><div><strong>PayPal</strong><br><span>Not offered by Ametopia</span></div><strong>Disabled</strong></div>
    <label>Stripe publishable key ${field("settings.payments.publishableKey", adminState.settings.payments.publishableKey)}</label>
    <label>Mode ${field("settings.payments.mode", adminState.settings.payments.mode)}</label>
  `;

  document.querySelector("#analyticsPanel").innerHTML = `
    <div class="admin-row"><div><strong>Average order value</strong><br><span>${adminState.orders.length ? adminMoney.format(totalSales / adminState.orders.length, "AUD") : adminMoney.format(0, "AUD")}</span></div></div>
    <div class="admin-row"><div><strong>Wishlist saves</strong><br><span>${adminState.wishlist.length} saved items</span></div></div>
    <div class="admin-row"><div><strong>Restock requests</strong><br><span>${adminState.restockSubscriptions.length} email alerts waiting</span></div></div>
  `;

  document.querySelector("#policiesPanel").innerHTML = `
    <label>Returns policy ${field("settings.policies.returns", adminState.settings.policies.returns, "textarea")}</label>
    <label>Privacy summary ${field("settings.policies.privacy", adminState.settings.policies.privacy, "textarea")}</label>
    <label>Shipping policy ${field("settings.policies.shipping", adminState.settings.policies.shipping, "textarea")}</label>
  `;

  document.querySelector("#storeSettingsPanel").innerHTML = `
    <label>Store name ${field("settings.store.name", adminState.settings.store.name)}</label>
    <label>Currency ${field("settings.store.currency", adminState.settings.store.currency)}</label>
    <label>Market ${field("settings.store.market", adminState.settings.store.market)}</label>
    <label>Support email ${field("settings.store.supportEmail", adminState.settings.store.supportEmail, "email")}</label>
    <label>Charm Builder button effect
      <select data-edit="settings.builderButtonEffect">
        <option value="magic" ${adminState.settings.builderButtonEffect === "magic" ? "selected" : ""}>Magical wand & stars</option>
        <option value="hearts" ${adminState.settings.builderButtonEffect === "hearts" ? "selected" : ""}>Little hearts pop up</option>
        <option value="paws" ${adminState.settings.builderButtonEffect === "paws" ? "selected" : ""}>Dog paw pop up</option>
        <option value="off" ${adminState.settings.builderButtonEffect === "off" ? "selected" : ""}>Off</option>
      </select>
    </label>
  `;

  document.querySelector("#setsAdminPanel").innerHTML = adminState.settings.sets.map((set, index) => `
    <div class="admin-edit-card">
      <div class="admin-card-head"><strong>${escapeHtml(set.title)}</strong><button type="button" data-delete="settings.sets.${index}">Delete</button></div>
      <label>Title ${field(`settings.sets.${index}.title`, set.title)}</label>
      <label>Image path ${field(`settings.sets.${index}.image`, set.image)}</label>
      <label>Description ${field(`settings.sets.${index}.description`, set.description, "textarea")}</label>
      <div class="admin-edit-grid">
        <label>Price ${field(`settings.sets.${index}.price`, set.price, "number")}</label>
        <label>Stock ${field(`settings.sets.${index}.stock`, set.stock, "number")}</label>
        <label>Active ${field(`settings.sets.${index}.active`, set.active, "checkbox")}</label>
      </div>
    </div>
  `).join("");

  renderBuilderInventory();
}

function filteredBuilderItems() {
  const key = adminState.ui.builderType;
  const query = adminState.ui.builderQuery.trim().toLowerCase();
  return adminState.settings[key]
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !query || [item.title, item.id].join(" ").toLowerCase().includes(query));
}

function renderBuilderInventory() {
  const list = document.querySelector("#builderInventoryPanel");
  const editor = document.querySelector("#builderItemEditor");
  if (!list || !editor) return;
  const key = adminState.ui.builderType;
  const rows = filteredBuilderItems();
  list.innerHTML = rows.map(({ item, index }) => `
    <button type="button" class="admin-list-row ${index === adminState.ui.selectedBuilderItem ? "active" : ""}" data-select-builder="${index}">
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.id || "")}</small></span>
      <span>${item.stock}</span>
      <span>${adminMoney.format(item.price, "AUD")}</span>
    </button>
  `).join("") || `<div class="empty">No matching builder items.</div>`;
  const item = adminState.settings[key][adminState.ui.selectedBuilderItem];
  if (!item) {
    editor.innerHTML = `<div class="empty">Select a builder item to edit.</div>`;
    return;
  }
  editor.innerHTML = `
    <div class="admin-card-head">
      <strong>Edit ${key === "builderBases" ? "base" : "charm"}</strong>
      <button type="button" data-delete="settings.${key}.${adminState.ui.selectedBuilderItem}">Delete</button>
    </div>
    <img class="admin-editor-image" src="${item.image}" alt="${escapeHtml(item.title)}">
    <label>Title ${field(`settings.${key}.${adminState.ui.selectedBuilderItem}.title`, item.title)}</label>
    <label>ID / SKU ${field(`settings.${key}.${adminState.ui.selectedBuilderItem}.id`, item.id || "")}</label>
    <label>Image path ${field(`settings.${key}.${adminState.ui.selectedBuilderItem}.image`, item.image)}</label>
    <div class="admin-edit-grid">
      <label>Single item price ${field(`settings.${key}.${adminState.ui.selectedBuilderItem}.price`, item.price, "number")}</label>
      <label>Available amount ${field(`settings.${key}.${adminState.ui.selectedBuilderItem}.stock`, item.stock, "number")}</label>
    </div>
  `;
}

function valueForInput(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return Number(input.value);
  return input.value;
}

function setDeep(path, value) {
  const keys = path.split(".");
  let target = adminState;
  keys.slice(0, -1).forEach((key) => {
    target = target[key];
  });
  target[keys[keys.length - 1]] = value;
}

function deleteDeep(path) {
  const keys = path.split(".");
  let target = adminState;
  keys.slice(0, -1).forEach((key) => {
    target = target[key];
  });
  target.splice(Number(keys[keys.length - 1]), 1);
}

function addProduct() {
  const id = `new-product-${Date.now()}`;
  adminState.products.unshift({
    id,
    title: "New Product",
    category: "Charms",
    price: 0,
    currency: "AUD",
    image: "assets/products/uniform/gold-dice-charm.jpg",
    originalImage: "",
    tag: "charms",
    stock: 0,
    rating: 4.9,
    personalized: false,
    created: Date.now(),
    description: "Add product details here.",
    handle: slugify(id),
  });
}

function showDashboard() {
  document.querySelector("#loginPanel").hidden = true;
  document.querySelector("#adminDashboard").hidden = false;
  renderAdmin();
}

function showLogin() {
  document.querySelector("#loginPanel").hidden = false;
  document.querySelector("#adminDashboard").hidden = true;
}

function bindAdmin() {
  const loginForm = document.querySelector("#adminLoginForm");
  const logoutButton = document.querySelector("#logoutButton");
  const dashboard = document.querySelector("#adminDashboard");

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (String(data.password || "").trim() !== "ame-2016") {
      alert("Incorrect admin password. Use ame-2016.");
      return;
    }
    writeSession("ametopiaAdmin", "true");
    showDashboard();
  });

  logoutButton?.addEventListener("click", () => {
    removeSession("ametopiaAdmin");
    showLogin();
  });

  dashboard?.addEventListener("input", (event) => {
    if (event.target.id === "productAdminSearch") {
      adminState.ui.productQuery = event.target.value;
      renderAdmin();
      return;
    }
    if (event.target.id === "builderAdminSearch") {
      adminState.ui.builderQuery = event.target.value;
      renderBuilderInventory();
      return;
    }
    if (!event.target.matches("[data-edit]")) return;
    setDeep(event.target.dataset.edit, valueForInput(event.target));
    saveAdminState();
  });

  dashboard?.addEventListener("change", (event) => {
    if (event.target.id === "productAdminFilter") {
      adminState.ui.productFilter = event.target.value;
      adminState.ui.selectedProduct = filteredAdminProducts()[0]?.index || 0;
      renderAdmin();
      return;
    }
    if (event.target.id === "builderAdminType") {
      adminState.ui.builderType = event.target.value;
      adminState.ui.selectedBuilderItem = 0;
      renderBuilderInventory();
      return;
    }
    if (!event.target.matches("[data-edit]")) return;
    setDeep(event.target.dataset.edit, valueForInput(event.target));
    saveAdminState();
    renderAdmin();
  });

  dashboard?.addEventListener("click", (event) => {
    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab) {
      adminState.ui.activePanel = adminTab.dataset.adminTab;
      renderAdmin();
      return;
    }

    if (event.target.closest("[data-export]")) {
      exportAdminData();
      return;
    }

    const productSelect = event.target.closest("[data-select-product]");
    if (productSelect) {
      adminState.ui.selectedProduct = Number(productSelect.dataset.selectProduct);
      renderAdmin();
      return;
    }
    const builderSelect = event.target.closest("[data-select-builder]");
    if (builderSelect) {
      adminState.ui.selectedBuilderItem = Number(builderSelect.dataset.selectBuilder);
      renderBuilderInventory();
      return;
    }
    if (event.target.id === "addProductButton") addProduct();
    if (event.target.id === "addSectionButton") adminState.settings.pageSections.push({ id: `custom-${Date.now()}`, title: "New Section", copy: "Add page or section content here.", active: true });
    if (event.target.id === "addDiscountButton") adminState.settings.discounts.push({ code: "HOLIDAY10", type: "Percent", value: 10, minimum: 0, active: true, starts: "", ends: "" });
    if (event.target.id === "addSaleButton") adminState.settings.sales.push({ title: "Seasonal sale", copy: "Add seasonal promotion details here.", cta: "Shop now", active: true });
    if (event.target.id === "addSetButton") adminState.settings.sets.push({ id: `set-${Date.now()}`, title: "New Set", price: 0, stock: 0, image: "assets/products/uniform/heart-stars-charm-chain-necklace.jpg", description: "Set details.", active: true });
    if (event.target.id === "addBuilderBaseButton") {
      adminState.settings.builderBases.push({ id: `base-${Date.now()}`, title: "New Base", price: 0, stock: 0, image: "assets/products/uniform/gold-curb-chain-carabiner-necklace.jpg" });
      adminState.ui.builderType = "builderBases";
      adminState.ui.selectedBuilderItem = adminState.settings.builderBases.length - 1;
    }
    if (event.target.id === "addBuilderCharmButton") {
      adminState.settings.builderCharms.push({ id: `charm-${Date.now()}`, title: "New Charm", price: 0, stock: 0, image: "assets/products/uniform/sweet-cherry-pair-charm.jpg" });
      adminState.ui.builderType = "builderCharms";
      adminState.ui.selectedBuilderItem = adminState.settings.builderCharms.length - 1;
    }
    if (event.target.dataset.deleteProduct) {
      adminState.products.splice(Number(event.target.dataset.deleteProduct), 1);
      adminState.ui.selectedProduct = Math.max(0, adminState.ui.selectedProduct - 1);
    }
    if (event.target.dataset.delete) {
      deleteDeep(event.target.dataset.delete);
      adminState.ui.selectedBuilderItem = Math.max(0, adminState.ui.selectedBuilderItem - 1);
    }

    const fulfillId = event.target.dataset.fulfill;
    const refundId = event.target.dataset.refund;
    if (fulfillId || refundId) {
      adminState.orders = adminState.orders.map((order) => {
        if (order.id === fulfillId) return { ...order, fulfillmentStatus: "Fulfilled" };
        if (order.id === refundId) return { ...order, paymentStatus: "Refunded", fulfillmentStatus: "Closed" };
        return order;
      });
    }

    if (event.target.matches("button")) {
      saveAdminState();
      renderAdmin();
    }
  });

  if (readSession("ametopiaAdmin") === "true") showDashboard();
}

function exportAdminData() {
  const payload = JSON.stringify(adminState, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ametopia-commerce-export.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindAdmin);
} else {
  bindAdmin();
}
