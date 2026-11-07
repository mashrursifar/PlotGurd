# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-flow.spec.ts >> demo flow: signup, map search, history, risk check, enquiry, authority reply, and transaction
- Location: tests\e2e\demo-flow.spec.ts:24:1

# Error details

```
Error: Command failed: npm run demo:reset
```

# Test source

```ts
  1   | import { execSync } from 'node:child_process';
  2   | import path from 'node:path';
  3   | import { fileURLToPath } from 'node:url';
  4   | 
  5   | import { expect, test } from '@playwright/test';
  6   | 
  7   | const __filename = fileURLToPath(import.meta.url);
  8   | const __dirname = path.dirname(__filename);
  9   | const repoRoot = path.resolve(__dirname, '../..');
  10  | 
  11  | const authorityEmail = process.env.SEED_AUTHORITY_EMAIL ?? 'authority@example.test';
  12  | const authorityPassword =
  13  |   process.env.SEED_AUTHORITY_PASSWORD ?? 'ReplaceMe123';
  14  | 
  15  | function resetAndSeedDatabase(): void {
> 16  |   execSync('npm run demo:reset', { cwd: repoRoot, stdio: 'inherit' });
      |   ^ Error: Command failed: npm run demo:reset
  17  |   execSync('npm run seed', { cwd: repoRoot, stdio: 'inherit' });
  18  | }
  19  | 
  20  | test.beforeAll(() => {
  21  |   resetAndSeedDatabase();
  22  | });
  23  | 
  24  | test('demo flow: signup, map search, history, risk check, enquiry, authority reply, and transaction', async ({
  25  |   page,
  26  |   context,
  27  | }) => {
  28  |   const userName = `Demo User ${Date.now()}`;
  29  |   const userEmail = `demo-${Date.now()}@example.test`;
  30  |   const userPassword = 'StrongPass123';
  31  | 
  32  |   await page.goto('/signup');
  33  |   await page.getByLabel('Name').fill(userName);
  34  |   await page.getByLabel('Email').fill(userEmail);
  35  |   await page.getByLabel('Password').fill(userPassword);
  36  |   await page.getByRole('button', { name: 'Create account' }).click();
  37  | 
  38  |   await expect(page).toHaveURL(/\/map$/);
  39  | 
  40  |   await page.goto('/authority');
  41  |   await expect(page).toHaveURL(/\/map$/);
  42  | 
  43  |   const search = page.getByLabel('Search dag number');
  44  |   await search.fill('14');
  45  |   await search.press('Enter');
  46  | 
  47  |   await expect(page.getByRole('heading', { name: /Dag 14/i })).toBeVisible();
  48  | 
  49  |   await page.getByRole('tab', { name: 'history' }).click();
  50  |   await page.getByRole('button', { name: 'Verify integrity' }).click();
  51  | 
  52  |   await expect(
  53  |     page.getByText(/History verified: .* entries, no changes detected/i),
  54  |   ).toBeVisible();
  55  | 
  56  |   await page.getByRole('tab', { name: 'risk' }).click();
  57  |   await page.getByRole('button', { name: 'Run risk assessment' }).click();
  58  | 
  59  |   await expect(page.getByText('High')).toBeVisible();
  60  |   await expect(page.getByText('R1')).toBeVisible();
  61  |   await expect(page.getByText('R2')).toBeVisible();
  62  | 
  63  |   await page.getByRole('tab', { name: 'enquire' }).click();
  64  |   await page
  65  |     .getByLabel('Ask about this parcel')
  66  |     .fill('Please confirm the ownership record for this parcel.');
  67  |   await page.getByRole('button', { name: 'Submit enquiry' }).click();
  68  | 
  69  |   await expect(page.getByText('No reply yet.')).toBeVisible();
  70  | 
  71  |   const myEnquiriesResponse = await context.request.get('/api/enquiries/mine');
  72  |   expect(myEnquiriesResponse.ok()).toBeTruthy();
  73  |   const myEnquiries = await myEnquiriesResponse.json();
  74  |   const enquiry = myEnquiries.data.find(
  75  |     (item: { question: string }) =>
  76  |       item.question.includes('ownership record for this parcel'),
  77  |   );
  78  | 
  79  |   expect(enquiry).toBeTruthy();
  80  | 
  81  |   await page.getByRole('button', { name: 'Log out' }).click();
  82  |   await page.goto('/login');
  83  | 
  84  |   await page.getByLabel('Email').fill(authorityEmail);
  85  |   await page.getByLabel('Password').fill(authorityPassword);
  86  |   await page.getByRole('button', { name: 'Log in' }).click();
  87  | 
  88  |   await expect(page).toHaveURL(/\/map$/);
  89  | 
  90  |   const replyResponse = await context.request.patch(
  91  |     `/api/enquiries/${enquiry.id}/reply`,
  92  |     {
  93  |       data: {
  94  |         reply: 'The record was reviewed and verified by the authority.',
  95  |       },
  96  |     },
  97  |   );
  98  |   expect(replyResponse.ok()).toBeTruthy();
  99  | 
  100 |   const parcelsResponse = await context.request.get('/api/parcels');
  101 |   expect(parcelsResponse.ok()).toBeTruthy();
  102 |   const parcels = await parcelsResponse.json();
  103 |   const parcel3 = parcels.data.find(
  104 |     (item: { dagNumber: string }) => item.dagNumber === '3',
  105 |   );
  106 |   expect(parcel3).toBeTruthy();
  107 | 
  108 |   const parcelDetailResponse = await context.request.get(
  109 |     `/api/parcels/${parcel3.id}`,
  110 |   );
  111 |   expect(parcelDetailResponse.ok()).toBeTruthy();
  112 |   const parcelDetail = await parcelDetailResponse.json();
  113 | 
  114 |   const newOwnerResponse = await context.request.post('/api/owners', {
  115 |     data: {
  116 |       name: `Buyer ${Date.now()}`,
```