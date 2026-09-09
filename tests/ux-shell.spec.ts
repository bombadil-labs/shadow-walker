import { test, expect } from '@playwright/test';

test('review-first shell names the exploration and makes the pending decision primary',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await expect(view.getByRole('heading',{name:'A discovery walk',exact:true})).toBeVisible();
  await expect(view.getByText('REVIEW NEEDED',{exact:true}).first()).toBeVisible();
  await expect(view.getByRole('heading',{name:'A proposed step is waiting for you.',exact:true})).toBeVisible();
  await expect(view.locator('.review-first-card + .map-layout')).toHaveCount(1);
  await expect(view.getByText('What changed',{exact:true}).first()).toBeVisible();
  await expect(view.getByText('What this opens',{exact:true}).first()).toBeVisible();
  await expect(view.getByText('What we’re unsure about',{exact:true}).first()).toBeVisible();
});

test('editing keeps domain-heavy controls behind advanced disclosure',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Change it',exact:true}).click();
  await expect(view.getByLabel('Main idea')).toBeVisible();
  await expect(view.getByText('Advanced structure & provenance',{exact:true})).toBeVisible();
  await expect(view.getByLabel('New language / spans (comma separated)')).toBeHidden();
  await view.getByText('Advanced structure & provenance',{exact:true}).click();
  await expect(view.getByLabel('New language / spans (comma separated)')).toBeVisible();
});
