# GoDaddy Deployment Guide

This guide provides step-by-step instructions on how to build and deploy your Astro-based portfolio to a GoDaddy shared hosting environment.

## 1. Build the Production Application

Before transferring files to your server, you must generate the static production build.

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /Users/redape/SynologyDrive/Antigravity/astro-portfolio
   ```
2. Run the build command:
   ```bash
   npm run build
   ```
3. Verify that a `dist/` directory was created in the root of your project. This folder contains the highly optimized, finalized static files (HTML, CSS, JS, and assets) that are ready to be served.

## 2. Prepare the `.htaccess` File (Clean URLs & HTTPS)

Astro's default build process outputs files in a format that naturally supports clean URLs (e.g., `/professional.astro` becomes `/professional/index.html`). Most Apache servers (like GoDaddy) will automatically resolve `/professional` to that `index.html` file. 

However, to guarantee clean URLs, enforce HTTPS, and handle custom 404 pages gracefully, you should create a `.htaccess` file in your `dist/` directory before uploading.

Create a file named `.htaccess` inside the `dist/` folder with the following content:

```apache
# Enable Rewrite Engine
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Force HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Remove trailing slashes (optional, but good for SEO matching clean URLs)
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)/$ /$1 [L,R=301]

  # Tell Apache to look for index.html implicitly
  DirectoryIndex index.html

  # Custom 404 Error Page 
  # (Uncomment and create a 404.html page in Astro if desired)
  # ErrorDocument 404 /404.html
</IfModule>
```

> **Note:** If you are using macOS, files starting with a dot (`.`) are hidden by default. Use `Command + Shift + .` in Finder to view them and ensure it gets uploaded.

## 3. Upload to GoDaddy via File Manager (or FTP)

### Method A: cPanel File Manager (Recommended for ease)

1. Log in to your **GoDaddy Dashboard**.
2. Navigate to **My Products** -> **Web Hosting** -> Manage.
3. Open the **cPanel Admin** interface.
4. Click on **File Manager**.
5. Navigate to your primary web directory, usually `public_html`.
   * *If you are hosting this on a sub-domain or add-on domain, navigate to that specific folder (e.g., `public_html/portfolio`).*
6. **Upload** the *contents* of your local `dist/` folder directly into `public_html/`. 
   > **Critical:** Do not upload the `dist` folder itself. Upload the files and folders *inside* `dist` (like `index.html`, `/professional/`, `/automotive/`, and `.htaccess`).
7. Once uploaded, visit your domain to verify the site is live.

### Method B: FTP Client (FileZilla, Cyberduck)

1. Open your FTP client.
2. Enter your GoDaddy FTP credentials (Host, Username, Password, Port 21). You can find/reset these in your GoDaddy cPanel under "FTP Accounts".
3. In the remote server pane, navigate to `public_html` (or your target directory).
4. In the local pane, navigate to your `/astro-portfolio/dist/` directory.
5. Select all files and folders *inside* `dist` (including the hidden `.htaccess` file) and drag them into the remote `public_html` directory.

## 4. Post-Deployment Verification

1. Navigate to your root domain (e.g., `https://yourdomain.com`). Ensure the SSL certificate is active (HTTPS).
2. Click on the **Enterprise Architect** gateway portal. Verify the URL is exactly `https://yourdomain.com/professional` (no `.html` or trailing slash).
3. Click on the **Automotive Enthusiast** gateway portal. Verify the URL is exactly `https://yourdomain.com/automotive`.
4. Run a Lighthouse test via Chrome DevTools on the live production URL to confirm the 90+ mobile score threshold is maintained on GoDaddy's network.
