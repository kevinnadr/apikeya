const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Sequelize, DataTypes } = require('sequelize'); // Impor Sequelize
const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// --- 1. KONFIGURASI KONEKSI DATABASE ---
// (Ini adalah bagian yang tadinya ada di db.js)
// Ganti 'root' dan 'password_anda' sesuai pengaturan MySQL Anda!
const sequelize = new Sequelize(
    'apikeya',       // Nama database
    'root',          // Username MySQL (default 'root')
    'Kevinnadr123', // Password MySQL Anda
    {
        host: 'localhost', // Host database
        port: 3308,        // Port MySQL default
        dialect: 'mysql'   // Kita pakai MySQL
    }
);


// --- 2. DEFINISI MODEL ---
// Memberi tahu Sequelize cara membuat tabel 'ApiKeys'
const ApiKey = sequelize.define('ApiKey', {
    key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        primaryKey: true
    }
}, {
    timestamps: true, // Otomatis menambah createdAt dan updatedAt
});


// === ROUTES ===

// Route untuk menyajikan file index.html (Tidak berubah)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route untuk MEMBUAT API key (Menyimpan ke DB)
app.post('/create', async (req, res) => {
    try {
        const keyBytes = crypto.randomBytes(32);
        const token = keyBytes.toString('base64url');
        const stamp = Date.now().toString(36);
        let apiKey = `sk-co-vi-${stamp}.${token}`;

        // Simpan ke database
        await ApiKey.create({ key: apiKey });

        console.log('Key dibuat dan disimpan ke DB:', apiKey);
        res.status(200).json({ apiKey: apiKey });

    } catch (error) {
        console.error('Gagal membuat API key:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ error: 'Gagal membuat key, terjadi duplikasi. Coba lagi.' });
        }
        res.status(500).json({ error: 'Gagal menyimpan key ke database' });
    }
});


// Route untuk MEMVALIDASI API key (Mencari di DB)
app.post('/validate', async (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key tidak ada di body' });
    }

    try {
        // Cari di database
        const foundKey = await ApiKey.findOne({
            where: { key: apiKey } // Cari di kolom 'key'
        });

        if (foundKey) {
            // Key ditemukan
            res.status(200).json({ valid: true, message: 'API key valid' });
        } else {
            // Key TIDAK ditemukan
            res.status(401).json({ valid: false, message: 'API key tidak valid atau tidak ditemukan' });
        }

    } catch (error) {
        console.error('Error saat validasi key:', error);
        res.status(500).json({ error: 'Error internal server saat validasi' });
    }
});


// --- 3. FUNGSI START SERVER ---
// Menguji koneksi, sinkronisasi tabel, lalu jalankan server
async function startServer() {
    try {
        // Coba koneksi dulu
        await sequelize.authenticate();
        console.log('✅ Koneksi ke database "apikeya" BERHASIL.');
        
        // Sinkronisasi model.
        // Ini akan OTOMATIS membuat tabel "ApiKeys" jika belum ada.
        await sequelize.sync(); 
        console.log('✅ Model berhasil disinkronkan. Tabel "ApiKeys" siap.');

        // Menjalankan server
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });

    } catch (error) {
        console.error('❌ Gagal menyambung atau sinkronisasi database:', error);
    }
}

// Panggil fungsi untuk memulai server
startServer();