import { test, expect } from '@playwright/test';

test('standalone page opens saved state, protects structured edits, revises, keeps and survives reload',async({page})=>{
  await page.goto('http://127.0.0.1:4176/');
  const picker=page.getByLabel('Your saved explorations');await expect(picker).toBeEnabled();await expect(picker.locator('option')).toHaveCount(2);
  const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Change it',exact:true}).click();
  const editor=view.getByLabel('Main idea');await expect(editor).toBeVisible();await editor.fill('Standalone review keeps the same durable hypothesis.');
  await expect(picker).toBeDisabled();await expect(page.getByRole('button',{name:'Refresh from server'})).toBeDisabled();
  await view.getByRole('button',{name:'Save revision',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Revision saved');
  await expect(picker).toBeEnabled();
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Keep this',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Kept.');
  await page.reload();
  await expect(view.getByText('Standalone review keeps the same durable hypothesis.',{exact:true}).first()).toBeVisible();
  await view.getByRole('button',{name:'Map',exact:true}).click();
  await expect(view.getByRole('button',{name:/Visited arrival: Standalone review keeps/})).toBeVisible();
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toHaveCount(0);
});

test('exploration picker and direct page addresses reopen without creating a move',async({page})=>{
  await page.goto('http://127.0.0.1:4176/');const picker=page.getByLabel('Your saved explorations');await expect(picker).toBeEnabled();
  await picker.selectOption({label:'An earlier exploration'});const view=page.frameLocator('#view');await expect(view.getByRole('heading',{name:'An earlier exploration',exact:true})).toBeVisible();
  await expect(view.getByText('No proposed moves yet.')).toBeVisible();const url=page.url();expect(url).toContain('exploration=');await page.goto(url);await expect(view.getByText('No proposed moves yet.')).toBeVisible();
});

test('public landing page is honest about the private hosted field test and public-release boundary',async({page})=>{
  await page.goto('http://127.0.0.1:4176/about');await expect(page.getByRole('heading',{name:/Follow what changes/})).toBeVisible();
  await expect(page.getByText('Private Vercel + Neon field test is live.',{exact:false})).toBeVisible();
  await expect(page.getByText('Public signup, OAuth, and a public connector URL are not available yet.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Official connection guide ↗'})).toBeVisible();
});