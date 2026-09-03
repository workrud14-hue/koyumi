# Supabase Auth Setup for KIYUMI

## Required Configuration

Go to: **Supabase Dashboard → Authentication → URL Configuration**

### 1. Site URL
Set to: `https://kiyumi.freebuff.app/`

### 2. Redirect URLs
Add these (one per line):
```
https://kiyumi.freebuff.app/**
http://localhost:5173/**
```

### 3. Email Confirmation
Go to: **Authentication → Providers → Email**

**Option A (Recommended for testing):** Enable "Confirm email" = OFF
- This lets users sign in immediately after signing up
- Better for development and early launch

**Option B:** Keep "Confirm email" = ON
- Users must click a confirmation link before signing in
- Make sure your Supabase project has email sending configured
- If emails aren't working, users will be stuck

### 4. Create the Admin Account

Once the above is configured, go to your site and:
1. Click SIGN UP
2. Enter: `workrud14@gmail.com`
3. Enter: `anirudh@1411` (min 6 chars)
4. Click CREATE ACCOUNT
5. If auto-confirm is enabled, you'll be signed in immediately

### 5. Verify in Supabase Dashboard
Go to **Authentication → Users** and you should see the new user.

## Troubleshooting

**"Email not confirmed" error:**
- Either disable email confirmation (Option A above)
- Or check that email sending is configured in Supabase
- Or use the "Resend Confirmation" button on the auth page

**"Invalid login" error:**
- Double-check email and password
- Make sure the account exists (sign up first)

**Auth page loads but nothing happens:**
- Open browser console (F12) for detailed error messages
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly

## Environment Variables (Already Set)
- `VITE_SUPABASE_URL`: https://wnqfdmbypygvrdanosqx.supabase.co
- `VITE_SUPABASE_ANON_KEY`: (set via freebuff-env)
