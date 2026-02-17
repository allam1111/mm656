const { useState, useEffect } = React;

const App = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Set Theme on Body
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Firebase Real-time Sync
    useEffect(() => {
        if (!window.firebaseConfig || !window.firebaseConfig.apiKey) {
            setLoading(false);
            return;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
        }

        const db = firebase.firestore();
        const unsubscribe = db.collection('products')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProducts(fetched);
                setLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <div className="app-wrapper">
            {/* Navbar */}
            <nav className="nav-container">
                <div className="nav-blur"></div>
                <div className="nav-content">
                    <div className="logo">MAHAL AL FAJER</div>
                    <div className="nav-actions">
                        <button onClick={toggleTheme} className="nav-btn">
                            {theme === 'dark' ? (
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>
                            ) : (
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                            )}
                        </button>
                        <button onClick={() => setIsCartOpen(true)} className="nav-btn">
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="hero">
                <h1>Crafted Luxury</h1>
                <p>Redefining style with premium quality and timeless design. Elevate your wardrobe with Mahal Al Fajer.</p>
            </header>

            {/* Product Grid */}
            <main className="grid">
                {loading ? (
                    <div className="empty-state">Syncing with collection...</div>
                ) : products.length > 0 ? (
                    products.map(product => (
                        <div key={product.id} className="card">
                            <div className="card-img-container">
                                <img src={product.imageUrl} alt={product.name} className="card-img" />
                                <div className="card-overlay">
                                    <h3 style={{ fontSize: '1.4rem' }}>{product.name}</h3>
                                    <div className="price">${product.price}</div>
                                </div>
                            </div>
                            <div className="card-body">
                                <button className="btn-buy">Add to Cart</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <p>No collections available yet.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>Awaiting database link...</p>
                    </div>
                )}
            </main>

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h2>Shopping Bag</h2>
                            <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                        </div>
                        <div style={{ padding: '2rem 0', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Your bag is currently empty.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                            <div className="secret-dot" onClick={() => { setIsCartOpen(false); setIsAdminOpen(true); }}>.</div>
                            <div style={{ fontWeight: '700' }}>Total: $0.00</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Modal */}
            {isAdminOpen && (
                <AdminPanel onClose={() => setIsAdminOpen(false)} />
            )}
        </div>
    );
};

const AdminPanel = ({ onClose }) => {
    const [file, setFile] = useState(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return alert("Select an image first");

        setIsSubmitting(true);
        setStatus('Uploading assets...');

        try {
            const storage = firebase.storage();
            const db = firebase.firestore();

            const storageRef = storage.ref(`products/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const imageUrl = await snapshot.ref.getDownloadURL();

            await db.collection('products').add({
                name,
                price: Number(price),
                imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            setStatus('Collection updated!');
            setTimeout(onClose, 1000);
        } catch (err) {
            alert(err.message);
            setStatus('Error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h2>Admin Console</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product Visual</label>
                        <input type="file" onChange={e => setFile(e.target.files[0])} className="input-field" required />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Collection Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Signature Tee" className="input-field" required />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Market Price ($)</label>
                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="input-field" required />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="btn-buy" style={{ marginTop: 0 }}>
                        {isSubmitting ? 'Syncing...' : 'Add Collection'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '1rem', size: '0.8rem', color: 'var(--accent)' }}>{status}</div>
                </form>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
