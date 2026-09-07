import { test, expect } from '@playwright/test';
import type { MoveOutput } from '../packages/domain/src/index.ts';

test('standalone page opens saved state, protects edits, revises, lands and survives reload',async({page})=>{
  await page.goto('http://127.0.0.1:4176/');
  const picker=page.getByLabel('Your saved explorations');
  await expect(picker).toBeEnabled();
  await expect(picker.locator('option')).toHaveCount(2);
  const view=page.frameLocator('#view');
  const editor=view.getByLabel('Edit the full draft (JSON)');
  await expect(editor).toBeVisible();
  const output=JSON.parse(await editor.inputValue()) as MoveOutput;
  output.positions[0]!.meaning='Standalone review keeps the same durable hypothesis.';
  await editor.fill(JSON.stringify(output,null,2));
  await expect(picker).toBeDisabled();
  await expect(page.getByRole('button',{name:'Refresh from server'})).toBeDisabled();
  await expect(view.getByRole('button',{name:'Land',exact:true})).toBeDisabled();
  await view.getByRole('button',{name:'Revise',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Revision saved');
  await expect(picker).toBeEnabled();
  await view.getByRole('button',{name:'Land',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Step landed');
  await page.reload();
  await expect(view.getByText('Standalone review keeps the same durable hypothesis.',{exact:true})).toBeVisible();
  await expect(view.getByText(/excavation · accepted · hypothesis/)).toBeVisible();
  await expect(view.getByRole('button',{name:'Land',exact:true})).toHaveCount(0);
});

test('exploration picker and direct page addresses reopen without creating a move',async({page})=>{
  await page.goto('http://127.0.0.1:4176/');
  const picker=page.getByLabel('Your saved explorations');await expect(picker).toBeEnabled();
  await picker.selectOption({label:'An earlier exploration'});
  const view=page.frameLocator('#view');await expect(view.getByRole('heading',{name:'An earlier exploration',exact:true})).toBeVisible();
  await expect(view.getByText('No proposed moves yet.')).toBeVisible();
  const url=page.url();expect(url).toContain('exploration=');
  await page.goto(url);await expect(view.getByText('No proposed moves yet.')).toBeVisible();
});

test('public landing page is static and honest about hosted availability',async({page})=>{
  await page.goto('http://127.0.0.1:4176/about');
  await expect(page.getByRole('heading',{name:/Follow what changes/})).toBeVisible();
  await expect(page.getByText('Hosted accounts and a public MCP endpoint are not available yet.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Official connection guide ↗'})).toBeVisible();
});
