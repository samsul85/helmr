# Helmr — Group event planning prototype

A clickable prototype with a feedback button for sharing in WhatsApp / group chats.

## What you need to do (~30 min total)

### Step 1: Sign up for Formspree (3 min)
1. Go to https://formspree.io and sign up with `samsul20amazon@gmail.com`
2. Create a new form (call it "Helmr feedback")
3. Copy the form endpoint URL — it looks like `https://formspree.io/f/xyzabc123`
4. Open `app/page.js` and find this line near the top:
   ```js
   const FORMSPREE_ENDPOINT = 'https://formspree.io/f/REPLACE_WITH_YOUR_FORMSPREE_ID';
   ```
5. Replace the URL with your real Formspree endpoint
6. Save the file

### Step 2: Push to GitHub (10 min)
1. Sign up at https://github.com if you don't have an account
2. Click "New repository" — name it `helmr`, make it public, click Create
3. On the repo page, click "uploading an existing file"
4. Drag the entire helmr folder contents into the upload area
5. Click "Commit changes"

### Step 3: Deploy to Vercel (5 min)
1. Go to https://vercel.com and sign up using "Continue with GitHub"
2. Click "Add New... → Project"
3. Find your `helmr` repo and click "Import"
4. Leave all settings as default → click "Deploy"
5. Wait ~1 minute. You'll get a URL like `helmr-abc123.vercel.app`

### Step 4: Share that URL in group chats

That's it. Open the URL on your phone first to confirm it works, then send it to friends.

## How feedback works

Every screen has a 💬 Feedback button in the bottom-right corner. When tapped:
- Quick yes/maybe/no on "Would you use this?"
- Open text box for any comment
- Optional name field

Submissions go directly to your Gmail inbox via Formspree.
Free tier: 50 submissions/month (plenty for a prototype share).

## Local preview (optional, only if you have Node.js installed)
```bash
npm install
npm run dev
```
Then open http://localhost:3000
