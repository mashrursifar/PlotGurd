import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const authorityEmail = process.env.SEED_AUTHORITY_EMAIL ?? 'authority@example.test';
const authorityPassword =
  process.env.SEED_AUTHORITY_PASSWORD ?? 'ReplaceMe123';

function resetAndSeedDatabase(): void {
  execSync('npm run demo:reset', { cwd: repoRoot, stdio: 'inherit' });
  execSync('npm run seed', { cwd: repoRoot, stdio: 'inherit' });
}

test.beforeAll(() => {
  resetAndSeedDatabase();
});

test('demo flow: signup, map search, history, risk check, enquiry, authority reply, and transaction', async ({
  page,
  context,
}) => {
  const userName = `Demo User ${Date.now()}`;
  const userEmail = `demo-${Date.now()}@example.test`;
  const userPassword = 'StrongPass123';

  await page.goto('/signup');
  await page.getByLabel('Name').fill(userName);
  await page.getByLabel('Email').fill(userEmail);
  await page.getByLabel('Password').fill(userPassword);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/map$/);

  await page.goto('/authority');
  await expect(page).toHaveURL(/\/map$/);

  const search = page.getByLabel('Search dag number');
  await search.fill('14');
  await search.press('Enter');

  await expect(page.getByRole('heading', { name: /Dag 14/i })).toBeVisible();

  await page.getByRole('tab', { name: 'history' }).click();
  await page.getByRole('button', { name: 'Verify integrity' }).click();

  await expect(
    page.getByText(/History verified: .* entries, no changes detected/i),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'risk' }).click();
  await page.getByRole('button', { name: 'Run risk assessment' }).click();

  await expect(page.getByText('High')).toBeVisible();
  await expect(page.getByText('R1')).toBeVisible();
  await expect(page.getByText('R2')).toBeVisible();

  await page.getByRole('tab', { name: 'enquire' }).click();
  await page
    .getByLabel('Ask about this parcel')
    .fill('Please confirm the ownership record for this parcel.');
  await page.getByRole('button', { name: 'Submit enquiry' }).click();

  await expect(page.getByText('No reply yet.')).toBeVisible();

  const myEnquiriesResponse = await context.request.get('/api/enquiries/mine');
  expect(myEnquiriesResponse.ok()).toBeTruthy();
  const myEnquiries = await myEnquiriesResponse.json();
  const enquiry = myEnquiries.data.find(
    (item: { question: string }) =>
      item.question.includes('ownership record for this parcel'),
  );

  expect(enquiry).toBeTruthy();

  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto('/login');

  await page.getByLabel('Email').fill(authorityEmail);
  await page.getByLabel('Password').fill(authorityPassword);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL(/\/map$/);

  const replyResponse = await context.request.patch(
    `/api/enquiries/${enquiry.id}/reply`,
    {
      data: {
        reply: 'The record was reviewed and verified by the authority.',
      },
    },
  );
  expect(replyResponse.ok()).toBeTruthy();

  const parcelsResponse = await context.request.get('/api/parcels');
  expect(parcelsResponse.ok()).toBeTruthy();
  const parcels = await parcelsResponse.json();
  const parcel3 = parcels.data.find(
    (item: { dagNumber: string }) => item.dagNumber === '3',
  );
  expect(parcel3).toBeTruthy();

  const parcelDetailResponse = await context.request.get(
    `/api/parcels/${parcel3.id}`,
  );
  expect(parcelDetailResponse.ok()).toBeTruthy();
  const parcelDetail = await parcelDetailResponse.json();

  const newOwnerResponse = await context.request.post('/api/owners', {
    data: {
      name: `Buyer ${Date.now()}`,
      nationalId: `NID-${Date.now()}`,
      address: 'Fictional Street 12',
    },
  });
  expect(newOwnerResponse.ok()).toBeTruthy();
  const newOwner = await newOwnerResponse.json();

  const transactionResponse = await context.request.post(
    `/api/parcels/${parcel3.id}/transactions`,
    {
      data: {
        type: 'SALE',
        fromOwnerId: parcelDetail.data.currentOwner.id,
        toOwnerId: newOwner.data.id,
        effectiveDate: '2026-11-07',
        note: 'Demo sale recorded by the authority.',
      },
    },
  );
  expect(transactionResponse.ok()).toBeTruthy();

  const updatedParcelResponse = await context.request.get(
    `/api/parcels/${parcel3.id}`,
  );
  expect(updatedParcelResponse.ok()).toBeTruthy();
  const updatedParcel = await updatedParcelResponse.json();
  expect(updatedParcel.data.currentOwner.id).toBe(newOwner.data.id);

  await page.goto('/authority');
  await expect(page).toHaveURL(/\/map$/);
});
