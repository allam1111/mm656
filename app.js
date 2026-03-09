/* app.js — محل الفاجر full app */
const { useState, useEffect, useRef } = React;
const ADMIN_EMAIL = window.ADMIN_EMAIL || "m@gmail.com";

// ─── Firebase init ─────────────────────────────────────────────────────────
let db, auth, storage;
try {
    if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
} catch (e) { console.error("Firebase init error:", e); }

// ─── Toast helper ──────────────────────────────────────────────────────────
const ToastCtx = React.createContext(null);
function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const show = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };
    return (
        <ToastCtx.Provider value={show}>
            {children}
            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
        </ToastCtx.Provider>
    );
}

// ─── Google SVG icon ───────────────────────────────────────────────────────
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);

// ─── Cart Item Counter ─────────────────────────────────────────────────────
const cartCount = (items) => items.reduce((s, i) => s + i.qty, 0);
const cartTotal = (items) => items.reduce((s, i) => s + i.qty * i.price, 0);

// ─── Auth Modal ────────────────────────────────────────────────────────────
function AuthModal({ onClose, onSuccess }) {
    const [mode, setMode] = useState("login"); // login | register
    const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
    const [name, setName] = useState(""); const [loading, setLoading] = useState(false);
    const notify = React.useContext(ToastCtx);

    const handleGoogle = async () => {
        setLoading(true);
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            notify("تم تسجيل الدخول بنجاح ✓", "success");
            onSuccess();
        } catch (e) { notify(e.message, "error"); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            if (mode === "register") {
                const cred = await auth.createUserWithEmailAndPassword(email, pass);
                await cred.user.updateProfile({ displayName: name });
            } else {
                await auth.signInWithEmailAndPassword(email, pass);
            }
            notify("تم تسجيل الدخول بنجاح ✓", "success");
            onSuccess();
        } catch (e) {
            const msgs = {
                "auth/wrong-password": "كلمة المرور خاطئة",
                "auth/user-not-found": "البريد الإلكتروني غير موجود",
                "auth/email-already-in-use": "البريد الإلكتروني مستخدم بالفعل",
            };
            notify(msgs[e.code] || e.message, "error");
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 className="modal-title" style={{ textAlign: 'center' }}>
                    {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                </h2>
                <button className="google-btn" onClick={handleGoogle} disabled={loading}>
                    <GoogleIcon /> المتابعة بحساب Google
                </button>
                <div className="auth-sep">أو</div>
                <form onSubmit={handleSubmit}>
                    {mode === "register" && (
                        <div className="field-group">
                            <label className="field-label">الاسم</label>
                            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="اسمك الكامل" required />
                        </div>
                    )}
                    <div className="field-group">
                        <label className="field-label">البريد الإلكتروني</label>
                        <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" required />
                    </div>
                    <div className="field-group">
                        <label className="field-label">كلمة المرور</label>
                        <input className="input-field" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required minLength={6} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? "جاري التحميل..." : (mode === "login" ? "تسجيل الدخول" : "إنشاء حساب")}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
                    <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 700 }}
                        onClick={() => setMode(mode === "login" ? "register" : "login")}>
                        {mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
                    </span>
                </p>
            </div>
        </div>
    );
}

