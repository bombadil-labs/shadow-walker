import { test, expect } from '@playwright/test';

test('human Keep this updates the actual store and does not prepare a next move',async({page,request})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Keep this',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Kept.');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(2);expect(snapshot.positions[1].epistemicStatus).toBe('hypothesis');expect(snapshot.activeMove).toBeNull();
  expect(snapshot.positions[1].semanticShift.newlySalient[0].span).toBe('mismatch');
});
test('missing private metadata leaves review disabled',async({page})=>{
  await page.goto('/?noMeta=1');const view=page.frameLocator('#view');
  await expect(view.getByText('Review authorization is unavailable or stale.',{exact:false})).toBeVisible();
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeDisabled();
});
test('structured editing requires a saved revision before Keep this',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Change it',exact:true}).click();
  const editor=view.getByLabel('Main idea');await expect(editor).toBeVisible();
  await editor.fill('A human-revised hypothesis.');
  await expect(view.getByRole('button',{name:'Save revision',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Save revision',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Revision saved');
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Keep this',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Kept.');
});
test('Save for later does not add a generated arrival',async({page,request})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Save for later',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Saved for later');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(1);expect(snapshot.drafts[0].status).toBe('reserved');expect(snapshot.activeMove).toBeNull();
});
test('map exposes semantic-shift hover/focus copy and an unvisited hollow direction',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  const proposed=view.getByRole('button',{name:/Proposed arrival:/});await proposed.focus();
  await expect(view.getByText('What entered',{exact:true}).first()).toBeVisible();
  await expect(view.getByText('mismatch',{exact:true}).first()).toBeVisible();
  await expect(view.getByText('Hollow nodes are sensed, not visited.',{exact:false})).toBeVisible();
});
