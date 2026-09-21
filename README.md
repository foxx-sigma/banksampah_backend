# Bank Sampah Digital Backend

## Deskripsi
Proyek ini merupakan sistem backend aplikasi Bank Sampah Digital yang dirancang untuk mendukung operasional pengelolaan sampah. Backend ini memroses fungsionalitas nasabah dalam menyetor sampah dan menukarkan poin, sekaligus melayani antarmuka pengelola (admin) untuk memverifikasi transaksi serta mendata pengguna. Sistem ini memastikan seluruh pencatatan transaksi bank sampah secara terpusat dan aman.

## Tech Stack
- Framework: NestJS (v12.0.1)
- ORM: Prisma (v6.19.3)
- Database: PostgreSQL
- Authentication: @nestjs/jwt (v12.0.1), bcrypt (v6.0.0)
- Validation: class-validator (v0.15.1), class-transformer (v0.5.1)
- Security: helmet (v8.3.0), express-rate-limit (v8.7.0)

## Alur Penggunaan

### Nasabah
1. Mendaftarkan akun nasabah baru ke dalam aplikasi menggunakan (POST /api/v1/auth/nasabah/register) dengan akses Public.
2. Melakukan proses masuk ke aplikasi untuk mendapatkan token autentikasi melalui (POST /api/v1/auth/login) dengan akses Public.
3. Membuka halaman awal untuk melihat ringkasan poin dan riwayat aktivitas via (GET /api/v1/dashboard/summary) dengan akses role NASABAH.
4. Mengajukan setoran sampah kepada pihak bank sampah menggunakan (POST /api/v1/setor-sampah/pengajuan) dengan akses role NASABAH.
5. Memantau status seluruh pengajuan setor sampah secara mandiri lewat (GET /api/v1/setor-sampah/my-setor) dengan akses role NASABAH.
6. Menukarkan poin yang terkumpul dengan hadiah melalui (POST /api/v1/penukaran-poin/tukar) dengan akses role NASABAH.
7. Mengecek status dan daftar seluruh penukaran poin melalui (GET /api/v1/penukaran-poin/my-penukaran) dengan akses role NASABAH.
8. Melihat bukti nota transaksi spesifik, baik setoran lewat (GET /api/v1/setor-sampah/:id) maupun penukaran lewat (GET /api/v1/penukaran-poin/nota/:id) yang dapat diakses oleh role NASABAH maupun ADMIN.

### Admin
1. Mendaftarkan akun admin atau pengelola bank sampah melalui (POST /api/v1/auth/admin/register) dengan akses Public.
2. Menyelesaikan proses masuk ke dasbor pengelola untuk mendapatkan token autentikasi lewat (POST /api/v1/auth/login) dengan akses Public.
3. Mengelola daftar kategori dan nilai konversi sampah dengan mengakses (POST /api/v1/kategori-sampah), (PUT /api/v1/kategori-sampah/:id), dan (DELETE /api/v1/kategori-sampah/:id) yang memiliki peran ADMIN.
4. Mengurus daftar hadiah yang bisa ditukarkan nasabah dengan mengakses (POST /api/v1/hadiah), (PUT /api/v1/hadiah/:id), dan (DELETE /api/v1/hadiah/:id) di bawah peran ADMIN.
5. Melakukan administrasi profil dan pendaftaran data nasabah secara manual menggunakan sekumpulan endpoint (GET, POST, PUT, DELETE /api/v1/admin/nasabah/:id) dengan akses peran ADMIN.
6. Mendaftar seluruh pengajuan setoran sampah dari nasabah untuk ditangani melalui (GET /api/v1/setor-sampah/admin/list) menggunakan peran ADMIN.
7. Memverifikasi nilai akhir dan berat riil setoran sampah nasabah melalui (PUT /api/v1/setor-sampah/admin/verify/:id) dengan peran ADMIN.
8. Memantau seluruh pengajuan penukaran poin dari semua nasabah masuk lewat (GET /api/v1/penukaran-poin/admin/list) berdasarkan peran ADMIN.
9. Memperbarui status penukaran ketika hadiah diberikan kepada nasabah menggunakan (PUT /api/v1/penukaran-poin/admin/status/:id) dengan peranan ADMIN.
10. Menarik data laporan rekapitulasi bulanan pada keseluruhan aktivitas bank sampah via (GET /api/v1/rekapitulasi/bulanan) dengan otorisasi peran ADMIN.