// ─── Cart Modal ────────────────────────────────────────────────────────────
function CartModal({ items, onClose, onQty, onRemove, user, onAuthRequired }) {
    const notify = React.useContext(ToastCtx);
    const [step, setStep] = useState("cart"); // cart | checkout | done
    const [form, setForm] = useState({ name: user?.displayName || "", phone: "", address: "" });
    const [loading, setLoading] = useState(false);

    const placeOrder = async (e) => {
        e.preventDefault();
        if (!user) { onClose(); onAuthRequired(); return; }
        setLoading(true);
        try {
            await db.collection("orders").add({
                customer: form,
                items: items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, imageUrl: i.imageUrl })),
                total: cartTotal(items),
                status: "pending",
                userId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setStep("done");
        } catch (e) { notify(e.message, "error"); } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                {step === "cart" && <>
                    <h2 className="modal-title">🛍️ سلة التسوق</h2>
                    {items.length === 0
                        ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>السلة فارغة</div>
                        : <>
                            <div className="cart-list">
                                {items.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <img src={item.imageUrl} alt={item.name} onError={e => e.target.style.display = 'none'} />
                                        <div className="cart-item-info">
                                            <div className="cart-item-name">{item.name}</div>
                                            <div className="cart-item-price">{item.price} ج.م</div>
                                        </div>
                                        <div className="qty-control">
                                            <button className="qty-btn" onClick={() => onQty(item.id, -1)}>−</button>
                                            <span style={{ fontWeight: 700 }}>{item.qty}</span>
                                            <button className="qty-btn" onClick={() => onQty(item.id, 1)}>+</button>
                                        </div>
                                        <button className="qty-btn" onClick={() => onRemove(item.id)} style={{ color: 'var(--danger)' }}>🗑</button>
                                    </div>
                                ))}
                            </div>
                            <div className="cart-footer">
                                <div className="cart-total">الإجمالي <span>{cartTotal(items).toFixed(2)} ج.م</span></div>
                                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setStep("checkout")}>إتمام الطلب ←</button>
                            </div>
                        </>
                    }
                </>}
                {step === "checkout" && <>
                    <h2 className="modal-title">📦 تفاصيل الشحن</h2>
                    <form onSubmit={placeOrder}>
                        <div className="field-group">
                            <label className="field-label">الاسم الكامل</label>
                            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="محمد عبدالله" required />
                        </div>
                        <div className="field-group">
                            <label className="field-label">رقم الهاتف</label>
                            <input className="input-field" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" required />
                        </div>
                        <div className="field-group">
                            <label className="field-label">العنوان</label>
                            <input className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="المحافظة، المدينة، الشارع" required />
                        </div>
                        <div className="cart-total" style={{ marginBottom: '1rem' }}>الإجمالي <span>{cartTotal(items).toFixed(2)} ج.م</span></div>
                        <div style={{ display: 'flex', gap: '0.7rem' }}>
                            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep("cart")}>رجوع</button>
                            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                                {loading ? "جاري الإرسال..." : "تأكيد الطلب ✓"}
                            </button>
                        </div>
                    </form>
                </>}
                {step === "done" && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.5rem' }}>تم استلام طلبك!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>سنتواصل معك قريباً على رقم الهاتف المسجل.</p>
                        <button className="btn-primary" onClick={onClose}>إغلاق</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────
function AdminDashboard({ user }) {
    const [tab, setTab] = useState("products");
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loadP, setLoadP] = useState(true); const [loadO, setLoadO] = useState(true);
    const [form, setForm] = useState({ name: "", price: "", description: "", sizes: "", colors: "", imageUrl: "" });
    const [file, setFile] = useState(null); const [editing, setEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [imgMode, setImgMode] = useState("url"); // "url" | "file"
    const notify = React.useContext(ToastCtx);
    const fileRef = useRef();

    useEffect(() => {
        const u = db.collection("products").orderBy("createdAt", "desc").onSnapshot(s => {
            setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadP(false);
        });
        const u2 = db.collection("orders").orderBy("createdAt", "desc").onSnapshot(s => {
            setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadO(false);
        });
        return () => { u(); u2(); };
    }, []);

    const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);

    const parseList = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

    // Compress image using canvas → base64 JPEG
    const compressImage = (file, maxW = 900, quality = 0.78) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(1, maxW / img.width, maxW / img.height);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            let imageUrl = form.imageUrl || editing?.imageUrl || "";
            // File chosen → compress → base64 stored in Firestore
            if (file && imgMode === "file") {
                notify("جاري ضغط الصورة...", "success");
                imageUrl = await compressImage(file);
            }
            if (!imageUrl) { notify("أضف رابط صورة أو ارفع صورة", "error"); setSubmitting(false); return; }
            const data = {
                name: form.name,
                price: Number(form.price),
                description: form.description,
                imageUrl,
                sizes: parseList(form.sizes),
                colors: parseList(form.colors),
            };
            if (editing) {
                await db.collection("products").doc(editing.id).update(data);
                notify("تم تحديث المنتج ✓", "success");
                setEditing(null);
            } else {
                await db.collection("products").add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                notify("تم إضافة المنتج ✓", "success");
            }
            setForm({ name: "", price: "", description: "", sizes: "", colors: "", imageUrl: "" }); setFile(null);
            if (fileRef.current) fileRef.current.value = "";
        } catch (e) { notify(e.message, "error"); } finally { setSubmitting(false); }
    };

    const startEdit = (p) => {
        setEditing(p);
        setForm({
            name: p.name,
            price: p.price,
            description: p.description || "",
            sizes: (p.sizes || []).join(", "),
            colors: (p.colors || []).join(", "),
            imageUrl: p.imageUrl || "",
        });
        setImgMode("url");
        window.scrollTo({ top: document.querySelector('.add-product-form')?.offsetTop - 100, behavior: 'smooth' });
    };

    const deleteProduct = async (id) => {
        if (!confirm("هل تريد حذف هذا المنتج؟")) return;
        await db.collection("products").doc(id).delete();
        notify("تم حذف المنتج", "success");
    };

    const setOrderStatus = async (id, status) => {
        await db.collection("orders").doc(id).update({ status });
        notify("تم تحديث حالة الطلب", "success");
    };

    const statusLabel = { pending: "قيد الانتظار", confirmed: "مؤكد", cancelled: "ملغي" };
    const statusClass = { pending: "badge-pending", confirmed: "badge-confirmed", cancelled: "badge-cancelled" };

    return (
        <div className="dashboard-section" id="dashboard">
            <div className="dashboard-inner">
                <div className="dashboard-header">
                    <h2 className="section-title" style={{ textAlign: 'right', marginBottom: '0.3rem' }}>⚙️ لوحة التحكم</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>مرحباً {user.displayName || user.email}</p>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{products.length}</div>
                        <div className="stat-label">إجمالي المنتجات</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{orders.length}</div>
                        <div className="stat-label">إجمالي الطلبات</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{orders.filter(o => o.status === "pending").length}</div>
                        <div className="stat-label">طلبات قيد الانتظار</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalRevenue.toFixed(0)} ج.م</div>
                        <div className="stat-label">إجمالي الإيرادات</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="dashboard-tabs">
                    <button className={`tab-btn ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>المنتجات</button>
                    <button className={`tab-btn ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
                        الطلبات {orders.filter(o => o.status === "pending").length > 0 && `(${orders.filter(o => o.status === "pending").length})`}
                    </button>
                </div>

                {/* Products Tab */}
                {tab === "products" && <>
                    <form className="add-product-form" onSubmit={handleSubmit}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>{editing ? "✏️ تعديل المنتج" : "➕ إضافة منتج جديد"}</h3>
                        <div className="form-grid">
                            <div className="field-group">
                                <label className="field-label">اسم المنتج *</label>
                                <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم المنتج" required />
                            </div>
                            <div className="field-group">
                                <label className="field-label">السعر (ج.م) *</label>
                                <input className="input-field" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" required min="0" step="0.01" />
                            </div>
                            <div className="field-group" style={{ gridColumn: '1/-1' }}>
                                <label className="field-label">الوصف</label>
                                <input className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للمنتج" />
                            </div>
                            <div className="field-group">
                                <label className="field-label">المقاسات (افصل بفاصلة)</label>
                                <input className="input-field" value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL, XXL" />
                            </div>
                            <div className="field-group">
                                <label className="field-label">الألوان (افصل بفاصلة)</label>
                                <input className="input-field" value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })} placeholder="أحمر, أبيض, أسود, أزرق" />
                            </div>
                            <div className="field-group" style={{ gridColumn: '1/-1' }}>
                                <label className="field-label">صورة المنتج *</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '8px' }}>
                                    <button type="button" onClick={() => setImgMode("url")}
                                        style={{
                                            padding: '6px 14px', borderRadius: '8px', border: '1px solid', fontFamily: 'Cairo,sans-serif', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                                            borderColor: imgMode === "url" ? 'var(--accent)' : 'var(--glass-border)',
                                            background: imgMode === "url" ? 'var(--accent)' : 'var(--glass)',
                                            color: imgMode === "url" ? '#000' : 'var(--text)'
                                        }}>
                                        🔗 رابط URL
                                    </button>
                                    <button type="button" onClick={() => setImgMode("file")}
                                        style={{
                                            padding: '6px 14px', borderRadius: '8px', border: '1px solid', fontFamily: 'Cairo,sans-serif', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                                            borderColor: imgMode === "file" ? 'var(--accent)' : 'var(--glass-border)',
                                            background: imgMode === "file" ? 'var(--accent)' : 'var(--glass)',
                                            color: imgMode === "file" ? '#000' : 'var(--text)'
                                        }}>
                                        📁 رفع من الجهاز
                                    </button>
                                </div>
                                {imgMode === "url" ? (
                                    <input className="input-field" type="url" value={form.imageUrl}
                                        onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                        required={!editing} />
                                ) : (
                                    <input className="input-field" type="file" accept="image/*" ref={fileRef}
                                        onChange={e => setFile(e.target.files[0])}
                                        required={!editing && !form.imageUrl} />
                                )}
                                {imgMode === "url" && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>💡 الصورة هتتخزن في Firestore مباشرةً وما بتحتاجش Storage</p>}
                                {imgMode === "file" && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>💡 الصورة هتتضغط تلقائياً وتتخزن في Firestore بدون Storage</p>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.5rem' }}>
                            {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm({ name: "", price: "", description: "" }); setFile(null); }}>إلغاء</button>}
                            <button type="submit" className="btn-primary" disabled={submitting}>
                                {submitting ? "جاري الحفظ..." : (editing ? "حفظ التعديلات" : "إضافة المنتج")}
                            </button>
                        </div>
                    </form>

                    <div className="admin-table-wrap">
                        {loadP ? <div className="spinner" style={{ margin: '3rem auto' }} /> :
                            products.length === 0
                                ? <div className="empty-state">لا توجد منتجات بعد. أضف أول منتج من النموذج أعلاه.</div>
                                : <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>الصورة</th>
                                            <th>اسم المنتج</th>
                                            <th>السعر</th>
                                            <th>المقاسات</th>
                                            <th>الألوان</th>
                                            <th>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => (
                                            <tr key={p.id}>
                                                <td><img className="admin-thumb" src={p.imageUrl} alt={p.name} onError={e => e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect fill="%23333" width="50" height="50"/></svg>'} /></td>
                                                <td style={{ fontWeight: 700 }}>{p.name}</td>
                                                <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{p.price} ج.م</td>
                                                <td style={{ fontSize: '0.82rem' }}>{(p.sizes || []).join(" · ") || "—"}</td>
                                                <td style={{ fontSize: '0.82rem' }}>{(p.colors || []).join(" · ") || "—"}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button className="action-btn edit" onClick={() => startEdit(p)}>تعديل</button>
                                                        <button className="action-btn del" onClick={() => deleteProduct(p.id)}>حذف</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                        }
                    </div>
                </>}

                {/* Orders Tab */}
                {tab === "orders" && (
                    <div className="admin-table-wrap">
                        {loadO ? <div className="spinner" style={{ margin: '3rem auto' }} /> :
                            orders.length === 0
                                ? <div className="empty-state">لا توجد طلبات بعد.</div>
                                : <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>رقم الطلب</th>
                                            <th>العميل</th>
                                            <th>الهاتف</th>
                                            <th>العنوان</th>
                                            <th>المنتجات</th>
                                            <th>الإجمالي</th>
                                            <th>الحالة</th>
                                            <th>تغيير الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => (
                                            <tr key={o.id} className="order-row">
                                                <td>{o.id.slice(0, 8)}...</td>
                                                <td style={{ fontWeight: 700 }}>{o.customer?.name || "—"}</td>
                                                <td>{o.customer?.phone || "—"}</td>
                                                <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{o.customer?.address || "—"}</td>
                                                <td style={{ fontSize: '0.82rem' }}>{(o.items || []).map(i => `${i.name} ×${i.qty}`).join("، ")}</td>
                                                <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{(o.total || 0).toFixed(2)} ج.م</td>
                                                <td><span className={`badge ${statusClass[o.status] || "badge-pending"}`}>{statusLabel[o.status] || o.status}</span></td>
                                                <td>
                                                    <select style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '6px', fontFamily: 'Cairo, sans-serif', fontSize: '0.8rem' }}
                                                        value={o.status || "pending"} onChange={e => setOrderStatus(o.id, e.target.value)}>
                                                        <option value="pending">قيد الانتظار</option>
                                                        <option value="confirmed">مؤكد</option>
                                                        <option value="cancelled">ملغي</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Product Card with Size/Color selector ───────────────────────────────
function ProductCard({ product: p, onAddToCart }) {
    const [selSize, setSelSize] = useState("");
    const [selColor, setSelColor] = useState("");
    const notify = React.useContext(ToastCtx);
    const hasSizes = p.sizes && p.sizes.length > 0;
    const hasColors = p.colors && p.colors.length > 0;

    const handleAdd = () => {
        if (hasSizes && !selSize) { notify("اختر المقاس أولاً", "error"); return; }
        if (hasColors && !selColor) { notify("اختر اللون أولاً", "error"); return; }
        onAddToCart({
            ...p, selectedSize: selSize, selectedColor: selColor,
            id: `${p.id}_${selSize}_${selColor}`
        });
        notify(`تمت الإضافة ✓`, "success");
    };

    return (
        <div className="card">
            <div className="card-img-container">
                <img className="card-img" src={p.imageUrl} alt={p.name}
                    onError={e => { e.target.style.background = '#1a1a2e'; e.target.style.display = 'none'; }} />
                <div className="card-overlay">
                    <h3>{p.name}</h3>
                    <div className="price">{p.price} ج.م</div>
                    {p.description && <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>{p.description}</p>}
                </div>
            </div>
            <div className="card-body">
                {hasSizes && (
                    <div style={{ marginBottom: '0.7rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>المقاس:</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {p.sizes.map(s => (
                                <button key={s} onClick={() => setSelSize(s)}
                                    style={{
                                        padding: '4px 12px', borderRadius: '8px', border: '1px solid',
                                        borderColor: selSize === s ? 'var(--accent)' : 'var(--glass-border)',
                                        background: selSize === s ? 'var(--accent)' : 'var(--glass)',
                                        color: selSize === s ? '#000' : 'var(--text)',
                                        fontFamily: 'Cairo, sans-serif', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s'
                                    }}>{s}</button>
                            ))}
                        </div>
                    </div>
                )}
                {hasColors && (
                    <div style={{ marginBottom: '0.8rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>اللون:</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {p.colors.map(c => (
                                <button key={c} onClick={() => setSelColor(c)}
                                    style={{
                                        padding: '4px 12px', borderRadius: '8px', border: '1px solid',
                                        borderColor: selColor === c ? 'var(--accent)' : 'var(--glass-border)',
                                        background: selColor === c ? 'var(--accent)' : 'var(--glass)',
                                        color: selColor === c ? '#000' : 'var(--text)',
                                        fontFamily: 'Cairo, sans-serif', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s'
                                    }}>{c}</button>
                            ))}
                        </div>
                    </div>
                )}
                <button className="btn-buy" onClick={handleAdd}>إضافة للسلة</button>
            </div>
        </div>
    );
}

// ─── Main App ──────────────────────────────────────────────────────────────
const App = () => {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const [user, setUser] = useState(null);
    const [authLoaded, setAuthLoaded] = useState(false);
    const [products, setProducts] = useState([]);
    const [loadP, setLoadP] = useState(true);
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);

    const isAdmin = user?.email === ADMIN_EMAIL;

    useEffect(() => {
        document.body.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(u => { setUser(u); setAuthLoaded(true); });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = db.collection("products").orderBy("createdAt", "desc").onSnapshot(s => {
            setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadP(false);
        }, () => setLoadP(false));
        return unsub;
    }, []);

    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(i => i.id === product.id);
            if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const changeQty = (id, delta) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

    const signOut = async () => { await auth.signOut(); };

    return (
        <ToastProvider>
            <div className="app-wrapper">
                {/* Navbar */}
                <nav className="nav-container">
                    <div className="nav-content">
                        <div className="logo">محل الفاجر</div>
                        <div className="nav-actions">
                            <button className="nav-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="تغيير الثيم">
                                {theme === "dark"
                                    ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                                    : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                }
                            </button>
                            {authLoaded && (user ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {user.photoURL && <img className="user-avatar" src={user.photoURL} alt="avatar" />}
                                    {isAdmin && (
                                        <a href="#dashboard" className="nav-btn" style={{ textDecoration: 'none', color: 'var(--accent)', borderColor: 'var(--accent)' }}>⚙️ الداش بورد</a>
                                    )}
                                    <button className="nav-btn" onClick={signOut}>تسجيل الخروج</button>
                                </div>
                            ) : (
                                <button className="nav-btn" onClick={() => setAuthOpen(true)}>تسجيل الدخول</button>
                            ))}
                            <button className="nav-btn cart-btn" onClick={() => setCartOpen(true)}>
                                🛍️
                                {cartCount(cart) > 0 && <span className="cart-badge">{cartCount(cart)}</span>}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <header className="hero">
                    <div className="hero-badge">الكوليكشن الجديد 2025</div>
                    <h1>محل الفاجر</h1>
                    <p>أزياء فاخرة بلمسة مصرية أصيلة — جودة لا تُنافس وأسعار في المتناول</p>
                    <div className="hero-cta">
                        <button className="btn-primary" onClick={() => document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' })}>
                            تسوق الآن ↓
                        </button>
                        {!user && (
                            <button className="btn-ghost" onClick={() => setAuthOpen(true)}>إنشاء حساب</button>
                        )}
                    </div>
                </header>

                {/* Products */}
                <section className="products-section">
                    <div className="section-header">
                        <h2 className="section-title">منتجاتنا</h2>
                        <p className="section-sub">اكتشف أحدث الكوليكشنات</p>
                    </div>
                    <div className="grid">
                        {loadP ? (
                            <div className="empty-state"><div className="spinner" /></div>
                        ) : products.length === 0 ? (
                            <div className="empty-state">
                                <p style={{ fontSize: '1.1rem' }}>لا توجد منتجات بعد</p>
                                {isAdmin && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>أضف منتجات من الداش بورد أسفل الصفحة</p>}
                            </div>
                        ) : products.map(p => <ProductCard key={p.id} product={p} onAddToCart={addToCart} />)}
                    </div>
                </section>

                {/* Admin Dashboard (only visible to admin) */}
                {isAdmin && <AdminDashboard user={user} />}

                {/* Footer */}
                <footer className="footer">
                    <p>© 2025 محل الفاجر — جميع الحقوق محفوظة</p>
                </footer>

                {/* Modals */}
                {cartOpen && (
                    <CartModal items={cart} onClose={() => { setCartOpen(false); if (cart.every(i => true)) { } }} onQty={changeQty} onRemove={removeFromCart}
                        user={user} onAuthRequired={() => { setCartOpen(false); setAuthOpen(true); }} />
                )}
                {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />}
            </div>
        </ToastProvider>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
