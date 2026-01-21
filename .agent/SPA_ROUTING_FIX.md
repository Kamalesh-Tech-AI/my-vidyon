# SPA Routing Fix - 404 Error on Page Reload

## Problem Description

When deploying a Single Page Application (SPA) built with React Router, reloading the page on any route other than the root (`/`) causes a **404 NOT_FOUND** error. This happens because:

1. **Client-side routing** - React Router handles navigation on the client side
2. **Server doesn't know about routes** - When you reload `/faculty/dashboard`, the server looks for a file at that path
3. **File doesn't exist** - Only `index.html` exists, so the server returns 404

## Solution

Configure your deployment platform to redirect all requests to `index.html`, allowing React Router to handle the routing.

---

## Configuration Files Created

### 1. **Vercel** (`vercel.json`)
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**How it works:**
- All routes (`(.*)`) are rewritten to serve `index.html`
- React Router takes over and displays the correct page
- No 404 errors on page reload

---

### 2. **Netlify** (`netlify.toml`)
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build]
  publish = "dist"
  command = "npm run build"
```

**How it works:**
- All routes (`/*`) redirect to `index.html` with status 200
- Build configuration ensures correct output directory

---

### 3. **Netlify Alternative** (`public/_redirects`)
```
/*    /index.html   200
```

**How it works:**
- Simple redirect rule that Netlify reads from the public folder
- Gets copied to the dist folder during build

---

## Deployment Platform Instructions

### **If deploying to Vercel:**
1. ✅ `vercel.json` is already created
2. Commit and push to your repository
3. Vercel will automatically use this configuration
4. All routes will work on reload

### **If deploying to Netlify:**
1. ✅ `netlify.toml` and `public/_redirects` are already created
2. Commit and push to your repository
3. Netlify will automatically use this configuration
4. All routes will work on reload

### **If deploying to other platforms:**

#### **Apache (.htaccess)**
Create `.htaccess` in your `public` folder:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### **Nginx**
Add to your nginx configuration:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

#### **Firebase Hosting**
Add to `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## Testing the Fix

After deploying with the appropriate configuration:

1. **Navigate to any page** - e.g., `/faculty/dashboard`
2. **Reload the page** (F5 or Ctrl+R)
3. **Expected result:** Page loads correctly, no 404 error
4. **Verify URL:** URL should remain the same (not redirect to `/`)

---

## Why This Works

```
Before Fix:
User visits /faculty/dashboard → Server looks for /faculty/dashboard file → 404 Error

After Fix:
User visits /faculty/dashboard → Server rewrites to /index.html → React loads → React Router shows /faculty/dashboard
```

---

## Important Notes

1. **Static assets** (images, CSS, JS) are not affected by this redirect
2. **API calls** should use absolute paths or be configured separately
3. **Build before deploy** - Always run `npm run build` before deploying
4. **Environment variables** - Ensure all env vars are set in your deployment platform

---

## Verification Checklist

- [ ] Configuration file created for your platform
- [ ] File committed to repository
- [ ] Deployed to hosting platform
- [ ] Tested page reload on multiple routes
- [ ] No 404 errors appear
- [ ] All routes work correctly

---

## Common Issues

### Issue: Still getting 404 after configuration
**Solution:** 
- Clear your browser cache
- Hard reload (Ctrl+Shift+R)
- Check if the configuration file is in the correct location
- Verify the deployment platform is reading the config file

### Issue: Assets not loading
**Solution:**
- Ensure your assets use absolute paths or are in the `public` folder
- Check the `base` property in `vite.config.ts` if deploying to a subdirectory

### Issue: API calls failing
**Solution:**
- API routes should be excluded from the redirect
- Add specific rules for `/api/*` paths if needed

---

## Related Files

- `vite.config.ts` - Vite configuration
- `src/main.tsx` - React Router setup
- `package.json` - Build scripts

---

**Status:** ✅ Fixed - All configuration files created and ready for deployment
