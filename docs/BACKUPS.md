# Backups

Every night at about 2–3 AM Alaska time, a GitHub Action
(`.github/workflows/nightly-backup.yml`) copies Spectra to Google Drive:

- **Database:** a full dump (roles, schema, data) as one `.tar.gz` per day.
  Kept 30 days, plus the copy from the 1st of each month for a year.
- **Files:** every Storage bucket (licenses, product photos, menus, logos,
  test results). Only new files are uploaded; nothing is ever deleted.

Everything in Drive is **encrypted** with your backup passphrase. File names
stay readable (they're dates and random IDs); contents can't be opened without
the passphrase. They live in a Drive folder called **Spectra Backups**:

```
Spectra Backups/
  database/daily/2026-11-03.tar.gz.bin
  database/monthly/2026-11-01.tar.gz.bin
  storage/license-documents/…
  storage/product-images/…
```

Supabase Pro also keeps its own 7 days of database backups (Supabase dashboard →
Database → Backups). This is the off-site copy that also includes files.

**If the passphrase is lost, the backups are unreadable.** Keep it in a password
manager.

---

## One-time setup

Nothing below gets pasted into chat or committed. Each value goes straight into
GitHub: repo → **Settings → Secrets and variables → Actions → New repository
secret**, using the names in bold.

### 1. Database connection

Supabase dashboard → **Connect** (top of the project) → **Session pooler** →
copy the URI. Replace `[YOUR-PASSWORD]` with the database password (Project
Settings → Database → reset it there if you don't have it; if it contains
symbols like `@` or `#`, pick one without them to avoid URL-escaping trouble).

→ **SUPABASE_DB_URL**

Use the *session pooler* string, not the direct one: GitHub's servers can't
reach the direct address.

### 2. Storage access keys

Supabase dashboard → **Project Settings → Storage → S3 Connection**:

- Endpoint → **SUPABASE_S3_ENDPOINT**
- Region → **SUPABASE_S3_REGION**
- **New access key** → Access key ID → **SUPABASE_S3_ACCESS_KEY_ID**,
  Secret → **SUPABASE_S3_SECRET_KEY** (shown once)

### 3. Google Drive sign-in

On your Mac, install rclone (`brew install rclone`, or
`curl https://rclone.org/install.sh | sudo bash` without Homebrew), then run:

```bash
rclone config create gdrive drive scope=drive.file
```

A browser opens: sign in with the Google account that should hold the backups
and allow access. (`drive.file` means rclone can only see files it creates, not
the rest of your Drive.) Then print the token it saved:

```bash
rclone config show gdrive
```

Copy everything after `token = ` (the whole `{"access_token":…}` line) →
**GDRIVE_TOKEN**. This also leaves a working `gdrive` connection on your Mac
for restores.

### 4. Passphrase

Make a long passphrase (four or more random words), save it in your password
manager first → **BACKUP_PASSPHRASE**

### 5. Failure alerts in admin → Errors (optional)

From `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` → **SUPABASE_URL**,
`SUPABASE_SERVICE_ROLE_KEY` → **SUPABASE_SERVICE_ROLE_KEY**. GitHub also emails
you when a run fails.

### 6. First run

GitHub → **Actions → Nightly backup → Run workflow**. It takes a few minutes.
Then check Drive for the **Spectra Backups** folder.

---

## Restoring

### Get the files back

On a Mac where setup step 3 was done, the `gdrive` connection already exists
(otherwise run step 3 again). Add the encrypted view of the backup folder once:

```bash
rclone config create vault crypt remote="gdrive:Spectra Backups" \
  filename_encryption=off directory_name_encryption=false \
  password="$(rclone obscure 'YOUR PASSPHRASE')"
```

Then download what you need (rclone decrypts on the way down):

```bash
rclone ls vault:database/daily                         # list database copies
rclone copy vault:database/daily/2026-11-03.tar.gz ./restore/
rclone copy vault:storage ./restore/storage            # all files
```

### Restore the database into a Supabase project

Use a new, empty Supabase project for a test (or a real recovery):

```bash
cd restore && tar -xzf 2026-11-03.tar.gz && cd 2026-11-03
psql "NEW_PROJECT_SESSION_POOLER_URL" \
  --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql
```

### Restore files

Upload each folder under `restore/storage/` back into the bucket of the same
name (Supabase dashboard → Storage, or `rclone copy` to the new project's S3
endpoint). Buckets: `product-images` and `test-results` are public; the rest are
private.

### After a restore

Update `.env.local` and Vercel's environment variables with the new project's
URL and keys, then redeploy.

Test this once after the first backup runs, so a real emergency isn't the first
time.
