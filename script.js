// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeModalBtns = document.querySelectorAll('.close-btn');
const adminTrigger = document.getElementById('admin-trigger');
const adminModal = document.getElementById('admin-modal');
const productsGrid = document.getElementById('products-grid');
const addProductForm = document.getElementById('add-product-form');

// --- Theme Logic ---
const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to Dark
body.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// --- Modal Logic ---
function openModal(modal) {
    modal.classList.remove('hidden'); // Ensure display block if using display:none
    // Force reflow
    void modal.offsetWidth; 
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => {
        // modal.classList.add('hidden'); // Optional if strictly hiding is needed
    }, 300);
}

cartBtn.addEventListener('click', () => openModal(cartModal));

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        closeModal(modal);
    });
});

// Close when clicking outside content
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

// --- Admin Access ---
adminTrigger.addEventListener('click', () => {
    closeModal(cartModal);
    setTimeout(() => openModal(adminModal), 300);
});

// --- Firebase & App Logic ---

// Wait for Firebase to initialize (from script tags)
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        const db = firebase.firestore();
        const storage = firebase.storage();
        
        console.log("Firebase Initialized");

        // Fetch Products
        fetchProducts(db);
        
        // Add Product Handle
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddProduct(e, db, storage);
        });

    } catch (error) {
        console.error("Firebase Config missing or invalid:", error);
        productsGrid.innerHTML = `<div class="empty-state"><p>بانتظار ربط قاعدة البيانات (Firebase)</p></div>`;
    }
});

function fetchProducts(db) {
    productsGrid.innerHTML = '<div class="empty-state"><p>جار التحميل...</p></div>';
    
    db.collection('products').onSnapshot((snapshot) => {
        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="empty-state"><p>لا توجد منتجات حالياً.</p></div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            html += `
                <article class="product-card">
                    <img src="${product.imageUrl}" alt="${product.name}" class="product-img">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-price">${product.price} ج.م</div>
                        <button class="add-to-cart-btn">إضافة للسلة</button>
                    </div>
                </article>
            `;
        });
        productsGrid.innerHTML = html;
    }, (error) => {
        console.error("Error fetching products:", error);
        productsGrid.innerHTML = '<div class="empty-state"><p>حدث خطأ في تحميل المنتجات.</p></div>';
    });
}

async function handleAddProduct(e, db, storage) {
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "جار الإضافة...";
    btn.disabled = true;

    try {
        const file = document.getElementById('product-image-file').files[0];
        const name = document.getElementById('product-name').value;
        const price = document.getElementById('product-price').value;

        if (!file) {
            alert("يرجى اختيار صورة");
            throw new Error("No file selected");
        }

        // 1. Upload Image
        const storageRef = storage.ref(`products/${Date.now()}_${file.name}`);
        const snapshot = await storageRef.put(file);
        const imageUrl = await snapshot.ref.getDownloadURL();

        // 2. Add to Firestore
        await db.collection('products').add({
            name: name,
            price: Number(price),
            imageUrl: imageUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reset Form
        e.target.reset();
        alert("تمت إضافة المنتج بنجاح!");
        closeModal(adminModal);

    } catch (error) {
        console.error("Error adding product:", error);
        alert("حدث خطأ: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
